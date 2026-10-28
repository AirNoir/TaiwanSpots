-- Cloud copy of a traveller's passport (docs/spec.md §5.2). One row per spot a
-- user has collected; the phone keeps its own copy and merges with this one at
-- sign-in (earliest check-in wins). Rows go with the user when the account is
-- deleted (on delete cascade), so delete-account only has to remove the user.

create table public.collections (
  user_id uuid not null references auth.users (id) on delete cascade,
  spot_id text not null,
  checked_in_at timestamptz not null,
  season text,
  sky text,
  temperature smallint,
  variant text not null default 'day',
  updated_at timestamptz not null default now(),
  primary key (user_id, spot_id)
);

alter table public.collections enable row level security;

-- Signed-in users (anonymous ones included) read and write only their own rows.
create policy "own collections"
  on public.collections
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
