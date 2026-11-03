-- Problem reports and suggestions sent from the app (Me tab → 回報問題, app/feedback.tsx).
-- They replace "open a GitHub issue": travellers don't have GitHub accounts, and a
-- public issue tracker shows everyone's reports to everyone. Reports land here and
-- are read in the admin site (islandia-admin), which reads with the service role.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  -- keep the report when the account is deleted: the problem is still worth reading
  user_id uuid references auth.users (id) on delete set null,
  kind text not null default 'problem' check (kind in ('problem', 'spot', 'idea')),
  message text not null check (char_length(message) between 1 and 4000),
  -- optional; guests have no email, and a reply needs one
  contact_email text check (contact_email is null or char_length(contact_email) <= 320),
  spot_id text,
  -- diagnostics, so nobody has to describe their phone in words
  app_version text,
  os_version text,
  device text,
  locale text,
  has_full boolean,
  collected int,
  -- handled in the admin site
  status text not null default 'new' check (status in ('new', 'in_progress', 'done')),
  admin_note text,
  created_at timestamptz not null default now()
);

create index feedback_created_at_idx on public.feedback (created_at desc);
create index feedback_open_idx on public.feedback (status) where status <> 'done';

alter table public.feedback enable row level security;

-- Insert only, and only as yourself. No select: the table holds everyone's reports.
create policy "insert own feedback"
  on public.feedback
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on public.feedback from anon, authenticated;
grant insert on public.feedback to authenticated;
grant all on public.feedback to service_role;

-- Guest accounts are free to make, so RLS alone can't stop a flood. The limits keep
-- the admin inbox readable; messages are short enough that storage doesn't matter.
create function public.feedback_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.feedback
      where user_id = new.user_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'feedback_rate_hour';
  end if;
  if (select count(*) from public.feedback
      where user_id = new.user_id and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'feedback_rate_day';
  end if;
  -- the same words twice in a day is a double tap
  if exists (select 1 from public.feedback
      where user_id = new.user_id and message = new.message
        and created_at > now() - interval '24 hours') then
    raise exception 'feedback_duplicate';
  end if;
  -- staff-only columns are never set from the app
  new.status := 'new';
  new.admin_note := null;
  return new;
end
$$;

create trigger feedback_rate_limit
  before insert on public.feedback
  for each row execute function public.feedback_rate_limit();
