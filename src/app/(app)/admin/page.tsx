"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { launchDateLabel, timeLeft } from "@/components/Launch";
import { ConnectorChip } from "@/components/Tags";
import { useToast } from "@/components/Toast";
import type { AdminAction, AdminMember, AdminOverview } from "@/lib/admin";
import { ApiError, api } from "@/lib/services/http";
import { actions, useJumpIn, useNow } from "@/lib/store";

type Tab = "waiting" | "approved" | "all";

/** ISO → the value a datetime-local input wants, in the founder's timezone. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * The founder's page: onboard people one by one, hand out Connector badges,
 * set the launch countdown, and send the "we're live" email.
 */
export default function AdminPage() {
  const { access } = useJumpIn();
  const toast = useToast();
  const now = useNow(1000);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("waiting");
  const [busy, setBusy] = useState<string | null>(null);
  const [launchInput, setLaunchInput] = useState("");

  const refresh = useCallback(async () => {
    try {
      const next = await api<AdminOverview>("/api/admin/overview");
      setData(next);
      setLaunchInput(toLocalInput(next.launch.launchAt));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 501 ? "Connect the database to use founder tools." : "Couldn't load members.");
    }
  }, []);

  useEffect(() => {
    if (access.admin) void refresh();
  }, [access.admin, refresh]);

  const run = async (key: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try {
      await fn();
      toast(done);
      await refresh();
      await actions.reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : "That didn't work");
    } finally {
      setBusy(null);
    }
  };

  const act = (m: AdminMember, action: AdminAction, done: string) =>
    run(`${m.id}:${action}`, () => api("/api/admin/members", { json: { memberId: m.id, action } }), done);

  const members = data?.members ?? [];
  const counts = useMemo(
    () => ({
      waiting: members.filter((m) => m.membership === "waitlisted").length,
      approved: members.filter((m) => m.membership === "approved").length,
      ready: members.filter((m) => m.membership === "waitlisted" && m.gaps.length === 0).length,
      connectors: members.filter((m) => m.isConnector).length,
    }),
    [members],
  );
  const shown = members.filter((m) =>
    tab === "all" ? true : tab === "approved" ? m.membership === "approved" : m.membership !== "approved",
  );

  if (!access.admin) {
    return (
      <div className="container page page--narrow">
        <div className="empty">
          <p className="empty__title">Founder tools</p>
          <p>This page is for the JumpIn team.</p>
        </div>
      </div>
    );
  }

  const launch = data?.launch;
  const left = timeLeft(launch?.launchAt ?? null, now);
  const open = Boolean(launch?.openedAt) || (launch?.launchAt ? Date.parse(launch.launchAt) <= now : false);

  return (
    <div className="container page admin">
      <div className="page-head">
        <div>
          <p className="eyebrow">Founder</p>
          <h1 className="page-title">Onboarding &amp; launch</h1>
          <p className="page-sub">
            Bring people in one by one, then open the doors for everyone at once.{" "}
            <a className="link-quiet" href="/email-previews" target="_blank" rel="noreferrer">
              Preview every email <Icon name="external" size={13} />
            </a>
          </p>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="admin-stats">
        <Stat label="Waiting for you" value={counts.waiting} hint={`${counts.ready} with complete profiles`} />
        <Stat label="Approved" value={counts.approved} hint="Will get the launch email" />
        <Stat label="Connectors" value={counts.connectors} hint="Can send warm intros" />
      </div>

      <section className="admin-card">
        <div className="admin-card__head">
          <h2>Launch</h2>
          <span className={`admin-pill ${open ? "admin-pill--live" : ""}`}>{open ? "Calls are open" : "Onboarding"}</span>
        </div>
        <p className="admin-card__copy">
          {open
            ? "Members can jump in with each other now."
            : left && launch?.launchAt
              ? `Calls open ${launchDateLabel(launch.launchAt)}, in ${left.label}. Members see this countdown.`
              : "Pick when calls open. Members see a countdown until then; you can test calls any time."}
        </p>
        <div className="admin-launch">
          <label className="field admin-launch__date">
            <span className="field__label">Launch date and time (your timezone)</span>
            <input className="input" type="datetime-local" value={launchInput} onChange={(e) => setLaunchInput(e.target.value)} />
          </label>
          <button
            className="btn btn--jump"
            disabled={!launchInput || busy !== null}
            onClick={() =>
              run("date", () => api("/api/admin/launch", { json: { launchAt: new Date(launchInput).toISOString() } }), "Launch date saved")
            }
          >
            <Icon name="calendar" size={16} /> Save date
          </button>
          {open ? (
            <button
              className="btn btn--ghost"
              disabled={busy !== null || !launch?.openedAt}
              onClick={() => run("close", () => api("/api/admin/launch", { json: { open: false } }), "Calls closed again")}
            >
              Close calls again
            </button>
          ) : (
            <button
              className="btn btn--outline"
              disabled={busy !== null}
              onClick={() => run("open", () => api("/api/admin/launch", { json: { open: true } }), "Calls are open")}
            >
              <Icon name="unlock" size={16} /> Open calls now
            </button>
          )}
        </div>

        <div className="admin-email">
          <div>
            <h3>Launch email</h3>
            <p className="admin-card__copy">
              {launch?.launchEmailSentAt
                ? `Sent ${new Date(launch.launchEmailSentAt).toLocaleString()}.`
                : `The "JumpIn is live" email goes to ${counts.approved === 1 ? "your 1 approved member" : `all ${counts.approved} approved members`}, once. Send yourself a test first.`}
            </p>
          </div>
          <div className="admin-email__actions">
            <button
              className="btn btn--outline btn--sm"
              disabled={busy !== null}
              onClick={() => run("test", () => api("/api/admin/launch-email", { json: { test: true } }), "Test email sent to you")}
            >
              <Icon name="mail" size={15} /> Send me a test
            </button>
            <button
              className="btn btn--jump btn--sm"
              disabled={busy !== null || Boolean(launch?.launchEmailSentAt) || counts.approved === 0}
              onClick={() => {
                if (window.confirm(`Send the launch email to ${counts.approved} approved members now?`)) {
                  void run("send", () => api("/api/admin/launch-email", { json: {} }), "Launch email sent");
                }
              }}
            >
              <Icon name="send" size={15} /> Send to everyone
            </button>
          </div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card__head">
          <h2>Members</h2>
          <div className="seg admin-tabs" role="tablist">
            {(
              [
                ["waiting", `Waiting (${counts.waiting})`],
                ["approved", `Approved (${counts.approved})`],
                ["all", `All (${members.length})`],
              ] as Array<[Tab, string]>
            ).map(([key, label]) => (
              <button key={key} role="tab" aria-selected={tab === key} className={`seg__opt ${tab === key ? "seg__opt--on" : ""}`} onClick={() => setTab(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {data && shown.length === 0 && (
          <p className="admin-card__copy">
            {tab === "waiting" ? "Nobody's waiting. Share your sign-up link, or have a Connector send a warm intro." : "No one here yet."}
          </p>
        )}

        <ul className="admin-list">
          {shown.map((m) => (
            <li key={m.id} className="admin-row">
              <Avatar name={m.name} src={m.avatarUrl ?? undefined} size={48} />
              <div className="admin-row__main">
                <p className="admin-row__name">
                  {m.name}
                  {m.verified && (
                    <span className="admin-verified" title="Verified">
                      <Icon name="check" size={12} /> Verified
                    </span>
                  )}
                  {m.isConnector && <ConnectorChip compact />}
                </p>
                <p className="admin-row__meta">
                  {m.email ?? "No email"} · joined {new Date(m.joinedAt).toLocaleDateString()}
                  {m.invitedBy && ` · intro from ${m.invitedBy}`}
                </p>
                {m.headline && <p className="admin-row__headline">{m.headline}</p>}
                {m.linkedinUrl ? (
                  <a className="admin-row__link" href={m.linkedinUrl} target="_blank" rel="noreferrer">
                    <Icon name="external" size={13} /> Check their LinkedIn
                  </a>
                ) : (
                  <p className="admin-row__meta">No LinkedIn link on their profile</p>
                )}
                {m.gaps.length > 0 ? (
                  <p className="admin-row__gaps">
                    Missing: {m.gaps.map((g) => <span key={g} className="admin-gap">{g}</span>)}
                  </p>
                ) : (
                  <p className="admin-row__ready">
                    <Icon name="check" size={14} /> Profile complete
                  </p>
                )}
              </div>
              <div className="admin-row__actions">
                {m.membership === "approved" ? (
                  <span className="admin-pill admin-pill--live">Approved</span>
                ) : (
                  <button className="btn btn--jump btn--sm" disabled={busy !== null} onClick={() => act(m, "approve", `${m.name} is approved. Welcome email sent if email is set up.`)}>
                    <Icon name="check" size={15} /> Approve
                  </button>
                )}
                <button
                  className="btn btn--outline btn--sm"
                  disabled={busy !== null}
                  onClick={() =>
                    act(m, m.isConnector ? "unconnector" : "connector", m.isConnector ? `${m.name} is no longer a Connector` : `${m.name} is now a Connector`)
                  }
                >
                  <Icon name="link2" size={15} /> {m.isConnector ? "Remove Connector" : "Make Connector"}
                </button>
                <button
                  className="btn btn--outline btn--sm"
                  disabled={busy !== null}
                  onClick={() => act(m, m.verified ? "unverify" : "verify", m.verified ? `${m.name} is no longer verified` : `${m.name} is verified`)}
                >
                  <Icon name="shield" size={15} /> {m.verified ? "Remove Verified" : "Mark as verified"}
                </button>
                {m.membership === "approved" && (
                  <button className="btn btn--ghost btn--sm" disabled={busy !== null} onClick={() => act(m, "waitlist", `${m.name} moved back to waiting`)}>
                    Move back
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="admin-stat">
      <span className="admin-stat__value">{value}</span>
      <span className="admin-stat__label">{label}</span>
      <span className="admin-stat__hint">{hint}</span>
    </div>
  );
}
