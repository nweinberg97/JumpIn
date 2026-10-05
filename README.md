# JumpIn

**A private network where people building a better world can see who's free to talk, and jump straight into a conversation.**

Professional networks optimise for collecting connections. JumpIn optimises for actually talking. If someone looks interesting and they're open right now, you shouldn't have to send a request, wait, message back and forth, and book something three weeks out. You click **Jump In** and you're in a Google Meet.

```
Discover → Profile → See availability → Jump In → Meet → Connection
```

This is a portfolio prototype: a working product, not a production service. It runs with **zero setup** in demo mode, and every external integration (LinkedIn, Google Calendar, Google Meet, Instagram, email) is real code that switches on when you add credentials.

---

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000 and choose **Explore the demo as John**. No accounts, database or API keys needed.

Requires Node 20.9+.

### A two-minute tour

1. **Meet people.** The Discover page leads with who's *Open to JumpIn now*, with a live countdown of how long each person is free, then people you share causes with, then newcomers.
2. **Open Maddison's profile.** You've met her before (seeded history), and she's open, so the button reads **Jump straight in**. Click it: Meet opens immediately in a new tab, no invite step.
3. **Open Sarah's profile.** First time, so **Jump In** opens a short note (pre-written, editable). Send it and watch the flow: Meet created → note sent → *Sarah said yes*. Click **See what Sarah received** to view the invite email exactly as she'd get it, with Yes / No.
4. **Open Josh's profile.** He's *Available later*, so the primary action becomes **Schedule a JumpIn**: his weekly hours converted to your timezone, minus times you're busy.
5. **Connections** now shows the live calls, the booked JumpIn and your history.
6. Change **your own status** from the pill in the top bar, edit your profile in **My profile**, and try **Settings** for privacy, blocking and connected accounts.

To try onboarding from scratch, choose **Or try onboarding with a blank profile** on the landing page.

---

## Product decisions

**How "Jump In" decides what happens.** One button, three behaviours, chosen from live state (`src/lib/availability.ts → jumpInRoute`):

| Their status | You've met before? | Their setting | What happens |
|---|---|---|---|
| Open to JumpIn | Yes | Anyone / People I've met | **Straight into Meet.** They're pinged; no invite. |
| Open to JumpIn | No | Anyone | **Short note → they say yes → same Meet.** |
| Open to JumpIn | No | People I've met | Schedule your first one. |
| Available later / Not available | – | – | **Schedule a JumpIn.** |

The first-call note exists for the person being called. Instant video with a stranger needs one moment of consent; after you've met, it doesn't.

**Online is not the same as open.** A green dot means someone is using JumpIn. *Open to JumpIn* (mint, unlocked padlock, countdown) means they've explicitly said they're happy to talk now, and for how long. *Available later* (amber clock) and *Not available* (grey padlock) route you to scheduling. This follows the legend from the original design sketches.

**Your status is never buried.** It's in the top bar on every page (bottom tab on mobile), with one-tap durations: 30 min, 1 hour, 2 hours, until I turn it off. Open windows expire on their own.

**Privacy by default.** Nobody's email is ever shown to another member. Invites come from a JumpIn address; the server looks up the recipient's address at send time, so it never reaches the sender's browser. Members can hide their profile, choose who can jump in instantly (anyone / people I've met / nobody), block, and report.

**Scheduling stays simple.** A few weekly windows in your own timezone. Slots are shown in the booker's timezone, with times they're busy (Google free/busy) and times before 7 AM or after 10 PM for them hidden, and the dialog says how many were hidden and why. Existing JumpIns block double-booking.

**No feed.** JumpIn is people discovery and connection, not a content platform.

---

## Integrations

Principle: **real integration first, graceful fallback second.** Each provider is enabled only when its environment variables are set *and* `SESSION_SECRET` is set (so tokens can be secured). The UI asks `/api/integrations/status`, which returns booleans only.

| Integration | Real implementation | Without credentials |
|---|---|---|
| **LinkedIn sign-in** | OpenID Connect (`openid profile email`), authorization code flow, `state` CSRF check, `/v2/userinfo` | Button disabled with a setup note; demo sign-in |
| **Google sign-in** | OAuth 2.0 + **PKCE**, `openid email profile` | Same |
| **Google Calendar** | Incremental consent for `calendar.freebusy` (busy blocks only, never event details) + `calendar.events`; `freeBusy.query` on the primary calendar; access token refresh | Generated demo calendar (lunches, a few meetings) so double-booking protection is still visible |
| **Google Meet** | `events.insert` with `conferenceData.createRequest` (`hangoutsMeet`), `conferenceDataVersion=1`, polls if creation is pending | Hands off to `https://meet.google.com/new`, which opens a real new Meet in your own Google account |
| **Instagram** | *Instagram API with Instagram Login* (`instagram_business_basic`) to verify a handle; token discarded after reading the username | Paste your handle on your profile |
| **Invite email** | Resend REST API, HTML + text email from a JumpIn address, HMAC-signed Yes/No links that expire after 2 hours | In-app preview of the exact email at `/invite/<token>` |

