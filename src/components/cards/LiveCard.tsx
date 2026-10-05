"use client";

import Link from "next/link";
import { firstName, formatCountdown, openRemainingMs } from "@/lib/availability";
import { flagEmoji } from "@/lib/match";
import { useNow } from "@/lib/store";
import type { Member } from "@/lib/types";
import { Avatar } from "../Avatar";
import { useConnect } from "../connect/ConnectProvider";
import { Icon, InstagramMark, LinkedInMark } from "../Icon";

/**
 * Compact "they're free right now" card for the Open to JumpIn row:
 * who they are in one line, how long they're open, and the button.
 */
export function LiveCard({ member }: { member: Member }) {
  const { jumpIn } = useConnect();
  const now = useNow(1000);
  const remaining = openRemainingMs(member, now);
  const first = firstName(member.name);

  return (
    <article className="lcard">
      <div className="lcard__body">
        <div className="lcard__head">
          <Link href={`/people/${member.id}`} className="lcard__name">
            {first} <span className="lcard__flag">{flagEmoji(member.countryCode)}</span>
          </Link>
          <Avatar name={member.name} src={member.avatarUrl} size={44} ring online={member.onlineStatus} />
        </div>
        <p className="lcard__headline">{member.headline}</p>
        <div className="lcard__cta">
          <button className="btn btn--jump btn--sm" onClick={() => jumpIn(member)}>
            <Icon name="video" size={16} /> Jump In
          </button>
          <span className="lcard__timer" title="How long they're open for">
            {remaining !== null ? formatCountdown(remaining) : "Open"}
            <Icon name="timer" size={17} />
          </span>
        </div>
        <div className="lcard__socials">
          {member.linkedinUrl && (
            <a href={member.linkedinUrl} target="_blank" rel="noreferrer" aria-label={`${first} on LinkedIn`}>
              <LinkedInMark size={20} />
            </a>
          )}
          {member.instagramUrl && (
            <a href={member.instagramUrl} target="_blank" rel="noreferrer" aria-label={`${first} on Instagram`}>
              <InstagramMark size={20} />
            </a>
          )}
        </div>
      </div>
      <footer className="lcard__foot">
        <Link href={`/people/${member.id}`} className="lcard__go" aria-label={`Open ${first}'s profile`}>
          <Icon name="arrowRight" size={18} />
        </Link>
        <span className="lcard__tags">
          {member.interests.slice(0, 3).map((t) => (
            <span key={t} className="tag tag--mint tag--xs">
              {t}
            </span>
          ))}
        </span>
      </footer>
    </article>
  );
}
