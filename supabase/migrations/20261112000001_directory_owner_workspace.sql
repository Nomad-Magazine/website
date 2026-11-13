begin;

create table public.directory_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.directory_admins enable row level security;
revoke all on public.directory_admins from anon, authenticated;
insert into public.directory_admins(user_id)
select id from auth.users where lower(email) = 'hey@nomadgossip.com' and email_confirmed_at is not null;

create function public.directory_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.directory_admins where user_id = auth.uid());
$$;
revoke all on function public.directory_is_admin() from public, anon;
grant execute on function public.directory_is_admin() to authenticated;

create table public.directory_legacy_claims (
  legacy_id text primary key,
  contact_email text not null,
  payload jsonb not null,
  published boolean not null default false
);
alter table public.directory_legacy_claims enable row level security;
revoke all on public.directory_legacy_claims from anon, authenticated;

create table public.directory_managed_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text unique,
  draft jsonb not null,
  published jsonb,
  status text not null default 'draft' check (status in ('draft','pending','approved','rejected')),
  review_notes text not null default '',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index directory_managed_owner on public.directory_managed_listings(owner_id);
create index directory_managed_review on public.directory_managed_listings(status);
alter table public.directory_managed_listings enable row level security;
revoke all on public.directory_managed_listings from anon, authenticated;
grant select on public.directory_managed_listings to authenticated;
create policy "Owners and reviewers read listings" on public.directory_managed_listings for select to authenticated
using (owner_id = (select auth.uid()) or (select public.directory_is_admin()));

-- Preserve existing account submissions without trusting their old, owner-writable status.
-- Previously approved live SmartSuite entries are restored through verified legacy claims.
do $$
begin
  if to_regclass('public.directory_submissions') is not null then
    execute $backfill$
      insert into public.directory_managed_listings(id,owner_id,draft,status,review_notes,created_at,updated_at)
      select id,user_id,jsonb_build_object(
        'title',company_name,'description',coalesce(full_description,short_description,''),
        'website',coalesce(website_url,''),'category',coalesce(category,'Other'),
        'location',coalesce(locations,''),'special_offer','',
        'image',case when logo_url ~ '^https://[^[:space:]]+\.webp$' then logo_url else '' end
      ),'pending',coalesce(admin_notes,''),coalesce(created_at,now()),coalesce(updated_at,now())
      from public.directory_submissions
      on conflict(id) do nothing
    $backfill$;
  end if;
end;
$$;

