begin;

-- Public listing IDs only; no legacy contacts or owner data are copied here.
create table public.directory_legacy_vote_targets (listing_id text primary key);
alter table public.directory_legacy_vote_targets enable row level security;
revoke all on public.directory_legacy_vote_targets from anon, authenticated;
insert into public.directory_legacy_vote_targets(listing_id) values
  ('655f34669bac86d0f943d777'),
  ('655f34669bac86d0f943d793'),
  ('655f34669bac86d0f943d7a8'),
  ('655f34679bac86d0f943da5a'),
  ('655f3e03b70314e077fe8f5a'),
  ('655f3e03b70314e077fe8f5b'),
  ('655f3e03b70314e077fe8f5c'),
  ('655f76538779ef70a3a1736b'),
  ('655f7bb3e8c7214499517c0d'),
  ('6565281c4c8815ade26c5247'),
  ('6565f68ed4c2f8e720cdede3'),
  ('657f856b7eb8145e6a1cf9aa'),
  ('66a613a7966030f11d116a73'),
  ('66a6152cea7b6b05a824a6e0'),
  ('66a6166b797d4f913b64abe9'),
  ('6773ed769ff551d30130a77e'),
  ('6773f5197e0a8553a063faa8'),
  ('67741b5ac3e8ae68a41c751b'),
  ('67e581f6ad6b8381b2b4b6d0'),
  ('67e58262b1702d6bc713a53d'),
  ('67e582db1f229a9d1645ba37'),
  ('67e582db1f229a9d1645ba38'),
  ('67e582db1f229a9d1645ba39'),
  ('67e582db1f229a9d1645ba3a'),
  ('67e582db1f229a9d1645ba3b'),
  ('67e582db1f229a9d1645ba3c'),
  ('67e582db1f229a9d1645ba3d'),
  ('67e582db1f229a9d1645ba43'),
  ('67e582db1f229a9d1645ba45'),
  ('67e58e9797d5bc0f5c2c1692'),
  ('67e592877b66859b998be2dc'),
  ('67e5933c5bc7c638c8db3158'),
  ('67e59345fa3aa3ceb82402e8'),
  ('67e5947643d85b86a426441a'),
  ('67e5963699f083857445ba2a'),
  ('67e5964b79f7e74ebf605998'),
  ('67e597481dd60da06b60599a'),
  ('67e59764ebd46aa13ae0a55c'),
  ('67e59768a466d1d03d13a5f1'),
  ('67e59cc186b1aab0b9413151'),
  ('67e5a0253e5f7145b47f1339'),
  ('67e5a141325343fdc804c8e9'),
  ('67e5b0fe84485a5be528d337'),
  ('67e5b15e780f33b141b1869b'),
  ('67e5b1bdf4ecf1227c2402e8'),
  ('67e5b224f32367220c748924'),
  ('67e9b52ca2a0bf67e26cb4d9'),
  ('67eab3c625c624efaba7335e'),
  ('67eeb1b8fad51bd4893323ef'),
  ('67ffd4a49461b9b1feb40466'),
  ('68224470c1999ccfee7b8a10'),
  ('682bbd24fbc3e26b0f8dfcf7'),
  ('68497bfc87ef01ac58f35391'),
  ('68542eb83f4fe6c6136874ad'),
  ('68571c711193d4bf3ac176c3'),
  ('68571c711193d4bf3ac176c4'),
  ('68571c711193d4bf3ac176c5'),
  ('68571c711193d4bf3ac176c7'),
  ('68571c711193d4bf3ac176ca'),
  ('68571c711193d4bf3ac176cb'),
  ('68571c711193d4bf3ac176cc'),
  ('68571c711193d4bf3ac176cd'),
  ('68571c711193d4bf3ac176ce'),
  ('68571c711193d4bf3ac176cf'),
  ('68571c711193d4bf3ac176d0'),
  ('68571c711193d4bf3ac176d2'),
  ('68571c711193d4bf3ac176d3'),
  ('68571c711193d4bf3ac176d4'),
  ('686136e7b4a6f12fedba2393'),
  ('68614b88b570ca8607f1ee4a'),
  ('687a4b6306b813b36ac66253'),
  ('687e25051dfb0931ceb7a58c'),
  ('688853390c69eadfcbf3c554'),
  ('6888a04b7db2b8b0c6b21eab'),
  ('689080f9e0793277a898eca4'),
  ('6891465a5550715e77c09c0b'),
  ('68917ac67f49b40a53bfec86'),
  ('689e34e723650bac0dcd621f'),
  ('68a1aa9811d1fdd3047f8776'),
  ('68a2e438daeaf52dbb626eb3'),
  ('68ac4264a4f74a02c7ee8796'),
  ('68b00eb06aee0ca836f5056a'),
  ('68b19eafdac2f3940664a62e'),
  ('68b5d05831349d1cba458b3f'),
  ('68b848368713584d609dbce8'),
  ('68ba1668856bb0d4436c179f'),
  ('68c2e0487f505b69e1515f1a'),
  ('68c34dea1361f17a1003aab0'),
  ('68c3f7fcd93f167477286abc'),
  ('68c58019665944c00a97ca89'),
  ('68c68e23a5a443a2ec8332b6'),
  ('68c856e186ee6a5dae7bad8b'),
  ('68c8d7235114c4e60c0f6fd5'),
  ('68cd36c38c2c5c0ede12c7de'),
  ('68cdd491b3457483cf12c7de'),
  ('68d16c2771168e207eb1e6e5'),
  ('68d1a0e6dc3481ce9e1c9a43'),
  ('68d5de87108084c473300db5'),
  ('68dce72e661bdff3fd5cbd4d'),
  ('68e3eee32b6351712f134dce'),
  ('68e3f751f48d20e9c9773e83'),
  ('68e4d372ddf15e4d2f0434ae'),
  ('68e4df2230eb4c5a249f9b67'),
  ('68ecc38f4b28989276eaca1b'),
  ('68eeea79b55470dfa4306f45'),
  ('68ef77e7df85edffc55483b2'),
  ('68efb861417b3f2b09552228'),
  ('68f04ebd6832bc26f58aa7b1'),
  ('68f298fa6fd19ceebc00a7a6'),
  ('68f8d8189921e19c96d94ade'),
  ('68fa3eb0a1387f5e8d0c865c'),
  ('68ff1ddb081061b36062cf50'),
  ('6902344d48b584837f8a506f'),
  ('6903255ddade21fcc6b48397'),
  ('6903a38ba73dec069bb64f8b'),
  ('690a4e04bd605661fd087af3'),
  ('690ed4a7ded445a7217edab5'),
  ('690f01768e3eab848a105f84'),
  ('690f5ad61eb2a3b7280fa9eb'),
  ('69145a51a3e05a256f6e0f25'),
  ('69174415f8bc35050f2daa97'),
  ('691adc41952abc9be15b12b8'),
  ('691b56dbc7537477b4dd235f'),
  ('691bea34bf90dfda24fbdc57'),
  ('691c85a57e3b3231aa18de43'),
  ('692019be37446d669d8d2b22'),
  ('692396acf0da83bbdcd575d8'),
  ('692687905b035adbb442972d'),
  ('69271bd87b8f441dd30eb29e'),
  ('692d5acf1d0911fb4685e834'),
  ('692d98d4a1cd9b6cbc3b9c55'),
  ('692e00909f969d7d0dc7841c'),
  ('692e013b19a1d107469f089a'),
  ('692e173016de25c42b195210'),
  ('693087a820a3f25e8a5d4bb7'),
  ('69319d1601e0bdde9a9928b8'),
  ('693ac1dbcd28c0b0c1ac15ae'),
  ('693ac296e3c09432896211d9'),
  ('693c0afcf65a3ac8401487fd'),
  ('6944145dbf4adf784fb6b021'),
  ('69442f494c654b1ac093b167'),
  ('6945e242aec4a48e925f0e25'),
  ('69494c4493266071284e4034'),
  ('694a8d966a301fbe7fc32be8'),
  ('694ad0e1941f74dbbefe1c3c'),
  ('6957957ac3d2ba1aa4f190ef'),
  ('695d44977fdc786ba415d094'),
  ('696893af3bf4e6a842ce96ee'),
  ('6971c6ce05f0cc0f6f6c1ff7'),
  ('697370896db035f55347c77e'),
  ('697743d30b11c66309f1a242'),
  ('697b29a131aefa76304ccfd0'),
  ('697be62606008ebf80e88ceb'),
  ('697cd9919b7e75719da53ccc'),
  ('6981bbc8e0089d27c2c53861'),
  ('698d2e6aebbb23935324f395'),
  ('698df0277ffa4e8e2ef9b701'),
  ('6997f905dea789834c9dfa52'),
  ('699b145b5468296803ec8dad'),
  ('699c620bcf62299941fa57a0'),
  ('699dc911971229620b8a4a9f'),
  ('699dca118569bece96dab637'),
  ('699dcacee9cc16f43600edfc'),
  ('699dcbb11cd790630ee69265'),
  ('699ecb92ed362d3e7f723d6a'),
  ('69a767f00466f8918a25f888'),
  ('69bc05abf493f64d808b1869'),
  ('69c116509d98f5352717034e'),
  ('69c5284860f9a6266445e19b'),
  ('6a0d768aed431283494822ec'),
  ('6a0ec0233bcead91869b2839'),
  ('6a0f2e4f8698d89c76d070e5'),
  ('6a2683d4643b44fd230d35c5'),
  ('6a2fe431e953436427a8e8e5'),
  ('6a4400d13051162ff72bcfd8'),
  ('6a546b99f2a8f4177819df73'),
  ('6a571a080e9eb8f4673d2800'),
  ('6a57d45b81c8e61cb273c3b9'),
  ('6a5f8feb2bd1736131b44e1f'),
  ('6a6463567fbdfc79a3eb6d4c'),
  ('6a675a0c59af1d6b69b74797'),
  ('6a67bac5998e4b5f7c7a0935'),
  ('6a6db8a0e8a44fe5c6da869a'),
  ('6a703f159cd1b405d03887a6'),
  ('6a705fb39d0de889e618650b'),
  ('6a733e6c347a141f445a8bad'),
  ('6a747643260886689bc769a3'),
  ('6a7b8305ccc80c2cb03af20f'),
  ('6a7d07e07358f492c13af1fc'),
  ('6a7dfb98ebc5f677540182f2'),
  ('6a7f81b0f0a596f6cf7e1557'),
  ('6a8eb2d7d5e88dda6a1d0911'),
  ('6a9901950ecce3589a35d5c2'),
  ('6a99175ed33ef06012dfe136'),
  ('6a9960455095165d7a188fd9'),
  ('6a9e54af8c4e33d9806e7cad'),
  ('6a9fc9d0b26daab554d96735'),
  ('6aa2a626263a0c9cd2fdae67'),
  ('6aa5779beb9d0271c250bebb'),
  ('6aa815f430c8e40a3e409d5b'),
  ('6aacec0196c78d8abf674645'),
  ('6aae06c2e8a91a936846c94a'),
  ('6ab29fbc0ef1db12ac241bb8'),
  ('6ab2da6a291a5ba364aa820f'),
  ('6ab3ebd6b913275fded1360e'),
  ('6ab46f3d1f4a5b3097e075aa'),
  ('6abc7c52adfde7a9d4ebae10'),
  ('6abdbd71ba93ef887e65ed77'),
  ('6abdbe0b20c9c2d906d2434e'),
  ('6ac555ff4a2bad95eb0c35e5'),
  ('6ac5bc159c44bb531fc0d43c'),
  ('6ac65f85ee5a027a56173617'),
  ('6ac6d31dff003bc91845696d'),
  ('6ac900c5497bf9a50717a436'),
  ('6acbc0d87991a0f65bfa5f36'),
  ('6acd5d04bb3da5f974d1f2cd'),
  ('6acddf0328786f1efa364c7a'),
  ('6ace2aef6485e0e0541c2745'),
  ('6ace50e8ed4ee8d3c4789892'),
  ('6ace819f2246d3410b650c0e'),
  ('6ad253426f0d43502c24e13e'),
  ('6ad56ccd4170268b2f14b85a'),
  ('6ad667e2112e0a50358ae7e2'),
  ('6ad74bc9529f735fa0a5c947'),
  ('6ada7d6809d436404f220898'),
  ('6adc366b58ce552a8cf574f8'),
  ('6adf73f43185a828e74a0722'),
  ('6ae03739dbad4dec364f55cc'),
  ('6ae08a3c1ab8e1990ef5dbec'),
  ('6ae3881109c1fda8d7dd42b9'),
  ('6ae47db774c1b34d1f508cdb'),
  ('6ae487a4dd263b490b9c559c'),
  ('6ae502bb46c328140edd6e3c'),
  ('6ae7bd2f2eab55f68fe41aa8');

