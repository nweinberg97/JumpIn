"use client";

import { useEffect, useRef, useState } from "react";
import { firstName } from "@/lib/availability";
import { defaultNote } from "@/lib/invite";
import { inviteService } from "@/lib/services/inviteService";
import { meetingService, type MeetingResult } from "@/lib/services/meetingService";
import { actions, useJumpIn } from "@/lib/store";
import type { Connection, Member } from "@/lib/types";
import { Avatar } from "../Avatar";
import { Dialog } from "../Dialog";
import { Icon } from "../Icon";
import { StatusPill } from "../StatusPill";
import { DemoBadge } from "../Tags";

type Mode = "direct" | "invite";
type Phase = "compose" | "starting" | "ready" | "error";
type StepState = "pending" | "active" | "done";

/**
 * The defining interaction.
 *
 *  First time (invite):  write a short note → we create a Meet and send
 *    "Are you still free to connect?" → you hop into the Meet and they join.
 *  Met before (direct):  no note, no waiting. Meet is created, they're
 *    pinged, and Meet opens straight away.
 */
export function JumpInDialog({ member, mode, onClose }: { member: Member; mode: Mode; onClose: () => void }) {
  const { viewer } = useJumpIn();
  const them = firstName(member.name);
  const me = viewer ? firstName(viewer.name) : "me";

  const [phase, setPhase] = useState<Phase>(mode === "invite" ? "compose" : "starting");
  const [note, setNote] = useState(() => defaultNote(them, me));
  const [steps, setSteps] = useState<StepState[]>(["pending", "pending"]);
  const [meeting, setMeeting] = useState<MeetingResult | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [emailed, setEmailed] = useState(false);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [theirReply, setTheirReply] = useState<"waiting" | "yes">("waiting");
  const [popupBlocked, setPopupBlocked] = useState(false);
  const popup = useRef<Window | null>(null);
  const started = useRef(false);

  const run = async () => {
    if (!viewer || started.current) return;
    started.current = true;
    setPhase("starting");
    setSteps(["active", "pending"]);

    const created = await meetingService.createInstant({
      memberId: member.id,
      title: `JumpIn: ${viewer.name} + ${member.name}`,
      description:
        mode === "invite"
          ? `${note}\n\nStarted on JumpIn.`
          : `${me} jumped in on JumpIn. You've met before, so this one skipped the invite.`,
    });
    setMeeting(created);
    setSteps(["done", "active"]);

    const conn: Connection = {
      id: actions.newConnectionId(),
      userId: viewer.id,
      otherUserId: member.id,
      type: "jumpin",
      status: mode === "invite" ? "invited" : "live",
      createdAt: new Date().toISOString(),
      meetingUrl: created.meetingUrl,
      durationMinutes: 30,
      note: mode === "invite" ? note : undefined,
      calendarEventId: created.eventId,
      source: created.source,
    };

    if (mode === "invite") {
      const sent = await inviteService.send({
        connectionId: conn.id,
        fromName: viewer.name,
        fromAvatarUrl: viewer.avatarUrl,
        fromHeadline: viewer.headline,
        toMemberId: member.id,
        toName: member.name,
        note,
        meetingUrl: created.meetingUrl,
        expiresAt: new Date(Date.now() + 2 * 3600_000).toISOString(),
      });
      setInviteUrl(sent.inviteUrl);
      setEmailed(sent.delivered);
    } else {
      // Returning connection: a quick ping, then straight in.
      await new Promise((r) => setTimeout(r, 700));
    }

    await actions.saveConnection(conn);
    setConnection(conn);
    setSteps(["done", "done"]);
    await new Promise((r) => setTimeout(r, 350));
    setPhase("ready");

    if (mode === "direct") {
      if (popup.current && !popup.current.closed) {
        popup.current.location.href = created.meetingUrl;
      } else {
        setPopupBlocked(true);
      }
    }
  };

  // Direct mode starts immediately. Open a tab synchronously so the browser
  // treats it as user-initiated, then point it at the Meet once it exists.
  useEffect(() => {
    // Guard against React Strict Mode's double effect run in development.
    if (mode !== "direct" || started.current) return;
    try {
      popup.current = window.open("", "_blank");
      if (popup.current) {
        popup.current.document.title = "Starting your JumpIn…";
        popup.current.document.body.innerHTML =
          '<p style="font:16px system-ui;padding:40px;color:#4A4F5C">Starting your JumpIn…</p>';
      }
    } catch {
      popup.current = null;
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Demo mode: the other person "answers" a few seconds after the invite lands.
  useEffect(() => {
    if (phase !== "ready" || mode !== "invite" || emailed) return;
    const t = setTimeout(() => setTheirReply("yes"), 3800);
    return () => clearTimeout(t);
  }, [phase, mode, emailed]);

  const join = () => {
    if (!meeting || !connection) return;
    window.open(meeting.meetingUrl, "_blank", "noopener");
    actions.updateConnection(connection.id, { status: "live" });
    onClose();
  };

  const stepLabels =
    mode === "invite"
      ? ["Creating your Google Meet", `Sending your note to ${them}`]
      : ["Creating your Google Meet", `Letting ${them} know you're jumping in`];

  return (
    <Dialog open onClose={onClose} label={`Jump in with ${member.name}`} size="md" dismissible={phase !== "starting"}>
      <div className="jump">
        <div className="jump__pair" aria-hidden="true">
          <Avatar name={viewer?.name ?? "You"} src={viewer?.avatarUrl} size={52} ring />
          <span className={`jump__link ${phase === "starting" ? "jump__link--live" : ""} ${phase === "ready" ? "jump__link--done" : ""}`}>
            <span />
            <span />
            <span />
          </span>
          <Avatar name={member.name} src={member.avatarUrl} size={52} ring online={member.onlineStatus} />
        </div>

        {phase === "compose" && (
          <>
            <h2 className="jump__title">Connecting via JumpIn</h2>
            <p className="jump__sub">
              First time with {them}, so we&apos;ll send a quick note. When they say yes, you&apos;re both in the same Meet.
            </p>
            <div className="jump__status">
              <StatusPill member={member} />
            </div>
            <label className="field">
              <span className="field__label">Your message</span>
              <textarea
                className="note-box"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={8}
                maxLength={1200}
                data-autofocus
              />
            </label>
            <p className="fine-print">
              <Icon name="shield" size={14} /> {them} won&apos;t see your email address, and you won&apos;t see theirs.
            </p>
            <div className="jump__actions">
              <button className="btn btn--ghost" onClick={onClose}>
                Not now
              </button>
              <button className="btn btn--jump" onClick={run} disabled={!note.trim()}>
                <Icon name="send" size={17} /> Send &amp; jump in
              </button>
            </div>
          </>
        )}

        {phase === "starting" && (
          <>
            <h2 className="jump__title">Starting your JumpIn</h2>
            <ol className="steps" aria-live="polite">
              {stepLabels.map((label, i) => (
                <li key={label} className={`step step--${steps[i]}`}>
                  <span className="step__mark">{steps[i] === "done" ? <Icon name="check" size={14} /> : null}</span>
                  {label}
                </li>
              ))}
            </ol>
          </>
        )}

        {phase === "ready" && meeting && mode === "invite" && (
          <>
            <div className="sent-mark" aria-hidden="true">
              <Icon name="check" size={26} />
            </div>
            <h2 className="jump__title">Message sent!</h2>
            <p className="jump__sub" aria-live="polite">
              {theirReply === "yes" ? (
                <strong className="reply-yes">{them} said yes and is joining now.</strong>
              ) : emailed ? (
                <>
                  {them} has your note in their inbox. Hop into the Meet; they&apos;ll join if they&apos;re still free.
                </>
              ) : (
                <span className="waiting">
                  Waiting for {them}
                  <span className="waiting__dots" />
                </span>
              )}
            </p>
            <button className="btn btn--jump btn--wide" onClick={join} data-autofocus>
              <Icon name="video" size={18} /> Join Google Meet
            </button>
            <div className="jump__meta">
              {inviteUrl && (
                <a href={inviteUrl} target="_blank" rel="noreferrer" className="link-quiet">
                  See what {them} received <Icon name="external" size={13} />
                </a>
              )}
              {meeting.source === "demo" && (
                <DemoBadge>Demo: opens a new Meet at meet.google.com/new</DemoBadge>
              )}
            </div>
          </>
        )}

        {phase === "ready" && meeting && mode === "direct" && (
          <>
            <div className="sent-mark" aria-hidden="true">
              <Icon name="video" size={24} />
            </div>
            <h2 className="jump__title">You&apos;re in.</h2>
            <p className="jump__sub">
              {popupBlocked
                ? "Your browser blocked the new tab. Use the button to open Meet."
                : `Meet opened in a new tab. ${them} has been pinged and is on the way.`}
            </p>
            <button className="btn btn--jump btn--wide" onClick={join} data-autofocus={popupBlocked || undefined}>
              <Icon name="video" size={18} /> {popupBlocked ? "Open Google Meet" : "Back to the Meet"}
            </button>
            <div className="jump__meta">
              <span className="fine-print">You&apos;ve met before, so this one skipped the invite.</span>
              {meeting.source === "demo" && <DemoBadge>Demo: meet.google.com/new</DemoBadge>}
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
