"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon, JumpInLogo } from "@/components/Icon";
import { ConnectorChip, DemoBadge, TagList } from "@/components/Tags";
import { firstName } from "@/lib/availability";
import { decodeIntro } from "@/lib/intro";

/**
 * What the recipient of a warm intro sees: the email, rendered in the
 * browser. A member goes on to the profile; someone new joins JumpIn
 * through the intro, without the waitlist.
 */
export default function IntroPage() {
  const { token } = useParams<{ token: string }>();
  const decoded = useMemo(() => decodeIntro(token), [token]);

  if (!decoded) {
    return (
      <div className="invite-page">
        <div className="invite-card invite-card--center">
          <JumpInLogo size={40} />
          <h1 className="invite-title">This intro link isn&apos;t valid</h1>
          <p>It may have been copied incompletely. Ask the person who introduced you to send it again.</p>
        </div>
      </div>
    );
  }

  const { payload, signed } = decoded;
  const from = firstName(payload.fromName);
  const subject = payload.subject;
  const subjectFirst = firstName(subject.name);
  const to = firstName(payload.recipientName);
  const expired = Date.parse(payload.expiresAt) < Date.now();

  return (
    <div className="invite-page">
      <div className="invite-mail">
        <div className="invite-mail__subject">
          <h1>
            {from} thinks you should meet {subjectFirst}
          </h1>
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

          <article className="intro-card">
            <Avatar name={subject.name} src={subject.avatarUrl} size={72} />
            <div className="intro-card__text">
              <h2 className="intro-card__name">{subject.name}</h2>
              {subject.city && <p className="intro-card__place">{subject.city}</p>}
              <p className="intro-card__headline">{subject.headline}</p>
              {subject.whatIDo && <p className="intro-card__what">{subject.whatIDo}</p>}
              {subject.impactAreas && subject.impactAreas.length > 0 && (
                <TagList items={subject.impactAreas} tone="outline" max={3} />
              )}
            </div>
          </article>

          <p className="intro-by">
            Introduced by <strong>{payload.fromName}</strong> <ConnectorChip />
          </p>

          {expired ? (
            <div className="invite-answer invite-answer--muted">
              <Icon name="clock" size={18} />
              This intro link has expired. Ask {from} to send it again.
            </div>
          ) : payload.recipientIsNew ? (
            <>
              <div className="invite-mail__buttons">
                <Link href={signed ? `/api/intros/claim?token=${encodeURIComponent(token)}` : "/"} className="btn btn--jump btn--lg">
                  Join JumpIn to meet {subjectFirst} <Icon name="arrowRight" size={18} />
                </Link>
              </div>
              <p className="intro-skip">
                <Icon name="link2" size={15} />
                <span>
                  JumpIn is a private network for people building a better world. {from} is a Connector, so you can
                  join straight away. No waitlist.
                  {payload.recipientEmailHint && (
                    <>
                      {" "}
                      Sign in with the email this intro was sent to, <strong>{payload.recipientEmailHint}</strong>.
                    </>
                  )}
                </span>
              </p>
            </>
          ) : (
            <div className="invite-mail__buttons">
              <Link href={`/people/${encodeURIComponent(subject.id)}`} className="btn btn--jump btn--lg">
                See {subjectFirst}&apos;s profile <Icon name="arrowRight" size={18} />
              </Link>
            </div>
          )}

          <p className="invite-mail__foot">
            <Icon name="shield" size={14} /> Sent by JumpIn. Nobody&apos;s email address was shared. Not expecting this?
            Just ignore it.
          </p>
        </div>
      </div>
    </div>
  );
}
