-- Portfolio page layout (limited builder) on profiles.
-- Safe to re-run.

alter table public.profiles
  add column if not exists portfolio_page jsonb;

comment on column public.profiles.portfolio_page is
  'Public studio page layout: theme + ordered sections (hero, gallery, about, …).';

-- Public resolve includes page config (marketing content only)
create or replace function public.get_studio_by_slug(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  r record;
begin
  v_slug := lower(trim(coalesce(p_slug, '')));
  if v_slug = '' or public.is_reserved_slug(v_slug) then
    return jsonb_build_object('error', 'not_found');
  end if;

  select id, slug, display_name, studio_name, avatar_url, portfolio_page
  into r
  from public.profiles
  where slug = v_slug
  limit 1;

  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  return jsonb_build_object(
    'id', r.id,
    'slug', r.slug,
    'display_name', r.display_name,
    'studio_name', r.studio_name,
    'avatar_url', r.avatar_url,
    'portfolio_page', r.portfolio_page
  );
end;
$$;

revoke all on function public.get_studio_by_slug(text) from public;
grant execute on function public.get_studio_by_slug(text) to anon, authenticated;
