begin;

create or replace function public.directory_insert_managed_from_legacy(
  p_legacy_id text,
  p_payload jsonb,
  p_published boolean
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare result uuid;
begin
  insert into public.directory_managed_listings(owner_id, legacy_id, draft, published, status, published_at)
  values (
    auth.uid(),
    p_legacy_id,
    p_payload,
    case when p_published then p_payload end,
    case when p_published then 'approved' else 'draft' end,
    case when p_published then now() end
  )
  returning id into result;
  return result;
end;
$$;
revoke all on function public.directory_insert_managed_from_legacy(text, jsonb, boolean) from public, anon, authenticated;

create or replace function public.directory_claim_listing(p_legacy_id text) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry public.directory_legacy_claims;
  result uuid;
  email text;
begin
  select lower(u.email) into email from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null;
  if email is null then raise exception 'Sign in with a verified email first'; end if;
  select * into entry
  from public.directory_legacy_claims
  where legacy_id = p_legacy_id and lower(contact_email) = email
  for update;
  if not found then
    raise exception 'Ownership could not be verified. Use the listing contact email or contact support.';
  end if;
  select id into result
  from public.directory_managed_listings
  where legacy_id = p_legacy_id and owner_id = auth.uid();
  if result is not null then return result; end if;
  if exists (
    select 1 from public.directory_managed_listings where legacy_id = p_legacy_id and owner_id <> auth.uid()
  ) then
    raise exception 'This listing is already managed by another account.';
  end if;
  return public.directory_insert_managed_from_legacy(entry.legacy_id, entry.payload, entry.published);
end;
$$;

create or replace function public.directory_auto_claim_listings()
returns table(listing_id uuid, title text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry public.directory_legacy_claims;
  email text;
  new_id uuid;
begin
  select lower(u.email) into email from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null;
  if email is null then raise exception 'Sign in with a verified email first'; end if;
  for entry in
    select * from public.directory_legacy_claims where lower(contact_email) = email order by legacy_id
  loop
    if exists (
      select 1 from public.directory_managed_listings where legacy_id = entry.legacy_id
    ) then
      continue;
    end if;
    new_id := public.directory_insert_managed_from_legacy(entry.legacy_id, entry.payload, entry.published);
    listing_id := new_id;
    title := trim(both from coalesce(entry.payload->>'title', ''));
    if title = '' then title := 'Your listing'; end if;
    return next;
  end loop;
end;
$$;

revoke all on function public.directory_auto_claim_listings() from public, anon;
grant execute on function public.directory_auto_claim_listings() to authenticated;

commit;