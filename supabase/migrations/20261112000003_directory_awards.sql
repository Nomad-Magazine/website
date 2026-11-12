begin;

alter table public.directory_legacy_vote_targets add column title text not null default '';
update public.directory_legacy_vote_targets t set title = v.title from (values
  ('6ae7bd2f2eab55f68fe41aa8','Zenvify'),
  ('6ae502bb46c328140edd6e3c','Kilobat'),
  ('6ae487a4dd263b490b9c559c','eSIM Grab'),
  ('6ae47db774c1b34d1f508cdb','Madeira Remote Casa do Pico'),
  ('6ae3881109c1fda8d7dd42b9','Remote First Jobs'),
  ('6ae08a3c1ab8e1990ef5dbec','Brijjo'),
  ('6ae03739dbad4dec364f55cc','Mubboo Flights'),
  ('6adf73f43185a828e74a0722','Nomadr'),
  ('6adc366b58ce552a8cf574f8','Farhaven'),
  ('6ada7d6809d436404f220898','Nomad Fly'),
  ('6ad74bc9529f735fa0a5c947','Reemotee'),
  ('6ad667e2112e0a50358ae7e2','taxcyp'),
  ('6ad56ccd4170268b2f14b85a','Corelinx'),
  ('6ad253426f0d43502c24e13e','PikoeSIM'),
  ('6ace819f2246d3410b650c0e','Discover Alone'),
  ('6ace50e8ed4ee8d3c4789892','chinamapbook'),
  ('6ace2aef6485e0e0541c2745','weekendflights'),
  ('6acddf0328786f1efa364c7a','SmartStackHubPro'),
  ('6acd5d04bb3da5f974d1f2cd','Turismo La Paz'),
  ('6acbc0d87991a0f65bfa5f36','PENSIUNEA DACICA SRL'),
  ('6ac900c5497bf9a50717a436','PanExpats'),
  ('6ac6d31dff003bc91845696d','Horizon eSIM'),
  ('6ac65f85ee5a027a56173617','Cloud Residents'),
  ('6ac5bc159c44bb531fc0d43c','Goskyscout'),
  ('6ac555ff4a2bad95eb0c35e5','Get In Tune'),
  ('6abdbe0b20c9c2d906d2434e','CoWorking Days'),
  ('6abdbd71ba93ef887e65ed77','CoWorking Safari'),
  ('6abc7c52adfde7a9d4ebae10','Carry China'),
  ('6ab46f3d1f4a5b3097e075aa','NumberHub'),
  ('6ab3ebd6b913275fded1360e','Hoppin House Seoul'),
  ('6ab2da6a291a5ba364aa820f','Transita'),
  ('6ab29fbc0ef1db12ac241bb8','SimBank'),
  ('6aae06c2e8a91a936846c94a','Cosmo Local CNX'),
  ('6aacec0196c78d8abf674645','Werkplek050'),
  ('6aa815f430c8e40a3e409d5b','Adomu - Digital Nomads Sardinia'),
  ('6aa5779beb9d0271c250bebb','THE-IF'),
  ('6aa2a626263a0c9cd2fdae67','Portugal Residency Advisors'),
  ('6a9fc9d0b26daab554d96735','How to Be a Digital Nomad'),
  ('6a9e54af8c4e33d9806e7cad','GetBrazilVisa'),
  ('6a9960455095165d7a188fd9','PLACE Coworking Phuket'),
  ('6a99175ed33ef06012dfe136','Nomad Pioneers'),
  ('6a9901950ecce3589a35d5c2','Freaking Nomads'),
  ('6a8eb2d7d5e88dda6a1d0911','Aila'),
  ('6a7f81b0f0a596f6cf7e1557','Buildersnode'),
  ('6a7dfb98ebc5f677540182f2','Dora'),
  ('6a7d07e07358f492c13af1fc','The Remote Escape'),
  ('6a7b8305ccc80c2cb03af20f','DayPassGyms'),
  ('6a747643260886689bc769a3','YouChina'),
  ('6a733e6c347a141f445a8bad','FlyApricot'),
  ('6a705fb39d0de889e618650b','Pouchers'),
  ('6a703f159cd1b405d03887a6','Universal Tax Professionals'),
  ('6a6db8a0e8a44fe5c6da869a','Sparta coHome'),
  ('6a67bac5998e4b5f7c7a0935','VisaForma'),
  ('6a675a0c59af1d6b69b74797','Nomad Desk'),
  ('6a6463567fbdfc79a3eb6d4c','Freeland'),
  ('6a5f8feb2bd1736131b44e1f','Adventurekeys Surf Camp - Coworking Space - Yoga Retreat'),
  ('6a57d45b81c8e61cb273c3b9','IndepAI'),
  ('6a571a080e9eb8f4673d2800','The City Theory'),
  ('6a546b99f2a8f4177819df73','Laguna Network'),
  ('6a4400d13051162ff72bcfd8','Deeply Nomad'),
  ('6a2fe431e953436427a8e8e5','Worldly Tribe'),
  ('6a2683d4643b44fd230d35c5','Working Remotely'),
  ('6a0f2e4f8698d89c76d070e5','Find Your Coliving'),
  ('6a0ec0233bcead91869b2839','Arctic Coliving'),
  ('6a0d768aed431283494822ec','Nomad Shophouse'),
  ('69c5284860f9a6266445e19b','Nomad Love Lab'),
  ('69c116509d98f5352717034e','Cummari Sicily'),
  ('69bc05abf493f64d808b1869','Growing Together Parenting'),
  ('69a767f00466f8918a25f888','Anytime Mailbox'),
  ('699ecb92ed362d3e7f723d6a','WESPA Spaces'),
  ('699dcbb11cd790630ee69265','TheDigitalNomad Japan'),
  ('699dcacee9cc16f43600edfc','SatoriCamp (Japan)'),
  ('699dca118569bece96dab637','BaybayinHUB (Philippines)'),
  ('699dc911971229620b8a4a9f','TheDigitalNomad Asia'),
  ('699c620bcf62299941fa57a0','Digital Nomad Guide'),
  ('699b145b5468296803ec8dad','One Planet Journey'),
  ('6997f905dea789834c9dfa52','Coliving Community'),
  ('698df0277ffa4e8e2ef9b701','ProspIn'),
  ('698d2e6aebbb23935324f395','Nomads & Pirates'),
  ('6981bbc8e0089d27c2c53861','Nesting Away'),
  ('697cd9919b7e75719da53ccc','Nomads Club'),
  ('697be62606008ebf80e88ceb','Dolce Vita Coliving'),
  ('697b29a131aefa76304ccfd0','Ca''Co Casa CoLiving'),
  ('697743d30b11c66309f1a242','Genki'),
  ('697370896db035f55347c77e','Digital Nomads USA'),
  ('6971c6ce05f0cc0f6f6c1ff7','TRAppe'),
  ('696893af3bf4e6a842ce96ee','hoppswap'),
  ('695d44977fdc786ba415d094','Beetcommunity'),
  ('6957957ac3d2ba1aa4f190ef','Deutsches Komitee der AIESEC e.V.'),
  ('694ad0e1941f74dbbefe1c3c','SSBM Consulting LLC'),
  ('694a8d966a301fbe7fc32be8','TaxTrail'),
  ('69494c4493266071284e4034','Circles House'),
  ('6945e242aec4a48e925f0e25','The Center for Competitiveness and Innovation (Colombia)'),
  ('69442f494c654b1ac093b167','Casa Marianas'),
  ('6944145dbf4adf784fb6b021','MojoCoHouse'),
  ('693c0afcf65a3ac8401487fd','LATTECINO'),
  ('693ac296e3c09432896211d9','Nomad-fest.com'),
  ('693ac1dbcd28c0b0c1ac15ae','Coliving.frilingue'),
  ('69319d1601e0bdde9a9928b8','Sparrowbid.com'),
  ('693087a820a3f25e8a5d4bb7','Nomad Photographer'),
  ('692e173016de25c42b195210','Alicante Nomad Summit'),
  ('692e013b19a1d107469f089a','NomadWeek'),
  ('692e00909f969d7d0dc7841c','Pangea'),
  ('692d98d4a1cd9b6cbc3b9c55','Planit'),
  ('692d5acf1d0911fb4685e834','SALT Inc.'),
  ('69271bd87b8f441dd30eb29e','LOFT Community'),
  ('692687905b035adbb442972d','Digital Citizen'),
  ('692396acf0da83bbdcd575d8','The Broke Backpacker'),
  ('692019be37446d669d8d2b22','Nomads in Wonderlands'),
  ('691c85a57e3b3231aa18de43','Holafly'),
  ('691bea34bf90dfda24fbdc57','Remote Tribe'),
  ('691b56dbc7537477b4dd235f','TimeMind'),
  ('691adc41952abc9be15b12b8','Chiang Mai Nomad Wonderland'),
  ('69174415f8bc35050f2daa97','Swaphouse'),
  ('69145a51a3e05a256f6e0f25','The Louise by Clockwise'),
  ('690f5ad61eb2a3b7280fa9eb','Digital Nomad Association Slovenia'),
  ('690f01768e3eab848a105f84','Nomadlio'),
  ('690ed4a7ded445a7217edab5','The Hybrid Tours'),
  ('690a4e04bd605661fd087af3','Stape | Global Payroll'),
  ('6903a38ba73dec069bb64f8b','The Storage Scanner'),
  ('6903255ddade21fcc6b48397','Coliving Community'),
  ('6902344d48b584837f8a506f','NordVPN'),
  ('68ff1ddb081061b36062cf50','NomadFest (by HipTraveler)'),
  ('68fa3eb0a1387f5e8d0c865c','Cowork Funchal'),
  ('68f8d8189921e19c96d94ade','Polarsteps'),
  ('68f298fa6fd19ceebc00a7a6','Smileys Community'),
  ('68f04ebd6832bc26f58aa7b1','Loft 153 - Coworking, Club & Events'),
  ('68efb861417b3f2b09552228','Falmouth University'),
  ('68ef77e7df85edffc55483b2','Vertical Coworking Dom Henrique'),
  ('68eeea79b55470dfa4306f45','SUMA'),
  ('68ecc38f4b28989276eaca1b','goldenweeks'),
  ('68e4df2230eb4c5a249f9b67','Madeira Friends Hub'),
  ('68e4d372ddf15e4d2f0434ae','Reorient'),
  ('68e3f751f48d20e9c9773e83','Scaglia y Asociados'),
  ('68e3eee32b6351712f134dce','NomadWallets'),
  ('68dce72e661bdff3fd5cbd4d','InterNations'),
  ('68d5de87108084c473300db5','Inside Job Concierge'),
  ('68d1a0e6dc3481ce9e1c9a43','Albufeira Coworking'),
  ('68d16c2771168e207eb1e6e5','Second Home Mercado'),
  ('68cdd491b3457483cf12c7de','AfricaNomads'),
  ('68cd36c38c2c5c0ede12c7de','NomadTax Bulgaria Ltd.'),
  ('68c8d7235114c4e60c0f6fd5','NAiO LLC'),
  ('68c856e186ee6a5dae7bad8b','Rocha Beach House'),
  ('68c68e23a5a443a2ec8332b6','Borderless Strategy'),
  ('68c58019665944c00a97ca89','INF - Italia Nomad Fest'),
  ('68c3f7fcd93f167477286abc','povnomad'),
  ('68c34dea1361f17a1003aab0','Rustic Savor'),
  ('68c2e0487f505b69e1515f1a','Wonder House Coliving'),
  ('68ba1668856bb0d4436c179f','Coconut-Office'),
  ('68b848368713584d609dbce8','SOVENTURE'),
  ('68b5d05831349d1cba458b3f','Saily'),
  ('68b19eafdac2f3940664a62e','Entity Inc.'),
  ('68b00eb06aee0ca836f5056a','Nomad Summer Camp LLC'),
  ('68ac4264a4f74a02c7ee8796','Edge City'),
  ('68a2e438daeaf52dbb626eb3','Nomad Experience'),
  ('68a1aa9811d1fdd3047f8776','Diving Nomads'),
  ('689e34e723650bac0dcd621f','Wanderwell Club'),
  ('68917ac67f49b40a53bfec86','The Better Neighbors'),
  ('6891465a5550715e77c09c0b','Remote Queer'),
  ('689080f9e0793277a898eca4','ImagineThat'),
  ('6888a04b7db2b8b0c6b21eab','Casa Gori Coliving'),
  ('688853390c69eadfcbf3c554','TADAIMA SHIMODA'),
  ('687e25051dfb0931ceb7a58c','Max Browser'),
  ('687a4b6306b813b36ac66253','Nomadico'),
  ('68614b88b570ca8607f1ee4a','OUTSITE Madeira'),
  ('686136e7b4a6f12fedba2393','NOMAD Social'),
  ('68571c711193d4bf3ac176d4','Wenland'),
  ('68571c711193d4bf3ac176d3','Virtuelle Assistenz Schweiz'),
  ('68571c711193d4bf3ac176d2','Rent Remote'),
  ('68571c711193d4bf3ac176d0','Remote Commons'),
  ('68571c711193d4bf3ac176cf','Real Work From Anywhere'),
  ('68571c711193d4bf3ac176ce','Pack Your Essentials Community'),
  ('68571c711193d4bf3ac176cd','Nomadwise.io'),
  ('68571c711193d4bf3ac176cc','Nomads Embassy'),
  ('68571c711193d4bf3ac176cb','Nomadicards'),
  ('68571c711193d4bf3ac176ca','Insured Nomads'),
  ('68571c711193d4bf3ac176c7','Fairytrail'),
  ('68571c711193d4bf3ac176c5','Curves'),
  ('68571c711193d4bf3ac176c4','Coliving Compass'),
  ('68571c711193d4bf3ac176c3','Clos De Vaul Creux'),
  ('68542eb83f4fe6c6136874ad','Kalima Beach Life'),
  ('68497bfc87ef01ac58f35391','Pomar Co-Living'),
  ('682bbd24fbc3e26b0f8dfcf7','Beetcommunity'),
  ('68224470c1999ccfee7b8a10','WeWork Mennica Legacy Tower'),
  ('67ffd4a49461b9b1feb40466','KAOS Coworking GmbH'),
  ('67eeb1b8fad51bd4893323ef','Dandelion'),
  ('67eab3c625c624efaba7335e','Colive Fukuoka'),
  ('67e9b52ca2a0bf67e26cb4d9','Fisga Garden'),
  ('67e5b224f32367220c748924','CoWorkBude14'),
  ('67e5b1bdf4ecf1227c2402e8','BCN575 Coworking'),
  ('67e5b15e780f33b141b1869b','DeHouse Península'),
  ('67e5b0fe84485a5be528d337','DeHouse Downtown'),
  ('67e5a141325343fdc804c8e9','WorkHub'),
  ('67e5a0253e5f7145b47f1339','MACHWERK'),
  ('67e59cc186b1aab0b9413151','beehive GmbH'),
  ('67e59768a466d1d03d13a5f1','Unicorn Workspaces Liberdade'),
  ('67e59764ebd46aa13ae0a55c','Unicorn Workspaces Avenidas Novas'),
  ('67e597481dd60da06b60599a','Unicorn Workspaces Marquês'),
  ('67e5964b79f7e74ebf605998','Betahaus Urban'),
  ('67e5963699f083857445ba2a','Betahaus Moritzplatz'),
  ('67e5947643d85b86a426441a','Betahaus Kreuzberg'),
  ('67e59345fa3aa3ceb82402e8','MOB Bailèn'),
  ('67e5933c5bc7c638c8db3158','MOB Sants'),
  ('67e592877b66859b998be2dc','Workspace 6'),
  ('67e58e9797d5bc0f5c2c1692','Fisga Warehouse'),
  ('67e582db1f229a9d1645ba45','Kiez Buero Coworking'),
  ('67e582db1f229a9d1645ba43','Cowork Studio Las Palmas'),
  ('67e582db1f229a9d1645ba3c','Loffice Wien'),
  ('67e582db1f229a9d1645ba3d','Sowo Coworking'),
  ('67e582db1f229a9d1645ba3a','Space Shack'),
  ('67e582db1f229a9d1645ba3b','Loffice Budapest'),
  ('67e582db1f229a9d1645ba37','MOB Caterina'),
  ('67e582db1f229a9d1645ba38','JUNGLE Coworking'),
  ('67e582db1f229a9d1645ba39','Velt Studio'),
  ('67e58262b1702d6bc713a53d','START2BEE COWORKING'),
  ('67e581f6ad6b8381b2b4b6d0','Fosbury & Sons'),
  ('67741b5ac3e8ae68a41c751b','NomadWay'),
  ('6773f5197e0a8553a063faa8','Global Nomad Pass'),
  ('6773ed769ff551d30130a77e','The Offsite'),
  ('66a6166b797d4f913b64abe9','Mapmelon'),
  ('66a6152cea7b6b05a824a6e0','Urgent driving license Georgia'),
  ('66a613a7966030f11d116a73','Creative Digital Agency Infokus'),
  ('657f856b7eb8145e6a1cf9aa','Coliving.com'),
  ('6565f68ed4c2f8e720cdede3','Nomad Retreats'),
  ('6565281c4c8815ade26c5247','NOMADS.insure'),
  ('655f7bb3e8c7214499517c0d','SafetyWing'),
  ('655f76538779ef70a3a1736b','Remotivate'),
  ('655f3e03b70314e077fe8f5c','SlowColiving'),
  ('655f3e03b70314e077fe8f5b','Same Same Co-Living'),
  ('655f3e03b70314e077fe8f5a','Co.Lisbon'),
  ('655f34679bac86d0f943da5a','Slow Coliving Lisbon'),
  ('655f34669bac86d0f943d7a8','SWAP Coworking'),
  ('655f34669bac86d0f943d793','Typographia Cowork'),
  ('655f34669bac86d0f943d777','La Vaca Coworking')
) as v(id,title) where t.listing_id = v.id;

