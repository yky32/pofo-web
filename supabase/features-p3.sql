-- P3: Finals + portfolio + original download window (idempotent)
-- Run after features-p1-p2.sql

-- ---------------------------------------------------------------------------
-- Portfolio (public showcase of published shots)
-- ---------------------------------------------------------------------------
create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  shot_id uuid not null references public.shots (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text,
  caption text,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_id, shot_id)
);

create index if not exists portfolio_items_owner_sort_idx
  on public.portfolio_items (owner_id, sort_order, created_at desc);

create index if not exists portfolio_items_published_idx
  on public.portfolio_items (owner_id)
  where is_published = true;

alter table public.portfolio_items enable row level security;

drop policy if exists "portfolio_owner_all" on public.portfolio_items;
create policy "portfolio_owner_all" on public.portfolio_items
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Public read of published portfolio by studio slug (no auth)
create or replace function public.get_public_portfolio(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_items jsonb;
begin
  if p_slug is null or length(trim(p_slug)) < 2 then
    return jsonb_build_object('error', 'invalid_slug');
  end if;

  select * into v_profile
  from public.profiles
  where slug = lower(trim(p_slug))
  limit 1;

  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', pi.id,
      'title', coalesce(nullif(pi.title, ''), s.filename, p.title),
      'caption', pi.caption,
      'shot_id', s.id,
      'storage_key', s.storage_key,
      'preview_url', s.preview_url,
      'filename', s.filename,
      'width', s.width,
      'height', s.height,
      'project_title', p.title,
      'sort_order', pi.sort_order,
      'created_at', pi.created_at
    )
    order by pi.sort_order asc, pi.created_at desc
  ), '[]'::jsonb)
  into v_items
  from public.portfolio_items pi
  join public.shots s on s.id = pi.shot_id
  left join public.projects p on p.id = pi.project_id
  where pi.owner_id = v_profile.id
    and pi.is_published = true;

  return jsonb_build_object(
    'ok', true,
    'studio', jsonb_build_object(
      'slug', v_profile.slug,
      'studio_name', v_profile.studio_name,
      'display_name', v_profile.display_name,
      'avatar_url', v_profile.avatar_url
    ),
    'items', v_items
  );
end;
$$;

revoke all on function public.get_public_portfolio(text) from public;
grant execute on function public.get_public_portfolio(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Share link: original / RAW download window for clients
-- ---------------------------------------------------------------------------
alter table public.share_links
  add column if not exists allow_original_download boolean not null default false;

alter table public.share_links
  add column if not exists original_expires_at timestamptz;

-- Expose flags via get_share_gate if present (best-effort recreate of extras)
-- App also reads via admin/session for passworded galleries.
