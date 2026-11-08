-- Activity, devices and events for the admin site (islandia-admin), modelled on little-steps-admin.
--
-- The app calls mark_active() at launch and on each return to the foreground (src/activity.ts):
-- it records one row per user per Taiwan day and the device the user was last seen on.
-- Events (src/analytics.ts) are insert-only. Nothing here is readable by the app.
-- Accounts made before the app reported devices get their platform from the auth session's user agent.

-- ── tables ─────────────────────────────────────────────────────────

create table public.user_devices (
  user_id uuid primary key references auth.users (id) on delete cascade,
  platform text,          -- ios | android | web
  device_model text,      -- "iPhone 15 Pro", "Pixel 8"
  os_version text,
  app_version text,       -- "1.0.0 (18)"
  locale text,
  is_dev boolean not null default false,   -- __DEV__ build (Expo Go, simulator)
  has_full boolean,
  collected int,          -- collections on the phone, synced or not
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table public.user_active_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  first_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table public.app_events (
  id bigserial primary key,
  user_id uuid references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 64),
  props jsonb not null default '{}'::jsonb check (octet_length(props::text) <= 2000),
  created_at timestamptz not null default now()
);
create index app_events_created_at_idx on public.app_events (created_at desc);
create index app_events_user_idx on public.app_events (user_id, created_at desc);

-- accounts left out of the activity numbers: the owner, demo and store-review devices
create table public.internal_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reason text not null default 'owner',
  created_at timestamptz not null default now()
);

alter table public.user_devices enable row level security;
alter table public.user_active_days enable row level security;
alter table public.app_events enable row level security;
alter table public.internal_users enable row level security;

create policy "insert own events"
  on public.app_events
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on public.user_devices, public.user_active_days, public.app_events, public.internal_users from anon, authenticated;
grant insert on public.app_events to authenticated;
grant usage on sequence public.app_events_id_seq to authenticated;
grant all on public.user_devices, public.user_active_days, public.app_events, public.internal_users to service_role;
grant usage on sequence public.app_events_id_seq to service_role;

-- ── the app's one write: "I'm here, on this device" ────────────────