create table public.directory_award_settings (
  singleton boolean primary key default true check(singleton),
  starts_at timestamptz not null default clock_timestamp()
);
insert into public.directory_award_settings default values;
alter table public.directory_award_settings enable row level security;
revoke all on public.directory_award_settings from anon,authenticated;

-- First receipt never moves on re-voting. Intervals reconstruct eligibility at a closed boundary.
create table public.directory_vote_history (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  first_voted_at timestamptz not null,
  unique(listing_id,user_id)
);
create index directory_vote_history_received on public.directory_vote_history(first_voted_at);
create index directory_vote_history_user on public.directory_vote_history(user_id);
create table public.directory_vote_intervals (
  id bigint generated always as identity primary key,
  history_id uuid not null references public.directory_vote_history(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  check(ended_at is null or ended_at >= started_at)
);
create unique index directory_vote_interval_active on public.directory_vote_intervals(history_id) where ended_at is null;
create index directory_vote_interval_history on public.directory_vote_intervals(history_id,started_at,ended_at);
alter table public.directory_vote_history enable row level security;
alter table public.directory_vote_intervals enable row level security;
revoke all on public.directory_vote_history,public.directory_vote_intervals from anon,authenticated;
insert into public.directory_vote_history(listing_id,user_id,first_voted_at)
select listing_id,user_id,created_at from public.directory_votes;
insert into public.directory_vote_intervals(history_id,started_at)
select id,first_voted_at from public.directory_vote_history;

create function public.directory_lock_vote_history() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock_shared(hashtextextended('directory-awards-ledger',0));
  return null;
end;
$$;
create trigger directory_vote_history_lock before insert or delete on public.directory_votes
for each statement execute function public.directory_lock_vote_history();

create function public.directory_track_vote_history() returns trigger
language plpgsql security definer set search_path = '' as $$
declare history_key uuid; changed_at timestamptz := clock_timestamp();
begin
  if tg_op = 'INSERT' then
    insert into public.directory_vote_history(listing_id,user_id,first_voted_at)
    values(new.listing_id,new.user_id,changed_at)
    on conflict(listing_id,user_id) do update set listing_id = excluded.listing_id
    returning id into history_key;
    insert into public.directory_vote_intervals(history_id,started_at) values(history_key,changed_at);
  else
    update public.directory_vote_intervals i set ended_at = changed_at
    from public.directory_vote_history h
    where h.id = i.history_id and h.listing_id = old.listing_id and h.user_id = old.user_id and i.ended_at is null;
  end if;
  return null;
end;
$$;
create trigger directory_vote_history_track after insert or delete on public.directory_votes
for each row execute function public.directory_track_vote_history();

-- Close intervals before FK cascades, then erase the deleted account's identity from history.
create function public.directory_anonymize_deleted_voter() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock_shared(hashtextextended('directory-awards-ledger',0));
  update public.directory_vote_intervals i set ended_at = clock_timestamp()
  from public.directory_vote_history h where h.id = i.history_id and h.user_id = old.id and i.ended_at is null;
  update public.directory_vote_history set user_id = null where user_id = old.id;
  return old;
end;
$$;
create trigger directory_voter_deletion before delete on auth.users
for each row execute function public.directory_anonymize_deleted_voter();
revoke all on function public.directory_lock_vote_history(),public.directory_track_vote_history(),public.directory_anonymize_deleted_voter() from public,anon,authenticated;

create table public.directory_award_periods (
  id uuid primary key default gen_random_uuid(),
  kind text not null check(kind in ('day','week','month','year')),
  starts_at timestamptz not null,
  ends_at timestamptz not null check(ends_at > starts_at),
  finalized_at timestamptz not null default clock_timestamp(),
  unique(kind,starts_at)
);
create table public.directory_awards (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.directory_award_periods(id),
  listing_id text not null,
  listing_title text not null,
  vote_count bigint not null check(vote_count > 0),
  tied_winners integer not null check(tied_winners > 0),
  revoked_at timestamptz,
  revocation_reason text,
  unique(period_id,listing_id)
);
create index directory_awards_listing on public.directory_awards(listing_id);
create index directory_award_periods_recent on public.directory_award_periods(kind,starts_at desc);
alter table public.directory_award_periods enable row level security;
alter table public.directory_awards enable row level security;
revoke all on public.directory_award_periods,public.directory_awards from anon,authenticated;

create function public.directory_award_bounds(p_kind text,p_at timestamptz)
returns table(starts_at timestamptz,ends_at timestamptz)
language plpgsql stable set search_path = '' set timezone = 'UTC' as $$
declare beginning timestamptz;
begin
  if p_kind is null or p_kind not in ('day','week','month','year') then raise exception 'Invalid award period' using errcode='22023'; end if;
  beginning := date_trunc(p_kind,p_at at time zone 'UTC') at time zone 'UTC';
  return query select beginning,beginning + case p_kind when 'day' then interval '1 day' when 'week' then interval '1 week' when 'month' then interval '1 month' else interval '1 year' end;
end;
$$;
create function public.directory_award_listing_title(p_id text) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select published->>'title' from public.directory_managed_listings where published is not null and coalesce(legacy_id,id::text)=p_id),
    (select title from public.directory_legacy_vote_targets where listing_id=p_id)
  );