create table public.directory_owner_posts (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.directory_managed_listings(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('update','affiliate')),
  draft jsonb not null,
  published jsonb,
  status text not null default 'draft' check (status in ('draft','pending','approved','rejected','withdrawn')),
  review_notes text not null default '',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index directory_posts_owner on public.directory_owner_posts(owner_id, kind);
create index directory_posts_listing on public.directory_owner_posts(listing_id);
create index directory_posts_review on public.directory_owner_posts(status);
alter table public.directory_owner_posts enable row level security;
revoke all on public.directory_owner_posts from anon, authenticated;
grant select on public.directory_owner_posts to authenticated;
create policy "Owners and reviewers read posts" on public.directory_owner_posts for select to authenticated
using (owner_id = (select auth.uid()) or (select public.directory_is_admin()));

create function public.directory_clean_payload(p_kind text, p_payload jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare result jsonb := '{}'::jsonb; field text; fields text[]; value text;
begin
  if jsonb_typeof(p_payload) <> 'object' or p_payload is null then raise exception 'Invalid form data'; end if;
  fields := case p_kind
    when 'listing' then array['title','description','website','category','location','special_offer','image']
    when 'update' then array['title','body','url']
    when 'affiliate' then array['program_url','network','commission','cookie_window','countries','terms','contact_email']
    else null end;
  if fields is null then raise exception 'Invalid submission type'; end if;
  foreach field in array fields loop
    if p_payload ? field and jsonb_typeof(p_payload->field) <> 'string' then raise exception 'Invalid field: %', field; end if;
    value := trim(coalesce(p_payload->>field, ''));
    if length(value) > 4000 then raise exception 'Field too long: %', field; end if;
    result := result || jsonb_build_object(field, value);
  end loop;
  if p_kind in ('listing','update') and (length(result->>'title') < 2 or length(result->>'title') > 120) then raise exception 'Title must be 2–120 characters'; end if;
  if p_kind = 'listing' then
    if length(result->>'description') < 20 then raise exception 'Description must be at least 20 characters'; end if;
    if length(result->>'category') < 2 then raise exception 'Choose a category'; end if;
    if result->>'website' !~ '^https://[a-zA-Z0-9][^[:space:]]+$' then raise exception 'Enter a valid HTTPS website URL'; end if;
    if result->>'image' <> '' and result->>'image' !~ '^(https://[a-zA-Z0-9][^[:space:]]+|/images/[a-zA-Z0-9/_-]+|storage://[a-f0-9/-]+)\.webp$' then raise exception 'Logo must be a WebP image'; end if;
  elsif p_kind = 'update' then
    if length(result->>'body') < 20 then raise exception 'Update must be at least 20 characters'; end if;
    if result->>'url' <> '' and result->>'url' !~ '^https://[a-zA-Z0-9][^[:space:]]+$' then raise exception 'Use an HTTPS link'; end if;
  else
    if result->>'program_url' !~ '^https://[a-zA-Z0-9][^[:space:]]+$' then raise exception 'Enter the HTTPS affiliate programme URL'; end if;
    if length(result->>'commission') < 2 or length(result->>'terms') < 20 then raise exception 'Provide commission details and programme terms'; end if;
    if result->>'contact_email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Provide a contact email'; end if;
  end if;
  return result;
end;
$$;
revoke all on function public.directory_clean_payload(text,jsonb) from public, anon, authenticated;

create function public.directory_claim_listing(p_legacy_id text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare entry public.directory_legacy_claims; result uuid; email text;
begin
  select lower(u.email) into email from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null;
  if email is null then raise exception 'Sign in with a verified email first'; end if;
  select * into entry from public.directory_legacy_claims where legacy_id = p_legacy_id and lower(contact_email) = email for update;
  if not found then raise exception 'Ownership could not be verified. Use the listing contact email or contact support.'; end if;
  select id into result from public.directory_managed_listings where legacy_id = p_legacy_id and owner_id = auth.uid();
  if result is not null then return result; end if;
  insert into public.directory_managed_listings(owner_id, legacy_id, draft, published, status, published_at)
  values(auth.uid(), entry.legacy_id, entry.payload, case when entry.published then entry.payload end,
    case when entry.published then 'approved' else 'draft' end, case when entry.published then now() end)
  returning id into result;
  return result;
end;
$$;

create function public.directory_save_listing(p_id uuid, p_payload jsonb, p_submit boolean default false, p_version integer default 0) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid; clean jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  clean := public.directory_clean_payload('listing', p_payload);
  if clean->>'image' like 'storage://%' and not exists(
    select 1 from storage.objects where bucket_id='directory-owner-logos' and name=substring(clean->>'image' from 11)
      and (storage.foldername(name))[1]=auth.uid()::text
  ) then raise exception 'Logo unavailable'; end if;
  if p_id is null then
    if (select count(*) from public.directory_managed_listings where owner_id = auth.uid()) >= 25 then raise exception 'Listing limit reached. Contact support.'; end if;
    insert into public.directory_managed_listings(owner_id,draft,status)
    values(auth.uid(),clean,case when p_submit then 'pending' else 'draft' end) returning id into result;
  else
    update public.directory_managed_listings set draft=clean, status=case when p_submit then 'pending' else 'draft' end,
      version=version+1, review_notes='', updated_at=now()
    where id=p_id and owner_id=auth.uid() and version=p_version returning id into result;
    if result is null then raise exception 'Listing unavailable or changed in another tab. Reload and try again.'; end if;
  end if;
  return result;
end;
$$;

create function public.directory_save_post(p_id uuid, p_listing_id uuid, p_kind text, p_payload jsonb, p_submit boolean default false, p_version integer default 0) returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid; clean jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.directory_managed_listings where id=p_listing_id and owner_id=auth.uid()) then raise exception 'Listing unavailable'; end if;
  if p_kind not in ('update','affiliate') then raise exception 'Invalid submission type'; end if;
  clean := public.directory_clean_payload(p_kind,p_payload);
  if p_id is null then
    if (select count(*) from public.directory_owner_posts where owner_id=auth.uid() and created_at > now()-interval '1 day') >= 20 then raise exception 'Daily submission limit reached'; end if;
    insert into public.directory_owner_posts(owner_id,listing_id,kind,draft,status)
    values(auth.uid(),p_listing_id,p_kind,clean,case when p_submit then 'pending' else 'draft' end) returning id into result;
  else
    update public.directory_owner_posts set draft=clean,status=case when p_submit then 'pending' else 'draft' end,
      version=version+1,review_notes='',updated_at=now()
    where id=p_id and owner_id=auth.uid() and listing_id=p_listing_id and kind=p_kind and version=p_version returning id into result;
    if result is null then raise exception 'Submission unavailable or changed in another tab. Reload and try again.'; end if;
  end if;
  return result;
end;
$$;

create function public.directory_withdraw_post(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.directory_owner_posts set status='withdrawn',published=null,updated_at=now(),version=version+1 where id=p_id and owner_id=auth.uid();
  if not found then raise exception 'Submission unavailable'; end if;
end;
$$;

create function public.directory_review(p_kind text,p_id uuid,p_approve boolean,p_notes text,p_version integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.directory_is_admin() then raise exception 'Reviewer access required'; end if;
  if length(p_notes) > 2000 then raise exception 'Review note too long'; end if;
  if p_kind='listing' then
    update public.directory_managed_listings set status=case when p_approve then 'approved' else 'rejected' end,
      published=case when p_approve then draft else published end, published_at=case when p_approve then now() else published_at end,
      review_notes=p_notes,updated_at=now(),version=version+1 where id=p_id and status='pending' and version=p_version;
  elsif p_kind in ('update','affiliate') then
    if p_approve and p_kind='update' and not exists(
      select 1 from public.directory_owner_posts p join public.directory_managed_listings l on l.id=p.listing_id where p.id=p_id and l.published is not null
    ) then raise exception 'Approve the listing before publishing its updates'; end if;
    update public.directory_owner_posts set status=case when p_approve then 'approved' else 'rejected' end,
      published=case when p_approve and kind='update' then draft else published end,
      published_at=case when p_approve then now() else published_at end,review_notes=p_notes,updated_at=now(),version=version+1
      where id=p_id and kind=p_kind and status='pending' and version=p_version;
  else raise exception 'Invalid review type'; end if;
  if not found then raise exception 'Submission already reviewed or changed. Reload the review queue.'; end if;
end;
$$;

create function public.directory_public_listings() returns table(id text,payload jsonb)
language sql stable security definer set search_path = '' as $$
  select coalesce(l.legacy_id,l.id::text),l.published from public.directory_managed_listings l where l.published is not null order by l.created_at;
$$;
create function public.directory_public_updates() returns table(id uuid,listing_id text,listing_title text,payload jsonb,published_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id,coalesce(l.legacy_id,l.id::text),l.published->>'title',p.published,p.published_at
  from public.directory_owner_posts p join public.directory_managed_listings l on l.id=p.listing_id
  where p.kind='update' and p.published is not null and l.published is not null order by p.published_at desc limit 100;
$$;

revoke all on function public.directory_claim_listing(text), public.directory_save_listing(uuid,jsonb,boolean,integer),
 public.directory_save_post(uuid,uuid,text,jsonb,boolean,integer), public.directory_withdraw_post(uuid),
 public.directory_review(text,uuid,boolean,text,integer) from public,anon;
grant execute on function public.directory_claim_listing(text), public.directory_save_listing(uuid,jsonb,boolean,integer),
 public.directory_save_post(uuid,uuid,text,jsonb,boolean,integer), public.directory_withdraw_post(uuid),
 public.directory_review(text,uuid,boolean,text,integer) to authenticated;
revoke all on function public.directory_public_listings(),public.directory_public_updates() from public;
grant execute on function public.directory_public_listings(),public.directory_public_updates() to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('directory-owner-logos','directory-owner-logos',true,2097152,array['image/webp']);
create policy "Owners upload immutable WebP logos" on storage.objects for insert to authenticated
with check(bucket_id='directory-owner-logos' and (storage.foldername(name))[1]=(select auth.uid())::text and lower(storage.extension(name))='webp');

comment on table public.directory_legacy_claims is 'Private trusted contact mapping, populated by the import script. Never expose contact emails to claimants.';
comment on table public.directory_owner_posts is 'Affiliate terms stay private even after approval. Only approved update payloads are exposed by the public RPC.';
commit;
