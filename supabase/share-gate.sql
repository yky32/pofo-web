-- Public share-link gate metadata (no password_hash, no shots).
-- Lets the password screen show studio / project without service role.
-- Run after schema.sql

create or replace function public.get_share_gate(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.share_links%rowtype;
  v_project public.projects%rowtype;
  v_owner public.profiles%rowtype;
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

  return jsonb_build_object(
    'requires_password',
      (v_link.password_hash is not null and length(trim(v_link.password_hash)) > 0),
    'project_title', v_project.title,
    'client_name', v_project.client_name,
    'studio_name', coalesce(
      nullif(trim(v_owner.studio_name), ''),
      nullif(trim(v_owner.display_name), '')
    ),
    'display_name', v_owner.display_name,
    'avatar_url', v_owner.avatar_url
  );
end;
$$;

revoke all on function public.get_share_gate(text) from public;
grant execute on function public.get_share_gate(text) to anon, authenticated;