$$;
revoke all on function public.directory_award_bounds(text,timestamptz),public.directory_award_listing_title(text) from public,anon,authenticated;

create function public.directory_finalize_awards() returns integer
language plpgsql security definer set search_path = '' set timezone = 'UTC' as $$
declare
  launch_at timestamptz; cutoff timestamptz; period_kind text; beginning timestamptz; ending timestamptz;
  period_key uuid; processed integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended('directory-awards-ledger',0));
  cutoff := clock_timestamp();
  select starts_at into launch_at from public.directory_award_settings where singleton;
  foreach period_kind in array array['day','week','month','year'] loop
    select b.starts_at,b.ends_at into beginning,ending from public.directory_award_bounds(period_kind,launch_at) b;
    while ending <= cutoff loop
      period_key := null;
      insert into public.directory_award_periods(kind,starts_at,ends_at) values(period_kind,beginning,ending)
      on conflict(kind,starts_at) do nothing returning id into period_key;
      if period_key is not null then
        with scores as materialized (
          select h.listing_id,count(*) as votes from public.directory_vote_history h
          where h.first_voted_at >= greatest(beginning,launch_at) and h.first_voted_at < ending
            and public.directory_vote_target_exists(h.listing_id)
            and exists(select 1 from public.directory_vote_intervals i where i.history_id=h.id
              and i.started_at < ending and (i.ended_at is null or i.ended_at >= ending))
          group by h.listing_id
        ), winners as (select * from scores where votes=(select max(votes) from scores))
        insert into public.directory_awards(period_id,listing_id,listing_title,vote_count,tied_winners)
        select period_key,w.listing_id,public.directory_award_listing_title(w.listing_id),w.votes,(select count(*)::integer from winners) from winners w;
        processed := processed + 1;
      end if;
      select b.starts_at,b.ends_at into beginning,ending from public.directory_award_bounds(period_kind,ending) b;
    end loop;
  end loop;
  -- Anonymous history from before the previous UTC year can no longer affect an open period.
  delete from public.directory_vote_history where user_id is null
    and first_voted_at < (date_trunc('year',cutoff at time zone 'UTC') at time zone 'UTC') - interval '1 year';
  return processed;
