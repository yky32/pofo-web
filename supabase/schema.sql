-- Pofo Phase 1–4 schema (idempotent)
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)
-- Or: ./scripts/supabase-apply-schema.sh

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  studio_name text,
  avatar_url text,
  -- Denormalized cache of auth.identities.provider; see profiles-providers.sql
  providers text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists providers text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- Projects (one job / wedding / event)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.project_status as enum (
    'draft', 'shared', 'proofing', 'final', 'archived'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  client_name text,
  description text,
  status public.project_status not null default 'draft',
  selection_limit int not null default 40,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_updated_idx
  on public.projects (owner_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- Containers (phase 1: auto-created "Main Gallery" per project)
-- ---------------------------------------------------------------------------
create table if not exists public.containers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  is_client_visible_default boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists containers_project_idx
  on public.containers (project_id, sort_order);

-- ---------------------------------------------------------------------------
-- Shots (single photo asset)
-- preview_url: external/demo sample URLs only (Unsplash seed). Uploads leave null.
-- storage_key: object path in Supabase Storage or R2 (private; signed at read time)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.shot_kind as enum (
    'preview', 'jpeg', 'raw', 'final'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.shots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  container_id uuid not null references public.containers (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind public.shot_kind not null default 'preview',
  storage_key text,
  preview_url text,
  filename text,
  mime_type text,
  size_bytes bigint,
  width int,
  height int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists shots_project_idx
  on public.shots (project_id, sort_order);
create index if not exists shots_container_idx
  on public.shots (container_id, sort_order);

-- ---------------------------------------------------------------------------
-- Share links (client access by unguessable token)
-- ---------------------------------------------------------------------------
create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  token text not null unique,
  password_hash text,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists share_links_project_idx
  on public.share_links (project_id, created_at desc);
create unique index if not exists share_links_token_uidx
  on public.share_links (token);

-- ---------------------------------------------------------------------------
-- Shot selections (client proofing favorites)
-- ---------------------------------------------------------------------------
create table if not exists public.shot_selections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  share_link_id uuid not null references public.share_links (id) on delete cascade,
  shot_id uuid not null references public.shots (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (share_link_id, shot_id)
);

create index if not exists shot_selections_link_idx
  on public.shot_selections (share_link_id);
create index if not exists shot_selections_project_idx
  on public.shot_selections (project_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.containers enable row level security;
alter table public.shots enable row level security;
alter table public.share_links enable row level security;
alter table public.shot_selections enable row level security;

-- Profiles
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Projects
drop policy if exists "projects_owner_all" on public.projects;
create policy "projects_owner_all" on public.projects
  for all using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Containers (via project ownership)
drop policy if exists "containers_owner_all" on public.containers;
create policy "containers_owner_all" on public.containers
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

-- Shots (owner only — clients use RPCs)
drop policy if exists "shots_owner_all" on public.shots;
create policy "shots_owner_all" on public.shots
  for all using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Share links (owner only — public resolve via RPC)
drop policy if exists "share_links_owner_all" on public.share_links;
create policy "share_links_owner_all" on public.share_links
  for all using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

-- Selections: owner can read; clients mutate via RPC
drop policy if exists "shot_selections_owner_select" on public.shot_selections;
create policy "shot_selections_owner_select" on public.shot_selections
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, studio_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'studio_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists containers_set_updated_at on public.containers;
create trigger containers_set_updated_at
  before update on public.containers
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Client RPCs (SECURITY DEFINER) — no broad anon RLS on shots
-- ---------------------------------------------------------------------------

create or replace function public.get_client_gallery(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.share_links%rowtype;
  v_project public.projects%rowtype;
  v_limit int;
  v_shots jsonb;
  v_selected uuid[];
begin
  if p_token is null or length(trim(p_token)) < 8 then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  select * into v_link
  from public.share_links
  where token = p_token
  limit 1;

  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  if not v_link.is_active then
    return jsonb_build_object('error', 'revoked');
  end if;

  if v_link.expires_at is not null and v_link.expires_at < now() then
    return jsonb_build_object('error', 'expired');
  end if;

  -- Password-protected links are never returned via public RPC.
  -- App verifies scrypt hash + unlock cookie, then loads via service role.
  if v_link.password_hash is not null and length(trim(v_link.password_hash)) > 0 then
    return jsonb_build_object('error', 'password_required');
  end if;

  select * into v_project from public.projects where id = v_link.project_id;
  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  v_limit := v_project.selection_limit;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'storage_key', s.storage_key,
      'preview_url', s.preview_url,
      'filename', s.filename,
      'sort_order', s.sort_order,
      'width', s.width,
      'height', s.height
    ) order by s.sort_order, s.created_at
  ), '[]'::jsonb)
  into v_shots
  from public.shots s
  join public.containers c on c.id = s.container_id
  where s.project_id = v_project.id
    and c.is_client_visible_default = true
    and (s.preview_url is not null or s.storage_key is not null);

  select coalesce(array_agg(ss.shot_id), array[]::uuid[])
  into v_selected
  from public.shot_selections ss
  where ss.share_link_id = v_link.id;

  return jsonb_build_object(
    'token', v_link.token,
    'share_link_id', v_link.id,
    'project', jsonb_build_object(
      'id', v_project.id,
      'title', v_project.title,
      'client_name', v_project.client_name,
      'description', v_project.description,
      'status', v_project.status,
      'selection_limit', v_limit
    ),
    'shots', v_shots,
    'selected_shot_ids', to_jsonb(v_selected)
  );
end;
$$;

revoke all on function public.get_client_gallery(text) from public;
grant execute on function public.get_client_gallery(text) to anon, authenticated;

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

  -- Shot must belong to this project
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

    -- Soft status: first select → proofing
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

-- ---------------------------------------------------------------------------
-- Storage: private "shots" bucket (signed URLs at read time; R2 can replace)
-- Path: {user_id}/projects/{project_id}/…  OR legacy owners/{user_id}/…
-- Prefer re-running supabase/storage.sql after this file for latest policies.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shots',
  'shots',
  false,
  31457280, -- 30MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "shots_storage_select" on storage.objects;
drop policy if exists "shots_storage_insert" on storage.objects;
drop policy if exists "shots_storage_update" on storage.objects;
drop policy if exists "shots_storage_delete" on storage.objects;

create policy "shots_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'shots'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        (storage.foldername(name))[1] = 'owners'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

create policy "shots_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shots'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        (storage.foldername(name))[1] = 'owners'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

create policy "shots_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'shots'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        (storage.foldername(name))[1] = 'owners'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

create policy "shots_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'shots'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        (storage.foldername(name))[1] = 'owners'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );
