begin;

create table public.directory_sponsorships (
  listing_id uuid primary key references public.directory_managed_listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  status text not null,
  current_period_end timestamptz not null,
  plan text not null check (plan in ('monthly', 'yearly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index directory_sponsorships_user on public.directory_sponsorships(user_id);
create index directory_sponsorships_status on public.directory_sponsorships(status, current_period_end);

alter table public.directory_sponsorships enable row level security;
revoke all on public.directory_sponsorships from anon, authenticated;
grant select on public.directory_sponsorships to authenticated;

create policy "Owners and admins read sponsorships" on public.directory_sponsorships
for select to authenticated
using (user_id = (select auth.uid()) or (select public.directory_is_admin()));

create or replace function public.directory_public_active_sponsorships()
returns table(listing_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(l.legacy_id, l.id::text)
  from public.directory_sponsorships s
  join public.directory_managed_listings l on l.id = s.listing_id
  where s.status in ('active', 'trialing')
    and s.current_period_end > now()
    and l.published is not null
    and l.status = 'approved';
$$;

revoke all on function public.directory_public_active_sponsorships() from public;
grant execute on function public.directory_public_active_sponsorships() to anon, authenticated;

commit;