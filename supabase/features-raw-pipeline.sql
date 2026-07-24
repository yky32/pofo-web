-- RAW + preview pipeline (Phase A) — idempotent
-- One logical shot may hold JPEG original + companion RAW + web derivatives.

alter table public.shots
  add column if not exists raw_key text;

alter table public.shots
  add column if not exists preview_key text;

alter table public.shots
  add column if not exists processing_status text not null default 'ready';

alter table public.shots
  add column if not exists processing_error text;

-- kind is enum public.shot_kind (not text) — extend with paired (JPEG + RAW).
-- CHECK constraints on enum labels fail with 22P02 if the label is missing.
alter type public.shot_kind add value if not exists 'paired';

-- Drop any legacy text-style check (enum already enforces membership)
do $$ begin
  alter table public.shots drop constraint if exists shots_kind_check;
exception when undefined_object then null;
end $$;

do $$ begin
  alter table public.shots drop constraint if exists shots_processing_status_check;
exception when undefined_object then null;
end $$;

do $$ begin
  alter table public.shots
    add constraint shots_processing_status_check
    check (processing_status in ('pending', 'ready', 'failed'));
exception when duplicate_object then null;
end $$;

comment on column public.shots.storage_key is
  'Primary original object key (JPEG or RAW when raw-only).';
comment on column public.shots.raw_key is
  'Optional companion RAW object key when kind = paired.';
comment on column public.shots.preview_key is
  'Web-safe preview object key for client gallery (~1600–2400px).';
comment on column public.shots.processing_status is
  'ready | pending | failed — pending when RAW has no web preview yet.';

create index if not exists shots_processing_pending_idx
  on public.shots (processing_status)
  where processing_status = 'pending';

-- ---------------------------------------------------------------------------
-- Proofing: lock selections when project status is final / archived
-- ---------------------------------------------------------------------------
create or replace function public.toggle_client_selection(
  p_token text,
  p_shot_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.share_links%rowtype;
  v_project public.projects%rowtype;
  v_limit int;
  v_count int;
  v_exists boolean;
  v_selected uuid[];
begin
  if p_token is null or p_shot_id is null then
    return jsonb_build_object('error', 'invalid');
  end if;

  select * into v_link from public.share_links where token = p_token limit 1;
  if not found or not v_link.is_active then
    return jsonb_build_object('error', 'not_found');
  end if;
  if v_link.expires_at is not null and v_link.expires_at < now() then
    return jsonb_build_object('error', 'expired');
  end if;

  select * into v_project from public.projects where id = v_link.project_id;
  v_limit := v_project.selection_limit;

  if v_project.status in ('final', 'archived') then
    return jsonb_build_object('error', 'locked', 'status', v_project.status);
  end if;

  if not exists (
    select 1 from public.shots s
    where s.id = p_shot_id and s.project_id = v_link.project_id
  ) then
    return jsonb_build_object('error', 'invalid_shot');
  end if;

  select exists (
    select 1 from public.shot_selections
    where share_link_id = v_link.id and shot_id = p_shot_id
  ) into v_exists;

  if v_exists then
    delete from public.shot_selections
    where share_link_id = v_link.id and shot_id = p_shot_id;
  else
    select count(*) into v_count
    from public.shot_selections
    where share_link_id = v_link.id;

    if v_count >= v_limit then
      return jsonb_build_object(
        'error', 'limit_reached',
        'selection_limit', v_limit,
        'selected_count', v_count
      );
    end if;

    insert into public.shot_selections (project_id, share_link_id, shot_id)
    values (v_link.project_id, v_link.id, p_shot_id)
    on conflict (share_link_id, shot_id) do nothing;

    if v_project.status in ('draft', 'shared') then
      update public.projects
      set status = 'proofing', updated_at = now()
      where id = v_project.id;
    end if;
  end if;

  select coalesce(array_agg(ss.shot_id), array[]::uuid[])
  into v_selected
  from public.shot_selections ss
  where ss.share_link_id = v_link.id;

  return jsonb_build_object(
    'ok', true,
    'selected_shot_ids', to_jsonb(v_selected),
    'selected_count', coalesce(array_length(v_selected, 1), 0),
    'selection_limit', v_limit
  );
end;
$$;

-- Bulk selections: same final lock
create or replace function public.set_client_selections(
  p_token text,
  p_shot_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.share_links%rowtype;
  v_project public.projects%rowtype;
  v_limit int;
  v_ids uuid[];
  v_selected uuid[];
begin
  if p_token is null then
    return jsonb_build_object('error', 'invalid');
  end if;

  select * into v_link from public.share_links where token = p_token limit 1;
  if not found or not v_link.is_active then
    return jsonb_build_object('error', 'not_found');
  end if;
  if v_link.expires_at is not null and v_link.expires_at < now() then
    return jsonb_build_object('error', 'expired');
  end if;

  select * into v_project from public.projects where id = v_link.project_id;
  v_limit := greatest(1, coalesce(v_project.selection_limit, 40));

  if v_project.status in ('final', 'archived') then
    return jsonb_build_object('error', 'locked', 'status', v_project.status);
  end if;

  -- Keep only shots in this project, cap to limit
  select coalesce(array_agg(s.id), array[]::uuid[])
  into v_ids
  from (
    select s.id
    from public.shots s
    where s.project_id = v_link.project_id
      and s.id = any(coalesce(p_shot_ids, array[]::uuid[]))
    limit v_limit
  ) s;

  delete from public.shot_selections where share_link_id = v_link.id;

  if array_length(v_ids, 1) is not null then
    insert into public.shot_selections (project_id, share_link_id, shot_id)
    select v_link.project_id, v_link.id, unnest(v_ids)
    on conflict (share_link_id, shot_id) do nothing;

    if v_project.status in ('draft', 'shared') then
      update public.projects
      set status = 'proofing', updated_at = now()
      where id = v_project.id;
    end if;
  end if;

  select coalesce(array_agg(ss.shot_id), array[]::uuid[])
  into v_selected
  from public.shot_selections ss
  where ss.share_link_id = v_link.id;

  return jsonb_build_object(
    'ok', true,
    'selected_shot_ids', to_jsonb(v_selected),
    'selected_count', coalesce(array_length(v_selected, 1), 0),
    'selection_limit', v_limit
  );
end;
$$;

revoke all on function public.toggle_client_selection(text, uuid) from public;
grant execute on function public.toggle_client_selection(text, uuid) to anon, authenticated;

revoke all on function public.set_client_selections(text, uuid[]) from public;
grant execute on function public.set_client_selections(text, uuid[]) to anon, authenticated;
