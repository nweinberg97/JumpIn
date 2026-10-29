-- ─────────────────────────────────────────────────────────────────────────────
-- Warm intros: JumpIn's growth loop
--
-- A Connector (a trusted member the founder has personally onboarded) shares
-- a member's profile with someone and says why they should talk. The
-- recipient is either already a member, or someone new who gets an email and
-- can join with the intro, skipping the waitlist because a Connector vouched
-- for them.
--
-- Only the server creates intros: it checks the Connector badge, sends the
-- email, and stores a hash of the link token (never the token itself).
-- ─────────────────────────────────────────────────────────────────────────────

create type public.warm_intro_status as enum ('sent', 'opened', 'joined', 'connected', 'declined');

-- The Connector badge. Granted by the founder only: not in the column list
-- members may update (see the initial migration), so a member can't self-grant.
alter table public.members
  add column is_connector     boolean not null default false,
  add column connector_since  timestamptz;

create table public.warm_intros (
  id                  uuid primary key default gen_random_uuid(),
  introducer_id       uuid not null references public.members (id) on delete cascade,
  -- The member whose profile is being shared.
  subject_id          uuid not null references public.members (id) on delete cascade,
  -- Exactly one of: an existing member, or a new person by email.
  recipient_member_id uuid references public.members (id) on delete cascade,
  recipient_email     text check (recipient_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  recipient_name      text not null check (char_length(recipient_name) between 1 and 120),
  note                text not null check (char_length(note) between 1 and 1200),
  status              public.warm_intro_status not null default 'sent',
  -- sha256 of the link token in the email; looked up when the link is opened.
  token_hash          text not null unique,
  -- Set when a new person joins through this intro.
  joined_member_id    uuid references public.members (id) on delete set null,
  created_at          timestamptz not null default now(),
  opened_at           timestamptz,
  check ((recipient_member_id is null) <> (recipient_email is null)),
  check (introducer_id <> subject_id),
  check (recipient_member_id is null or recipient_member_id not in (introducer_id, subject_id))
);
create index warm_intros_introducer_idx on public.warm_intros (introducer_id, created_at desc);
create index warm_intros_subject_idx    on public.warm_intros (subject_id);
create index warm_intros_recipient_idx  on public.warm_intros (recipient_member_id) where recipient_member_id is not null;

alter table public.warm_intros enable row level security;
revoke all on public.warm_intros from anon;
revoke insert, update, delete on public.warm_intros from authenticated;

-- The base table (with the new person's email) is readable only by the
-- introducer.
create policy warm_intros_read_introducer on public.warm_intros
  for select to authenticated using (introducer_id = auth.uid());

-- What the person introduced and a member recipient see: no email, no token
-- hash, and nothing from someone they've blocked (or who blocked them).
create function public.my_received_intros()
returns table (
  id uuid, introducer_id uuid, subject_id uuid, recipient_member_id uuid,
  recipient_name text, note text, status public.warm_intro_status, created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select i.id, i.introducer_id, i.subject_id, i.recipient_member_id,
         i.recipient_name, i.note, i.status, i.created_at
    from public.warm_intros i
   where auth.uid() in (i.subject_id, i.recipient_member_id)
     and not public.is_blocked_between(i.introducer_id, auth.uid())
   order by i.created_at desc;
$$;
revoke execute on function public.my_received_intros() from public, anon;
grant execute on function public.my_received_intros() to authenticated;

-- Has someone warmly introduced these two? (Lets a "people I've met" policy
-- accept a first call from someone a Connector vouched for.)
create function public.has_warm_intro(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.warm_intros i
    where i.status <> 'declined'
      and ((i.subject_id = a and i.recipient_member_id = b)
        or (i.subject_id = b and i.recipient_member_id = a)
        or (i.subject_id = a and i.joined_member_id = b)
        or (i.subject_id = b and i.joined_member_id = a))
  );
$$;
revoke execute on function public.has_warm_intro(uuid, uuid) from public, anon, authenticated;

-- A new person signs up through an intro: link them to it and let them in.
-- Called by server code with the token from the link.
--
-- The intro is a vouch for one specific person, so it only counts when they
-- signed in with the email it was sent to (compared case-insensitively,
-- against the address their sign-in provider confirmed). Anyone else holding
-- the link can still join JumpIn, through the normal waitlist, and the intro
-- stays unused for its rightful recipient.
create function public.redeem_warm_intro(token_sha256 text, new_member uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  intro public.warm_intros;
  signed_in_email text;
begin
  select u.email into signed_in_email from auth.users u where u.id = new_member;
  if signed_in_email is null then
    return null;
  end if;
  select * into intro from public.warm_intros
   where token_hash = token_sha256
     and recipient_email is not null
     and joined_member_id is null
     and lower(recipient_email) = lower(signed_in_email)
   for update;
  if not found then
    return null;
  end if;
  update public.warm_intros
     set joined_member_id = new_member, status = 'joined', opened_at = coalesce(opened_at, now())
   where id = intro.id;
  update public.memberships
     set status = 'approved', approved_at = now(), invited_by = intro.introducer_id
   where member_id = new_member and status = 'waitlisted';
  return intro.id;
end;
$$;
revoke execute on function public.redeem_warm_intro(text, uuid) from public, anon, authenticated;

-- Connectors are trusted to vouch: only the founder (service role) grants it.
create function public.grant_connector(member uuid)
returns void language sql security definer set search_path = '' as $$
  update public.members set is_connector = true, connector_since = coalesce(connector_since, now()) where id = member;
  update public.memberships set status = 'approved', approved_at = coalesce(approved_at, now()) where member_id = member;
$$;
revoke execute on function public.grant_connector(uuid) from public, anon, authenticated;
