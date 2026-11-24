begin;

create table public.directory_vote_change_log (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id text not null,
  changed_at timestamptz not null default clock_timestamp()
);
create index directory_vote_change_log_user_time on public.directory_vote_change_log(user_id, changed_at desc);
alter table public.directory_vote_change_log enable row level security;
revoke all on public.directory_vote_change_log from anon, authenticated;

create table public.directory_vote_network_daily (
  vote_day date not null,
  listing_id text not null,
  network_hash text not null check (network_hash ~ '^[a-f0-9]{64}$'),
  vote_events integer not null default 0 check (vote_events >= 0),
  constraint directory_vote_network_daily_pkey primary key (vote_day, listing_id, network_hash)
);
create index directory_vote_network_daily_listing_day on public.directory_vote_network_daily(listing_id, vote_day desc);
alter table public.directory_vote_network_daily enable row level security;
revoke all on public.directory_vote_network_daily from anon, authenticated;

create table public.directory_vote_network_slots (
  vote_day date not null,
  listing_id text not null,
  network_hash text not null check (network_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  constraint directory_vote_network_slots_pkey primary key (vote_day, listing_id, network_hash, user_id)
);
alter table public.directory_vote_network_slots enable row level security;
revoke all on public.directory_vote_network_slots from anon, authenticated;

drop function if exists public.directory_set_vote(text, boolean);
drop function if exists public.directory_set_vote(text, boolean, text);

create function public.directory_set_vote(
  p_user_id uuid,
  p_listing_id text,
  p_voted boolean,
  p_network_hash text default null
) returns table(result_listing_id text, vote_count bigint, voted boolean)
language plpgsql security definer set search_path = '' as $$
declare
  changes_last_hour integer;
  network_events integer;
  utc_vote_day date := (clock_timestamp() at time zone 'UTC')::date;
  consumed_slot boolean := false;
  voter_email_confirmed timestamptz;
  active_vote_count integer;
  already_voted_listing boolean;
begin
  if p_user_id is null then
    raise exception 'Sign in required to vote' using errcode = '42501';
  end if;
  if p_listing_id is null or length(p_listing_id) > 100 or p_voted is null then
    raise exception 'Invalid vote' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Invalid voter' using errcode = '22023';
  end if;
  if p_voted and (p_network_hash is null or p_network_hash !~ '^[a-f0-9]{64}$') then
    raise exception 'Invalid vote network' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('directory-vote-user:' || p_user_id::text, 0));

  select count(*)::integer into changes_last_hour
  from public.directory_vote_change_log
  where user_id = p_user_id and changed_at > clock_timestamp() - interval '1 hour';
  if changes_last_hour >= 30 then
    raise exception 'Vote rate limit exceeded' using errcode = '53200';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('directory-vote:' || p_listing_id, 0));

  if not public.directory_vote_target_exists(p_listing_id) then
    raise exception 'This listing is not published' using errcode = '22023';
  end if;

  select u.email_confirmed_at into voter_email_confirmed from auth.users u where u.id = p_user_id;

  if p_voted and voter_email_confirmed is null then
    select exists (
      select 1 from public.directory_votes v where v.user_id = p_user_id and v.listing_id = p_listing_id
    ) into already_voted_listing;
    if not already_voted_listing then
      select count(*)::integer into active_vote_count from public.directory_votes v where v.user_id = p_user_id;
      if active_vote_count >= 5 then
        raise exception 'email_required' using errcode = '45003';
      end if;
    end if;
  end if;

  if p_voted then
    select exists (
      select 1 from public.directory_vote_network_slots s
      where s.vote_day = utc_vote_day
        and s.listing_id = p_listing_id
        and s.network_hash = p_network_hash
        and s.user_id = p_user_id
    ) into consumed_slot;

    if not consumed_slot then
      select coalesce(d.vote_events, 0) into network_events
      from public.directory_vote_network_daily d
      where d.vote_day = utc_vote_day and d.listing_id = p_listing_id and d.network_hash = p_network_hash;
      if network_events >= 3 then
        raise exception 'Daily vote limit reached for this listing on your network' using errcode = '53200';
      end if;
    end if;

    insert into public.directory_votes(listing_id, user_id) values (p_listing_id, p_user_id)
      on conflict on constraint directory_votes_pkey do nothing;

    if found and not consumed_slot then
      insert into public.directory_vote_network_slots(vote_day, listing_id, network_hash, user_id)
      values (utc_vote_day, p_listing_id, p_network_hash, p_user_id)
      on conflict on constraint directory_vote_network_slots_pkey do nothing;
      if found then
        insert into public.directory_vote_network_daily(vote_day, listing_id, network_hash, vote_events)
        values (utc_vote_day, p_listing_id, p_network_hash, 1)
        on conflict on constraint directory_vote_network_daily_pkey
        do update set vote_events = public.directory_vote_network_daily.vote_events + 1;
        select d.vote_events into network_events
        from public.directory_vote_network_daily d
        where d.vote_day = utc_vote_day and d.listing_id = p_listing_id and d.network_hash = p_network_hash;
        if network_events > 3 then
          raise exception 'Daily vote limit reached for this listing on your network' using errcode = '53200';
        end if;
      end if;
    end if;
  else
    delete from public.directory_votes v where v.listing_id = p_listing_id and v.user_id = p_user_id;
  end if;

  insert into public.directory_vote_change_log(user_id, listing_id) values (p_user_id, p_listing_id);

  return query
  select p_listing_id as result_listing_id, count(*)::bigint, p_voted
  from public.directory_votes v
  where v.listing_id = p_listing_id;
