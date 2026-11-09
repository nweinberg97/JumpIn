-- ─────────────────────────────────────────────────────────────────────────────
-- JumpIn: initial schema
--
-- The server owns the truth: who is a member, who is open right now, who was
-- invited and whether they said yes. Browsers read through row-level security
-- (RLS) and change only what is theirs; everything that involves another
-- person (connections, invites, Meet links) is written by server code using
-- the service role.
--
-- Security model in one paragraph:
--   * Approved members see approved, visible members, minus anyone blocked in
--     either direction.
--   * You may edit your own profile fields, presence, weekly hours, projects,
--     blocks, reports and push subscriptions. Nothing else.
--   * Emails (member_private), OAuth tokens and rate-limit counters have no
--     client policies at all: only the service role can touch them.
--   * `verified`, `calendar_connected` and membership status are set by the
--     server, never by the member.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Types ────────────────────────────────────────────────────────────────────

create type public.availability_status as enum ('open', 'later', 'unavailable');
create type public.jump_in_policy      as enum ('anyone', 'met', 'nobody');
create type public.membership_status   as enum ('waitlisted', 'approved', 'suspended');
create type public.connection_type     as enum ('jumpin', 'scheduled');
create type public.connection_status   as enum ('invited', 'live', 'scheduled', 'completed', 'declined', 'cancelled');
create type public.invite_status       as enum ('pending', 'accepted', 'declined', 'expired', 'cancelled');

-- ── Members ──────────────────────────────────────────────────────────────────

create table public.members (
  id                 uuid primary key references auth.users (id) on delete cascade,
  name               text not null check (char_length(name) between 1 and 120),
  avatar_url         text,
  headline           text not null default '' check (char_length(headline) <= 160),
  what_i_do          text not null default '' check (char_length(what_i_do) <= 300),
  bio                text not null default '' check (char_length(bio) <= 2000),
  city               text not null default '',
  country_code       char(2),
  timezone           text not null default 'UTC',
  interests          text[] not null default '{}',
  impact_areas       text[] not null default '{}',
  skills             text[] not null default '{}',
  loom_url           text,
  linkedin_url       text,
  instagram_url      text,
  website_url        text,
  jump_in_policy     public.jump_in_policy not null default 'anyone',
  profile_hidden     boolean not null default false,
  onboarded          boolean not null default false,
  -- Server-managed: a member cannot set these on themselves.
  verified           boolean not null default false,
  calendar_connected boolean not null default false,
  joined_at          timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on column public.members.verified is 'LinkedIn OIDC identity confirmed. Set by the server only.';

-- Private contact details. No client policy: read only by server code.
create table public.member_private (
  member_id uuid primary key references public.members (id) on delete cascade,
  email     text not null
);

-- The private-network gate.
create table public.memberships (
  member_id   uuid primary key references public.members (id) on delete cascade,
  status      public.membership_status not null default 'waitlisted',
  invited_by  uuid references public.members (id) on delete set null,
  created_at  timestamptz not null default now(),
  approved_at timestamptz
);

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  url         text,
  position    smallint not null default 0
);
create index projects_member_idx on public.projects (member_id);

-- Recurring windows in the member's own timezone. day: 0 = Sunday.
create table public.weekly_availability (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members (id) on delete cascade,
  day        smallint not null check (day between 0 and 6),
  start_time time not null,
  end_time   time not null,
  check (end_time > start_time)
);
create index weekly_availability_member_idx on public.weekly_availability (member_id);

-- ── Presence: "Open to JumpIn" lives on the server ──────────────────────────
-- Online/offline is ephemeral and handled by Supabase Realtime Presence, not
-- stored. This table is the durable, explicit willingness to talk.

create table public.presence (
  member_id  uuid primary key references public.members (id) on delete cascade,
  status     public.availability_status not null default 'later',
  open_until timestamptz,
  updated_at timestamptz not null default now(),
  -- open_until only makes sense while open; null while open = until switched off.
  check (status = 'open' or open_until is null)
);

-- ── Safety ───────────────────────────────────────────────────────────────────

