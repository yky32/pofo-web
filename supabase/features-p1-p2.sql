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