end;
$$;
revoke all on function public.directory_set_vote(uuid, text, boolean, text) from public, anon, authenticated;
grant execute on function public.directory_set_vote(uuid, text, boolean, text) to service_role;

comment on function public.directory_set_vote(uuid, text, boolean, text) is
  'Server-only vote mutation. Enforces 30 changes/hour per user, 3 new adds/listing/network/day, and 5 active votes until email is confirmed.';

create or replace view public.directory_award_vote_spike_flags as
with recent as (
  select h.listing_id,
         count(*) filter (where h.first_voted_at >= clock_timestamp() - interval '24 hours') as votes_24h,
         count(*) filter (where h.first_voted_at >= clock_timestamp() - interval '7 days'
           and h.first_voted_at < clock_timestamp() - interval '24 hours') as votes_prev_6d
  from public.directory_vote_history h
  where exists (
    select 1 from public.directory_vote_intervals i
    where i.history_id = h.id and (i.ended_at is null or i.ended_at >= clock_timestamp() - interval '24 hours')
  )
  group by h.listing_id
),
networks as (
  select d.listing_id,
         sum(d.vote_events) filter (where d.vote_day = (clock_timestamp() at time zone 'UTC')::date) as network_events_today,
         count(*) filter (where d.vote_day = (clock_timestamp() at time zone 'UTC')::date) as distinct_networks_today
  from public.directory_vote_network_daily d
  group by d.listing_id
)
select r.listing_id,
       public.directory_award_listing_title(r.listing_id) as listing_title,
       r.votes_24h,
       case when r.votes_24h >= 25 then 'burst_24h' end as burst_flag,
       case when r.votes_24h >= 12 and r.votes_24h >= greatest(4, coalesce(r.votes_prev_6d, 0) * 3)
         then 'burst_vs_baseline' end as burst_vs_baseline_flag,
       case when coalesce(n.network_events_today, 0) >= 6 and coalesce(n.distinct_networks_today, 0) <= 2
         then 'network_concentration' end as network_flag
from recent r
left join networks n on n.listing_id = r.listing_id
where r.votes_24h >= 12
  or coalesce(n.network_events_today, 0) >= 6;

