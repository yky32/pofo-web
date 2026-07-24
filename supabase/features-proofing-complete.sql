-- Proofing completion signal (client “I’m done” + auto at limit)
-- Idempotent.

alter table public.projects
  add column if not exists proofing_completed_at timestamptz;

alter table public.projects
  add column if not exists proofing_completed_count int;

alter table public.projects
  add column if not exists proofing_completed_via text;

do $$ begin
  alter table public.projects
    add constraint projects_proofing_completed_via_check
    check (
      proofing_completed_via is null
      or proofing_completed_via in ('client', 'limit')
    );
exception when duplicate_object then null;
end $$;

comment on column public.projects.proofing_completed_at is
  'When the client marked proofing complete (or hit selection limit).';
comment on column public.projects.proofing_completed_via is
  'client = manual submit · limit = auto when selection limit reached';

create index if not exists projects_proofing_completed_idx
  on public.projects (owner_id, proofing_completed_at desc nulls last)
  where proofing_completed_at is not null;
