-- Pofo MVP schema
-- Run in Supabase SQL editor after creating a project.

-- Extensions
create extension if not exists "pgcrypto";

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  studio_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Galleries
create type public.gallery_status as enum ('draft', 'shared', 'proofing', 'final', 'archived');

create table if not exists public.galleries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  client_name text,
  description text,
  cover_photo_id uuid,
  status public.gallery_status not null default 'draft',
  selection_limit int not null default 40,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Photos
create type public.photo_kind as enum ('jpeg', 'raw', 'final');

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind public.photo_kind not null default 'jpeg',
  storage_key text not null,
  thumbnail_key text,
  filename text not null,
  mime_type text,
  size_bytes bigint,
  width int,
  height int,
  sort_order int not null default 0,
  version_label text not null default 'draft', -- draft | final
  created_at timestamptz not null default now()
);

alter table public.galleries
  add constraint galleries_cover_photo_fk
  foreign key (cover_photo_id) references public.photos (id)
  on delete set null;

-- Share links
create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries (id) on delete cascade,
  token text not null unique,
  password_hash text,
  expires_at timestamptz,
  allow_raw_download boolean not null default false,
  raw_expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Client selections (proofing)
create table if not exists public.photo_selections (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries (id) on delete cascade,
  photo_id uuid not null references public.photos (id) on delete cascade,
  share_link_id uuid references public.share_links (id) on delete set null,
  client_label text,
  created_at timestamptz not null default now(),
  unique (gallery_id, photo_id)
);

-- Portfolio (public showcase of approved finals)
create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  photo_id uuid not null references public.photos (id) on delete cascade,
  gallery_id uuid references public.galleries (id) on delete set null,
  title text,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists galleries_owner_idx on public.galleries (owner_id);
create index if not exists photos_gallery_idx on public.photos (gallery_id);
create index if not exists share_links_token_idx on public.share_links (token);
create index if not exists photo_selections_gallery_idx on public.photo_selections (gallery_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.galleries enable row level security;
alter table public.photos enable row level security;
alter table public.share_links enable row level security;
alter table public.photo_selections enable row level security;
alter table public.portfolio_items enable row level security;

-- Profiles: users manage own profile
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Galleries: owners full access
create policy "galleries_owner_all" on public.galleries
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Photos: owners full access
create policy "photos_owner_all" on public.photos
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Share links: owners full access
create policy "share_links_owner_all" on public.share_links
  for all using (
    exists (
      select 1 from public.galleries g
      where g.id = gallery_id and g.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.galleries g
      where g.id = gallery_id and g.owner_id = auth.uid()
    )
  );

-- Selections: owners can read; inserts via service role / edge for clients
create policy "selections_owner_select" on public.photo_selections
  for select using (
    exists (
      select 1 from public.galleries g
      where g.id = gallery_id and g.owner_id = auth.uid()
    )
  );

-- Portfolio: owners manage; public read published
create policy "portfolio_owner_all" on public.portfolio_items
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "portfolio_public_read" on public.portfolio_items
  for select using (is_published = true);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
