-- Project tags — free-form labels for filter + job nature (wedding, commercial, …)
-- Idempotent.

alter table public.projects
  add column if not exists tags text[] not null default '{}';

comment on column public.projects.tags is
  'Free-form project labels (e.g. wedding, commercial). For library filter + Memories.';

create index if not exists projects_tags_gin_idx
  on public.projects using gin (tags);
