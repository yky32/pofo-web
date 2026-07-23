-- OAuth-aware profile bootstrap (Google / Apple metadata)
-- Aligns with Triftly handle_new_user: create public profile on auth.users insert.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_display text;
  v_studio text;
  v_slug text;
  v_avatar text;
begin
  v_display := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(coalesce(new.email, ''), '@', 1),
    'Photographer'
  );
  v_studio := nullif(trim(new.raw_user_meta_data->>'studio_name'), '');
  v_avatar := coalesce(
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), ''),
    nullif(trim(new.raw_user_meta_data->>'picture'), '')
  );
  v_slug := public.allocate_unique_slug(
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'slug'), ''),
      v_studio,
      v_display,
      split_part(coalesce(new.email, ''), '@', 1)
    )
  );

  -- One public profile per auth.users id.
  -- providers[] is a denormalized cache; auth.identities remains source of truth.
  insert into public.profiles (id, display_name, studio_name, slug, avatar_url, providers)
  values (
    new.id,
    v_display,
    v_studio,
    v_slug,
    v_avatar,
    case
      when new.raw_app_meta_data ? 'providers'
        and jsonb_typeof(new.raw_app_meta_data->'providers') = 'array'
      then (
        select coalesce(array_agg(distinct x order by x), '{}')
        from jsonb_array_elements_text(new.raw_app_meta_data->'providers') as t(x)
      )
      when nullif(trim(new.raw_app_meta_data->>'provider'), '') is not null
      then array[trim(new.raw_app_meta_data->>'provider')]
      when new.email is not null then array['email']
      else '{}'::text[]
    end
  )
  on conflict (id) do update set
    -- Prefer existing app-edited name over IdP refresh (Triftly pattern)
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    studio_name = coalesce(public.profiles.studio_name, excluded.studio_name),
    slug = coalesce(public.profiles.slug, excluded.slug),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);
  -- providers[] refreshed by auth.identities trigger (profiles-providers.sql)

  return new;
end;
$$;

-- Providers: see profiles-providers.sql (providers[] + sync from auth.identities).
