begin;

create table public.directory_partnership_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.directory_managed_listings(id) on delete cascade,
  public_listing_id text not null,
  requester_name text not null,
  requester_email text not null,
  requester_company text not null default '',
  message text not null,
  status text not null default 'new' check (status in ('new','read','accepted','declined')),
  owner_reply text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index directory_partnership_listing on public.directory_partnership_requests(listing_id, created_at desc);
create index directory_partnership_unread on public.directory_partnership_requests(listing_id) where status = 'new';

alter table public.directory_partnership_requests enable row level security;
revoke all on public.directory_partnership_requests from anon, authenticated;

create or replace function public.directory_clean_payload(p_kind text, p_payload jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare result jsonb := '{}'::jsonb; field text; fields text[]; value text;
begin
  if jsonb_typeof(p_payload) <> 'object' or p_payload is null then raise exception 'Invalid form data'; end if;
  fields := case p_kind
    when 'listing' then array[
      'title','description','website','category','location','special_offer','image',
      'partner_offer_title','partner_offer_description','partner_offer_url','partner_offer_code'
    ]
    when 'update' then array['title','body','url']
    when 'affiliate' then array['program_url','network','commission','cookie_window','countries','terms','contact_email']
    else null end;
  if fields is null then raise exception 'Invalid submission type'; end if;
  foreach field in array fields loop
    if p_payload ? field and jsonb_typeof(p_payload->field) <> 'string' then raise exception 'Invalid field: %', field; end if;
    value := trim(coalesce(p_payload->>field, ''));
    if field = 'partner_offer_description' and length(value) > 280 then raise exception 'Partner offer description must be at most 280 characters'; end if;
    if field = 'partner_offer_title' and length(value) > 120 then raise exception 'Partner offer title too long'; end if;
    if field = 'partner_offer_code' and length(value) > 64 then raise exception 'Promo code too long'; end if;
    if field not in ('partner_offer_description','partner_offer_title','partner_offer_code') and length(value) > 4000 then
      raise exception 'Field too long: %', field;
    end if;
    result := result || jsonb_build_object(field, value);
  end loop;
  if p_kind in ('listing','update') and (length(result->>'title') < 2 or length(result->>'title') > 120) then raise exception 'Title must be 2–120 characters'; end if;
  if p_kind = 'listing' then
    if length(result->>'description') < 20 then raise exception 'Description must be at least 20 characters'; end if;
    if length(result->>'category') < 2 then raise exception 'Choose a category'; end if;
    if result->>'website' !~ '^https://[a-zA-Z0-9][^[:space:]]+$' then raise exception 'Enter a valid HTTPS website URL'; end if;
    if result->>'image' <> '' and result->>'image' !~ '^(https://[a-zA-Z0-9][^[:space:]]+|/images/[a-zA-Z0-9/_-]+|storage://[a-f0-9/-]+)\.webp$' then raise exception 'Logo must be a WebP image'; end if;
    if (result->>'partner_offer_title' <> '' or result->>'partner_offer_description' <> '' or result->>'partner_offer_url' <> '' or result->>'partner_offer_code' <> '') then
      if length(result->>'partner_offer_title') < 2 then raise exception 'Partner offer needs a short title'; end if;
      if result->>'partner_offer_url' !~ '^https?://[a-zA-Z0-9][^[:space:]]+$' then raise exception 'Partner offer URL must be HTTP or HTTPS'; end if;
    end if;
    if result->>'partner_offer_url' <> '' and result->>'partner_offer_url' !~ '^https?://[a-zA-Z0-9][^[:space:]]+$' then
      raise exception 'Partner offer URL must be HTTP or HTTPS';
    end if;
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

create function public.directory_submit_partnership_request(
  p_public_listing_id text,
  p_name text,
  p_email text,
  p_company text,
  p_message text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare listing public.directory_managed_listings; request_id uuid;
begin
  if length(trim(p_name)) < 2 or length(p_name) > 120 then raise exception 'Invalid name'; end if;
  if p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(p_email) > 254 then raise exception 'Invalid email'; end if;
  if length(p_company) > 200 then raise exception 'Company name too long'; end if;
  if length(trim(p_message)) < 10 or length(p_message) > 2000 then raise exception 'Message must be 10–2000 characters'; end if;
  select * into listing from public.directory_managed_listings
  where published is not null and status = 'approved'
    and (legacy_id = p_public_listing_id or id::text = p_public_listing_id);
  if not found then raise exception 'Listing unavailable'; end if;
  insert into public.directory_partnership_requests(
    listing_id, public_listing_id, requester_name, requester_email, requester_company, message
  ) values (
    listing.id,
    coalesce(listing.legacy_id, listing.id::text),
    trim(p_name), lower(trim(p_email)), trim(p_company), trim(p_message)
  ) returning id into request_id;
  return request_id;
end;
$$;

create function public.directory_owner_partnership_requests(p_listing_id uuid default null)
returns table(
  id uuid,
  listing_id uuid,
  public_listing_id text,
  listing_title text,
  requester_name text,
  requester_email text,
  requester_company text,
  message text,
  status text,
  owner_reply text,
  read_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select r.id, r.listing_id, r.public_listing_id, l.published->>'title', r.requester_name, r.requester_email,
    r.requester_company, r.message, r.status, r.owner_reply, r.read_at, r.created_at, r.updated_at
  from public.directory_partnership_requests r
  join public.directory_managed_listings l on l.id = r.listing_id
  where l.owner_id = (select auth.uid())
    and (p_listing_id is null or r.listing_id = p_listing_id)
  order by r.created_at desc;
$$;

create function public.directory_owner_partnership_unread_count()
returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.directory_partnership_requests r
  join public.directory_managed_listings l on l.id = r.listing_id
  where l.owner_id = (select auth.uid()) and r.status = 'new';
$$;

create function public.directory_respond_partnership_request(
  p_request_id uuid,
  p_listing_id uuid,
  p_status text,
  p_reply text default ''
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if p_status not in ('read','accepted','declined') then raise exception 'Invalid status'; end if;
  if length(p_reply) > 2000 then raise exception 'Reply too long'; end if;
  if p_status in ('accepted','declined') and length(trim(p_reply)) < 2 then raise exception 'Add a short reply'; end if;
  update public.directory_partnership_requests r set
    status = p_status,
    owner_reply = case when p_status in ('accepted','declined') then trim(p_reply) else owner_reply end,
    read_at = case when status = 'new' and p_status in ('read','accepted','declined') then coalesce(read_at, now()) else read_at end,
    updated_at = now()
  from public.directory_managed_listings l
  where r.id = p_request_id and r.listing_id = p_listing_id and l.id = r.listing_id and l.owner_id = auth.uid();
  if not found then raise exception 'Request unavailable'; end if;
end;
$$;

create function public.directory_listing_accepts_partnerships(p_public_listing_id text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.directory_managed_listings l
    where l.published is not null and l.status = 'approved'
      and (l.legacy_id = p_public_listing_id or l.id::text = p_public_listing_id)
  );
$$;

revoke all on function public.directory_submit_partnership_request(text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.directory_owner_partnership_requests(uuid) from public, anon;
revoke all on function public.directory_owner_partnership_unread_count() from public, anon;
revoke all on function public.directory_respond_partnership_request(uuid,uuid,text,text) from public, anon;
revoke all on function public.directory_listing_accepts_partnerships(text) from public;

grant execute on function public.directory_submit_partnership_request(text,text,text,text,text) to service_role;
grant execute on function public.directory_owner_partnership_requests(uuid) to authenticated;
grant execute on function public.directory_owner_partnership_unread_count() to authenticated;
grant execute on function public.directory_respond_partnership_request(uuid,uuid,text,text) to authenticated;
grant execute on function public.directory_listing_accepts_partnerships(text) to anon, authenticated;

commit;