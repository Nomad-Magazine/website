-- Run only in an isolated local Supabase database. All fixture changes roll back.
begin;
set local timezone = 'Pacific/Auckland';
do $$
begin
  if (select starts_at from public.directory_award_bounds('week','2026-01-01T14:00:00Z')) <> '2025-12-29T00:00:00Z' then raise exception 'ISO week boundary'; end if;
  if (select ends_at from public.directory_award_bounds('month','2024-02-29T23:59:59Z')) <> '2024-03-01T00:00:00Z' then raise exception 'Leap month boundary'; end if;
  if (select ends_at from public.directory_award_bounds('year','2025-12-31T23:59:59Z')) <> '2026-01-01T00:00:00Z' then raise exception 'Year boundary'; end if;
  if (select ends_at from public.directory_award_bounds('day','2026-03-29T12:00:00Z')) <> '2026-03-30T00:00:00Z' then raise exception 'UTC/DST boundary'; end if;
end;
$$;
-- Isolate scoring fixtures from other test accounts inside this transaction.
delete from public.directory_awards;
delete from public.directory_award_periods;
delete from public.directory_vote_history;
update public.directory_award_settings set starts_at='2025-01-01T00:00:00Z';
insert into public.directory_legacy_vote_targets(listing_id,title) values ('award-sql-a','Nomad Grove'),('award-sql-b','Atlas House'),('award-sql-c','Withdrawn candidate');
insert into public.directory_vote_history(id,listing_id,first_voted_at) values
('11111111-0000-0000-0000-000000000001','award-sql-a','2025-02-28T23:59:59.999Z'),
('11111111-0000-0000-0000-000000000002','award-sql-b','2025-02-28T12:00:00Z'),
('11111111-0000-0000-0000-000000000003','award-sql-c','2025-02-28T10:00:00Z'),
('11111111-0000-0000-0000-000000000004','award-sql-a','2025-03-01T00:00:00Z');
insert into public.directory_vote_intervals(history_id,started_at,ended_at) values
('11111111-0000-0000-0000-000000000001','2025-02-28T23:59:59.999Z','2025-03-01T00:00:00Z'),
('11111111-0000-0000-0000-000000000002','2025-02-28T12:00:00Z','2025-04-01T00:00:00Z'),
('11111111-0000-0000-0000-000000000003','2025-02-28T10:00:00Z','2025-02-28T23:59:59Z'),
('11111111-0000-0000-0000-000000000003','2025-03-01T10:00:00Z','2025-04-01T00:00:00Z'),
('11111111-0000-0000-0000-000000000004','2025-03-01T00:00:00Z','2026-01-01T00:00:00Z');
select public.directory_finalize_awards();
do $$
declare before_count integer; after_count integer;
begin
  if (select count(*) from public.directory_public_awards(p_kind=>'day',p_limit=>1000) where starts_at='2025-02-28T00:00:00Z' and vote_count=1 and tied_winners=2) <> 2 then raise exception 'Day tie/exact-close withdrawal'; end if;
  if exists(select 1 from public.directory_public_awards(p_kind=>'day',p_limit=>1000) where listing_id='award-sql-c') then raise exception 'Re-vote must not earn another daily vote'; end if;
  if not exists(select 1 from public.directory_public_awards(p_kind=>'day',p_limit=>1000) where starts_at='2025-03-01T00:00:00Z' and listing_id='award-sql-a' and vote_count=1 and tied_winners=1) then raise exception 'Vote at midnight belongs to next day'; end if;
  if (select count(*) from public.directory_public_awards(p_kind=>'month',p_limit=>1000) where starts_at='2025-02-01T00:00:00Z' and tied_winners=2) <> 2 then raise exception 'Monthly tie'; end if;
  if not exists(select 1 from public.directory_public_awards(p_kind=>'year',p_limit=>1000) where starts_at='2025-01-01T00:00:00Z' and listing_id='award-sql-a' and vote_count=1) then raise exception 'Year-end active vote'; end if;
  if exists(select 1 from public.directory_award_periods where ends_at>now()) then raise exception 'Open period finalized'; end if;
  if exists(select 1 from public.directory_award_periods p join public.directory_awards a on p.id=a.period_id where p.starts_at='2025-01-02T00:00:00Z' and p.kind='day') then raise exception 'Empty period issued a badge'; end if;
  select count(*) into before_count from public.directory_awards;
  update public.directory_legacy_vote_targets set title='Renamed later' where listing_id='award-sql-a';
  update public.directory_vote_intervals set ended_at='2025-03-01T00:00:00Z' where history_id='11111111-0000-0000-0000-000000000004';
  perform public.directory_finalize_awards();
  select count(*) into after_count from public.directory_awards;
  if before_count<>after_count then raise exception 'Finalization is not idempotent'; end if;
  if exists(select 1 from public.directory_awards where listing_id='award-sql-a' and listing_title<>'Nomad Grove') then raise exception 'Award title changed after finalization'; end if;
  if not exists(select 1 from public.directory_public_awards(p_kind=>'year',p_limit=>1000) where listing_id='award-sql-a' and vote_count=1) then raise exception 'Finalized score changed'; end if;
end;
$$;
rollback;
