-- Project memory metadata — when/where the job happened (idempotent)
-- Used for hero display + future Memories filter / search / tags.

alter table public.projects
  add column if not exists event_date date;

alter table public.projects
  add column if not exists location text;

comment on column public.projects.event_date is
  'When the shoot/event happened (not created_at). For Memories timeline.';
comment on column public.projects.location is
  'Where it happened — free text; multiple places ok (e.g. "Hong Kong · The Peninsula").';

create index if not exists projects_event_date_idx
  on public.projects (owner_id, event_date desc nulls last);