create table public.blocks (
  blocker_id uuid not null references public.members (id) on delete cascade,
  blocked_id uuid not null references public.members (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.members (id) on delete cascade,
  member_id   uuid not null references public.members (id) on delete cascade,
  reason      text not null check (char_length(reason) between 1 and 80),
  details     text check (char_length(details) <= 2000),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  check (reporter_id <> member_id)
);

-- ── Connections, invites and joins ──────────────────────────────────────────
-- One row per JumpIn, shared by both people (the prototype stored a row per
-- viewer). Written by the server, which creates the Meet link.

create table public.connections (
  id                uuid primary key default gen_random_uuid(),
  initiator_id      uuid not null references public.members (id) on delete cascade,
  recipient_id      uuid not null references public.members (id) on delete cascade,
  type              public.connection_type not null,
  status            public.connection_status not null,
  scheduled_at      timestamptz,
  duration_minutes  smallint not null default 30 check (duration_minutes between 5 and 240),
  meet_link         text check (meet_link ~ '^https://meet\.google\.com/'),
  calendar_event_id text,
  note              text check (char_length(note) <= 1200),
  created_at        timestamptz not null default now(),
  completed_at      timestamptz,
  check (initiator_id <> recipient_id),
  check (type <> 'scheduled' or scheduled_at is not null)
);
create index connections_initiator_idx on public.connections (initiator_id, created_at desc);
create index connections_recipient_idx on public.connections (recipient_id, created_at desc);

-- The first-time "Are you still free to connect?" ask. Replaces the stateless
-- signed token, so the caller can see the real answer.
create table public.invites (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null unique references public.connections (id) on delete cascade,
  from_id       uuid not null references public.members (id) on delete cascade,
  to_id         uuid not null references public.members (id) on delete cascade,
  note          text not null check (char_length(note) between 1 and 1200),
  status        public.invite_status not null default 'pending',
  expires_at    timestamptz not null default now() + interval '2 hours',
  responded_at  timestamptz,
  created_at    timestamptz not null default now(),
  check (from_id <> to_id)
);
create index invites_to_pending_idx on public.invites (to_id) where status = 'pending';

-- A participant clicking "Join" in JumpIn. Both joined = you've met.
create table public.call_joins (
  connection_id uuid not null references public.connections (id) on delete cascade,
  member_id     uuid not null references public.members (id) on delete cascade,
  joined_at     timestamptz not null default now(),
  primary key (connection_id, member_id)
);

-- ── Server-only secrets and bookkeeping ─────────────────────────────────────

create table public.oauth_tokens (
  member_id         uuid not null references public.members (id) on delete cascade,
  provider          text not null check (provider in ('google', 'linkedin', 'instagram')),
  -- Encrypted by the app (AES-256-GCM) before it is stored.
  refresh_token_enc text,
  scopes            text not null default '',
  updated_at        timestamptz not null default now(),
  primary key (member_id, provider)
);

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_member_idx on public.push_subscriptions (member_id);

create table public.rate_limits (
  member_id    uuid not null references public.members (id) on delete cascade,
  action       text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (member_id, action, window_start)
);

-- ── Helper functions used by policies ───────────────────────────────────────
-- SECURITY DEFINER so policies can consult tables the caller can't read
-- directly (memberships of others, blocks against them). Each pins
-- search_path so it can't be hijacked.

create function public.is_approved(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.member_id = uid and m.status = 'approved'
  );
$$;

create function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks bl
    where (bl.blocker_id = a and bl.blocked_id = b)
       or (bl.blocker_id = b and bl.blocked_id = a)
  );
$$;

