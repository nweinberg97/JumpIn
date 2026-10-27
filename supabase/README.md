# Database (Supabase)

The schema for the real, multi-user JumpIn. The prototype still runs on
`LocalRepository` (browser storage); nothing here is wired into the app yet.

## What's in it

`migrations/20261026000000_initial_schema.sql` creates every table from the
build plan, with row-level security on all of them:

| Table | Who can read | Who can write |
| --- | --- | --- |
| `members` | Approved members, minus hidden profiles and blocks (both ways) | Yourself, profile fields only (`verified` is server-only) |
| `presence` | Same as the profile | Yourself |
| `projects`, `weekly_availability` | Same as the profile | Yourself |
| `memberships` | Yourself | Server only (approvals) |
| `connections`, `invites` | The two people involved | Server only |
| `call_joins` | The two people involved | Yourself, on your own calls |
| `blocks`, `reports`, `push_subscriptions` | Your own | Your own |
| `warm_intros` | The Connector who sent it; the person introduced and a member recipient via `my_received_intros()` (no emails) | Server only |
| `member_private`, `oauth_tokens`, `rate_limits` | Server only | Server only |

A sign-up trigger turns each new auth user into a waitlisted member.
`20261026010000_warm_intros.sql` adds the Connector badge (`members.is_connector`,
granted only through `grant_connector()` by the server) and warm intros. Someone
who joins through a Connector's intro link is approved straight away
(`redeem_warm_intro()`); each link works once.
`expire_stale_state()` closes expired "open" windows and unanswered invites;
on Supabase it is scheduled every minute with `pg_cron`.

## Test it locally (no Supabase account needed)

```bash
npm run test:db
```

Spins up a throwaway Postgres (15+), applies the migrations on top of a small
Supabase stand-in (`tests/supabase_stub.sql`), and runs `tests/rls_test.sql`:
60 checks that each person sees and changes only what they should. CI runs
the same thing on every pull request.

## Apply it to a real project (later)

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```