create table public.directory_votes (
  listing_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (listing_id, user_id)
);
create index directory_votes_user on public.directory_votes(user_id);
alter table public.directory_votes enable row level security;
revoke all on public.directory_votes from anon, authenticated;
grant select on public.directory_votes to authenticated;
create policy "Members read only their own votes" on public.directory_votes
  for select to authenticated using (user_id = (select auth.uid()));

create function public.directory_vote_target_exists(p_listing_id text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.directory_legacy_vote_targets where listing_id = p_listing_id)
    or exists(select 1 from public.directory_managed_listings
      where published is not null and coalesce(legacy_id,id::text) = p_listing_id);
$$;
revoke all on function public.directory_vote_target_exists(text) from public, anon, authenticated;

create function public.directory_vote_counts() returns table(listing_id text, vote_count bigint)
language sql stable security definer set search_path = '' as $$
  with counts as materialized (
    select v.listing_id,count(*) as vote_count from public.directory_votes v group by v.listing_id
  )
  select c.listing_id,c.vote_count from counts c
  where public.directory_vote_target_exists(c.listing_id) order by c.listing_id;
$$;
revoke all on function public.directory_vote_counts() from public, anon, authenticated;
grant execute on function public.directory_vote_counts() to anon, authenticated;

create function public.directory_my_votes() returns table(listing_id text)
language sql stable security invoker set search_path = '' as $$
  select v.listing_id from public.directory_votes v where v.user_id = auth.uid() order by v.listing_id;
