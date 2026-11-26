begin;

create table public.directory_vote_pending_merge (
  merge_id uuid primary key default gen_random_uuid(),
  anon_user_id uuid not null references auth.users(id) on delete cascade,
  target_email_hash text not null check (target_email_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);
create index directory_vote_pending_merge_anon on public.directory_vote_pending_merge(anon_user_id);
create index directory_vote_pending_merge_expires on public.directory_vote_pending_merge(expires_at) where used_at is null;
alter table public.directory_vote_pending_merge enable row level security;
revoke all on public.directory_vote_pending_merge from anon, authenticated;

create function public.directory_vote_target_user_for_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from auth.users u
  where u.email is not null
    and lower(trim(u.email)) = lower(trim(p_email))
    and u.email_confirmed_at is not null
  limit 1;
$$;
revoke all on function public.directory_vote_target_user_for_email(text) from public, anon, authenticated;
grant execute on function public.directory_vote_target_user_for_email(text) to service_role;

create function public.directory_vote_pending_merge_create(
  p_anon_user_id uuid,
  p_target_email_hash text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_merge_id uuid;
begin
  if p_anon_user_id is null or p_target_email_hash is null
    or p_target_email_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid pending merge' using errcode = '22023';
  end if;
  if not exists (
    select 1 from auth.users u
    where u.id = p_anon_user_id and coalesce(u.is_anonymous, false)
  ) then
    raise exception 'Invalid anonymous voter' using errcode = '42501';
  end if;

  update public.directory_vote_pending_merge
  set used_at = clock_timestamp()
  where anon_user_id = p_anon_user_id
    and used_at is null
    and expires_at > clock_timestamp();

  insert into public.directory_vote_pending_merge(anon_user_id, target_email_hash, expires_at)
  values (p_anon_user_id, p_target_email_hash, clock_timestamp() + interval '1 hour')
  returning merge_id into new_merge_id;

  return new_merge_id;
end;
$$;
revoke all on function public.directory_vote_pending_merge_create(uuid, text) from public, anon, authenticated;
grant execute on function public.directory_vote_pending_merge_create(uuid, text) to service_role;

create function public.directory_merge_anonymous_votes(
  p_merge_id uuid,
  p_target_user_id uuid,
  p_target_email_hash text
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  pending_row public.directory_vote_pending_merge%rowtype;
  changes_last_hour integer;
  moved integer := 0;
  vote_row record;
begin
  if p_merge_id is null or p_target_user_id is null
    or p_target_email_hash is null or p_target_email_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid merge request' using errcode = '22023';
  end if;

  select * into pending_row
  from public.directory_vote_pending_merge m
  where m.merge_id = p_merge_id
  for update;

  if not found or pending_row.used_at is not null then
    raise exception 'Merge already used' using errcode = '42501';
  end if;
  if pending_row.expires_at <= clock_timestamp() then
    raise exception 'Merge expired' using errcode = '42501';
  end if;
  if not exists (
    select 1 from auth.users u
    where u.id = pending_row.anon_user_id and coalesce(u.is_anonymous, false)
  ) then
    raise exception 'Invalid anonymous voter' using errcode = '42501';
  end if;
  if not exists (
    select 1 from auth.users u
    where u.id = p_target_user_id and u.email_confirmed_at is not null
  ) then
    raise exception 'Verified account required' using errcode = '42501';
  end if;
  if p_target_user_id = pending_row.anon_user_id then
    raise exception 'Invalid merge target' using errcode = '42501';
  end if;

  if p_target_email_hash is distinct from pending_row.target_email_hash then
    raise exception 'Merge email mismatch' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('directory-vote-user:' || p_target_user_id::text, 0));

  select count(*)::integer into changes_last_hour
  from public.directory_vote_change_log
  where user_id = p_target_user_id and changed_at > clock_timestamp() - interval '1 hour';

  for vote_row in
    select v.listing_id
    from public.directory_votes v
    where v.user_id = pending_row.anon_user_id
    order by v.listing_id
  loop
    exit when changes_last_hour + moved >= 30;
    if not public.directory_vote_target_exists(vote_row.listing_id) then
      continue;
    end if;
    if exists (
      select 1 from public.directory_votes t
      where t.user_id = p_target_user_id and t.listing_id = vote_row.listing_id
    ) then
      delete from public.directory_votes v
      where v.user_id = pending_row.anon_user_id and v.listing_id = vote_row.listing_id;
      continue;
    end if;

    insert into public.directory_votes(listing_id, user_id)
    values (vote_row.listing_id, p_target_user_id)
    on conflict on constraint directory_votes_pkey do nothing;

    if found then
      insert into public.directory_vote_change_log(user_id, listing_id)
      values (p_target_user_id, vote_row.listing_id);
      moved := moved + 1;
      delete from public.directory_votes v
      where v.user_id = pending_row.anon_user_id and v.listing_id = vote_row.listing_id;
    end if;
  end loop;

  update public.directory_vote_pending_merge
  set used_at = clock_timestamp()
  where merge_id = p_merge_id;

  return moved;
end;
$$;
revoke all on function public.directory_merge_anonymous_votes(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.directory_merge_anonymous_votes(uuid, uuid, text) to service_role;

comment on function public.directory_merge_anonymous_votes(uuid, uuid, text) is
  'One-time move of anonymous directory votes onto a verified account after email confirmation in the same browser.';

commit;