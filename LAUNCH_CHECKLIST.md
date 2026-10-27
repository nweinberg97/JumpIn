# JumpIn launch checklist

Everything between today and a working, launched JumpIn. Tick items off as they're done.

- **You:** accounts, keys and decisions. Nothing here needs code.
- **Claude:** code still to build. Each item says whether it's blocked on you.

Paste secret keys only into Supabase or Vercel, never into chat or this file.

---

## Phase 1: Onboarding week (people can sign up, you approve them)

### You

- [ ] **Supabase project.** supabase.com → New organization `JumpIn` (Free, separate from Kitside) → New project `jumpin`, region Canada (Central) or West US (Oregon). Save the database password in a password manager.
- [ ] **Load the database.** Either connect the JumpIn organization to Claude and say "load it", or open SQL Editor and run the 4 files in `supabase/migrations/`, oldest first.
- [ ] **Copy 3 values** from Supabase → Project Settings → API Keys: project URL, publishable key (`sb_publishable_…`), secret key (`sb_secret_…`).
- [ ] **Vercel.** vercel.com → sign in with GitHub → Add New → Project → `nweinberg97/JumpIn` → Deploy. Note the address (e.g. `jumpin-xyz.vercel.app`).
- [ ] **Point Vercel at the new code.** Vercel → Settings → Git → production branch `backend-foundations`, or merge PR #1. Merging is safe for Martina's demo: it only changes when `docs/` is rebuilt.
- [ ] **Vercel environment variables** (Settings → Environment Variables), then Redeploy:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` = project URL
  - [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = publishable key
  - [ ] `SUPABASE_SECRET_KEY` = secret key
  - [ ] `ADMIN_EMAILS` = the email you'll sign in with
  - [ ] `SESSION_SECRET` = 40+ random characters (password manager generator)
  - [ ] `APP_URL` = `https://<your-vercel-address>`
- [ ] **Supabase redirect URLs.** Authentication → URL Configuration → Site URL `https://<your-vercel-address>`; Redirect URLs `https://<your-vercel-address>/auth/callback` and `http://localhost:3000/auth/callback`.
- [ ] **Google sign-in.** console.cloud.google.com → new project `JumpIn` → OAuth consent screen (External, app name JumpIn) → Credentials → OAuth client ID → Web application. Redirect URIs:
  - `https://<project-ref>.supabase.co/auth/v1/callback`
  - `https://<your-vercel-address>/api/auth/google/callback`

  Paste the client ID and secret into Supabase → Authentication → Sign In / Providers → Google → Enable.
- [ ] **LinkedIn sign-in (recommended: it's what gives the Verified badge).** Create a JumpIn LinkedIn Page → developer.linkedin.com → Create app linked to the Page → Products: "Sign In with LinkedIn using OpenID Connect" → Auth: redirect URL `https://<project-ref>.supabase.co/auth/v1/callback` → paste the ID and secret into Supabase → Providers → LinkedIn (OIDC).
- [ ] **Smoke test** (15 min):
  - [ ] Sign in on your Vercel site → finish onboarding → you see the Onboarding banner and a **Founder** tab.
  - [ ] Founder page → set a launch date → make yourself a Connector.
  - [ ] Private window, second Google account → it sees "You're on the list" → approve it → it sees the app and the countdown.
  - [ ] Second account presses Jump In → "Calls open at launch".
  - [ ] Tell Claude what broke, if anything.
- [ ] **Decide:** keep warm intro defaults (20 a day per Connector, links valid 30 days, the person introduced isn't asked first)?

### Claude: needed for onboarding week (not blocked)

- [ ] **Warm intro sign-up.** When someone new joins from an intro link, call `redeem_warm_intro()` so they skip the waitlist. The database side is built and tested; the sign-in flow doesn't call it yet.
- [ ] **Verified badge.** Mark members verified when they sign in with LinkedIn. Nothing sets it in live mode yet.
- [ ] **Clear errors when saving a profile fails**, e.g. a photo upload problem. Today it fails silently.
- [ ] **Privacy policy and terms pages**: drafts for you to approve. Google and LinkedIn ask for them.

---

## Phase 2: Before launch day (calls actually work)

### You

- [ ] **Domain.** Buy one (~$10–20/year, e.g. Cloudflare or Namecheap).
- [ ] **Resend.** resend.com → add the domain → add the DNS records it shows → create an API key.
- [ ] **Vercel variables**, then Redeploy:
  - [ ] `RESEND_API_KEY`
  - [ ] `INVITE_FROM_EMAIL` = `JumpIn <hello@yourdomain.com>`
- [ ] **Google Calendar (real Meet links).** Google Cloud → APIs & Services → enable **Google Calendar API** → consent screen: add scopes `calendar.events` and `calendar.freebusy` → add early members as test users (max 100 until verified).
- [ ] **Vercel variables**, then Redeploy:
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET` (same OAuth client as sign-in)
- [ ] **Approve** the privacy policy and terms, then **submit Google verification** (free, takes a few weeks; needed past 100 Calendar users).
- [ ] **Test the full call loop** with a friend: Jump In → note → their email → Yes → same Meet.
- [ ] **Founder page:** Send me a test → check it → Send to everyone on launch day.

### Claude: needed for calls to work properly

- [ ] **Require Google Calendar before a first call** (blocked on: Google Calendar setup). Without it, two people can still land in different Meets.
- [ ] **Incoming invite alert in the app.** Today the recipient only finds out by email. Show a live toast when someone jumps in with you.
- [ ] **Web Push "ring"**, so people hear about a call when the tab is closed (blocked on: `SESSION_SECRET` set; Claude generates the push keys).
- [ ] **Schedule against both calendars.** Scheduling currently hides the booker's busy times but not the other person's.
- [ ] **Record joins** ("you've met") when each person clicks Join, so the next call goes straight in.
- [ ] **Shared rate limits.** Move them from server memory to the database function that's already built (`take_rate_limit`).
- [ ] **Reports queue** on the founder page.
- [ ] **Account deletion and data export.**
- [ ] **Live-mode Settings.** Connecting LinkedIn or Instagram from Settings still uses the old prototype flow.

---

## Phase 3: After launch (quality and growth)

### You

- [ ] Free **Sentry** account → send Claude the DSN.
- [ ] Free **PostHog** account → send Claude the project key.

### Claude

- [ ] Error monitoring (Sentry) and the Discover → call funnel (PostHog) (blocked on: those two keys).
- [ ] Browser tests of the main flows in CI (Playwright), plus linting.
- [ ] Native app (Expo), so the ring reaches the lock screen.
- [ ] Smarter Discover: who you'd click with.

---

## Already done (on `backend-foundations`, PR #1)

- [x] Database with security rules on every table: 71 automated checks.
- [x] Real sign-in, saved profiles and photos, live presence, real invite answers (off until keys are set).
- [x] Onboarding mode: approval screen, countdown, calls closed until launch, demo kept as practice.
- [x] Founder page: approvals, profile gaps, Connector badges, launch date, launch email.
- [x] Warm intros and the Connector badge (email-matched, single use).
- [x] Security fixes: signed-in invites, sender from the server, rate limits, Meet-only links, scanner-safe email buttons.
- [x] 53 unit tests, all in CI.
