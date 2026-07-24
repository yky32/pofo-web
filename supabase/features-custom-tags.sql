-- Per-user custom project tags (idempotent)
-- Photographers build their own vocabulary beyond system starters.

alter table public.profiles
  add column if not exists custom_project_tags text[] not null default '{}';

comment on column public.profiles.custom_project_tags is
  'User-defined project tags (not in system list). Used as suggestions for that account only.';
