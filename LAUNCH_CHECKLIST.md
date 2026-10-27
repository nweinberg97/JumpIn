# JumpIn launch checklist

Two lists:

- **On your own:** accounts only you can create. No setup from Claude needed.
- **Together:** we do these in the chat. You say "go"; Claude does the work or gives you the exact values to paste.

---

## On your own (about 45 minutes, any order)

- [ ] **Supabase.** At supabase.com, create a new organization called `JumpIn` (Free plan, separate from Kitside). Then in claude.ai → Settings → Connectors → Supabase, reconnect and allow the `JumpIn` organization.
- [ ] **Vercel.** At vercel.com, sign in with GitHub → Add New → Project → `nweinberg97/JumpIn` → Deploy. Then Settings → Git → set the production branch to `backend-foundations`.
- [ ] **Google Cloud.** At console.cloud.google.com, create a project called `JumpIn`. Set up the OAuth consent screen: External, app name JumpIn, your email as contact. Stop there; we'll do the rest together.
- [ ] **LinkedIn.** Create a LinkedIn Page for JumpIn. At developer.linkedin.com, create an app linked to that Page, and add the product "Sign In with LinkedIn using OpenID Connect". Stop there.
- [ ] **Security basics.** Turn on two-factor sign-in for GitHub, Supabase, Vercel, Google and LinkedIn.
- [ ] **Optional, saves you copying logs:** in claude.ai → Settings → Connectors, add **Vercel** and **Resend**.

Before launch day (not needed for onboarding):

- [ ] **Buy a domain** (about $10–20 a year).
- [ ] **Create a Resend account** at resend.com.

---

## Together (about 45 minutes, in this order)

- [ ] **1. Database.** Claude creates the Supabase project, loads the database and runs Supabase's security check. *You: say "go".*
- [ ] **2. Keys into Vercel.** Claude gives you the 6 setting names and the non-secret values. You copy the one secret value (the Supabase secret key) straight from Supabase into Vercel, then redeploy.
- [ ] **3. Google sign-in.** Claude gives you the exact redirect URLs. You create the OAuth client in Google Cloud and paste its ID and secret into Supabase. Claude checks it's switched on.
- [ ] **4. LinkedIn sign-in.** Same pattern: Claude gives you the redirect URL; you paste the app's ID and secret into Supabase.
- [ ] **5. First test.** You sign in on your Vercel site and try the onboarding flow with a second account. Claude watches the logs and the database, and fixes anything that breaks.

Before launch day:

- [ ] **6. Email.** Claude adds your domain to Resend and tells you the DNS records; you add them where you bought the domain, then paste the Resend key into Vercel.
- [ ] **7. Google Calendar** (real Meet links). Claude walks you through turning it on in Google Cloud; you paste two values into Vercel.
- [ ] **8. Launch email.** You press "Send me a test" on your founder page, then "Send to everyone". Claude checks delivery.

---

## How Google and LinkedIn sign-in work

When someone clicks "Continue with Google", Google asks them to approve, then sends them back to Supabase, which signs them in to JumpIn. Two things make that work:

1. Google (or LinkedIn) has to know the **redirect URL**: where to send people back.
2. Supabase has to know the app's **client ID and client secret**, which you get from Google (or LinkedIn).

That's all the setup is: one URL into Google or LinkedIn, two values into Supabase.

## How we keep it secure

- **Secrets go only into Supabase or Vercel**, pasted by you: the Supabase secret key, the Google and LinkedIn client secrets, the Resend key and `SESSION_SECRET`. Never into chat, email or code. Claude never needs to see them.
- **Two values are public by design:** the Supabase project URL and publishable key. The database rules (71 automated checks) decide what anyone can see or change.
- **Only your email goes in `ADMIN_EMAILS`.** That's what unlocks the founder page.
- **Two-factor sign-in** on every account above.
- **If a secret ever leaks:** create a new one in that service, paste it into Vercel, redeploy. The old one stops working.

---

## Claude: code still to build (nothing needed from you)

For onboarding week:

- [ ] People who join through a warm intro skip the waitlist.
- [ ] A Verified badge for people who sign in with LinkedIn.
- [ ] A clear message when a profile save fails.
- [ ] Privacy policy and terms pages, for you to approve.

Before launch:

- [ ] Require Google Calendar before a first call, so both people land in the same Meet.
- [ ] An in-app alert, plus a push notification, when someone jumps in with you.
- [ ] Scheduling that checks both people's calendars.
- [ ] Record joins, so "you've met" works.
- [ ] Rate limits shared across servers; a reports queue; account deletion.
