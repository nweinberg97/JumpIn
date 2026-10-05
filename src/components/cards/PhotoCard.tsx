"use client";

import Link from "next/link";
import { useState } from "react";
import { effectiveStatus, firstName } from "@/lib/availability";
import { flagEmoji, sharedGround, sharedLine } from "@/lib/match";
import { useJumpIn, useNow } from "@/lib/store";
import type { Member } from "@/lib/types";
import { useConnect } from "../connect/ConnectProvider";
import { Portrait } from "../Avatar";
import { Icon, LinkedInMark } from "../Icon";
import { StatusPill } from "../StatusPill";

/**
 * The main discovery card: photography first, availability on the photo,
 * and the two ways to connect one tap away. The whole card opens the profile.
 */
export function PhotoCard({ member, priority }: { member: Member; priority?: boolean }) {
  const { viewer } = useJumpIn();
  const { jumpIn, schedule } = useConnect();
  const now = useNow(15_000);
  const [expanded, setExpanded] = useState(false);
  const status = effectiveStatus(member, now);
  // Only call out common ground when it's substantial, so it stays meaningful.
  const ground = viewer ? sharedGround(viewer, member) : null;
  const shared = ground && ground.score >= 5 ? sharedLine(ground) : null;
  const href = `/people/${member.id}`;
  const first = firstName(member.name);

  return (
    <article className={`pcard pcard--${status}`}>
      <Link href={href} className="pcard__photo" aria-label={`${member.name}, view profile`}>
        <Portrait name={member.name} src={member.avatarUrl} width={520} height={600} priority={priority} />
        <span className="pcard__status">
          <StatusPill member={member} size="sm" tone="overlay" />
        </span>
        {member.onlineStatus === "online" && <span className="pcard__online" title="Online now" />}
        {shared && (
          <span className="pcard__shared">
            <Icon name="sparkle" size={13} />
            {shared}
          </span>
        )}
      </Link>

      <div className="pcard__namebar">
        <Link href={href} className="pcard__name">
          {first}
        </Link>
        {member.verified && (
          <span className="pcard__verified" title="Verified with LinkedIn">
            <LinkedInMark size={17} />
          </span>
        )}
        <span className="pcard__tags">
          {member.impactAreas.slice(0, 2).map((t) => (
            <span key={t} className="tag tag--outline tag--xs">
              {t}
            </span>
          ))}
        </span>
      </div>

      <div className={`pcard__bar ${expanded ? "pcard__bar--open" : ""}`}>
        <div className="pcard__bar-row">
          <button
            className="pcard__expand"
            onClick={() => setExpanded((x) => !x)}
            aria-expanded={expanded}
            aria-label={expanded ? "Hide intro" : `Read ${first}'s intro`}
          >
            <Icon name="chevronDown" size={18} />
          </button>
          <span className="pcard__place">
            {flagEmoji(member.countryCode)} {member.city}
          </span>
          <div className="pcard__actions">
            <button
              className={`pcard__btn ${status === "open" ? "pcard__btn--live" : ""}`}
              onClick={() => jumpIn(member)}
              aria-label={status === "open" ? `Jump in with ${first} now` : `${first} isn't open right now, schedule instead`}
              title={status === "open" ? "Jump In now (Google Meet)" : "Not open right now"}
            >
              <Icon name="video" size={17} />
            </button>
            <button
              className="pcard__btn"
              onClick={() => schedule(member)}
              aria-label={`Schedule a JumpIn with ${first}`}
              title="Schedule a JumpIn"
            >
              <Icon name="calendar" size={17} />
            </button>
          </div>
        </div>
        <div className="pcard__intro" hidden={!expanded}>
          <p>{member.headline}</p>
          <Link href={href} className="pcard__more">
            Get to know {first} <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