revoke all on public.directory_award_vote_spike_flags from anon, authenticated;

create or replace function public.directory_award_vote_spike_flags()
returns table(
  listing_id text,
  listing_title text,
  votes_24h bigint,
  burst_flag text,
  burst_vs_baseline_flag text,
  network_flag text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.directory_is_admin() then
    raise exception 'Reviewer access required' using errcode = '42501';
  end if;
  return query
  select f.listing_id, f.listing_title, f.votes_24h, f.burst_flag, f.burst_vs_baseline_flag, f.network_flag
  from public.directory_award_vote_spike_flags f
  where f.burst_flag is not null or f.burst_vs_baseline_flag is not null or f.network_flag is not null;
end;
$$;
revoke all on function public.directory_award_vote_spike_flags() from public, anon, authenticated;
grant execute on function public.directory_award_vote_spike_flags() to authenticated;

create function public.directory_cleanup_vote_change_log(p_older_than_days integer default 14)
returns integer
language plpgsql security definer set search_path = '' as $$
declare removed integer := 0;
begin
  if p_older_than_days is null or p_older_than_days < 1 or p_older_than_days > 365 then
    raise exception 'Invalid cleanup window' using errcode = '22023';
  end if;
  delete from public.directory_vote_change_log where changed_at < clock_timestamp() - make_interval(days => p_older_than_days);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

create function public.directory_cleanup_vote_network(p_keep_days integer default 30)
returns integer
language plpgsql security definer set search_path = '' as $$
declare removed integer := 0;
declare n_removed integer := 0;
begin
  if p_keep_days is null or p_keep_days < 1 or p_keep_days > 365 then
    raise exception 'Invalid cleanup window' using errcode = '22023';
  end if;
  delete from public.directory_vote_network_daily
  where vote_day < (clock_timestamp() at time zone 'UTC')::date - p_keep_days;
  get diagnostics removed = row_count;
  delete from public.directory_vote_network_slots
  where vote_day < (clock_timestamp() at time zone 'UTC')::date - p_keep_days;
  get diagnostics n_removed = row_count;
  return removed + n_removed;
end;
$$;
revoke all on function public.directory_cleanup_vote_network(integer) from public, anon, authenticated;
grant execute on function public.directory_cleanup_vote_network(integer) to service_role;
revoke all on function public.directory_cleanup_vote_change_log(integer) from public, anon, authenticated;
grant execute on function public.directory_cleanup_vote_change_log(integer) to service_role;

create function public.directory_cleanup_anonymous_voters(p_older_than_days integer default 14)
returns integer
language plpgsql security definer set search_path = '' as $$
declare removed integer := 0;
begin
  if p_older_than_days < 1 or p_older_than_days > 365 then
    raise exception 'Invalid cleanup window' using errcode = '22023';
  end if;
  with doomed as (
    select u.id
    from auth.users u
    where coalesce(u.is_anonymous, false)
      and u.created_at < clock_timestamp() - make_interval(days => p_older_than_days)
      and not exists (select 1 from public.directory_votes v where v.user_id = u.id)
  )
  delete from auth.users u using doomed d where u.id = d.id;
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function public.directory_cleanup_anonymous_voters(integer) from public, anon, authenticated;
grant execute on function public.directory_cleanup_anonymous_voters(integer) to service_role;

select cron.unschedule(jobid) from cron.job where jobname = 'nomad-directory-anon-cleanup';
select cron.schedule(
  'nomad-directory-anon-cleanup',
  '15 1 * * *',
  $$select public.directory_cleanup_anonymous_voters(14), public.directory_cleanup_vote_change_log(14), public.directory_cleanup_vote_network(30);$$
);

comment on table public.directory_award_settings is
  'Awards ledger start. After deploying anonymous voting, run: update public.directory_award_settings set starts_at = now() where singleton;';

comment on table public.directory_votes is 'One session vote per published listing (verified or anonymous). Public counts never expose voter identities.';

commit;