Every demo fallback is labelled in the UI with an amber **Demo** badge, so a faked integration is never mistaken for a real one.

### Configuration

```bash
cp .env.example .env.local
openssl rand -base64 32   # paste into SESSION_SECRET
```

| Variable | Needed for |
|---|---|
| `APP_URL` | Redirect URIs and invite links (default: request origin) |
| `SESSION_SECRET` | Required by every real integration: encrypts session cookies, signs invites |
| `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` | LinkedIn sign-in |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in, Calendar, Meet |
| `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET` | Instagram handle verification |
| `RESEND_API_KEY`, `INVITE_FROM_EMAIL` | Sending invite emails |
| `INVITE_TEST_RECIPIENT` | Route every invite and calendar guest to your own inbox (seeded members have undeliverable `.example` addresses) |

**Callback URLs** to register with each provider (replace the host in production):

```
http://localhost:3000/api/auth/linkedin/callback
http://localhost:3000/api/auth/google/callback
http://localhost:3000/api/auth/instagram/callback
```

#### LinkedIn
1. Create an app at [developer.linkedin.com](https://developer.linkedin.com/) (it must be associated with a LinkedIn Page).
2. **Products** → add **Sign In with LinkedIn using OpenID Connect**.
3. **Auth** → add the callback URL; copy the client ID and secret.

LinkedIn's OIDC userinfo doesn't include a public profile URL, so members paste their LinkedIn URL themselves; the OIDC `sub` is what marks them **Verified**.

#### Google
1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable the **Google Calendar API**.
2. **OAuth consent screen**: add scopes `openid`, `email`, `profile`, `.../auth/calendar.events`, `.../auth/calendar.freebusy`. While the app is in *Testing*, add your Google account as a test user.
3. **Credentials** → **OAuth client ID** → *Web application*; add the callback URL.

Sign-in asks only for basic scopes. Calendar access is requested later, from **Availability → Connect Google Calendar**, with `include_granted_scopes` so earlier grants are kept.

#### Instagram
Meta retired the Instagram Basic Display API on 4 December 2024. The supported path, *Instagram API with Instagram Login*, only works for **Business and Creator** accounts. Create an app at [developers.facebook.com](https://developers.facebook.com/), add the Instagram product, choose *API setup with Instagram login*, and add the callback URL. Connecting Instagram requires a LinkedIn or Google session first.

#### Email
Create an API key at [resend.com](https://resend.com/) and verify a sending domain. Set `INVITE_TEST_RECIPIENT` to your own address to receive invites while members are seeded.

---

## Architecture

Next.js (App Router) · React 19 · TypeScript · hand-written CSS with design tokens. No UI library, no database, no auth library: every dependency is one you'd otherwise have to justify.

```
src/
├─ app/
│  ├─ page.tsx                     Landing + sign-in
│  ├─ onboarding/                  5-step profile setup with live card preview
│  ├─ auth/complete/               Mirrors a real OAuth session into app state
│  ├─ invite/[token]/              What the recipient sees (the email, in-app)
│  ├─ (app)/                       Signed-in screens, wrapped in AppShell
│  │  ├─ discover/  people/[id]/  connections/  me/  availability/  settings/
│  └─ api/                         Server route handlers (all secrets live here)
│     ├─ auth/{linkedin,google,instagram}/(callback)   OAuth flows
│     ├─ auth/session, auth/signout
│     ├─ meetings/                 Google Calendar event + Meet link
│     ├─ calendar/freebusy/        Busy blocks
│     ├─ invites/, invites/respond Signed invite links + email
│     └─ integrations/status       Which providers are configured (booleans)
├─ components/                     UI only: cards, dialogs, forms, shell
│  └─ connect/                     JumpInDialog, ScheduleDialog, ConnectProvider
├─ lib/
│  ├─ types.ts                     Domain model
│  ├─ data/
│  │  ├─ repository.ts             JumpInRepository interface
│  │  ├─ localRepository.ts        Seed data + localStorage implementation
│  │  ├─ index.ts                  ← the one line to swap for a real backend
│  │  └─ seed.ts                   20 members, demo account, demo history
│  ├─ services/                    Client boundaries to the API, each with a demo fallback
│  │  └─ authService, googleService, calendarService, meetingService, inviteService
│  ├─ store.ts                     App state + actions (talks only to the repository)
│  ├─ availability.ts              Status, countdowns, Jump In routing rules
│  ├─ time.ts                      Timezone math (Intl only), slot generation
│  └─ match.ts                     Shared ground, search, flags
└─ server/                         server-only modules
   ├─ env.ts                       Reads secrets; reports what's configured
   ├─ crypto.ts                    AES-256-GCM sealing, HMAC signing, PKCE
   ├─ session.ts                   Encrypted httpOnly session cookie
   ├─ oauth.ts                     state/PKCE cookie, safe redirects, errors
   ├─ providers/                   linkedin.ts, google.ts, instagram.ts
   ├─ googleCalendar.ts            Meet event creation, free/busy
   ├─ memberDirectory.ts           Private emails, resolved only server-side
   └─ email.ts                     Invite email template + Resend
```

**Layering.** Components never touch storage or providers. They call `actions` in `store.ts`, which call `repository`. They call `services/*` for anything external, which call `/api/*`, which hold the secrets. Each service catches the API's "not configured" (501) / "not connected" (401) response and returns a labelled demo result, so the UI has one code path.

**Security notes.**
- OAuth `state` is random, stored in a short-lived encrypted cookie scoped to `/api/auth`, compared in constant time and deleted on use. Google also uses PKCE (S256).
- Post-login redirects only accept same-site relative paths (blocks `//evil.com`).
- Sessions and provider tokens are sealed with AES-256-GCM in an httpOnly, `SameSite=Lax` cookie (`Secure` in production). There is no server-side session store to leak.
- Invite links are HMAC-signed and expire; *Yes* only ever redirects to a `meet.google.com` URL that was validated when the invite was created.

---

## Data model

`src/lib/types.ts`. Types are flat and serialisable so they map 1:1 onto tables:

```sql
create table members (
  id uuid primary key,
  name text not null, avatar_url text, headline text, what_i_do text, bio text,
  city text, country_code char(2), timezone text,
  interests text[], impact_areas text[], skills text[],
  loom_url text, linkedin_url text, instagram_url text, website_url text,
  online_status text, availability_status text, open_until timestamptz,
  calendar_connected boolean, jump_in_policy text, verified boolean,
  profile_hidden boolean, joined_at timestamptz
);
create table member_private (member_id uuid primary key references members, email text not null);
create table projects (id uuid primary key, member_id uuid references members, name text, description text, url text);
create table weekly_availability (id uuid primary key, member_id uuid references members, day smallint, start_time time, end_time time);
create table connections (
  id uuid primary key, user_id uuid references members, other_user_id uuid references members,
  type text, status text, created_at timestamptz, scheduled_at timestamptz,
  duration_minutes int, meeting_url text, note text, calendar_event_id text, source text
);
create table blocks  (member_id uuid, blocked_id uuid, primary key (member_id, blocked_id));
create table reports (id uuid primary key, reporter_id uuid, member_id uuid, reason text, details text, created_at timestamptz);
```

Email lives in its own table so it can be locked down with row-level security and never selected by member-facing queries, matching how `memberDirectory.ts` keeps it server-side today.

---

## Why there's no backend (yet)

Everything the prototype needs to *demonstrate* runs in one browser: seeded members, your profile, status, weekly hours, connections and safety settings persist in `localStorage` through the repository. Real OAuth needs server code, so it lives in Next.js route handlers, with the encrypted cookie as the only session store. That's deliberately the smallest server that can keep secrets.

A database becomes necessary the moment there are **two real people**:

- other members' presence and "open" status need to be shared and live (Postgres + Realtime, or a presence service);
- the sender needs to learn that the recipient said yes (today the recipient goes straight to the Meet, so this is graceful, but there's no notification back);
- emails for real members have to be looked up from a users table.

### Adding a real backend

1. Create the tables above (e.g. in Supabase/Postgres) with row-level security: members can read public member columns and write only their own rows.
2. Implement `JumpInRepository` (`src/lib/data/repository.ts`) against it, e.g. `SupabaseRepository`.
3. Change the one line in `src/lib/data/index.ts`.
4. Replace `memberDirectory.ts` with a query on `member_private`.
5. Add presence (Supabase Realtime channels) and have `/api/invites/respond` record the answer so the sender's dialog can update.

No component needs to change.

---

## Testing notes

The prototype was exercised end to end in headless Chromium at desktop (1440px) and phone (390px) sizes: demo sign-in, onboarding with validation, search and filters, profiles, direct Jump In (Meet opens in a new tab), first-time invite (compose → sent → accepted → recipient email → Yes), scheduling with busy and off-hours slots hidden, connections, status changes, profile edits surviving reloads, report, block and unblock.

`npm run typecheck` runs `tsc --noEmit`.

## Credits

Member photography from [Unsplash](https://unsplash.com/) (Unsplash License). Fonts: Bricolage Grotesque and Hanken Grotesk via Google Fonts. People in the seed data are fictional.
