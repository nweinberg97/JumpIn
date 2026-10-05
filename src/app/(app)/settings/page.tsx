"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { GoogleMark, Icon, InstagramMark, LinkedInMark } from "@/components/Icon";
import { DemoBadge } from "@/components/Tags";
import { useToast } from "@/components/Toast";
import { POLICY_COPY } from "@/lib/policy";
import { authService } from "@/lib/services/authService";
import { googleService } from "@/lib/services/googleService";
import { actions, useJumpIn } from "@/lib/store";
import type { JumpInPolicy } from "@/lib/types";

export default function SettingsPage() {
  const { viewer, session, integrations, members, safety } = useJumpIn();
  const router = useRouter();
  const toast = useToast();
  if (!viewer || !session) return null;

  const blocked = members.filter((m) => safety.blockedIds.includes(m.id));
  const isDemo = session.provider === "demo";

  return (
    <div className="container page page--narrow">
      <div className="page-head">
        <div>
          <p className="eyebrow">Settings</p>
          <h1 className="page-title">Account &amp; privacy</h1>
        </div>
      </div>

      <section className="panel">
        <header className="panel__head">
          <h2 className="panel__title">Account</h2>
          <Link href="/me" className="link-quiet">
            Edit profile
          </Link>
        </header>
        <div className="account-row">
          <Avatar name={viewer.name} src={viewer.avatarUrl} size={56} />
          <div>
            <strong>{viewer.name}</strong>
            <span className="account-row__email">
              {viewer.email || "No email yet"} <span className="private-chip"><Icon name="lock" size={11} /> Only you</span>
            </span>
          </div>
        </div>
        <p className="panel__copy">
          Your email is used for invites and reminders. It&apos;s never shown to other members, and JumpIn sends
          invites from its own address so neither person&apos;s email is exposed.
        </p>
      </section>

      <section className="panel">
        <header className="panel__head">
          <h2 className="panel__title">Sign-in &amp; connected accounts</h2>
        </header>
        <ul className="connections-list">
          <li>
            <LinkedInMark size={26} />
            <div className="connections-list__text">
              <strong>LinkedIn</strong>
              <span>
                {session.linked.linkedin
                  ? "Signed in with LinkedIn. Your identity is verified."
                  : integrations.linkedin
                    ? "Verify your identity so people know you're real."
                    : "Not configured on this server. The demo account is marked verified."}
              </span>
            </div>
            {session.linked.linkedin ? (
              <span className="connected-check"><Icon name="check" size={18} /></span>
            ) : integrations.linkedin ? (
              <button className="btn btn--outline btn--sm" onClick={() => authService.continueWithLinkedIn("/auth/complete?next=/settings")}>
                Verify
              </button>
            ) : (
              <DemoBadge>Setup needed</DemoBadge>
            )}
          </li>
          <li>
            <GoogleMark size={26} />
            <div className="connections-list__text">
              <strong>Google Calendar &amp; Meet</strong>
              <span>
                {session.linked.google
                  ? "Connected. JumpIns create real Meet links and avoid your busy times."
                  : viewer.calendarConnected
                    ? "Demo calendar connected."
                    : "Connect to create Meet links and use your real availability."}
              </span>
            </div>
            {session.linked.google ? (
              <span className="connected-check"><Icon name="check" size={18} /></span>
            ) : integrations.google ? (
              <button className="btn btn--outline btn--sm" onClick={() => googleService.connectCalendar("/settings")}>
                Connect
              </button>
            ) : viewer.calendarConnected ? (
              <DemoBadge />
            ) : (
              <button
                className="btn btn--outline btn--sm"
                onClick={() => {
                  actions.updateViewer({ calendarConnected: true });
                  toast("Demo calendar connected");
                }}
              >
                Connect demo
              </button>
            )}
          </li>
          <li>
            <InstagramMark size={26} />
            <div className="connections-list__text">
              <strong>Instagram</strong>
              <span>
                {session.linked.instagram
                  ? `Connected as @${session.instagramHandle}.`
                  : integrations.instagram
                    ? isDemo
                      ? "Sign in with LinkedIn or Google to connect Instagram."
                      : "Optional. Verifies your handle (Business or Creator accounts)."
                    : "Not configured on this server. You can still add your handle to your profile."}
              </span>
            </div>
            {session.linked.instagram ? (
              <span className="connected-check"><Icon name="check" size={18} /></span>
            ) : integrations.instagram && !isDemo ? (
              <button className="btn btn--outline btn--sm" onClick={() => authService.connectInstagram("/me")}>
                Connect
              </button>
            ) : (
              <Link href="/me#links" className="btn btn--ghost btn--sm">
                Add handle
              </Link>
            )}
          </li>
        </ul>
      </section>

      <section className="panel">
        <header className="panel__head">
          <h2 className="panel__title">Privacy &amp; safety</h2>
        </header>
        <label className="switch-row">
          <span>
            <strong>Hide my profile</strong>
            <span>You won&apos;t appear in Meet people or search. People you&apos;ve met can still see you in Connections.</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="switch"
            checked={viewer.profileHidden}
            onChange={(e) => {
              actions.updateViewer({ profileHidden: e.target.checked });
              toast(e.target.checked ? "Your profile is hidden" : "Your profile is visible again");
            }}
          />
        </label>
        <div className="field">
          <span className="field__label">Who can jump in with you instantly</span>
          <select
            className="input input--select"
            value={viewer.jumpInPolicy}
            onChange={(e) => {
              actions.updateViewer({ jumpInPolicy: e.target.value as JumpInPolicy });
              toast("Saved");
            }}
          >
            {(Object.keys(POLICY_COPY) as JumpInPolicy[]).map((p) => (
              <option key={p} value={p}>
                {POLICY_COPY[p].title}: {POLICY_COPY[p].sub}
              </option>
            ))}
          </select>
          <p className="field__hint">Anyone can still ask to schedule. Turn yourself to Not available any time from the top bar.</p>
        </div>

        <div className="field">
          <span className="field__label">Blocked members</span>
          {blocked.length === 0 ? (
            <p className="field__hint">You haven&apos;t blocked anyone. You can block or report someone from the menu on their profile.</p>
          ) : (
            <ul className="blocked-list">
              {blocked.map((m) => (
                <li key={m.id}>
                  <Avatar name={m.name} src={m.avatarUrl} size={32} />
                  <span>{m.name}</span>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      actions.unblock(m.id);
                      toast(`Unblocked ${m.name.split(" ")[0]}`);
                    }}
                  >
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          )}
          {safety.reports.length > 0 && (
            <p className="field__hint">
              You&apos;ve sent {safety.reports.length} {safety.reports.length === 1 ? "report" : "reports"}. Thank you for keeping
              JumpIn safe.
            </p>
          )}
        </div>
      </section>

      <section className="panel">
        <header className="panel__head">
          <h2 className="panel__title">Session</h2>
        </header>
        <div className="session-actions">
          <button
            className="btn btn--outline"
            onClick={async () => {
              await actions.signOut();
              router.replace("/");
            }}
          >
            <Icon name="logout" size={16} /> Sign out
          </button>
          {isDemo && (
            <button
              className="btn btn--ghost"
              onClick={async () => {
                await actions.resetDemo();
                router.replace("/");
              }}
            >
              <Icon name="refresh" size={16} /> Reset demo data
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
