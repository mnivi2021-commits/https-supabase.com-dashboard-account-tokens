-- =====================================================================
-- Health Tracker – Supabase schema
-- Run this whole file in Supabase → SQL Editor → New query → Run
-- (or `npm run setup:supabase`). Safe to re-run: it also upgrades older versions.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  name              text not null default '',
  age               int check (age between 1 and 120),
  gender            text check (gender in ('male', 'female')),
  height_cm         numeric(5, 1),
  height_unit       text not null default 'cm' check (height_unit in ('cm', 'ft')),
  weight_kg         numeric(5, 1),
  blood_group       text check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  photo_path        text,
  target_weight_kg  numeric(5, 1),
  target_date       date,
  goal_type         text not null default 'maintain' check (goal_type in ('lose', 'gain', 'maintain')),
  -- What the member shares with their groups. Photo is private by default.
  share             jsonb not null default
                      '{"photo":false,"weight":true,"bmi":true,"workouts":true,"steps":true,"sleep":true,"water":true,"food":true}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Member numbers (HT001 …) — every profile gets one automatically.
create sequence if not exists public.member_no_seq start 1;
alter table public.profiles add column if not exists member_no int unique;
alter table public.profiles add column if not exists share_pin text;

-- SECURITY DEFINER: app users have no rights on the sequence itself.
create or replace function public.assign_member_no()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.member_no is null then new.member_no := nextval('public.member_no_seq'); end if;
  return new;
end $$;
drop trigger if exists profiles_member_no on public.profiles;
create trigger profiles_member_no before insert on public.profiles
  for each row execute function public.assign_member_no();
update public.profiles set member_no = nextval('public.member_no_seq') where member_no is null;

create table if not exists public.weight_logs (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null,
  weight_kg  numeric(5, 1) not null,
  bmi        numeric(4, 1),
  created_at timestamptz not null default now()
);
create index if not exists weight_logs_user_date on public.weight_logs (user_id, date);

create table if not exists public.workouts (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date        date not null,
  type        text not null check (type in ('walking','jogging','running','cycling','yoga',
                                            'pullups','situps','pushups','squats','skipping')),
  minutes     numeric(6, 1),
  distance_km numeric(6, 2),
  reps        int,
  sets        int,
  steps       int,
  calories    numeric(7, 1) not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists workouts_user_date on public.workouts (user_id, date);
-- Allowed workout types (kept in sync with WORKOUT_TYPES in src/lib/types.ts).
alter table public.workouts drop constraint if exists workouts_type_check;
alter table public.workouts add constraint workouts_type_check check (type in (
  'walking','jogging','running','cycling','yoga','pullups','situps','pushups','squats','skipping',
  'jumping_jacks','plank','stretching'));

-- Food eaten. Nutrition values are for the whole entry (serving × qty).
create table if not exists public.food_logs (
  id         uuid primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date       date not null,
  meal       text not null check (meal in ('breakfast', 'lunch', 'snack', 'dinner')),
  food_id    text,
  name       text not null,
  qty        numeric(5, 1) not null default 1,
  serving    text,
  kcal       numeric(7, 1) not null default 0,
  protein    numeric(6, 1) not null default 0,
  carbs      numeric(6, 1) not null default 0,
  fat        numeric(6, 1) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists food_logs_user_date on public.food_logs (user_id, date);

create table if not exists public.sleep_logs (
  id       uuid primary key,
  user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date     date not null,           -- the wake-up date
  sleep_at timestamptz not null,
  wake_at  timestamptz not null,
  hours    numeric(4, 2) not null,
  quality  text not null check (quality in ('good', 'okay', 'poor'))
);
create index if not exists sleep_logs_user_date on public.sleep_logs (user_id, date);

create table if not exists public.water_logs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date    date not null,
  glasses int not null default 0 check (glasses between 0 and 30), -- legacy (250 ml glasses)
  ml      int not null default 0 check (ml between 0 and 10000),
  primary key (user_id, date)
);
alter table public.water_logs add column if not exists ml int not null default 0;
alter table public.profiles add column if not exists health_issues text;  -- private, never shared

create table if not exists public.step_logs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date    date not null,
  steps   int not null default 0 check (steps >= 0),
  primary key (user_id, date)
);

create table if not exists public.targets (
  user_id                  uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  steps                    int not null default 8000,
  workout_minutes          int not null default 30,
  sleep_hours              numeric(3, 1) not null default 8,
  water_glasses            int not null default 8,          -- legacy
  water_ml                 int not null default 2000,
  glass_ml                 int not null default 200,
  monthly_weight_change_kg numeric(3, 1) not null default 2
);
alter table public.targets add column if not exists water_ml int not null default 2000;
alter table public.targets add column if not exists glass_ml int not null default 200;

create table if not exists public.reminders (
  id      uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind    text not null check (kind in ('workout', 'bedtime', 'weight')),
  hour    int not null check (hour between 0 and 23),
  minute  int not null check (minute between 0 and 59),
  weekday int check (weekday between 1 and 7),
  enabled boolean not null default true
);

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique check (invite_code ~ '^[0-9]{6}$'),
  admin_id    uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);
-- 'private' = invited family/friends group (max 5, admin approves, full data);
-- 'open'    = anyone can find and join (max 50, limited data only).
alter table public.groups add column if not exists kind text not null default 'private';
alter table public.groups drop constraint if exists groups_kind_check;
alter table public.groups add constraint groups_kind_check check (kind in ('private', 'open'));
alter table public.groups add column if not exists description text not null default '';
alter table public.groups add column if not exists helpline text;        -- set by the admin, members only
alter table public.groups add column if not exists meeting_room text;    -- random Jitsi room id
update public.groups set meeting_room = encode(uuid_send(gen_random_uuid()), 'hex') where meeting_room is null;

