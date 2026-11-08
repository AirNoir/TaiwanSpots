-- Admin site (islandia-admin, Next.js on Vercel). Every page checks the signed-in user is in
-- public.admins and then reads with the service role. Same pattern as little-steps-admin.

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
-- no policies: only the service role reads this table
revoke all on public.admins from anon, authenticated;
grant all on public.admins to service_role;

insert into public.admins (user_id, email)
select id, email from auth.users where email = 'williams710504@gmail.com' and not is_anonymous
on conflict do nothing;

-- One row per account: how it signed in and how much it has collected.
-- v_admin_users and v_admin_daily read auth.users, which service_role cannot select, so they run
-- with the owner's rights (no security_invoker); the revoke at the bottom keeps them off the API.
create view public.v_admin_users as
select
  u.id as user_id,
  u.email,
  u.is_anonymous,
  coalesce(u.raw_app_meta_data -> 'providers', '[]'::jsonb) as providers,
  u.created_at,
  u.last_sign_in_at,
  count(c.spot_id)::int as collected,
  min(c.checked_in_at) as first_checkin_at,
  max(c.checked_in_at) as last_checkin_at,
  max(c.updated_at) as last_sync_at,
  exists (select 1 from public.admins a where a.user_id = u.id) as is_admin
from auth.users u
left join public.collections c on c.user_id = u.id
group by u.id;

-- One row per spot that someone has collected (spot names live in the app repo, not in the DB).
create view public.v_admin_spots
with (security_invoker = true) as
select
  spot_id,
  count(*)::int as collectors,
  count(*) filter (where checked_in_at > now() - interval '30 days')::int as collectors_30d,
  min(checked_in_at) as first_checkin_at,
  max(checked_in_at) as last_checkin_at
from public.collections
group by spot_id;

-- Daily counts in Taiwan time for the last 90 days.
create view public.v_admin_daily as
with days as (
  select generate_series(
    (now() at time zone 'Asia/Taipei')::date - 89,
    (now() at time zone 'Asia/Taipei')::date,
    interval '1 day'
  )::date as day
)
select
  d.day,
  (select count(*) from auth.users u
    where (u.created_at at time zone 'Asia/Taipei')::date = d.day)::int as new_accounts,
  (select count(*) from auth.users u
    where not u.is_anonymous and (u.created_at at time zone 'Asia/Taipei')::date = d.day)::int as new_linked,
  (select count(*) from public.collections c
    where (c.checked_in_at at time zone 'Asia/Taipei')::date = d.day)::int as checkins,
  (select count(*) from public.feedback f
    where (f.created_at at time zone 'Asia/Taipei')::date = d.day)::int as feedback
from days d
order by d.day;

-- views over auth.users must never reach the public API roles
revoke all on public.v_admin_users, public.v_admin_spots, public.v_admin_daily from anon, authenticated;
grant select on public.v_admin_users, public.v_admin_spots, public.v_admin_daily to service_role;
