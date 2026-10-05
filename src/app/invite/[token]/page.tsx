"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon, JumpInLogo } from "@/components/Icon";
import { DemoBadge } from "@/components/Tags";
import { firstName } from "@/lib/availability";
import { decodeInvite } from "@/lib/invite";
import { actions, ensureLoaded, useJumpIn } from "@/lib/store";

/**
 * What the other person receives: the "Connecting via JumpIn" email,
 * rendered in the browser. Yes → straight into the Meet. No → a kind
 * "not right now", and the sender is told without any awkwardness.
 */
export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const decoded = useMemo(() => decodeInvite(token), [token]);
  useJumpIn();
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("answered") === "no") setAnswer("no");
    if (p.get("expired") === "1") setExpired(true);
    if (decoded && Date.parse(decoded.payload.expiresAt) < Date.now()) setExpired(true);
  }, [decoded]);

  if (!decoded) {
    return (
      <div className="invite-page">
        <div className="invite-card invite-card--center">
          <JumpInLogo size={40} />
          <h1 className="invite-title">This invite link isn&apos;t valid</h1>
          <p>It may have been copied incompletely. Ask the sender to jump in again.</p>
        </div>
      </div>
    );
  }

  const { payload, signed } = decoded;
  const from = firstName(payload.fromName);
  const to = firstName(payload.toName);
  const tokenParam = encodeURIComponent(token);

  const respond = async (a: "yes" | "no") => {
    if (signed) {
      window.location.assign(`/api/invites/respond?answer=${a}&token=${tokenParam}`);
      return;
    }
    // Demo: the sender's connection lives in this same browser, so update it.
    await ensureLoaded();
    await actions.updateConnection(payload.connectionId, { status: a === "yes" ? "live" : "declined" });
    setAnswer(a);
    if (a === "yes") window.open(payload.meetingUrl, "_blank", "noopener");
  };

  return (
    <div className="invite-page">
      <div className="invite-mail">
        <div className="invite-mail__subject">
          <h1>Connecting via JumpIn</h1>
          <span className="invite-mail__label">Inbox</span>
          {!signed && <DemoBadge>Demo preview of {to}&apos;s email</DemoBadge>}
        </div>
        <div className="invite-mail__from">
          <span className="invite-mail__sender-logo">
            <JumpInLogo size={40} />
          </span>
          <div>
            <strong>JumpIn</strong> <span className="invite-mail__addr">on behalf of {payload.fromName}</span>
            <span className="invite-mail__to">to {to}</span>
          </div>
          <span className="invite-mail__time">just now</span>
        </div>

        <div className="invite-mail__body">
          <p className="invite-mail__note">{payload.note}</p>

          {expired ? (
            <div className="invite-answer invite-answer--muted">
              <Icon name="clock" size={18} />
              This invite has expired. If you&apos;d still like to talk, find {from} on JumpIn and schedule a time.
            </div>
          ) : answer === "yes" ? (
            <div className="invite-answer invite-answer--yes">
              <Icon name="check" size={18} />
              <span>
                You&apos;re in. Meet opened in a new tab.{" "}
                <a href={payload.meetingUrl} target="_blank" rel="noreferrer">
                  Open it again
                </a>
              </span>
            </div>
          ) : answer === "no" ? (
            <div className="invite-answer invite-answer--muted">
              <Icon name="check" size={18} />
              No problem. We&apos;ve let {from} know you&apos;re not free right now. They can schedule a time instead.
            </div>
          ) : (
            <>
              <p className="invite-mail__ask">Are you still free to connect with {from}?</p>
              <div className="invite-mail__buttons">
                <button className="btn btn--jump btn--lg" onClick={() => respond("yes")}>
                  Yes
                </button>
                <button className="btn btn--outline btn--lg" onClick={() => respond("no")}>
                  No
                </button>
              </div>
            </>
          )}

          <div className="meet-preview" aria-label={`${from} is waiting in Google Meet`}>
            <div className="meet-preview__stage">
              <Avatar name={payload.fromName} src={payload.fromAvatarUrl} size={64} />
              <span className="meet-preview__waiting">{from} is waiting in the call</span>
              <span className="meet-preview__name">{payload.fromName}</span>
            </div>
            <div className="meet-preview__bar">
              <span className="meet-preview__code">Google Meet</span>
              <span className="meet-preview__controls">
                <span />
                <span />
                <span />
                <span className="meet-preview__hangup" />
              </span>
            </div>
          </div>

          <p className="invite-mail__foot">
            <Icon name="shield" size={14} /> Sent by JumpIn. {from} can&apos;t see your email address. Not expecting
            this? Just ignore it.
          </p>
        </div>
      </div>
    </div>
  );
}
