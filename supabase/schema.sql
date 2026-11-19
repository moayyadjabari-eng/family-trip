-- Family Trip app: run this whole file once in Supabase -> SQL Editor -> New query -> Run.
-- Safe to run again: it only creates what is missing and replaces the api function.

create extension if not exists pgcrypto with schema extensions;

-- ---------- tables ----------
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  name text not null,
  household text not null default '',
  role text not null default 'member' check (role in ('admin','member')),
  pass_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  token text primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create table if not exists public.itinerary (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  time text not null default '',
  title text not null,
  details text not null default '',
  place text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  pinned boolean not null default false,
  author uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  day date,
  status text not null default 'open' check (status in ('open','planned','declined')),
  author uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  value int not null check (value in (-1, 1)),
  primary key (suggestion_id, member_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  author uuid references public.members(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'food',
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'EGP',
  paid_by uuid not null references public.members(id),
  spent_on date not null default current_date,
  split jsonb not null default '{}'::jsonb,   -- how it was split (for editing)
  shares jsonb not null,                      -- {member_id: amount owed, in expense currency}
  note text not null default '',
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  from_member uuid not null references public.members(id),
  to_member uuid not null references public.members(id),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'JOD',
  note text not null default '',
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);


create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null default '',
  summary text not null default '',
  info text not null default '',          -- tips, opening hours, what to know
  map_url text not null default '',
  cover uuid,                             -- photos.id
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.days (
  day date primary key,
  title text not null default '',
  brief text not null default '',          -- "brief of the day": what we do, in short
  meet_time text not null default '',
  meet_place text not null default '',
  wear text not null default '',
  bring text not null default '',
  cover uuid
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  data text not null,                      -- resized JPEG as a data: URL (kept small by the app)
  caption text not null default '',
  place_id uuid references public.places(id) on delete set null,
  day date,
  author uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.members add column if not exists email text not null default '';
alter table public.members add column if not exists perms jsonb not null default '{}'::jsonb;
alter table public.itinerary add column if not exists place_id uuid references public.places(id) on delete set null;

create table if not exists public.settings (
  key text primary key,
  value jsonb not null
);

insert into public.settings(key, value) values
  ('trip', '{"name":"Egypt 2026","start":"2026-12-18","end":"2026-12-25"}'),
  ('rates', '{"JOD":1,"EGP":68,"USD":1.41}'),
  ('theme', '{"color":"#0f766e","welcome":"Welcome to our family trip to Egypt! Check the plan, share ideas, and log expenses here."}')
on conflict (key) do nothing;

-- Lock every table: the app only talks to the database through public.api() below.
alter table public.members enable row level security;
alter table public.sessions enable row level security;
alter table public.itinerary enable row level security;
alter table public.announcements enable row level security;
alter table public.suggestions enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;
alter table public.expenses enable row level security;
alter table public.settlements enable row level security;
alter table public.settings enable row level security;
alter table public.places enable row level security;
alter table public.days enable row level security;
alter table public.photos enable row level security;
revoke all on public.places, public.days, public.photos from anon, authenticated;
revoke all on public.members, public.sessions, public.itinerary, public.announcements,
  public.suggestions, public.votes, public.comments, public.expenses, public.settlements,
  public.settings from anon, authenticated;

-- Starter itinerary (only if the plan is empty)
insert into public.itinerary(day, time, title, details, place)
select * from (values
  ('2026-12-18'::date, '12:15', 'Fly Amman → Hurghada', 'Direct flight about 1h15. Meet at the airport 3 hours before. Check in at the resort.', 'Queen Alia Airport'),
  ('2026-12-19'::date, '', 'Resort day', 'Rest, pool and beach. Settle in.', 'Hurghada'),
  ('2026-12-20'::date, '08:30', 'Giftun Island boat day', 'Snorkeling and beach on the island. Bring swimsuits, towels, sunscreen.', 'Hurghada Marina'),
  ('2026-12-21'::date, '10:00', 'Glass-bottom boat or submarine', 'Great for the kids. Marina walk and dinner in the evening.', 'Hurghada Marina'),
  ('2026-12-22'::date, '14:00', 'Desert safari + Bedouin dinner', 'Quad bikes / jeep, sunset in the desert, dinner and show. Bring a jacket, evenings are cold.', 'Eastern Desert'),
  ('2026-12-23'::date, '12:00', 'Fly Hurghada → Cairo', 'Check in at the Cairo hotel, then dinner at Khan el-Khalili.', 'Hurghada Airport'),
  ('2026-12-24'::date, '08:00', 'Pyramids, Sphinx + Grand Egyptian Museum', 'Felucca ride on the Nile at sunset.', 'Giza'),
  ('2026-12-25'::date, '09:00', 'Old Cairo, then fly home to Amman', 'Morning visit if the flight is in the afternoon.', 'Cairo')
) v(day, time, title, details, place)
where not exists (select 1 from public.itinerary);

-- Starter places and day briefs (only if empty)
insert into public.places(name, city, summary, info, map_url, sort)
select * from (values
  ('Giftun Island', 'Hurghada', 'Protected island with white beaches and coral reefs, about 45 minutes by boat.', 'Boat leaves in the morning, back around 4 pm. Lunch is usually on board. Reef-safe sunscreen, snorkel gear is provided. Kids need life jackets.', 'https://maps.google.com/?q=Giftun+Island', 1),
  ('Hurghada Marina', 'Hurghada', 'Seafront promenade with restaurants, cafes and the boats.', 'Nice for an evening walk and dinner. Glass-bottom boats and the submarine leave from here.', 'https://maps.google.com/?q=Hurghada+Marina', 2),
  ('Eastern Desert safari', 'Hurghada', 'Quad bikes or jeeps into the desert, a Bedouin village, sunset and dinner.', 'Pickup from the hotel around 2 pm. Wear closed shoes, bring a scarf for dust and a warm jacket for after sunset.', '', 3),
  ('Khan el-Khalili', 'Cairo', 'Historic bazaar from the 14th century, full of lanterns, spices and souvenirs.', 'Bargain politely, start around half the asking price. Keep bags in front. El Fishawy cafe is the famous tea stop.', 'https://maps.google.com/?q=Khan+el-Khalili', 4),
  ('Pyramids of Giza and the Sphinx', 'Cairo', 'The last standing wonder of the ancient world.', 'Go early to beat heat and crowds. Ignore camel touts, our guide arranges rides. Bring water, hats and cash for small tips.', 'https://maps.google.com/?q=Giza+Pyramids', 5),
  ('Grand Egyptian Museum', 'Cairo', 'The new giant museum next to the pyramids, home of the full Tutankhamun collection.', 'Allow 3 hours. Tickets are booked for the group. Comfortable shoes.', 'https://maps.google.com/?q=Grand+Egyptian+Museum', 6),
  ('Old Cairo', 'Cairo', 'Coptic quarter, the Hanging Church and Amr Ibn Al-As Mosque.', 'Modest clothing: shoulders and knees covered.', 'https://maps.google.com/?q=Coptic+Cairo', 7)
) v(name, city, summary, info, map_url, sort)
where not exists (select 1 from public.places);

insert into public.days(day, title, brief, meet_time, meet_place, wear, bring)
select * from (values
  ('2026-12-18'::date, 'Travel day to Hurghada', 'We fly from Amman to Hurghada, then check in and relax at the resort.', '09:00', 'Queen Alia Airport, departures', 'Comfortable clothes', 'Passports, tickets, chargers'),
  ('2026-12-19'::date, 'Resort day', 'No plans: pool, beach and rest.', '', '', 'Swimwear', 'Sunscreen'),
  ('2026-12-20'::date, 'Giftun Island', 'Full day boat trip with snorkeling and beach time.', '08:00', 'Hotel lobby', 'Swimwear under clothes', 'Towel, sunscreen, hat, cash for tips'),
  ('2026-12-21'::date, 'Boats and marina', 'Glass-bottom boat or submarine for the kids, marina dinner at night.', '09:30', 'Hotel lobby', 'Light clothes', 'Cash, sunglasses'),
  ('2026-12-22'::date, 'Desert safari', 'Afternoon desert trip with sunset and a Bedouin dinner.', '13:45', 'Hotel lobby', 'Closed shoes, jacket for the evening', 'Scarf, water'),
  ('2026-12-23'::date, 'To Cairo', 'Fly to Cairo, check in, dinner at Khan el-Khalili.', '09:00', 'Hotel lobby with bags', 'Comfortable', 'Passports'),
  ('2026-12-24'::date, 'Pyramids day', 'Pyramids and Sphinx, Grand Egyptian Museum, felucca at sunset.', '07:30', 'Hotel lobby', 'Walking shoes, hat', 'Water, cash for tips'),
  ('2026-12-25'::date, 'Old Cairo and home', 'Morning in Old Cairo, then the flight home.', '08:30', 'Hotel lobby with bags', 'Modest clothes', 'Passports, everything packed')
) v(day, title, brief, meet_time, meet_place, wear, bring)
where not exists (select 1 from public.days);

update public.itinerary i set place_id = p.id from public.places p
where i.place_id is null and (
  (p.name = 'Giftun Island' and i.title like 'Giftun%') or
  (p.name = 'Hurghada Marina' and i.title like 'Glass-bottom%') or
  (p.name = 'Eastern Desert safari' and i.title like 'Desert safari%') or
  (p.name = 'Pyramids of Giza and the Sphinx' and i.title like 'Pyramids%') or
  (p.name = 'Old Cairo' and i.title like 'Old Cairo%'));

-- ---------- permissions ----------
-- Per-member switches stored in members.perms. Admins always have everything.
--   view_plan, view_places, view_ideas, view_money, view_photos  (default on)
--   money_all      see every expense and everyone's balance (default on; off = only their own)
--   add_expense, suggest, comment, add_photos                    (default on)
--   edit_plan, edit_places, announce                             (default off: helper roles)
create or replace function public._can(m public.members, k text)
returns boolean language sql stable set search_path = public as $$
  select m.role = 'admin' or coalesce((m.perms->>k)::boolean,
    k in ('view_plan','view_places','view_ideas','view_money','view_photos','money_all','add_expense','suggest','comment','add_photos'));
$$;
revoke all on function public._can(public.members, text) from public, anon, authenticated;

-- ---------- api ----------
create or replace function public.api(p_token text, p_action text, p_data jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  me public.members;
  d jsonb := coalesce(p_data, '{}'::jsonb);
  v_id uuid;
  v_token text;
  v_sum numeric;
  v_amount numeric;
  k text;
begin
  -- ----- actions that need no login -----
  if p_action = 'status' then
    return jsonb_build_object('needs_setup', not exists (select 1 from members));
  end if;

  if p_action = 'setup' then
    if exists (select 1 from members) then raise exception 'already_set_up'; end if;
    if length(coalesce(d->>'password','')) < 6 then raise exception 'password_too_short'; end if;
    if coalesce(trim(d->>'username'),'') = '' or coalesce(trim(d->>'name'),'') = '' then raise exception 'missing_name'; end if;
    insert into members(username, name, role, pass_hash, email)
      values (lower(trim(d->>'username')), trim(d->>'name'), 'admin', crypt(d->>'password', gen_salt('bf')), coalesce(trim(d->>'email'),''))
      returning * into me;
    v_token := encode(gen_random_bytes(32), 'hex');
    insert into sessions(token, member_id) values (v_token, me.id);
    return jsonb_build_object('token', v_token);
  end if;

  if p_action = 'login' then
    select * into me from members where username = lower(trim(d->>'username'));
    if me.id is null or me.pass_hash <> crypt(coalesce(d->>'password',''), me.pass_hash) then
      perform pg_sleep(0.5);
      raise exception 'bad_login';
    end if;
    v_token := encode(gen_random_bytes(32), 'hex');
    insert into sessions(token, member_id) values (v_token, me.id);
    delete from sessions where last_seen < now() - interval '90 days';
    return jsonb_build_object('token', v_token);
  end if;

  -- ----- everything else needs a valid session -----
  select m.* into me from sessions s join members m on m.id = s.member_id
    where s.token = p_token and s.last_seen > now() - interval '90 days';
  if me.id is null then raise exception 'not_logged_in'; end if;
  update sessions set last_seen = now() where token = p_token and last_seen < now() - interval '1 hour';

  if p_action = 'logout' then
    delete from sessions where token = p_token;
    return '{}'::jsonb;
  end if;

  if p_action = 'state' then
    return jsonb_build_object(
      'me', jsonb_build_object('id', me.id, 'username', me.username, 'name', me.name, 'role', me.role,
              'household', me.household, 'email', me.email, 'perms', me.perms),
      'members', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'username', username, 'name', name, 'role', role,
              'household', household,
              'email', case when me.role = 'admin' or id = me.id then email else '' end,
              'perms', case when me.role = 'admin' or id = me.id then perms else '{}'::jsonb end) order by name) from members), '[]'),
      'itinerary', case when _can(me,'view_plan') then coalesce((select jsonb_agg(to_jsonb(i) order by day, nullif(time,'') nulls first, created_at) from itinerary i), '[]') else '[]' end,
      'days', case when _can(me,'view_plan') then coalesce((select jsonb_agg(to_jsonb(dd) order by day) from days dd), '[]') else '[]' end,
      'announcements', coalesce((select jsonb_agg(to_jsonb(a) order by pinned desc, created_at desc) from announcements a), '[]'),
      'suggestions', case when _can(me,'view_ideas') then coalesce((select jsonb_agg(to_jsonb(s) || jsonb_build_object(
          'votes', coalesce((select jsonb_object_agg(v.member_id, v.value) from votes v where v.suggestion_id = s.id), '{}'),
          'comments', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at) from comments c where c.suggestion_id = s.id), '[]')
        ) order by s.created_at desc) from suggestions s), '[]') else '[]' end,
      'expenses', case when not _can(me,'view_money') then '[]'::jsonb
        else coalesce((select jsonb_agg(to_jsonb(e) order by spent_on desc, created_at desc) from expenses e
          where _can(me,'money_all') or e.paid_by = me.id or e.shares ? me.id::text or e.created_by = me.id), '[]') end,
      'settlements', case when not _can(me,'view_money') then '[]'::jsonb
        else coalesce((select jsonb_agg(to_jsonb(t) order by created_at desc) from settlements t
          where _can(me,'money_all') or t.from_member = me.id or t.to_member = me.id), '[]') end,
      'places', case when _can(me,'view_places') then coalesce((select jsonb_agg(to_jsonb(p) order by sort, created_at) from places p), '[]') else '[]' end,
      'photos', case when _can(me,'view_photos') or _can(me,'view_places') then coalesce((select jsonb_agg(jsonb_build_object('id', ph.id, 'caption', ph.caption, 'place_id', ph.place_id,
          'day', ph.day, 'author', ph.author, 'created_at', ph.created_at) order by ph.created_at desc) from photos ph), '[]') else '[]' end,
      'settings', coalesce((select jsonb_object_agg(key, value) from settings), '{}')
    );
  end if;

  if p_action = 'photo' then
    if not (_can(me,'view_photos') or _can(me,'view_places')) then raise exception 'not_allowed'; end if;
    return coalesce((select jsonb_build_object('id', id, 'data', data) from photos where id = (d->>'id')::uuid), '{}'::jsonb);
  end if;

  -- ----- photos: everyone can share; delete by author or admin -----
  if p_action = 'add_photo' then
    if not _can(me,'add_photos') then raise exception 'not_allowed'; end if;
    if coalesce(d->>'data','') not like 'data:image/%' then raise exception 'bad_photo'; end if;
    if length(d->>'data') > 1500000 then raise exception 'photo_too_big'; end if;
    insert into photos(data, caption, place_id, day, author)
      values (d->>'data', coalesce(d->>'caption',''), nullif(d->>'place_id','')::uuid, nullif(d->>'day','')::date, me.id)
      returning id into v_id;
    return jsonb_build_object('id', v_id);
  end if;

  if p_action = 'delete_photo' then
    delete from photos where id = (d->>'id')::uuid and (author = me.id or me.role = 'admin') returning id into v_id;
    if v_id is null then raise exception 'not_allowed'; end if;
    return '{}'::jsonb;
  end if;

  if p_action = 'update_profile' then
    update members set email = coalesce(trim(d->>'email'), email) where id = me.id;
    return '{}'::jsonb;
  end if;

  if p_action = 'change_password' then
    if me.pass_hash <> crypt(coalesce(d->>'old',''), me.pass_hash) then raise exception 'bad_login'; end if;
    if length(coalesce(d->>'new','')) < 6 then raise exception 'password_too_short'; end if;
    update members set pass_hash = crypt(d->>'new', gen_salt('bf')) where id = me.id;
    delete from sessions where member_id = me.id and token <> p_token;
    return '{}'::jsonb;
  end if;

  -- ----- suggestions, votes, comments (everyone) -----
  if p_action = 'add_suggestion' then
    if not _can(me,'suggest') then raise exception 'not_allowed'; end if;
    if coalesce(trim(d->>'title'),'') = '' then raise exception 'missing_title'; end if;
    insert into suggestions(title, body, day, author)
      values (trim(d->>'title'), coalesce(d->>'body',''), nullif(d->>'day','')::date, me.id) returning id into v_id;
    return jsonb_build_object('id', v_id);
  end if;

  if p_action = 'delete_suggestion' then
    delete from suggestions where id = (d->>'id')::uuid and (author = me.id or me.role = 'admin');
    return '{}'::jsonb;
  end if;

  if p_action = 'vote' then
    if not _can(me,'view_ideas') then raise exception 'not_allowed'; end if;
    if coalesce((d->>'value')::int, 0) = 0 then
      delete from votes where suggestion_id = (d->>'id')::uuid and member_id = me.id;
    else
      insert into votes(suggestion_id, member_id, value) values ((d->>'id')::uuid, me.id, sign((d->>'value')::int))
        on conflict (suggestion_id, member_id) do update set value = excluded.value;
    end if;
    return '{}'::jsonb;
  end if;

  if p_action = 'comment' then
    if not _can(me,'comment') then raise exception 'not_allowed'; end if;
    if coalesce(trim(d->>'body'),'') = '' then raise exception 'missing_text'; end if;
    insert into comments(suggestion_id, author, body) values ((d->>'id')::uuid, me.id, trim(d->>'body'));
    return '{}'::jsonb;
  end if;

  if p_action = 'delete_comment' then
    delete from comments where id = (d->>'id')::uuid and (author = me.id or me.role = 'admin');
    return '{}'::jsonb;
  end if;

  -- ----- money (everyone can log; edit/delete by creator, payer or admin) -----
  if p_action = 'save_expense' then
    if not _can(me,'add_expense') then raise exception 'not_allowed'; end if;
    v_amount := (d->>'amount')::numeric;
    if v_amount is null or v_amount <= 0 then raise exception 'bad_amount'; end if;
    if coalesce(trim(d->>'title'),'') = '' then raise exception 'missing_title'; end if;
    if jsonb_typeof(d->'shares') <> 'object' or d->'shares' = '{}'::jsonb then raise exception 'no_people'; end if;
    v_sum := 0;
    for k in select jsonb_object_keys(d->'shares') loop
      if not exists (select 1 from members where id = k::uuid) then raise exception 'unknown_member'; end if;
      v_sum := v_sum + (d->'shares'->>k)::numeric;
    end loop;
    if abs(v_sum - v_amount) > 0.05 then raise exception 'shares_do_not_add_up'; end if;
    if not exists (select 1 from members where id = (d->>'paid_by')::uuid) then raise exception 'unknown_member'; end if;
    if nullif(d->>'id','') is null then
      insert into expenses(title, category, amount, currency, paid_by, spent_on, split, shares, note, created_by)
        values (trim(d->>'title'), coalesce(d->>'category','other'), v_amount, coalesce(d->>'currency','EGP'),
                (d->>'paid_by')::uuid, coalesce(nullif(d->>'spent_on','')::date, current_date),
                coalesce(d->'split','{}'), d->'shares', coalesce(d->>'note',''), me.id)
        returning id into v_id;
    else
      update expenses set title = trim(d->>'title'), category = coalesce(d->>'category','other'), amount = v_amount,
          currency = coalesce(d->>'currency','EGP'), paid_by = (d->>'paid_by')::uuid,
          spent_on = coalesce(nullif(d->>'spent_on','')::date, spent_on), split = coalesce(d->'split','{}'),
          shares = d->'shares', note = coalesce(d->>'note','')
        where id = (d->>'id')::uuid and (created_by = me.id or paid_by = me.id or me.role = 'admin')
        returning id into v_id;
      if v_id is null then raise exception 'not_allowed'; end if;
    end if;
    return jsonb_build_object('id', v_id);
  end if;

  if p_action = 'delete_expense' then
    delete from expenses where id = (d->>'id')::uuid and (created_by = me.id or paid_by = me.id or me.role = 'admin')
      returning id into v_id;
    if v_id is null then raise exception 'not_allowed'; end if;
    return '{}'::jsonb;
  end if;

  if p_action = 'add_settlement' then
    if not _can(me,'view_money') then raise exception 'not_allowed'; end if;
    if me.role <> 'admin' and me.id not in ((d->>'from')::uuid, (d->>'to')::uuid) then raise exception 'not_allowed'; end if;
    v_amount := (d->>'amount')::numeric;
    if v_amount is null or v_amount <= 0 then raise exception 'bad_amount'; end if;
    if (d->>'from')::uuid = (d->>'to')::uuid then raise exception 'same_person'; end if;
    insert into settlements(from_member, to_member, amount, currency, note, created_by)
      values ((d->>'from')::uuid, (d->>'to')::uuid, v_amount, coalesce(d->>'currency','JOD'), coalesce(d->>'note',''), me.id);
    return '{}'::jsonb;
  end if;

  if p_action = 'delete_settlement' then
    delete from settlements where id = (d->>'id')::uuid
      and (created_by = me.id or from_member = me.id or to_member = me.id or me.role = 'admin')
      returning id into v_id;
    if v_id is null then raise exception 'not_allowed'; end if;
    return '{}'::jsonb;
  end if;

  -- ----- helper roles (see _can) -----
  if p_action = 'save_place' then
    if not _can(me,'edit_places') then raise exception 'not_allowed'; end if;
    if coalesce(trim(d->>'name'),'') = '' then raise exception 'missing_title'; end if;
    if nullif(d->>'id','') is null then
      insert into places(name, city, summary, info, map_url, cover, sort)
        values (trim(d->>'name'), coalesce(d->>'city',''), coalesce(d->>'summary',''), coalesce(d->>'info',''),
                coalesce(d->>'map_url',''), nullif(d->>'cover','')::uuid, coalesce((d->>'sort')::int, 0))
        returning id into v_id;
    else
      update places set name = trim(d->>'name'), city = coalesce(d->>'city',''), summary = coalesce(d->>'summary',''),
          info = coalesce(d->>'info',''), map_url = coalesce(d->>'map_url',''), cover = nullif(d->>'cover','')::uuid,
          sort = coalesce((d->>'sort')::int, sort)
        where id = (d->>'id')::uuid returning id into v_id;
    end if;
    return jsonb_build_object('id', v_id);
  end if;

  if p_action = 'delete_place' then
    if not _can(me,'edit_places') then raise exception 'not_allowed'; end if;
    delete from places where id = (d->>'id')::uuid;
    return '{}'::jsonb;
  end if;

  if p_action = 'save_day' then
    if not _can(me,'edit_plan') then raise exception 'not_allowed'; end if;
    insert into days(day, title, brief, meet_time, meet_place, wear, bring, cover)
      values ((d->>'day')::date, coalesce(d->>'title',''), coalesce(d->>'brief',''), coalesce(d->>'meet_time',''),
              coalesce(d->>'meet_place',''), coalesce(d->>'wear',''), coalesce(d->>'bring',''), nullif(d->>'cover','')::uuid)
      on conflict (day) do update set title = excluded.title, brief = excluded.brief, meet_time = excluded.meet_time,
          meet_place = excluded.meet_place, wear = excluded.wear, bring = excluded.bring, cover = excluded.cover;
    return '{}'::jsonb;
  end if;

  if p_action = 'save_item' then
    if not _can(me,'edit_plan') then raise exception 'not_allowed'; end if;
    if coalesce(trim(d->>'title'),'') = '' then raise exception 'missing_title'; end if;
    if nullif(d->>'id','') is null then
      insert into itinerary(day, time, title, details, place, place_id)
        values ((d->>'day')::date, coalesce(d->>'time',''), trim(d->>'title'), coalesce(d->>'details',''), coalesce(d->>'place',''),
                nullif(d->>'place_id','')::uuid);
    else
      update itinerary set day = (d->>'day')::date, time = coalesce(d->>'time',''), title = trim(d->>'title'),
          details = coalesce(d->>'details',''), place = coalesce(d->>'place',''),
          place_id = nullif(d->>'place_id','')::uuid where id = (d->>'id')::uuid;
    end if;
    return '{}'::jsonb;
  end if;

  if p_action = 'delete_item' then
    if not _can(me,'edit_plan') then raise exception 'not_allowed'; end if;
    delete from itinerary where id = (d->>'id')::uuid;
    return '{}'::jsonb;
  end if;

  if p_action = 'save_announcement' then
    if not _can(me,'announce') then raise exception 'not_allowed'; end if;
    if coalesce(trim(d->>'title'),'') = '' then raise exception 'missing_title'; end if;
    if nullif(d->>'id','') is null then
      insert into announcements(title, body, pinned, author)
        values (trim(d->>'title'), coalesce(d->>'body',''), coalesce((d->>'pinned')::boolean, false), me.id);
    else
      update announcements set title = trim(d->>'title'), body = coalesce(d->>'body',''),
          pinned = coalesce((d->>'pinned')::boolean, false) where id = (d->>'id')::uuid;
    end if;
    return '{}'::jsonb;
  end if;

  if p_action = 'delete_announcement' then
    if not _can(me,'announce') then raise exception 'not_allowed'; end if;
    delete from announcements where id = (d->>'id')::uuid;
    return '{}'::jsonb;
  end if;

  if p_action = 'set_suggestion_status' then
    if not _can(me,'edit_plan') then raise exception 'not_allowed'; end if;
    update suggestions set status = d->>'status' where id = (d->>'id')::uuid;
    return '{}'::jsonb;
  end if;

  -- ----- admin only from here -----
  if me.role <> 'admin' then raise exception 'admin_only'; end if;

  if p_action = 'save_member' then
    if nullif(d->>'id','') is null then
      if length(coalesce(d->>'password','')) < 6 then raise exception 'password_too_short'; end if;
      if coalesce(trim(d->>'username'),'') = '' or coalesce(trim(d->>'name'),'') = '' then raise exception 'missing_name'; end if;
      if exists (select 1 from members where username = lower(trim(d->>'username'))) then raise exception 'username_taken'; end if;
      insert into members(username, name, household, role, pass_hash, email, perms)
        values (lower(trim(d->>'username')), trim(d->>'name'), coalesce(trim(d->>'household'),''),
                coalesce(nullif(d->>'role',''),'member'), crypt(d->>'password', gen_salt('bf')),
                coalesce(trim(d->>'email'),''), coalesce(d->'perms','{}'::jsonb));
    else
      if (d->>'id')::uuid = me.id and coalesce(d->>'role','admin') <> 'admin' then raise exception 'cannot_demote_self'; end if;
      update members set name = coalesce(nullif(trim(d->>'name'),''), name),
          household = coalesce(trim(d->>'household'), household),
          role = coalesce(nullif(d->>'role',''), role),
          email = coalesce(trim(d->>'email'), email),
          perms = coalesce(d->'perms', perms)
        where id = (d->>'id')::uuid;
      if length(coalesce(d->>'password','')) > 0 then
        if length(d->>'password') < 6 then raise exception 'password_too_short'; end if;
        update members set pass_hash = crypt(d->>'password', gen_salt('bf')) where id = (d->>'id')::uuid;
        delete from sessions where member_id = (d->>'id')::uuid;
      end if;
    end if;
    return '{}'::jsonb;
  end if;

  if p_action = 'delete_member' then
    v_id := (d->>'id')::uuid;
    if v_id = me.id then raise exception 'cannot_delete_self'; end if;
    if exists (select 1 from expenses where paid_by = v_id or shares ? v_id::text)
       or exists (select 1 from settlements where from_member = v_id or to_member = v_id) then
      raise exception 'member_has_expenses';
    end if;
    delete from members where id = v_id;
    return '{}'::jsonb;
  end if;

  if p_action = 'save_setting' then
    if d->>'key' not in ('trip','rates','theme') then raise exception 'unknown_setting'; end if;
    insert into settings(key, value) values (d->>'key', d->'value')
      on conflict (key) do update set value = excluded.value;
    return '{}'::jsonb;
  end if;

  raise exception 'unknown_action';
end;
$$;

revoke all on function public.api(text, text, jsonb) from public;
grant execute on function public.api(text, text, jsonb) to anon, authenticated;
