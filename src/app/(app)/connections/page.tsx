"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { useConnect } from "@/components/connect/ConnectProvider";
import { Icon } from "@/components/Icon";
import { StatusPill } from "@/components/StatusPill";
import { DemoBadge } from "@/components/Tags";
import { useToast } from "@/components/Toast";
import { effectiveStatus, firstName } from "@/lib/availability";
import { displayStatus, type DisplayStatus } from "@/lib/connections";
import { actions, useJumpIn, useNow } from "@/lib/store";
import { formatWhen, relativeTime } from "@/lib/time";
import type { Connection, Member } from "@/lib/types";

export default function ConnectionsPage() {
  const { connections, members, safety } = useJumpIn();
  const now = useNow(15_000);
  const byId = new Map(members.map((m) => [m.id, m]));
  const blocked = new Set(safety.blockedIds);

  const rows = connections
    .filter((c) => byId.has(c.otherUserId) && !blocked.has(c.otherUserId))
    .map((c) => ({ c, m: byId.get(c.otherUserId)!, s: displayStatus(c, now) }))
    .filter((r) => r.s !== "cancelled");

  const upcoming = rows
    .filter((r) => r.s === "upcoming")
    .sort((a, b) => Date.parse(a.c.scheduledAt!) - Date.parse(b.c.scheduledAt!));
  const active = rows.filter((r) => r.s === "live" || r.s === "waiting");
  const past = rows
    .filter((r) => r.s === "met" || r.s === "no-answer" || r.s === "declined")
    .sort((a, b) => Date.parse(b.c.scheduledAt ?? b.c.createdAt) - Date.parse(a.c.scheduledAt ?? a.c.createdAt));
  const metCount = new Set(rows.filter((r) => r.s === "met" || r.s === "live").map((r) => r.m.id)).size;

  return (
    <div className="container page page--narrow">
      <div className="page-head">
        <div>
          <p className="eyebrow">Connections</p>
          <h1 className="page-title">People you&apos;ve jumped in with</h1>
          <p className="page-sub">
            {metCount > 0
              ? `${metCount} ${metCount === 1 ? "conversation" : "conversations"} so far. People you've met can jump straight into a call with you next time.`
              : "Your JumpIns and scheduled calls show up here."}
          </p>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="empty">
          <p className="empty__title">No JumpIns yet.</p>
          <p>Find someone who&apos;s open right now. It takes about ten seconds.</p>
          <Link href="/discover" className="btn btn--jump">
            Meet someone interesting <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      )}

      {active.length > 0 && (
        <Group title="Happening now">
          {active.map(({ c, m, s }) => (
            <Row key={c.id} c={c} m={m} s={s} now={now} />
          ))}
        </Group>
      )}
      {upcoming.length > 0 && (
        <Group title="Coming up">
          {upcoming.map(({ c, m, s }) => (
            <Row key={c.id} c={c} m={m} s={s} now={now} />
          ))}
        </Group>
      )}
      {past.length > 0 && (
        <Group title="Past">
          {past.map(({ c, m, s }) => (
            <Row key={c.id} c={c} m={m} s={s} now={now} />
          ))}
        </Group>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="conn-group">
      <h2 className="conn-group__title">{title}</h2>
      <ul className="conn-list">{children}</ul>
    </section>
  );
}

const LABEL: Record<DisplayStatus, string> = {
  upcoming: "Scheduled",
  live: "Live now",
  waiting: "Invite sent",
  met: "Met",
  "no-answer": "No answer",
  declined: "Not this time",
  cancelled: "Cancelled",
};

function Row({ c, m, s, now }: { c: Connection; m: Member; s: DisplayStatus; now: number }) {
  const { jumpIn, schedule } = useConnect();
  const toast = useToast();
  const first = firstName(m.name);
  const when = Date.parse(c.scheduledAt ?? c.createdAt);
  const open = effectiveStatus(m, now) === "open";

  const detail =
    s === "upcoming"
      ? `${formatWhen(when)} · ${relativeTime(when, now)}`
      : s === "waiting"
        ? `Note sent ${relativeTime(when, now)}`
        : s === "live"
          ? `Started ${relativeTime(when, now)}`
          : `${c.type === "jumpin" ? "Jumped in" : "Scheduled call"} ${relativeTime(when, now)}`;

  return (
    <li className={`conn conn--${s}`}>
      <Link href={`/people/${m.id}`} className="conn__who">
        <Avatar name={m.name} src={m.avatarUrl} size={52} online={m.onlineStatus} />
        <span className="conn__text">
          <strong>{m.name}</strong>
          <span className="conn__detail">
            <Icon name={c.type === "jumpin" ? "video" : "calendar"} size={14} /> {detail}
          </span>
          {c.note && s !== "met" && <span className="conn__note">&ldquo;{c.note.split("\n").filter(Boolean)[1] ?? c.note}&rdquo;</span>}
        </span>
      </Link>
      <div className="conn__side">
        <span className={`conn__badge conn__badge--${s}`}>{LABEL[s]}</span>
        {c.source === "demo" && (s === "upcoming" || s === "live" || s === "waiting") && <DemoBadge>Demo</DemoBadge>}
        <div className="conn__actions">
          {(s === "upcoming" || s === "live" || s === "waiting") && (
            <a className="btn btn--outline btn--sm" href={c.meetingUrl} target="_blank" rel="noreferrer">
              <Icon name="video" size={15} /> Open Meet
            </a>
          )}
          {s === "upcoming" && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={async () => {
                await actions.updateConnection(c.id, { status: "cancelled" });
                toast(`Cancelled your JumpIn with ${first}`);
              }}
            >
              Cancel
            </button>
          )}
          {(s === "met" || s === "no-answer" || s === "declined") &&
            (open ? (
              <button className="btn btn--jump btn--sm" onClick={() => jumpIn(m)}>
                <Icon name="video" size={15} /> Jump in again
              </button>
            ) : (
              <>
                <StatusPill member={m} size="sm" />
                <button className="btn btn--outline btn--sm" onClick={() => schedule(m)}>
                  <Icon name="calendar" size={15} /> Schedule
                </button>
              </>
            ))}
        </div>
      </div>
    </li>
  );
}