-- Can the signed-in person see this member's profile, presence and hours?
create function public.can_see_member(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    target = auth.uid()
    or (
      public.is_approved(auth.uid())
      and public.is_approved(target)
      and not public.is_blocked_between(auth.uid(), target)
      and not coalesce((select m.profile_hidden from public.members m where m.id = target), true)
    );
$$;

-- "You've met": a completed connection, or a call you both joined.
create function public.has_met(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.connections c
    where ((c.initiator_id = a and c.recipient_id = b) or (c.initiator_id = b and c.recipient_id = a))
      and (
        c.status = 'completed'
        or (select count(*) from public.call_joins j where j.connection_id = c.id) >= 2
      )
  );
$$;

-- The client-facing form: only ever about the signed-in person.
create function public.have_i_met(other uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_met(auth.uid(), other);
$$;

-- Status after an expired open window, for reads between cron runs.
create function public.effective_status(p public.presence)
returns public.availability_status language sql stable set search_path = '' as $$
  select case
    when p.status = 'open' and p.open_until is not null and p.open_until <= now() then 'later'::public.availability_status
    else p.status
  end;
$$;

-- Fixed-window rate limit for server code: returns true if the action is
-- allowed and counts it.
create function public.take_rate_limit(uid uuid, action_name text, max_per_window integer, window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  win timestamptz := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  used integer;
begin
  insert into public.rate_limits as r (member_id, action, window_start, count)
  values (uid, action_name, win, 1)
  on conflict (member_id, action, window_start) do update set count = r.count + 1
  returning r.count into used;
  return used <= max_per_window;
end;
$$;

-- ── Housekeeping (run every minute by pg_cron in production) ────────────────

create function public.expire_stale_state()
returns void language sql security definer set search_path = '' as $$
  update public.presence
     set status = 'later', open_until = null, updated_at = now()
   where status = 'open' and open_until is not null and open_until <= now();

  update public.invites
     set status = 'expired'
   where status = 'pending' and expires_at <= now();

  update public.connections c
     set status = 'cancelled'
    from public.invites i
   where i.connection_id = c.id and i.status = 'expired' and c.status = 'invited';

  delete from public.rate_limits where window_start < now() - interval '1 day';
$$;

-- ── Triggers ─────────────────────────────────────────────────────────────────

create function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger members_touch  before update on public.members  for each row execute function public.touch_updated_at();
create trigger presence_touch before update on public.presence for each row execute function public.touch_updated_at();

-- A new sign-in becomes a member: profile, private email, a waitlisted
-- membership and a presence row, in one transaction.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.members (id, name, avatar_url)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', ''), 'New member'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  if new.email is not null then
    insert into public.member_private (member_id, email) values (new.id, new.email);
  end if;
  insert into public.memberships (member_id) values (new.id);
  insert into public.presence (member_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row-level security ──────────────────────────────────────────────────────

alter table public.members             enable row level security;
alter table public.member_private      enable row level security;
alter table public.memberships         enable row level security;
alter table public.projects            enable row level security;
alter table public.weekly_availability enable row level security;
alter table public.presence            enable row level security;
alter table public.blocks              enable row level security;
alter table public.reports             enable row level security;
alter table public.connections         enable row level security;
alter table public.invites             enable row level security;
alter table public.call_joins          enable row level security;
alter table public.oauth_tokens        enable row level security;
alter table public.push_subscriptions  enable row level security;
alter table public.rate_limits         enable row level security;

-- Nothing is readable while signed out.
revoke all on all tables in schema public from anon;

-- Server-only tables: no grants, no policies.
revoke all on public.member_private, public.oauth_tokens, public.rate_limits from authenticated;

-- members: read who you can see; update only profile columns on your own row.
revoke insert, update, delete on public.members from authenticated;
grant select on public.members to authenticated;
grant update (
  name, avatar_url, headline, what_i_do, bio, city, country_code, timezone,
  interests, impact_areas, skills, loom_url, linkedin_url, instagram_url, website_url,
  jump_in_policy, profile_hidden, onboarded
) on public.members to authenticated;

create policy members_read on public.members
  for select to authenticated using (public.can_see_member(id));
create policy members_update_own on public.members
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- memberships: see your own status; changed only by the server.
revoke insert, update, delete on public.memberships from authenticated;
create policy memberships_read_own on public.memberships
  for select to authenticated using (member_id = auth.uid());

-- projects and weekly hours: visible with the profile, written by the owner.
create policy projects_read on public.projects
  for select to authenticated using (public.can_see_member(member_id));
create policy projects_write_own on public.projects
  for all to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());

create policy weekly_read on public.weekly_availability
  for select to authenticated using (public.can_see_member(member_id));
create policy weekly_write_own on public.weekly_availability
  for all to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());

-- presence: visible with the profile; you set only your own.
revoke insert, delete on public.presence from authenticated;
create policy presence_read on public.presence
  for select to authenticated using (public.can_see_member(member_id));
create policy presence_update_own on public.presence
  for update to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());

-- blocks: you manage and see only the blocks you made.
revoke update on public.blocks from authenticated;
create policy blocks_read_own on public.blocks
  for select to authenticated using (blocker_id = auth.uid());
create policy blocks_insert_own on public.blocks
  for insert to authenticated with check (blocker_id = auth.uid());
create policy blocks_delete_own on public.blocks
  for delete to authenticated using (blocker_id = auth.uid());

-- reports: file and see your own; moderators use the service role.
revoke update, delete on public.reports from authenticated;
create policy reports_read_own on public.reports
  for select to authenticated using (reporter_id = auth.uid());
create policy reports_insert_own on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());

-- connections and invites: both people can read; only the server writes.
revoke insert, update, delete on public.connections, public.invites from authenticated;
create policy connections_read_party on public.connections
  for select to authenticated using (auth.uid() in (initiator_id, recipient_id));
create policy invites_read_party on public.invites
  for select to authenticated using (auth.uid() in (from_id, to_id));

-- call_joins: record your own join on a call you're part of.
revoke update, delete on public.call_joins from authenticated;
create policy call_joins_read_party on public.call_joins
  for select to authenticated using (
    exists (select 1 from public.connections c
            where c.id = connection_id and auth.uid() in (c.initiator_id, c.recipient_id))
  );
create policy call_joins_insert_own on public.call_joins
  for insert to authenticated with check (
    member_id = auth.uid()
    and exists (select 1 from public.connections c
                where c.id = connection_id and auth.uid() in (c.initiator_id, c.recipient_id))
  );

-- push subscriptions: your own devices only.
revoke update on public.push_subscriptions from authenticated;
create policy push_read_own on public.push_subscriptions
  for select to authenticated using (member_id = auth.uid());
create policy push_insert_own on public.push_subscriptions
  for insert to authenticated with check (member_id = auth.uid());
create policy push_delete_own on public.push_subscriptions
  for delete to authenticated using (member_id = auth.uid());

-- Helpers are for policies and server code, not for direct calls by clients:
-- called directly they would reveal who blocked whom or who has met whom.
-- Policies reach them through can_see_member (SECURITY DEFINER).
revoke execute on function public.is_approved(uuid) from public, anon, authenticated;
revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.has_met(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.can_see_member(uuid) from public, anon;
revoke execute on function public.have_i_met(uuid) from public, anon;
grant execute on function public.can_see_member(uuid), public.have_i_met(uuid) to authenticated;
revoke execute on function public.take_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;
revoke execute on function public.expire_stale_state() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ── Realtime and scheduled jobs (only where Supabase provides them) ─────────

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.presence, public.invites, public.connections;
  end if;
end;
$$;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('jumpin-expire-stale-state', '* * * * *', 'select public.expire_stale_state()');
  end if;
end;
$$;
