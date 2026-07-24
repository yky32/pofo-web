-- Pricing / plan foundation (idempotent)
-- Free-first: every profile defaults to plan = 'free'

alter table public.profiles
  add column if not exists plan text not null default 'free';

do $$ begin
  alter table public.profiles
    add constraint profiles_plan_check
    check (plan in ('free', 'solo', 'pro'));
exception when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists billing_interval text not null default 'monthly';

do $$ begin
  alter table public.profiles
    add constraint profiles_billing_interval_check
    check (billing_interval in ('monthly', 'annual'));
exception when duplicate_object then null;
end $$;

comment on column public.profiles.plan is
  'Subscription tier: free | solo | pro. New users always free.';
