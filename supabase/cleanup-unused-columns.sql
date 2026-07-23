-- Remove columns with no app usage (safe / additive reverse of dead schema).
-- Run in Supabase SQL Editor after backup if you care about any legacy data.
--
-- Dropped:
--   shots.thumbnail_key, shots.captured_at
--   containers.concept, containers.selection_limit
--   share_links.allow_download, allow_raw_download, raw_expires_at, selection_limit_override
--   shot_selections.client_label
--   profiles.custom_domain  (never wired in app UI)
--
-- Kept intentionally:
--   profiles.providers (synced cache)
--   profiles.slug (studio subdomains)
--   shots.width/height (returned in galleries; not always filled yet)
--   share_links.password_hash / expires_at / is_active / token (active features)

-- ---------------------------------------------------------------------------
-- shots
-- ---------------------------------------------------------------------------
alter table public.shots drop column if exists thumbnail_key;
alter table public.shots drop column if exists captured_at;

-- ---------------------------------------------------------------------------
-- containers
-- ---------------------------------------------------------------------------
alter table public.containers drop column if exists concept;
alter table public.containers drop column if exists selection_limit;

-- ---------------------------------------------------------------------------
-- share_links
-- ---------------------------------------------------------------------------
alter table public.share_links drop column if exists allow_download;
alter table public.share_links drop column if exists allow_raw_download;
alter table public.share_links drop column if exists raw_expires_at;
alter table public.share_links drop column if exists selection_limit_override;

-- ---------------------------------------------------------------------------
-- shot_selections
-- ---------------------------------------------------------------------------
alter table public.shot_selections drop column if exists client_label;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop index if exists public.profiles_custom_domain_uidx;
alter table public.profiles drop column if exists custom_domain;