$$;
revoke all on function public.directory_my_votes() from public, anon, authenticated;
grant execute on function public.directory_my_votes() to authenticated;

-- Set the requested state rather than toggle: retries and concurrent clicks stay idempotent.
create function public.directory_set_vote(p_listing_id text, p_voted boolean)
returns table(listing_id text, vote_count bigint, voted boolean)
language plpgsql security definer set search_path = '' as $$
declare
  member_id uuid := auth.uid();
begin
  if member_id is null or not exists(select 1 from auth.users where id = member_id and email_confirmed_at is not null) then
    raise exception 'Sign in with a verified email to vote' using errcode = '42501';
  end if;
  if p_listing_id is null or length(p_listing_id) > 100 or p_voted is null then
    raise exception 'Invalid vote' using errcode = '22023';
  end if;
  -- Also serialize counts returned by concurrent voters on the same listing.
  perform pg_advisory_xact_lock(hashtextextended('directory-vote:' || p_listing_id,0));
  if not public.directory_vote_target_exists(p_listing_id) then
    raise exception 'This listing is not published' using errcode = '22023';
  end if;
  if p_voted then
    insert into public.directory_votes(listing_id,user_id) values(p_listing_id,member_id)
      on conflict on constraint directory_votes_pkey do nothing;
  else
    delete from public.directory_votes v where v.listing_id = p_listing_id and v.user_id = member_id;
  end if;
  return query select p_listing_id,count(*),p_voted from public.directory_votes v where v.listing_id = p_listing_id;
end;
$$;
revoke all on function public.directory_set_vote(text,boolean) from public, anon, authenticated;
grant execute on function public.directory_set_vote(text,boolean) to authenticated;

comment on table public.directory_votes is 'One verified account vote per published listing. Public counts never expose voter identities.';
comment on table public.directory_legacy_vote_targets is 'Published legacy IDs from the website snapshot. Register newly published legacy IDs in a migration; approved managed listings qualify automatically.';
commit;
