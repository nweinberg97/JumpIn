-- ─────────────────────────────────────────────────────────────────────────────
-- Once-only emails (waitlist, welcome, Connector, ...). The server inserts a
-- row before sending; the primary key makes a second send impossible, even
-- if two requests race. Server only: no client access at all.
-- ─────────────────────────────────────────────────────────────────────────────

create table public.email_log (
  member_id uuid not null references public.members (id) on delete cascade,
  kind      text not null check (kind ~ '^[a-z][a-z0-9_-]{1,40}$'),
  sent_at   timestamptz not null default now(),
  primary key (member_id, kind)
);

alter table public.email_log enable row level security;
revoke all on public.email_log from anon, authenticated;
