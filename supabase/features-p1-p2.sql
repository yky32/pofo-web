-- P1–P2 product features (idempotent)
-- Run after schema.sql / cleanup-unused-columns.sql

-- Studio notes & flags on shots
alter table public.shots
  add column if not exists studio_note text;

alter table public.shots
  add column if not exists studio_flag text;

-- Constrain flag values (ignore if constraint already exists)
do $$ begin
  alter table public.shots
    add constraint shots_studio_flag_check
    check (
      studio_flag is null
      or studio_flag in ('none', 'print', 'retouch', 'hero', 'reject')
    );
exception when duplicate_object then null;
end $$;

-- Optional derivative key (web-friendly thumbnail)
alter table public.shots
  add column if not exists thumbnail_key text;

-- Share analytics + email tracking
alter table public.share_links
  add column if not exists view_count int not null default 0;

alter table public.share_links
  add column if not exists last_viewed_at timestamptz;

alter table public.share_links
  add column if not exists last_email_to text;

alter table public.share_links
  add column if not exists last_email_at timestamptz;

-- Increment view counter (SECURITY DEFINER — called after token validated by app)
create or replace function public.record_share_view(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.share_links%rowtype;
begin
  if p_token is null or length(trim(p_token)) < 8 then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  update public.share_links
  set
    view_count = coalesce(view_count, 0) + 1,
    last_viewed_at = now()
  where token = p_token
    and is_active = true
    and (expires_at is null or expires_at > now())
  returning * into v_link;

  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'view_count', v_link.view_count,
    'last_viewed_at', v_link.last_viewed_at
  );
end;
$$;

revoke all on function public.record_share_view(text) from public;
grant execute on function public.record_share_view(text) to anon, authenticated;

-- Bulk set client proofing selections (replace set, capped by selection_limit)
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
  if p_token is null or length(trim(p_token)) < 8 then
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
  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;
  v_limit := coalesce(v_project.selection_limit, 40);

  -- Keep only shots that belong to this project; dedupe; cap to limit
  select coalesce(array_agg(x.id), array[]::uuid[])
  into v_ids
  from (
    select distinct s.id
    from unnest(coalesce(p_shot_ids, array[]::uuid[])) as u(id)
    join public.shots s
      on s.id = u.id
     and s.project_id = v_link.project_id
    limit v_limit
  ) x;

  delete from public.shot_selections where share_link_id = v_link.id;

  if v_ids is not null and coalesce(array_length(v_ids, 1), 0) > 0 then
    insert into public.shot_selections (project_id, share_link_id, shot_id)
    select v_link.project_id, v_link.id, sid
    from unnest(v_ids) as sid
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

revoke all on function public.set_client_selections(text, uuid[]) from public;
grant execute on function public.set_client_selections(text, uuid[]) to anon, authenticated;
