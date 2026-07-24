-- Account opening / workspace foundation (idempotent)
-- Personal accounts keep working: projects.owner_type default 'user', owner_id = profiles.id

-- ---------------------------------------------------------------------------
-- Teams
-- ---------------------------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  logo_url text,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_slug_format check (
    slug ~ '^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])?$'
  )
);

create unique index if not exists teams_slug_uidx on public.teams (slug);
create index if not exists teams_created_by_idx on public.teams (created_by);

do $$ begin
  create type public.team_member_role as enum ('owner', 'admin', 'member');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.team_member_status as enum ('active', 'invited');
exception when duplicate_object then null;
end $$;

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.team_member_role not null default 'member',
  status public.team_member_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create index if not exists team_members_user_idx
  on public.team_members (user_id, status);
create index if not exists team_members_team_idx
  on public.team_members (team_id, status);

-- ---------------------------------------------------------------------------
-- projects.owner_type (polymorphic owner_id)
-- user → owner_id = profiles.id (all existing rows)
-- team → owner_id = teams.id
-- ---------------------------------------------------------------------------
alter table public.projects
  add column if not exists owner_type text not null default 'user';

do $$ begin
  alter table public.projects
    add constraint projects_owner_type_check
    check (owner_type in ('user', 'team'));
exception when duplicate_object then null;
end $$;

-- Drop profiles FK so owner_id may reference a team id (app-enforced integrity)
do $$ begin
  alter table public.projects drop constraint if exists projects_owner_id_fkey;
exception when undefined_object then null;
end $$;

create index if not exists projects_owner_type_id_idx
  on public.projects (owner_type, owner_id);

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_active_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
  );
$$;

create or replace function public.can_manage_team(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and tm.status = 'active'
      and tm.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_project_accessible(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and (
        (p.owner_type = 'user' and p.owner_id = auth.uid())
        or (
          p.owner_type = 'team'
          and public.is_active_team_member(p.owner_id)
        )
      )
  );
$$;

revoke all on function public.is_active_team_member(uuid) from public;
revoke all on function public.can_manage_team(uuid) from public;
revoke all on function public.is_project_accessible(uuid) from public;
grant execute on function public.is_active_team_member(uuid) to authenticated;
grant execute on function public.can_manage_team(uuid) to authenticated;
grant execute on function public.is_project_accessible(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: teams
-- ---------------------------------------------------------------------------
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

drop policy if exists "teams_select_member" on public.teams;
create policy "teams_select_member" on public.teams
  for select using (public.is_active_team_member(id));

drop policy if exists "teams_insert_self" on public.teams;
create policy "teams_insert_self" on public.teams
  for insert with check (auth.uid() = created_by);

drop policy if exists "teams_update_manager" on public.teams;
create policy "teams_update_manager" on public.teams
  for update using (public.can_manage_team(id));

drop policy if exists "team_members_select" on public.team_members;
create policy "team_members_select" on public.team_members
  for select using (
    user_id = auth.uid()
    or public.is_active_team_member(team_id)
  );

drop policy if exists "team_members_insert" on public.team_members;
create policy "team_members_insert" on public.team_members
  for insert with check (
    -- creator adds self as owner on team create
    (user_id = auth.uid() and role = 'owner')
    or public.can_manage_team(team_id)
  );

drop policy if exists "team_members_update" on public.team_members;
create policy "team_members_update" on public.team_members
  for update using (public.can_manage_team(team_id));

drop policy if exists "team_members_delete" on public.team_members;
create policy "team_members_delete" on public.team_members
  for delete using (public.can_manage_team(team_id));

-- ---------------------------------------------------------------------------
-- RLS: projects / children — personal OR active team member
-- ---------------------------------------------------------------------------
drop policy if exists "projects_owner_all" on public.projects;
create policy "projects_accessible_all" on public.projects
  for all using (
    (owner_type = 'user' and owner_id = auth.uid())
    or (owner_type = 'team' and public.is_active_team_member(owner_id))
  )
  with check (
    (owner_type = 'user' and owner_id = auth.uid())
    or (
      owner_type = 'team'
      and public.can_manage_team(owner_id)
    )
  );

drop policy if exists "containers_owner_all" on public.containers;
create policy "containers_project_access" on public.containers
  for all using (public.is_project_accessible(project_id))
  with check (public.is_project_accessible(project_id));

-- Shots: project access (uploader still stored as shots.owner_id)
drop policy if exists "shots_owner_all" on public.shots;
create policy "shots_project_access" on public.shots
  for all using (public.is_project_accessible(project_id))
  with check (
    public.is_project_accessible(project_id)
    and owner_id = auth.uid()
  );

drop policy if exists "share_links_owner_all" on public.share_links;
create policy "share_links_project_access" on public.share_links
  for all using (public.is_project_accessible(project_id))
  with check (public.is_project_accessible(project_id));

drop policy if exists "shot_selections_owner_select" on public.shot_selections;
create policy "shot_selections_project_select" on public.shot_selections
  for select using (public.is_project_accessible(project_id));