create function public.mark_active(
  p_platform text default null,
  p_device_model text default null,
  p_os_version text default null,
  p_app_version text default null,
  p_locale text default null,
  p_is_dev boolean default false,
  p_has_full boolean default null,
  p_collected int default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  insert into public.user_active_days (user_id, day)
  values (uid, (now() at time zone 'Asia/Taipei')::date)
  on conflict do nothing;
  insert into public.user_devices as d
    (user_id, platform, device_model, os_version, app_version, locale, is_dev, has_full, collected)
  values (uid, left(p_platform, 16), left(p_device_model, 64), left(p_os_version, 32), left(p_app_version, 32),
          left(p_locale, 16), coalesce(p_is_dev, false), p_has_full, p_collected)
  on conflict (user_id) do update set
    platform = coalesce(excluded.platform, d.platform),
    device_model = coalesce(excluded.device_model, d.device_model),
    os_version = coalesce(excluded.os_version, d.os_version),
    app_version = coalesce(excluded.app_version, d.app_version),
    locale = coalesce(excluded.locale, d.locale),
    is_dev = excluded.is_dev,
    has_full = coalesce(excluded.has_full, d.has_full),
    collected = coalesce(excluded.collected, d.collected),
    last_seen_at = now();
end
$$;

revoke execute on function public.mark_active from public, anon;
grant execute on function public.mark_active to authenticated;

-- ── views (owner's rights because they read auth.*; revoked from the API roles at the bottom) ──

-- Sign-ins with the client read from the user agent:
-- okhttp = Android app, Islandia/<build> = iOS app, Expo/ = Expo Go (development), node = scripts.
create view public.v_admin_user_sessions as
select
  s.user_id,
  s.created_at as signed_in_at,
  greatest(s.created_at, s.updated_at, s.refreshed_at) as last_used_at,
  s.not_after as expires_at,
  s.user_agent,
  case
    when s.user_agent ilike 'okhttp%' then 'android'
    when s.user_agent ~ '^Islandia/' then 'ios'
    when s.user_agent ilike 'Expo/%' then 'dev'
    else 'other'
  end as platform,
  case
    when s.user_agent ilike 'okhttp%' then 'Android App'
    when s.user_agent ~ '^Islandia/' then 'iOS App build ' || substring(s.user_agent from '^Islandia/(\d+)')
    when s.user_agent ilike 'Expo/%' then 'Expo Go（開發）'
    when s.user_agent = 'node' then '後台／腳本'
    else coalesce(s.user_agent, '未知')
  end as client
from auth.sessions s;

-- Accounts that never count: internal_users, admins, and anything seen only in development.
create view public.v_excluded_users as
select user_id, reason from public.internal_users
union
select user_id, 'admin' from public.admins
union
select user_id, 'dev' from public.user_devices where is_dev
union
select user_id, 'dev' from public.v_admin_user_sessions
group by user_id having bool_and(platform in ('dev', 'other'));

-- Every Taiwan day a user did anything, including days before the app called mark_active().
create view public.v_user_active_days as
select distinct user_id, day from (
  select user_id, day from public.user_active_days
  union all
  select user_id, (checked_in_at at time zone 'Asia/Taipei')::date from public.collections
  union all
  select user_id, (updated_at at time zone 'Asia/Taipei')::date from public.collections
  union all
  select user_id, (created_at at time zone 'Asia/Taipei')::date from public.feedback where user_id is not null
  union all
  select user_id, (created_at at time zone 'Asia/Taipei')::date from public.app_events where user_id is not null
  union all
  select id, (created_at at time zone 'Asia/Taipei')::date from auth.users
  union all
  select id, (last_sign_in_at at time zone 'Asia/Taipei')::date from auth.users where last_sign_in_at is not null
  union all
  select user_id, (last_used_at at time zone 'Asia/Taipei')::date from public.v_admin_user_sessions
) d
where day is not null;

-- replaces the first version (20261108000000_admin.sql) with device, activity and internal flags
drop view if exists public.v_admin_users;
drop view if exists public.v_admin_daily;

create view public.v_admin_users as
with sess as (
  select distinct on (user_id) user_id, platform, client, last_used_at
  from public.v_admin_user_sessions
  where platform in ('ios', 'android', 'dev')
  order by user_id, last_used_at desc
),
col as (
  select user_id, count(*)::int as collected, min(checked_in_at) as first_checkin_at,
         max(checked_in_at) as last_checkin_at, max(updated_at) as last_sync_at
  from public.collections group by user_id
),
act as (
  select user_id, count(*)::int as active_days,
         count(*) filter (where day > (now() at time zone 'Asia/Taipei')::date - 30)::int as active_days_30d
  from public.v_user_active_days group by user_id
),
ev as (select user_id, count(*)::int as events from public.app_events group by user_id)
select
  u.id as user_id,
  u.email,
  u.is_anonymous,
  coalesce(u.raw_app_meta_data -> 'providers', '[]'::jsonb) as providers,
  u.created_at,
  u.last_sign_in_at,
  coalesce(d.platform, case when s.platform = 'dev' then null else s.platform end) as platform,
  d.device_model,
  d.os_version,
  d.app_version,
  d.locale,
  d.has_full,
  d.collected as collected_on_device,
  s.client as last_client,
  (d.user_id is not null) as device_reported,
  greatest(d.last_seen_at, s.last_used_at, u.last_sign_in_at, c.last_sync_at) as last_seen_at,
  coalesce(c.collected, 0) as collected,
  c.first_checkin_at,
  c.last_checkin_at,
  c.last_sync_at,
  coalesce(a.active_days, 0) as active_days,
  coalesce(a.active_days_30d, 0) as active_days_30d,
  coalesce(e.events, 0) as events,
  exists (select 1 from public.admins x where x.user_id = u.id) as is_admin,
  (select string_agg(distinct x.reason, ',') from public.v_excluded_users x where x.user_id = u.id) as excluded_reason
from auth.users u
left join public.user_devices d on d.user_id = u.id
left join sess s on s.user_id = u.id
left join col c on c.user_id = u.id
left join act a on a.user_id = u.id
left join ev e on e.user_id = u.id;

-- Daily activity in Taiwan time, last 120 days, without excluded accounts.
-- Guests = accounts that are anonymous today.
create view public.v_activity_daily as
with days as (
  select generate_series((now() at time zone 'Asia/Taipei')::date - 119, (now() at time zone 'Asia/Taipei')::date, interval '1 day')::date as day
),
users as (
  select u.id, u.is_anonymous, (u.created_at at time zone 'Asia/Taipei')::date as signup_day, v.platform
  from auth.users u
  left join public.v_admin_users v on v.user_id = u.id
  where not exists (select 1 from public.v_excluded_users x where x.user_id = u.id)
),
active as (
  select a.day, u.id, u.is_anonymous, u.platform
  from public.v_user_active_days a join users u on u.id = a.user_id
),
checkins as (
  select (c.checked_in_at at time zone 'Asia/Taipei')::date as day, c.user_id
  from public.collections c join users u on u.id = c.user_id
)
select
  d.day,
  (select count(*) from users u where u.signup_day = d.day)::int as signups,
  (select count(*) from users u where u.signup_day = d.day and u.is_anonymous)::int as signups_guest,
  (select count(*) from active a where a.day = d.day)::int as active_users,
  (select count(*) from active a where a.day = d.day and a.is_anonymous)::int as active_guest,
  (select count(*) from active a where a.day = d.day and a.platform = 'ios')::int as active_ios,
  (select count(*) from active a where a.day = d.day and a.platform = 'android')::int as active_android,
  (select count(*) from checkins c where c.day = d.day)::int as checkins,
  (select count(distinct c.user_id) from checkins c where c.day = d.day)::int as checkers,
  (select count(*) from public.feedback f where (f.created_at at time zone 'Asia/Taipei')::date = d.day)::int as feedback
from days d;

-- The same by Monday-start week, last 26 weeks; active counts are distinct within the week.
create view public.v_activity_weekly as
with weeks as (
  select generate_series(
    date_trunc('week', (now() at time zone 'Asia/Taipei')::date - 7 * 25)::date,
    date_trunc('week', (now() at time zone 'Asia/Taipei')::date)::date,
    interval '7 days')::date as week
),
users as (
  select u.id, u.is_anonymous, date_trunc('week', (u.created_at at time zone 'Asia/Taipei')::date)::date as signup_week
  from auth.users u
  where not exists (select 1 from public.v_excluded_users x where x.user_id = u.id)
),
active as (
  select date_trunc('week', a.day)::date as week, a.day, u.id, u.is_anonymous
  from public.v_user_active_days a join users u on u.id = a.user_id
),
checkins as (
  select date_trunc('week', (c.checked_in_at at time zone 'Asia/Taipei')::date)::date as week, c.user_id
  from public.collections c join users u on u.id = c.user_id
)
select
  w.week,
  (select count(*) from users u where u.signup_week = w.week)::int as signups,
  (select count(*) from users u where u.signup_week = w.week and u.is_anonymous)::int as signups_guest,
  (select count(distinct a.id) from active a where a.week = w.week)::int as active,
  (select count(distinct a.id) from active a where a.week = w.week and a.is_anonymous)::int as active_guest,
  (select count(*) from active a where a.week = w.week)::int as active_user_days,
  (select count(*) from checkins c where c.week = w.week)::int as checkins,
  (select count(distinct c.user_id) from checkins c where c.week = w.week)::int as checkers
from weeks w;

-- Weekly cohorts by signup week (Taiwan time); retained = active on any day in week N after signup.
create view public.v_retention_weekly as
with cohort as (
  select u.id, date_trunc('week', (u.created_at at time zone 'Asia/Taipei')::date)::date as cohort_week
  from auth.users u
  where not exists (select 1 from public.v_excluded_users x where x.user_id = u.id)
),
sizes as (select cohort_week, count(*)::int as cohort_size from cohort group by cohort_week),
act as (
  select distinct c.cohort_week, c.id, ((date_trunc('week', a.day)::date - c.cohort_week) / 7) as week_offset
  from cohort c join public.v_user_active_days a on a.user_id = c.id
)
select s.cohort_week, s.cohort_size, o.week_offset::int,
       (select count(*) from act a where a.cohort_week = s.cohort_week and a.week_offset = o.week_offset)::int as retained
from sizes s
cross join generate_series(0, 8) as o(week_offset)
where s.cohort_week + o.week_offset * 7 <= (now() at time zone 'Asia/Taipei')::date;

create view public.v_event_daily as
select (created_at at time zone 'Asia/Taipei')::date as day, name, count(*)::int as events, count(distinct user_id)::int as users
from public.app_events
where created_at > now() - interval '90 days'
group by 1, 2;

revoke all on public.v_admin_user_sessions, public.v_excluded_users, public.v_user_active_days, public.v_admin_users,
  public.v_activity_daily, public.v_activity_weekly, public.v_retention_weekly, public.v_event_daily
  from anon, authenticated;
grant select on public.v_admin_user_sessions, public.v_excluded_users, public.v_user_active_days, public.v_admin_users,
  public.v_activity_daily, public.v_activity_weekly, public.v_retention_weekly, public.v_event_daily
  to service_role;