-- A user can be in several groups (e.g. Family Group 1, Family Group 2, Friends Group).
create table if not exists public.group_members (
  group_id  uuid not null references public.groups (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  category  text not null default 'loss' check (category in ('loss', 'gain')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
-- Older versions allowed only one group per user.
alter table public.group_members drop constraint if exists group_members_user_id_key;
-- "Shared Data" switch per group: OFF = others see only my name and member code.
alter table public.group_members add column if not exists share_data boolean not null default true;
create index if not exists group_members_user on public.group_members (user_id);

-- Joining needs the admin's approval.
create table if not exists public.group_join_requests (
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category   text not null default 'loss' check (category in ('loss', 'gain')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.cheers (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  from_user  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  to_user    uuid not null references auth.users (id) on delete cascade,
  date       date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists cheers_to_date on public.cheers (to_user, date);

-- ---------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so RLS policies can use them
-- without recursive policy checks)
-- ---------------------------------------------------------------------

-- "HT001"
create or replace function public.member_label(n int)
returns text language sql immutable as $$ select 'HT' || lpad(n::text, 3, '0') $$;

create or replace function public.is_member(gid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid());
$$;

create or replace function public.is_group_admin(gid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.groups where id = gid and admin_id = auth.uid());
$$;

-- True when `target` shares at least one group with the current user.
create or replace function public.is_group_mate(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members a
    join public.group_members b on b.group_id = a.group_id
    where a.user_id = auth.uid() and b.user_id = target
  );
$$;

-- Photo visible to group mates only when its owner turned on "share photo".
create or replace function public.can_view_photo(owner text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id::text = owner
      and coalesce((p.share ->> 'photo')::boolean, false)
      and public.is_group_mate(p.id)
  );
$$;

-- Max 5 members in a private group, 50 in an open group
-- (row lock prevents two joins at the same moment).
create or replace function public.group_limit_for(p_kind text)
returns int language sql immutable as $$ select case when p_kind = 'open' then 50 else 5 end $$;

create or replace function public.enforce_group_limit()
returns trigger language plpgsql as $$
declare v_kind text;
begin
  select kind into v_kind from public.groups where id = new.group_id for update;
  if (select count(*) from public.group_members where group_id = new.group_id) >= public.group_limit_for(v_kind) then
    raise exception 'GROUP_FULL';
  end if;
  return new;
end $$;

drop trigger if exists group_limit on public.group_members;
create trigger group_limit before insert on public.group_members
  for each row execute function public.enforce_group_limit();

-- ---------------------------------------------------------------------
-- Row Level Security: users read/write only their own rows.
-- Group mates' data is exposed ONLY through the functions below, which
-- respect each member's share settings.
-- ---------------------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.weight_logs         enable row level security;
alter table public.food_logs           enable row level security;
alter table public.workouts            enable row level security;
alter table public.sleep_logs          enable row level security;
alter table public.water_logs          enable row level security;
alter table public.step_logs           enable row level security;
alter table public.targets             enable row level security;
alter table public.reminders           enable row level security;
alter table public.groups              enable row level security;
alter table public.group_members       enable row level security;
alter table public.group_join_requests enable row level security;
alter table public.cheers              enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['weight_logs','food_logs','workouts','sleep_logs','water_logs','step_logs','targets','reminders']
  loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

drop policy if exists "members read group" on public.groups;
create policy "members read group" on public.groups for select to authenticated
  using (public.is_member(id));

drop policy if exists "members read members" on public.group_members;
create policy "members read members" on public.group_members for select to authenticated
  using (public.is_member(group_id));

drop policy if exists "see own or admin requests" on public.group_join_requests;
create policy "see own or admin requests" on public.group_join_requests for select to authenticated
  using (user_id = auth.uid() or public.is_group_admin(group_id));

drop policy if exists "cancel own request" on public.group_join_requests;
create policy "cancel own request" on public.group_join_requests for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "read own cheers" on public.cheers;
create policy "read own cheers" on public.cheers for select to authenticated
  using (to_user = auth.uid() or from_user = auth.uid());

drop policy if exists "cheer group mates" on public.cheers;
create policy "cheer group mates" on public.cheers for insert to authenticated
  with check (
    from_user = auth.uid()
    and public.is_member(group_id)
    and exists (select 1 from public.group_members m where m.group_id = cheers.group_id and m.user_id = to_user)
    and to_user <> auth.uid()
  );

-- ---------------------------------------------------------------------
-- Storage: private "avatars" bucket, files at avatars/<user_id>/profile.jpg
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

drop policy if exists "own avatar" on storage.objects;
create policy "own avatar" on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "group avatar read" on storage.objects;
create policy "group avatar read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.can_view_photo((storage.foldername(name))[1]));

-- ---------------------------------------------------------------------
-- Remove functions from older versions (single-group design)
-- ---------------------------------------------------------------------

drop function if exists public.join_group(text, text);
drop function if exists public.leave_group();
drop function if exists public.remove_member(uuid);
drop function if exists public.set_my_category(text);
drop function if exists public.get_group_dashboard(date);
drop function if exists public.get_group_summary(date, date);
drop function if exists public.get_group_challenge(date);
drop function if exists public.my_group_id();
drop function if exists public.create_group(text, text, text, text);
-- Return columns changed (food added), so recreate:
drop function if exists public.get_group_dashboard(uuid, date);

-- ---------------------------------------------------------------------
-- Group functions (called from the app with supabase.rpc)
-- ---------------------------------------------------------------------

create or replace function public.create_group(
  p_name text, p_category text default 'loss', p_kind text default 'private', p_description text default '')
returns public.groups language plpgsql security definer set search_path = public as $$
declare
  g public.groups;
  code text;
  tries int := 0;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if (select count(*) from group_members where user_id = auth.uid()) >= 10 then
    raise exception 'TOO_MANY_GROUPS';
  end if;
  loop
    code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from groups where invite_code = code);
    tries := tries + 1;
    if tries > 30 then raise exception 'CODE_GENERATION_FAILED'; end if;
  end loop;
  insert into groups (name, invite_code, admin_id, kind, description, meeting_room)
  values (
    coalesce(nullif(trim(p_name), ''), 'My Group'), code, auth.uid(),
    case when p_kind = 'open' then 'open' else 'private' end,
    left(coalesce(trim(p_description), ''), 200),
    encode(uuid_send(gen_random_uuid()), 'hex'))
  returning * into g;
  insert into group_members (group_id, user_id, category)
  values (g.id, auth.uid(), case when p_category = 'gain' then 'gain' else 'loss' end);
  return g;
end $$;

-- Sends a join request; the admin approves it. Returns the group's name.
create or replace function public.request_join(p_code text, p_category text default 'loss')
returns text language plpgsql security definer set search_path = public as $$
declare g public.groups;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into g from groups where invite_code = trim(p_code);
  if g.id is null then raise exception 'INVALID_CODE'; end if;
  if exists (select 1 from group_members where group_id = g.id and user_id = auth.uid()) then
    raise exception 'ALREADY_MEMBER';
  end if;
  if (select count(*) from group_members where group_id = g.id) >= public.group_limit_for(g.kind) then
    raise exception 'GROUP_FULL';
  end if;
  -- Admin already invited this mobile number: join straight away.
  if exists (select 1 from group_invites i where i.group_id = g.id and i.status = 'invited' and i.phone = public.my_phone()) then
    insert into group_members (group_id, user_id, category)
    values (g.id, auth.uid(), case when p_category = 'gain' then 'gain' else 'loss' end);
    update group_invites set status = 'joined', joined_at = now() where group_id = g.id and phone = public.my_phone();
    return 'JOINED:' || g.name;
  end if;
  if g.kind = 'open' then
    insert into group_members (group_id, user_id, category)
    values (g.id, auth.uid(), case when p_category = 'gain' then 'gain' else 'loss' end);
    return 'JOINED:' || g.name;
  end if;
  insert into group_join_requests (group_id, user_id, category)
  values (g.id, auth.uid(), case when p_category = 'gain' then 'gain' else 'loss' end)
  on conflict (group_id, user_id) do update set category = excluded.category, created_at = now();
  return g.name;
end $$;

create or replace function public.my_join_requests()
returns table (group_id uuid, group_name text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.group_id, g.name, r.created_at
  from group_join_requests r join groups g on g.id = r.group_id
  where r.user_id = auth.uid()
  order by r.created_at desc;
$$;

-- Admin: pending requests with the requester's basic details.
create or replace function public.list_join_requests(p_group_id uuid)
returns table (user_id uuid, name text, age int, gender text, category text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_group_admin(p_group_id) then raise exception 'NOT_ADMIN'; end if;
  return query
    select r.user_id, coalesce(p.name, '?'), p.age, p.gender, r.category, r.created_at
    from group_join_requests r left join profiles p on p.id = r.user_id
    where r.group_id = p_group_id
    order by r.created_at;
end $$;

create or replace function public.respond_join_request(p_group_id uuid, p_user uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare req public.group_join_requests;
begin
  if not public.is_group_admin(p_group_id) then raise exception 'NOT_ADMIN'; end if;
  select * into req from group_join_requests where group_id = p_group_id and user_id = p_user;
  if req.group_id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
  if p_approve then
    insert into group_members (group_id, user_id, category)
    values (p_group_id, p_user, req.category)
    on conflict do nothing;                      -- GROUP_FULL is raised by the trigger
  end if;
  delete from group_join_requests where group_id = p_group_id and user_id = p_user;
end $$;

-- Leaving: if the admin leaves, the longest-standing member becomes admin;
-- the group is deleted when the last member leaves.
create or replace function public.leave_group(p_group_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare next_admin uuid;
begin
  delete from group_members where group_id = p_group_id and user_id = auth.uid();
  select user_id into next_admin from group_members where group_id = p_group_id order by joined_at limit 1;
  if next_admin is null then
    delete from groups where id = p_group_id;
  else
    update groups set admin_id = next_admin where id = p_group_id and admin_id = auth.uid();
  end if;
end $$;

create or replace function public.remove_member(p_group_id uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_group_admin(p_group_id) then raise exception 'NOT_ADMIN'; end if;
  if p_user = auth.uid() then raise exception 'CANNOT_REMOVE_SELF'; end if;
  delete from group_members where group_id = p_group_id and user_id = p_user;
end $$;

create or replace function public.set_my_category(p_group_id uuid, p_category text)
returns void language sql security definer set search_path = public as $$
  update group_members set category = case when p_category = 'gain' then 'gain' else 'loss' end
  where group_id = p_group_id and user_id = auth.uid();
$$;

-- Totals per member between two dates (daily / weekly / monthly group report).
create or replace function public.get_group_summary(p_group_id uuid, p_from date, p_to date)
returns table (
  user_id uuid, name text, workout_minutes numeric, calories numeric,
  steps bigint, avg_sleep numeric, water_ml bigint, active_days int
) language sql stable security definer set search_path = public as $$
  select
    gm.user_id,
    coalesce(p.name, '?'),
    case when gm.user_id = auth.uid() or (gm.share_data and coalesce((p.share->>'workouts')::boolean, true)) then w.minutes end,
    case when gm.user_id = auth.uid() or (gm.share_data and g.kind = 'private' and coalesce((p.share->>'workouts')::boolean, true)) then w.calories end,
    case when gm.user_id = auth.uid() or (gm.share_data and coalesce((p.share->>'steps')::boolean, true)) then s.steps end,
    case when gm.user_id = auth.uid() or (gm.share_data and g.kind = 'private' and coalesce((p.share->>'sleep')::boolean, true)) then sl.avg end,
    case when gm.user_id = auth.uid() or (gm.share_data and g.kind = 'private' and coalesce((p.share->>'water')::boolean, true)) then wa.ml end,
    coalesce(w.days, 0)::int
  from group_members gm
  join groups g on g.id = gm.group_id
  left join profiles p on p.id = gm.user_id
  left join lateral (
    select round(coalesce(sum(coalesce(x.minutes, x.reps * coalesce(x.sets, 1) * 3 / 60.0)), 0)) as minutes,
           round(coalesce(sum(x.calories), 0)) as calories,
           count(distinct x.date) as days
    from workouts x where x.user_id = gm.user_id and x.date between p_from and p_to
  ) w on true
  left join lateral (select coalesce(sum(z.steps), 0) as steps from step_logs z
                     where z.user_id = gm.user_id and z.date between p_from and p_to) s on true
  left join lateral (select round(avg(y.hours), 1) as avg from sleep_logs y
                     where y.user_id = gm.user_id and y.date between p_from and p_to) sl on true
  left join lateral (select coalesce(sum(coalesce(nullif(v.ml, 0), v.glasses * 250)), 0) as ml from water_logs v
                     where v.user_id = gm.user_id and v.date between p_from and p_to) wa on true
  where gm.group_id = p_group_id and public.is_member(p_group_id)
  order by gm.joined_at;
$$;

-- Monthly challenge: weight change in PERCENT (fair for everyone).
-- Start = last weigh-in on/before the 1st of the month (or the first one in the month),
-- end = last weigh-in in the month. "loss" ranks by % lost, "gain" (Healthy Gain) by % gained.
-- Percentages are always visible; kg values follow the member's "share weight" setting.
create or replace function public.get_group_challenge(p_group_id uuid, p_month date)
returns table (
  user_id uuid, name text, category text,
  start_weight numeric, current_weight numeric, change_pct numeric, weigh_ins int
) language sql stable security definer set search_path = public as $$
  with bounds as (
    select date_trunc('month', p_month)::date as m_start,
           (date_trunc('month', p_month) + interval '1 month - 1 day')::date as m_end
  ),
  base as (
    select gm.user_id, gm.category, p.name, p.share,
      coalesce(
        (select x.weight_kg from weight_logs x, bounds b
          where x.user_id = gm.user_id and x.date <= b.m_start order by x.date desc limit 1),
        (select x.weight_kg from weight_logs x, bounds b
          where x.user_id = gm.user_id and x.date between b.m_start and b.m_end order by x.date limit 1)
      ) as start_w,
      (select x.weight_kg from weight_logs x, bounds b
        where x.user_id = gm.user_id and x.date between b.m_start and b.m_end order by x.date desc limit 1) as end_w,
      (select count(*) from weight_logs x, bounds b
        where x.user_id = gm.user_id and x.date between b.m_start and b.m_end)::int as n
    from group_members gm
    left join profiles p on p.id = gm.user_id
    where gm.group_id = p_group_id and public.is_member(p_group_id)
      and (gm.share_data or gm.user_id = auth.uid())
      and exists (select 1 from groups gx where gx.id = p_group_id and gx.kind = 'private')
  )
  select
    user_id, coalesce(name, '?'), category,
    case when user_id = auth.uid() or coalesce((share->>'weight')::boolean, true) then start_w end,
    case when user_id = auth.uid() or coalesce((share->>'weight')::boolean, true) then end_w end,
    case when start_w > 0 and end_w is not null then
      round(case when category = 'gain' then (end_w - start_w) else (start_w - end_w) end / start_w * 100, 2)
    end,
    n
  from base;
$$;



-- ---------------------------------------------------------------------
-- One person's day report (used by groups AND share codes).
-- INTERNAL: not callable by app users directly (it takes any user id);
-- only the SECURITY DEFINER functions below call it, after checking access.
-- Fields the person chose not to share are NULL (you always see your own).
-- ---------------------------------------------------------------------

create or replace function public.person_day(p_user uuid, p_day date)
returns table (
  name text, photo_path text, weight_kg numeric, bmi numeric,
  workout_minutes numeric, workout_calories numeric, workout_types text,
  steps int, sleep_hours numeric, water_ml int,
  food_kcal numeric, protein numeric, carbs numeric, fat numeric, target_pct int
) language sql stable security definer set search_path = public as $$
  select
    coalesce(p.name, '?'),
    case when x.me or coalesce((p.share->>'photo')::boolean, false) then p.photo_path end,
    case when x.me or coalesce((p.share->>'weight')::boolean, true) then p.weight_kg end,
    case when x.me or coalesce((p.share->>'bmi')::boolean, true)
         then round(p.weight_kg / nullif((p.height_cm / 100.0) ^ 2, 0), 1) end,
    case when x.me or coalesce((p.share->>'workouts')::boolean, true) then w.minutes end,
    case when x.me or coalesce((p.share->>'workouts')::boolean, true) then w.calories end,
    case when x.me or coalesce((p.share->>'workouts')::boolean, true) then w.types end,
    case when x.me or coalesce((p.share->>'steps')::boolean, true) then coalesce(s.steps, 0) end,
    case when x.me or coalesce((p.share->>'sleep')::boolean, true) then sl.hours end,
    case when x.me or coalesce((p.share->>'water')::boolean, true) then coalesce(wa.ml, 0) end,
    case when x.me or coalesce((p.share->>'food')::boolean, true) then fd.kcal end,
    case when x.me or coalesce((p.share->>'food')::boolean, true) then fd.protein end,
    case when x.me or coalesce((p.share->>'food')::boolean, true) then fd.carbs end,
    case when x.me or coalesce((p.share->>'food')::boolean, true) then fd.fat end,
    round(100 * (
        least(1, coalesce(s.steps, 0)::numeric / nullif(coalesce(t.steps, 8000), 0))
      + least(1, coalesce(w.minutes, 0) / nullif(coalesce(t.workout_minutes, 30), 0))
      + least(1, coalesce(sl.hours, 0) / nullif(coalesce(t.sleep_hours, 8), 0))
      + least(1, coalesce(wa.ml, 0)::numeric / nullif(coalesce(t.water_ml, 2000), 0))
    ) / 4)::int
  from (select p_user = auth.uid() as me) x
  left join profiles p on p.id = p_user
  left join lateral (
    -- count-based workouts store reps; estimate ~3 s per rep for active minutes
    select coalesce(sum(coalesce(z.minutes, z.reps * coalesce(z.sets, 1) * 3 / 60.0)), 0) as minutes,
           coalesce(sum(z.calories), 0) as calories,
           string_agg(distinct z.type, ',') as types
    from workouts z where z.user_id = p_user and z.date = p_day
  ) w on true
  left join step_logs s on s.user_id = p_user and s.date = p_day
  left join lateral (select sum(y.hours) as hours from sleep_logs y where y.user_id = p_user and y.date = p_day) sl on true
  left join lateral (
    select coalesce(nullif(v.ml, 0), v.glasses * 250) as ml
    from water_logs v where v.user_id = p_user and v.date = p_day
  ) wa on true
  left join lateral (
    select round(coalesce(sum(f.kcal), 0)) as kcal, round(coalesce(sum(f.protein), 0)) as protein,
           round(coalesce(sum(f.carbs), 0)) as carbs, round(coalesce(sum(f.fat), 0)) as fat
    from food_logs f where f.user_id = p_user and f.date = p_day
  ) fd on true
  left join targets t on t.user_id = p_user;
$$;
revoke execute on function public.person_day(uuid, date) from public, anon, authenticated;

-- One row per member of a group for a given day.
-- Private group + Shared Data ON: everything the member shares.
-- Open group + Shared Data ON: only steps, workout minutes/types and target %.
-- Shared Data OFF: only name and member code. You always see your own row.
create or replace function public.get_group_dashboard(p_group_id uuid, p_day date)
returns table (
  user_id uuid, name text, member_code text, is_admin boolean, category text, shares boolean, photo_path text,
  weight_kg numeric, bmi numeric, workout_minutes numeric, workout_calories numeric,
  workout_types text, steps int, sleep_hours numeric, water_ml int,
  food_kcal numeric, protein numeric, carbs numeric, fat numeric, target_pct int,
  cheers_today int, i_cheered boolean
) language sql stable security definer set search_path = public as $$
  select
    gm.user_id, d.name, public.member_label(p.member_no), g.admin_id = gm.user_id, gm.category, gm.share_data,
    case when x.full_ then d.photo_path end,
    case when x.full_ then d.weight_kg end,
    case when x.full_ then d.bmi end,
    case when x.lim then d.workout_minutes end,
    case when x.full_ then d.workout_calories end,
    case when x.lim then d.workout_types end,
    case when x.lim then d.steps end,
    case when x.full_ then d.sleep_hours end,
    case when x.full_ then d.water_ml end,
    case when x.full_ then d.food_kcal end,
    case when x.full_ then d.protein end,
    case when x.full_ then d.carbs end,
    case when x.full_ then d.fat end,
    case when x.lim then d.target_pct end,
    (select count(*) from cheers c where c.to_user = gm.user_id and c.group_id = p_group_id and c.date = p_day)::int,
    exists (select 1 from cheers c where c.to_user = gm.user_id and c.from_user = auth.uid()
            and c.group_id = p_group_id and c.date = p_day)
  from group_members gm
  join groups g on g.id = gm.group_id
  left join profiles p on p.id = gm.user_id
  cross join lateral (
    select (gm.user_id = auth.uid()) or (gm.share_data and g.kind = 'private') as full_,
           (gm.user_id = auth.uid()) or gm.share_data as lim
  ) x
  cross join lateral public.person_day(gm.user_id, p_day) d
  where gm.group_id = p_group_id and public.is_member(p_group_id)
  order by gm.joined_at;
$$;

-- ---------------------------------------------------------------------
-- Group Login without email: each person has a Member No (HT001…) and a PIN.
-- Anyone who enters both can view that person's day report (respecting their
-- share settings) until removed or the PIN is changed.
-- ---------------------------------------------------------------------

alter table public.profiles add column if not exists share_code text unique;

create table if not exists public.share_links (
  owner_id    uuid not null references auth.users (id) on delete cascade,
  viewer_id   uuid not null references auth.users (id) on delete cascade,
  viewer_name text not null default '',
  created_at  timestamptz not null default now(),
  primary key (owner_id, viewer_id)
);
alter table public.share_links enable row level security;
-- No direct table policies: everything goes through the functions below.

-- Day report for everyone whose code I entered.
create or replace function public.get_shared_dashboard(p_day date)
returns table (
  user_id uuid, name text, photo_path text, weight_kg numeric, bmi numeric,
  workout_minutes numeric, workout_calories numeric, workout_types text,
  steps int, sleep_hours numeric, water_ml int,
  food_kcal numeric, protein numeric, carbs numeric, fat numeric, target_pct int
) language sql stable security definer set search_path = public as $$
  select l.owner_id, d.name, d.photo_path, d.weight_kg, d.bmi,
         d.workout_minutes, d.workout_calories, d.workout_types,
         d.steps, d.sleep_hours, d.water_ml, d.food_kcal, d.protein, d.carbs, d.fat, d.target_pct
  from share_links l
  cross join lateral public.person_day(l.owner_id, p_day) d
  where l.viewer_id = auth.uid()
  order by l.created_at;
$$;

-- Owner: who can see my data.
create or replace function public.my_viewers()
returns table (viewer_id uuid, viewer_name text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select l.viewer_id, l.viewer_name, l.created_at from share_links l
  where l.owner_id = auth.uid() order by l.created_at;
$$;

create or replace function public.remove_viewer(p_viewer uuid)
returns void language sql security definer set search_path = public as $$
  delete from share_links where owner_id = auth.uid() and viewer_id = p_viewer;
$$;

-- Viewer: stop following someone.
create or replace function public.remove_shared(p_owner uuid)
returns void language sql security definer set search_path = public as $$
  delete from share_links where viewer_id = auth.uid() and owner_id = p_owner;
$$;

revoke execute on function
  public.get_shared_dashboard(date), public.my_viewers(), public.remove_viewer(uuid), public.remove_shared(uuid)
from anon, public;
grant execute on function
  public.get_shared_dashboard(date), public.my_viewers(), public.remove_viewer(uuid), public.remove_shared(uuid)
to authenticated;

-- Only signed-in users may call the functions.
revoke execute on function
  public.create_group(text, text, text, text), public.request_join(text, text), public.my_join_requests(),
  public.list_join_requests(uuid), public.respond_join_request(uuid, uuid, boolean),
  public.leave_group(uuid), public.remove_member(uuid, uuid), public.set_my_category(uuid, text),
  public.get_group_dashboard(uuid, date), public.get_group_summary(uuid, date, date),
  public.get_group_challenge(uuid, date)
from anon, public;
grant execute on function
  public.create_group(text, text, text, text), public.request_join(text, text), public.my_join_requests(),
  public.list_join_requests(uuid), public.respond_join_request(uuid, uuid, boolean),
  public.leave_group(uuid), public.remove_member(uuid, uuid), public.set_my_category(uuid, text),
  public.get_group_dashboard(uuid, date), public.get_group_summary(uuid, date, date),
  public.get_group_challenge(uuid, date)
to authenticated;

-- Member numbers (HT001, HT002 …) + 4-digit PIN for Group Login.
-- The number is easy to say; the PIN stops strangers from simply trying numbers.
-- After 5 wrong PINs in an hour, that member number is locked for the hour.

drop function if exists public.my_share_code();
drop function if exists public.reset_share_code();
drop function if exists public.add_share_code(text, text);
drop function if exists public.new_share_code();

create sequence if not exists public.member_no_seq start 1;
alter table public.profiles add column if not exists member_no int unique;
alter table public.profiles add column if not exists share_pin text;

create table if not exists public.share_attempts (
  owner_id uuid not null references auth.users (id) on delete cascade,
  at       timestamptz not null default now()
);
create index if not exists share_attempts_owner_at on public.share_attempts (owner_id, at);
alter table public.share_attempts enable row level security;  -- no policies: functions only

create or replace function public.new_pin()
returns text language sql volatile as $$
  select lpad(((get_byte(b, 0) * 256 + get_byte(b, 1)) % 10000)::text, 4, '0')
  from (select uuid_send(gen_random_uuid()) as b) x;
$$;
revoke execute on function public.new_pin() from public, anon, authenticated;

-- "HT001"
create or replace function public.member_label(n int)
returns text language sql immutable as $$ select 'HT' || lpad(n::text, 3, '0') $$;

-- My member number and PIN (created the first time).
create or replace function public.my_member_card()
returns table (member_id text, pin text)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not exists (select 1 from profiles where id = auth.uid()) then raise exception 'NO_PROFILE'; end if;
  update profiles set member_no = nextval('public.member_no_seq')
    where id = auth.uid() and member_no is null;
  update profiles set share_pin = public.new_pin()
    where id = auth.uid() and share_pin is null;
  return query
    select public.member_label(p.member_no), p.share_pin from profiles p where p.id = auth.uid();
end $$;

-- New PIN; everyone who used the old one loses access.
create or replace function public.reset_member_pin()
returns table (member_id text, pin text)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid()) then raise exception 'NO_PROFILE'; end if;
  update profiles set share_pin = public.new_pin() where id = auth.uid();
  delete from share_links where owner_id = auth.uid();
  return query select * from public.my_member_card();
end $$;

-- Viewer enters Member No + PIN. Returns 'OK:<name>' or an error word.
-- (Returns instead of raising so failed attempts are kept for the lock-out.)
create or replace function public.add_member(p_member_id text, p_pin text, p_name text default '')
returns text language plpgsql security definer set search_path = public as $$
declare
  v_owner public.profiles;
  v_no int := nullif(regexp_replace(coalesce(p_member_id, ''), '[^0-9]', '', 'g'), '')::int;
begin
  if auth.uid() is null then return 'NOT_AUTHENTICATED'; end if;
  if v_no is null then return 'MEMBER_NOT_FOUND'; end if;
  select * into v_owner from profiles where member_no = v_no;
  if v_owner.id is null then return 'MEMBER_NOT_FOUND'; end if;
  if v_owner.id = auth.uid() then return 'OWN_CODE'; end if;
  if (select count(*) from share_attempts a where a.owner_id = v_owner.id and a.at > now() - interval '1 hour') >= 5 then
    return 'TOO_MANY_TRIES';
  end if;
  if v_owner.share_pin is null or trim(coalesce(p_pin, '')) <> v_owner.share_pin then
    insert into share_attempts (owner_id) values (v_owner.id);
    return 'WRONG_PIN';
  end if;
  if (select count(*) from share_links where viewer_id = auth.uid()) >= 20 then return 'TOO_MANY_PEOPLE'; end if;
  insert into share_links (owner_id, viewer_id, viewer_name)
  values (v_owner.id, auth.uid(), left(trim(coalesce(p_name, '')), 40))
  on conflict (owner_id, viewer_id) do update set viewer_name = excluded.viewer_name;
  return 'OK:' || coalesce(v_owner.name, '');
end $$;

revoke execute on function public.my_member_card(), public.reset_member_pin(), public.add_member(text, text, text)
from anon, public;
grant execute on function public.my_member_card(), public.reset_member_pin(), public.add_member(text, text, text)
to authenticated;
grant usage on sequence public.member_no_seq to service_role;

-- =====================================================================
-- Group Access v2: open groups, Shared Data switch, help line, meeting,
-- Q&A board, group targets with rewards.
-- =====================================================================

-- My groups with member count and my role.
create or replace function public.my_groups()
returns table (
  id uuid, name text, kind text, description text, invite_code text, admin_id uuid,
  helpline text, meeting_room text, members int, is_admin boolean, my_share boolean, created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.kind, g.description, g.invite_code, g.admin_id, g.helpline, g.meeting_room,
         (select count(*) from group_members x where x.group_id = g.id)::int,
         g.admin_id = auth.uid(), gm.share_data, g.created_at
  from group_members gm join groups g on g.id = gm.group_id
  where gm.user_id = auth.uid()
  order by g.created_at;
$$;

-- Find open groups by name.
create or replace function public.list_open_groups(p_search text default '')
returns table (id uuid, name text, description text, members int, is_member boolean)
language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.description,
         (select count(*) from group_members x where x.group_id = g.id)::int,
         public.is_member(g.id)
  from groups g
  where g.kind = 'open'
    and (coalesce(trim(p_search), '') = '' or g.name ilike '%' || trim(p_search) || '%')
  order by 4 desc, g.created_at desc
  limit 30;
$$;

create or replace function public.join_open_group(p_group_id uuid, p_category text default 'loss')
returns text language plpgsql security definer set search_path = public as $$
declare g public.groups;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into g from groups where id = p_group_id and kind = 'open';
  if g.id is null then raise exception 'INVALID_CODE'; end if;
  if public.is_member(g.id) then raise exception 'ALREADY_MEMBER'; end if;
  if (select count(*) from group_members where user_id = auth.uid()) >= 10 then raise exception 'TOO_MANY_GROUPS'; end if;
  insert into group_members (group_id, user_id, category)
  values (g.id, auth.uid(), case when p_category = 'gain' then 'gain' else 'loss' end);
  return g.name;
end $$;

create or replace function public.set_my_share_data(p_group_id uuid, p_on boolean)
returns void language sql security definer set search_path = public as $$
  update group_members set share_data = p_on where group_id = p_group_id and user_id = auth.uid();
$$;

-- Admin sets the group's help-line number (empty = remove).
create or replace function public.set_group_helpline(p_group_id uuid, p_phone text)
returns void language plpgsql security definer set search_path = public as $$
declare v text := nullif(trim(coalesce(p_phone, '')), '');
begin
  if not public.is_group_admin(p_group_id) then raise exception 'NOT_ADMIN'; end if;
  if v is not null and v !~ '^\+?[0-9][0-9 -]{5,18}$' then raise exception 'INVALID_PHONE'; end if;
  update groups set helpline = v where id = p_group_id;
end $$;

-- ---------- Q&A board ----------

create table if not exists public.group_questions (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists group_questions_group on public.group_questions (group_id, created_at);

create table if not exists public.group_answers (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.group_questions (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index if not exists group_answers_question on public.group_answers (question_id, created_at);

alter table public.group_questions enable row level security;
alter table public.group_answers enable row level security;

drop policy if exists "members read questions" on public.group_questions;
create policy "members read questions" on public.group_questions for select to authenticated
  using (public.is_member(group_id));
drop policy if exists "members ask" on public.group_questions;
create policy "members ask" on public.group_questions for insert to authenticated
  with check (user_id = auth.uid() and public.is_member(group_id));
drop policy if exists "author or admin deletes question" on public.group_questions;
create policy "author or admin deletes question" on public.group_questions for delete to authenticated
  using (user_id = auth.uid() or public.is_group_admin(group_id));

drop policy if exists "members read answers" on public.group_answers;
create policy "members read answers" on public.group_answers for select to authenticated
  using (exists (select 1 from public.group_questions q where q.id = question_id and public.is_member(q.group_id)));
drop policy if exists "members answer" on public.group_answers;
create policy "members answer" on public.group_answers for insert to authenticated
  with check (user_id = auth.uid()
    and exists (select 1 from public.group_questions q where q.id = question_id and public.is_member(q.group_id)));
drop policy if exists "author or admin deletes answer" on public.group_answers;
create policy "author or admin deletes answer" on public.group_answers for delete to authenticated
  using (user_id = auth.uid()
    or exists (select 1 from public.group_questions q where q.id = question_id and public.is_group_admin(q.group_id)));

create or replace function public.get_group_qa(p_group_id uuid)
returns table (id uuid, user_id uuid, author text, body text, created_at timestamptz, answers jsonb)
language sql stable security definer set search_path = public as $$
  select q.id, q.user_id, coalesce(p.name, '?'), q.body, q.created_at,
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'id', a.id, 'user_id', a.user_id, 'author', coalesce(pa.name, '?'),
                    'body', a.body, 'created_at', a.created_at) order by a.created_at)
           from group_answers a left join profiles pa on pa.id = a.user_id
           where a.question_id = q.id), '[]'::jsonb)
  from group_questions q left join profiles p on p.id = q.user_id
  where q.group_id = p_group_id and public.is_member(p_group_id)
  order by q.created_at desc
  limit 50;
$$;

-- ---------- Group targets + rewards ----------
-- Rewards when the group reaches its target: 1st = Gold (100 pts), 2nd–3rd = Silver (50 pts),
-- everyone else who contributed = +10 pts. Members with Shared Data OFF are not counted.

create table if not exists public.group_targets (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  kind       text not null check (kind in ('steps', 'workout_minutes', 'calories', 'weight_loss')),
  value      numeric(10, 1) not null check (value > 0),
  start_date date not null,
  end_date   date not null,
  gold       boolean not null default true,
  silver     boolean not null default true,
  points     boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists group_targets_group on public.group_targets (group_id, start_date);
alter table public.group_targets enable row level security;  -- no policies: functions only

-- INTERNAL: each counted member's progress for one target, up to p_today.
create or replace function public.target_values(p_target uuid, p_today date)
returns table (user_id uuid, val numeric)
language sql stable security definer set search_path = public as $$
  with t as (select *, least(end_date, p_today) as upto from group_targets where id = p_target)
  select gm.user_id,
    coalesce(case t.kind
      when 'steps' then (select sum(z.steps) from step_logs z
                         where z.user_id = gm.user_id and z.date between t.start_date and t.upto)
      when 'workout_minutes' then (select round(sum(coalesce(x.minutes, x.reps * coalesce(x.sets, 1) * 3 / 60.0))) from workouts x
                         where x.user_id = gm.user_id and x.date between t.start_date and t.upto)
      when 'calories' then (select round(sum(x.calories)) from workouts x
                         where x.user_id = gm.user_id and x.date between t.start_date and t.upto)
      when 'weight_loss' then greatest(0,
          coalesce(
            (select w.weight_kg from weight_logs w where w.user_id = gm.user_id and w.date <= t.start_date order by w.date desc limit 1),
            (select w.weight_kg from weight_logs w where w.user_id = gm.user_id and w.date between t.start_date and t.upto order by w.date limit 1))
          - (select w.weight_kg from weight_logs w where w.user_id = gm.user_id and w.date between t.start_date and t.upto order by w.date desc limit 1))
    end, 0)::numeric
  from t join group_members gm on gm.group_id = t.group_id
  where gm.share_data;
$$;
revoke execute on function public.target_values(uuid, date) from public, anon, authenticated;

-- Admin sets a target (this week, next week, this month …). Open groups: steps / workout minutes only.
create or replace function public.set_group_target(
  p_group_id uuid, p_kind text, p_value numeric, p_start date, p_end date,
  p_gold boolean default true, p_silver boolean default true, p_points boolean default true)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_kind text;
begin
  if not public.is_group_admin(p_group_id) then raise exception 'NOT_ADMIN'; end if;
  select kind into v_kind from groups where id = p_group_id;
  if v_kind = 'open' and p_kind not in ('steps', 'workout_minutes') then raise exception 'OPEN_GROUP_LIMITED'; end if;
  -- Replace any target in the same group that overlaps these dates.
  delete from group_targets where group_id = p_group_id and start_date <= p_end and end_date >= p_start;
  insert into group_targets (group_id, kind, value, start_date, end_date, gold, silver, points)
  values (p_group_id, p_kind, p_value, p_start, p_end, p_gold, p_silver, p_points)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.delete_group_target(p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from group_targets t where t.id = p_target and public.is_group_admin(t.group_id)) then
    raise exception 'NOT_ADMIN';
  end if;
  delete from group_targets where id = p_target;
end $$;

-- Targets of a group (latest first) with live totals; status relative to the phone's date.
create or replace function public.get_group_targets(p_group_id uuid, p_today date)
returns table (
  id uuid, kind text, value numeric, start_date date, end_date date,
  gold boolean, silver boolean, points boolean, total numeric, status text
) language sql stable security definer set search_path = public as $$
  select t.id, t.kind, t.value, t.start_date, t.end_date, t.gold, t.silver, t.points,
         coalesce((select sum(v.val) from public.target_values(t.id, p_today) v), 0),
         case when p_today < t.start_date then 'upcoming' when p_today > t.end_date then 'done' else 'active' end
  from group_targets t
  where t.group_id = p_group_id and public.is_member(p_group_id)
  order by t.start_date desc
  limit 20;
$$;

-- Leaderboard for one target. rnk is null for members with no progress (or not sharing).
create or replace function public.get_target_board(p_target uuid, p_today date)
returns table (user_id uuid, name text, member_code text, val numeric, rnk int, counted boolean)
language sql stable security definer set search_path = public as $$
  select gm.user_id, coalesce(p.name, '?'), public.member_label(p.member_no), v.val,
         case when coalesce(v.val, 0) > 0 then (rank() over (order by coalesce(v.val, 0) desc))::int end,
         v.user_id is not null
  from group_targets t
  join group_members gm on gm.group_id = t.group_id
  left join profiles p on p.id = gm.user_id
  left join public.target_values(p_target, p_today) v on v.user_id = gm.user_id
  where t.id = p_target and public.is_member(t.group_id)
  order by coalesce(v.val, -1) desc, gm.joined_at;
$$;

-- Points earned so far in a group (only targets the group actually reached).
create or replace function public.get_group_points(p_group_id uuid, p_today date)
returns table (user_id uuid, name text, gold int, silver int, total int)
language sql stable security definer set search_path = public as $$
  with tg as (
    select t.*, (select coalesce(sum(v.val), 0) from public.target_values(t.id, p_today) v) as sum_val
    from group_targets t
    where t.group_id = p_group_id and public.is_member(p_group_id) and t.start_date <= p_today
  ),
  ranked as (
    select a.gold as g_on, a.silver as s_on, a.points as p_on, v.user_id,
           rank() over (partition by a.id order by v.val desc) as r
    from tg a cross join lateral public.target_values(a.id, p_today) v
    where a.sum_val >= a.value and v.val > 0
  )
  select r.user_id, coalesce(p.name, '?'),
         count(*) filter (where r.r = 1 and r.g_on)::int,
         count(*) filter (where r.r in (2, 3) and r.s_on)::int,
         sum(case when r.r = 1 and r.g_on then 100
                  when r.r in (2, 3) and r.s_on then 50
                  when r.r >= 4 and r.p_on then 10 else 0 end)::int
  from ranked r left join profiles p on p.id = r.user_id
  group by r.user_id, p.name
  order by 5 desc;
$$;

revoke execute on function
  public.my_groups(), public.list_open_groups(text), public.join_open_group(uuid, text),
  public.set_my_share_data(uuid, boolean), public.set_group_helpline(uuid, text), public.get_group_qa(uuid),
  public.set_group_target(uuid, text, numeric, date, date, boolean, boolean, boolean),
  public.delete_group_target(uuid), public.get_group_targets(uuid, date),
  public.get_target_board(uuid, date), public.get_group_points(uuid, date)
from anon, public;
grant execute on function
  public.my_groups(), public.list_open_groups(text), public.join_open_group(uuid, text),
  public.set_my_share_data(uuid, boolean), public.set_group_helpline(uuid, text), public.get_group_qa(uuid),
  public.set_group_target(uuid, text, numeric, date, date, boolean, boolean, boolean),
  public.delete_group_target(uuid), public.get_group_targets(uuid, date),
  public.get_target_board(uuid, date), public.get_group_points(uuid, date)
to authenticated;

-- =====================================================================
-- Add member by mobile number → WhatsApp invite → auto-join on login
-- =====================================================================

create table if not exists public.group_invites (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  name       text not null default '',
  phone      text not null check (phone ~ '^[0-9]{11,15}$'),  -- digits with country code, e.g. 919876543210
  status     text not null default 'invited' check (status in ('invited', 'joined')),
  invited_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  joined_at  timestamptz,
  unique (group_id, phone)
);
alter table public.group_invites enable row level security;  -- no policies: functions only

-- "+91 98765 43210" / "9876543210" → "919876543210" (10 digits get India's 91).
create or replace function public.normalize_phone(p text)
returns text language sql immutable as $$
  select case
    when length(d) = 10 then '91' || d
    when length(d) = 12 and left(d, 2) = '91' then d
    when length(d) between 11 and 15 then d
    else null end
  from (select ltrim(regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g'), '0') as d) x;
$$;

-- The signed-in user's phone (set by phone OTP login), normalised.
create or replace function public.my_phone()
returns text language sql stable security definer set search_path = public, auth as $$
  select public.normalize_phone(u.phone) from auth.users u where u.id = auth.uid();
$$;
revoke execute on function public.my_phone() from public, anon, authenticated;

-- Admin adds a member by name + mobile number (pending invites count towards the size limit).
create or replace function public.add_group_invite(p_group_id uuid, p_name text, p_phone text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_phone text := public.normalize_phone(p_phone); v_kind text; v_id uuid;
begin
  if not public.is_group_admin(p_group_id) then raise exception 'NOT_ADMIN'; end if;
  if v_phone is null then raise exception 'INVALID_PHONE'; end if;
  select kind into v_kind from groups where id = p_group_id;
  if (select count(*) from group_members where group_id = p_group_id)
     + (select count(*) from group_invites where group_id = p_group_id and status = 'invited' and phone <> v_phone)
     >= public.group_limit_for(v_kind) then
    raise exception 'GROUP_FULL';
  end if;
  insert into group_invites (group_id, name, phone)
  values (p_group_id, left(trim(coalesce(p_name, '')), 40), v_phone)
  on conflict (group_id, phone) do update set name = excluded.name, created_at = now()
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.list_group_invites(p_group_id uuid)
returns table (id uuid, name text, phone text, status text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_group_admin(p_group_id) then raise exception 'NOT_ADMIN'; end if;
  return query
    select i.id, i.name, i.phone, i.status, i.created_at from group_invites i
    where i.group_id = p_group_id order by i.status, i.created_at desc;
end $$;

create or replace function public.delete_group_invite(p_invite uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from group_invites i where i.id = p_invite and public.is_group_admin(i.group_id)) then
    raise exception 'NOT_ADMIN';
  end if;
  delete from group_invites where id = p_invite;
end $$;

-- After login: join every group that invited my mobile number. Returns the group names joined.
create or replace function public.claim_my_invites()
returns setof text language plpgsql security definer set search_path = public as $$
declare v_phone text := public.my_phone(); r record;
begin
  if auth.uid() is null or v_phone is null then return; end if;
  for r in
    select i.id, i.group_id, g.name from group_invites i join groups g on g.id = i.group_id
    where i.phone = v_phone and i.status = 'invited'
  loop
    begin
      insert into group_members (group_id, user_id) values (r.group_id, auth.uid()) on conflict do nothing;
      update group_invites set status = 'joined', joined_at = now() where id = r.id;
      delete from group_join_requests where group_id = r.group_id and user_id = auth.uid();
      return next r.name;
    exception when others then
      -- group full or similar: leave the invite pending
      null;
    end;
  end loop;
end $$;

revoke execute on function
  public.add_group_invite(uuid, text, text), public.list_group_invites(uuid),
  public.delete_group_invite(uuid), public.claim_my_invites()
from anon, public;
grant execute on function
  public.add_group_invite(uuid, text, text), public.list_group_invites(uuid),
  public.delete_group_invite(uuid), public.claim_my_invites()
to authenticated;

-- ---------------------------------------------------------------------
-- Table privileges for the API roles.
-- Newer Supabase projects do NOT grant these automatically for tables made in SQL,
-- and without them every request fails with "permission denied" (42501).
-- Row Level Security above still limits each user to their own rows / their groups.
-- ---------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
-- Signed-out (anon) users get no table access at all.
revoke all on all tables in schema public from anon;
