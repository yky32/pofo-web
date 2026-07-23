-- Denormalized providers[] on public.profiles (cache of auth.identities).
-- Source of truth remains auth.identities; this is for admin/UI/reporting.
-- Run after schema.sql (SQL Editor or apply script).

alter table public.profiles
  add column if not exists providers text[] not null default '{}';

comment on column public.profiles.providers is
  'Linked auth providers (google, apple, email, …). Synced from auth.identities.';

-- Rebuild providers[] for one user from auth.identities
create or replace function public.sync_profile_providers(p_user_id uuid)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_providers text[];
begin
  if p_user_id is null then
    return '{}';
  end if;

  select coalesce(array_agg(distinct i.provider order by i.provider), '{}')
  into v_providers
  from auth.identities i
  where i.user_id = p_user_id;

  update public.profiles
  set
    providers = v_providers,
    updated_at = now()
  where id = p_user_id;

  return v_providers;
end;
$$;

revoke all on function public.sync_profile_providers(uuid) from public;
grant execute on function public.sync_profile_providers(uuid) to authenticated, service_role;

-- Keep cache fresh when identities are added/removed (link / unlink / signup)
create or replace function public.on_auth_identity_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  v_uid := coalesce(new.user_id, old.user_id);
  perform public.sync_profile_providers(v_uid);
  return coalesce(new, old);
end;
$$;

drop trigger if exists on_auth_identity_changed on auth.identities;
create trigger on_auth_identity_changed
  after insert or update or delete on auth.identities
  for each row
  execute function public.on_auth_identity_changed();

-- Backfill existing profiles
update public.profiles p
set providers = coalesce(
  (
    select array_agg(distinct i.provider order by i.provider)
    from auth.identities i
    where i.user_id = p.id
  ),
  '{}'
);