end;
$$;
revoke all on function public.directory_finalize_awards() from public,anon,authenticated;
grant execute on function public.directory_finalize_awards() to service_role;

create function public.directory_award_leaderboard(p_kind text default 'day')
returns table(listing_id text,listing_title text,vote_count bigint,starts_at timestamptz,ends_at timestamptz,awards_started_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with bounds as (select * from public.directory_award_bounds(p_kind,now())), scores as materialized (
    select h.listing_id,count(*) as votes from public.directory_vote_history h
    cross join bounds b cross join public.directory_award_settings s
    where h.first_voted_at >= greatest(b.starts_at,s.starts_at) and h.first_voted_at < b.ends_at
      and exists(select 1 from public.directory_vote_intervals i where i.history_id=h.id and i.ended_at is null)
    group by h.listing_id
  )
  select c.listing_id,public.directory_award_listing_title(c.listing_id),c.votes,b.starts_at,b.ends_at,s.starts_at
  from scores c cross join bounds b cross join public.directory_award_settings s
  where public.directory_vote_target_exists(c.listing_id)
  order by c.votes desc,c.listing_id limit 10;
$$;

create function public.directory_public_awards(p_kind text default null,p_listing_id text default null,p_award_id uuid default null,p_limit integer default 24,p_offset integer default 0,p_include_revoked boolean default false)
returns table(id uuid,listing_id text,listing_title text,vote_count bigint,tied_winners integer,kind text,starts_at timestamptz,ends_at timestamptz,finalized_at timestamptz,revoked_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id,a.listing_id,a.listing_title,a.vote_count,a.tied_winners,p.kind,p.starts_at,p.ends_at,p.finalized_at,a.revoked_at
  from public.directory_awards a join public.directory_award_periods p on p.id=a.period_id
  where (p_kind is null or p.kind=p_kind) and (p_listing_id is null or a.listing_id=p_listing_id)
    and (p_award_id is null or a.id=p_award_id) and (p_include_revoked or a.revoked_at is null or p_award_id is not null)
  order by p.ends_at desc,p.kind,a.vote_count desc,a.listing_title,a.id
  limit least(greatest(coalesce(p_limit,24),1),1000) offset greatest(coalesce(p_offset,0),0);
$$;

create function public.directory_revoke_award(p_id uuid,p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.directory_is_admin() then raise exception 'Reviewer access required' using errcode='42501'; end if;
  if p_reason is null or length(trim(p_reason)) < 5 or length(p_reason)>1000 then raise exception 'Give a reason for withdrawal' using errcode='22023'; end if;
  update public.directory_awards set revoked_at=clock_timestamp(),revocation_reason=trim(p_reason) where id=p_id and revoked_at is null;
  if not found then raise exception 'Active award not found' using errcode='22023'; end if;
end;
$$;
revoke all on function public.directory_award_leaderboard(text),public.directory_public_awards(text,text,uuid,integer,integer,boolean),public.directory_revoke_award(uuid,text) from public,anon,authenticated;
grant execute on function public.directory_award_leaderboard(text),public.directory_public_awards(text,text,uuid,integer,integer,boolean) to anon,authenticated;
grant execute on function public.directory_revoke_award(uuid,text) to authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('nomad-directory-awards','5 0 * * *','select public.directory_finalize_awards();');
comment on table public.directory_awards is 'Immutable awarded score/title snapshots, with explicit reviewer withdrawal. No purchase or owner write path.';
comment on table public.directory_vote_history is 'Private first-vote history; identity erased on account deletion. Closed anonymous history is pruned by finalization.';
commit;
