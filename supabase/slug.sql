-- Studio slug for subdomain tenancy: {slug}.pofo.app
-- Safe to re-run (idempotent).

alter table public.profiles
  add column if not exists slug text;

alter table public.profiles
  add column if not exists custom_domain text;

create unique index if not exists profiles_slug_uidx
  on public.profiles (slug)
  where slug is not null;

create unique index if not exists profiles_custom_domain_uidx
  on public.profiles (custom_domain)
  where custom_domain is not null;

alter table public.profiles
  drop constraint if exists profiles_slug_format;

alter table public.profiles
  add constraint profiles_slug_format
  check (
    slug is null
    or slug ~ '^[a-z0-9]([a-z0-9-]{1,30}[a-z0-9])?$'
  );

-- ---------------------------------------------------------------------------
-- Slug helpers
-- ---------------------------------------------------------------------------
create or replace function public.slugify_label(p_input text)
returns text
language plpgsql
immutable
as $$
declare
  v text;
begin
  v := lower(trim(coalesce(p_input, '')));
  v := regexp_replace(v, '[^a-z0-9]+', '-', 'g');
  v := trim(both '-' from v);
  if length(v) > 32 then
    v := left(v, 32);
    v := trim(both '-' from v);
  end if;
  if length(v) < 3 then
    v := null;
  end if;
  return v;
end;
$$;

create or replace function public.is_reserved_slug(p_slug text)
returns boolean
language sql
immutable
as $$
  select lower(p_slug) in (
    'www', 'app', 'api', 'admin', 'mail', 'status', 'static',
    'login', 'signup', 'dashboard', 'settings', 'portfolio',
    'g', 's', 'auth', 'cdn', 'assets', 'help', 'support',
    'billing', 'docs', 'blog', 'pofo', 'studio', 'client'
  );
$$;

create or replace function public.allocate_unique_slug(p_preferred text)
returns text
language plpgsql
as $$
declare
  v_base text;
  v_slug text;
  i int := 0;
begin
  v_base := public.slugify_label(p_preferred);
  if v_base is null or public.is_reserved_slug(v_base) then
    v_base := 'studio';
  end if;

  v_slug := v_base;
  while public.is_reserved_slug(v_slug)
     or exists (select 1 from public.profiles where slug = v_slug)
  loop
    i := i + 1;
    v_slug := left(v_base, 28) || '-' || i::text;
    if i > 100 then
      v_slug := 'studio-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
      exit;
    end if;
  end loop;

  return v_slug;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profile on signup — include slug
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_display text;
  v_studio text;
  v_slug text;
begin
  v_display := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    split_part(new.email, '@', 1)
  );
  v_studio := nullif(trim(new.raw_user_meta_data->>'studio_name'), '');
  v_slug := public.allocate_unique_slug(
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'slug'), ''),
      v_studio,
      split_part(new.email, '@', 1)
    )
  );

  insert into public.profiles (id, display_name, studio_name, slug)
  values (new.id, v_display, v_studio, v_slug)
  on conflict (id) do update set
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    studio_name = coalesce(public.profiles.studio_name, excluded.studio_name),
    slug = coalesce(public.profiles.slug, excluded.slug);

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public studio resolve by slug (branding only)
-- ---------------------------------------------------------------------------
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

  select id, slug, display_name, studio_name, avatar_url
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
    'avatar_url', r.avatar_url
  );
end;
$$;

revoke all on function public.get_studio_by_slug(text) from public;
grant execute on function public.get_studio_by_slug(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Client gallery: optional expected studio slug (subdomain guard)
-- ---------------------------------------------------------------------------
create or replace function public.get_client_gallery(
  p_token text,
  p_expected_slug text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.share_links%rowtype;
  v_project public.projects%rowtype;
  v_owner public.profiles%rowtype;
  v_limit int;
  v_shots jsonb;
  v_selected uuid[];
  v_expect text;
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

  select * into v_project from public.projects where id = v_link.project_id;
  if not found then
    return jsonb_build_object('error', 'not_found');
  end if;

  select * into v_owner from public.profiles where id = v_project.owner_id;

  v_expect := nullif(lower(trim(coalesce(p_expected_slug, ''))), '');
  if v_expect is not null then
    if v_owner.slug is null or v_owner.slug <> v_expect then
      return jsonb_build_object('error', 'wrong_studio');
    end if;
  end if;

  v_limit := coalesce(v_link.selection_limit_override, v_project.selection_limit);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
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
    'studio', jsonb_build_object(
      'slug', v_owner.slug,
      'studio_name', v_owner.studio_name,
      'display_name', v_owner.display_name
    ),
    'shots', v_shots,
    'selected_shot_ids', to_jsonb(v_selected)
  );
end;
$$;

revoke all on function public.get_client_gallery(text, text) from public;
grant execute on function public.get_client_gallery(text, text) to anon, authenticated;

-- Keep single-arg overload for older callers
create or replace function public.get_client_gallery(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.get_client_gallery(p_token, null::text);
$$;

revoke all on function public.get_client_gallery(text) from public;
grant execute on function public.get_client_gallery(text) to anon, authenticated;
