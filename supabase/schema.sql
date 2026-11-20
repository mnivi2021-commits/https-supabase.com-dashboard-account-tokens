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

-- Max 5 members per group (row lock prevents two approvals at the same moment).
create or replace function public.enforce_group_limit()
returns trigger language plpgsql as $$
begin
  perform 1 from public.groups where id = new.group_id for update;
  if (select count(*) from public.group_members where group_id = new.group_id) >= 5 then
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
-- Return columns changed (food added), so recreate:
drop function if exists public.get_group_dashboard(uuid, date);

-- ---------------------------------------------------------------------
-- Group functions (called from the app with supabase.rpc)
-- ---------------------------------------------------------------------

create or replace function public.create_group(p_name text, p_category text default 'loss')
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
  insert into groups (name, invite_code, admin_id)
  values (coalesce(nullif(trim(p_name), ''), 'My Group'), code, auth.uid())
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
  if (select count(*) from group_members where group_id = g.id) >= 5 then
    raise exception 'GROUP_FULL';
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

-- One row per member of a group for a given day. Fields a member chose not to
-- share are NULL (you always see your own data).
create or replace function public.get_group_dashboard(p_group_id uuid, p_day date)
returns table (
  user_id uuid, name text, is_admin boolean, category text, photo_path text,
  weight_kg numeric, bmi numeric, workout_minutes numeric, workout_calories numeric,
  workout_types text, steps int, sleep_hours numeric, water_ml int,
  food_kcal numeric, protein numeric, carbs numeric, fat numeric, target_pct int,
  cheers_today int, i_cheered boolean
) language sql stable security definer set search_path = public as $$
  with m as (
    select gm.user_id, gm.category, gm.joined_at, g.admin_id, p.*,
           (gm.user_id = auth.uid()) as me
    from group_members gm
    join groups g on g.id = gm.group_id
    left join profiles p on p.id = gm.user_id
    where gm.group_id = p_group_id and public.is_member(p_group_id)
  )
  select
    m.user_id,
    coalesce(m.name, '?'),
    m.admin_id = m.user_id,
    m.category,
    case when m.me or coalesce((m.share->>'photo')::boolean, false) then m.photo_path end,
    case when m.me or coalesce((m.share->>'weight')::boolean, true) then m.weight_kg end,
    case when m.me or coalesce((m.share->>'bmi')::boolean, true)
         then round(m.weight_kg / nullif((m.height_cm / 100.0) ^ 2, 0), 1) end,
    case when m.me or coalesce((m.share->>'workouts')::boolean, true) then w.minutes end,
    case when m.me or coalesce((m.share->>'workouts')::boolean, true) then w.calories end,
    case when m.me or coalesce((m.share->>'workouts')::boolean, true) then w.types end,
    case when m.me or coalesce((m.share->>'steps')::boolean, true) then coalesce(s.steps, 0) end,
    case when m.me or coalesce((m.share->>'sleep')::boolean, true) then sl.hours end,
    case when m.me or coalesce((m.share->>'water')::boolean, true) then coalesce(wa.ml, 0) end,
    case when m.me or coalesce((m.share->>'food')::boolean, true) then fd.kcal end,
    case when m.me or coalesce((m.share->>'food')::boolean, true) then fd.protein end,
    case when m.me or coalesce((m.share->>'food')::boolean, true) then fd.carbs end,
    case when m.me or coalesce((m.share->>'food')::boolean, true) then fd.fat end,
    round(100 * (
        least(1, coalesce(s.steps, 0)::numeric / nullif(coalesce(t.steps, 8000), 0))
      + least(1, coalesce(w.minutes, 0) / nullif(coalesce(t.workout_minutes, 30), 0))
      + least(1, coalesce(sl.hours, 0) / nullif(coalesce(t.sleep_hours, 8), 0))
      + least(1, coalesce(wa.ml, 0)::numeric / nullif(coalesce(t.water_ml, 2000), 0))
    ) / 4)::int,
    (select count(*) from cheers c where c.to_user = m.user_id and c.group_id = p_group_id and c.date = p_day)::int,
    exists (select 1 from cheers c where c.to_user = m.user_id and c.from_user = auth.uid()
            and c.group_id = p_group_id and c.date = p_day)
  from m
  left join lateral (
    -- count-based workouts store reps; estimate ~3 s per rep for active minutes
    select coalesce(sum(coalesce(x.minutes, x.reps * coalesce(x.sets, 1) * 3 / 60.0)), 0) as minutes,
           coalesce(sum(x.calories), 0) as calories,
           string_agg(distinct x.type, ',') as types
    from workouts x where x.user_id = m.user_id and x.date = p_day
  ) w on true
  left join step_logs s on s.user_id = m.user_id and s.date = p_day
  left join lateral (select sum(hours) as hours from sleep_logs y where y.user_id = m.user_id and y.date = p_day) sl on true
  left join lateral (
    select coalesce(nullif(v.ml, 0), v.glasses * 250) as ml
    from water_logs v where v.user_id = m.user_id and v.date = p_day
  ) wa on true
  left join lateral (
    select round(coalesce(sum(z.kcal), 0)) as kcal, round(coalesce(sum(z.protein), 0)) as protein,
           round(coalesce(sum(z.carbs), 0)) as carbs, round(coalesce(sum(z.fat), 0)) as fat
    from food_logs z where z.user_id = m.user_id and z.date = p_day
  ) fd on true
  left join targets t on t.user_id = m.user_id
  order by m.joined_at;
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
    case when gm.user_id = auth.uid() or coalesce((p.share->>'workouts')::boolean, true) then w.minutes end,
    case when gm.user_id = auth.uid() or coalesce((p.share->>'workouts')::boolean, true) then w.calories end,
    case when gm.user_id = auth.uid() or coalesce((p.share->>'steps')::boolean, true) then s.steps end,
    case when gm.user_id = auth.uid() or coalesce((p.share->>'sleep')::boolean, true) then sl.avg end,
    case when gm.user_id = auth.uid() or coalesce((p.share->>'water')::boolean, true) then wa.ml end,
    coalesce(w.days, 0)::int
  from group_members gm
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

-- Only signed-in users may call the functions.
revoke execute on function
  public.create_group(text, text), public.request_join(text, text), public.my_join_requests(),
  public.list_join_requests(uuid), public.respond_join_request(uuid, uuid, boolean),
  public.leave_group(uuid), public.remove_member(uuid, uuid), public.set_my_category(uuid, text),
  public.get_group_dashboard(uuid, date), public.get_group_summary(uuid, date, date),
  public.get_group_challenge(uuid, date)
from anon, public;
grant execute on function
  public.create_group(text, text), public.request_join(text, text), public.my_join_requests(),
  public.list_join_requests(uuid), public.respond_join_request(uuid, uuid, boolean),
  public.leave_group(uuid), public.remove_member(uuid, uuid), public.set_my_category(uuid, text),
  public.get_group_dashboard(uuid, date), public.get_group_summary(uuid, date, date),
  public.get_group_challenge(uuid, date)
to authenticated;
