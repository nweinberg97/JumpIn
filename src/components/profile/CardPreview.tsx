"use client";

import { flagEmoji } from "@/lib/match";
import type { Viewer } from "@/lib/types";
import { Portrait } from "../Avatar";
import { Icon, LinkedInMark } from "../Icon";
import { StatusPill } from "../StatusPill";

/** How your card looks to everyone else, updating as you type. */
export function CardPreview({ draft }: { draft: Viewer }) {
  const first = draft.name.trim().split(/\s+/)[0] || "Your name";
  return (
    <div className="card-preview">
      <p className="eyebrow eyebrow--center">How people will see you</p>
      <article className="pcard pcard--preview">
        <div className="pcard__photo">
          <Portrait name={draft.name || "You"} src={draft.avatarUrl} width={520} height={600} />
          <span className="pcard__status">
            <StatusPill member={draft} size="sm" tone="overlay" />
          </span>
          {draft.onlineStatus === "online" && <span className="pcard__online" />}
        </div>
        <div className="pcard__namebar">
          <span className="pcard__name">{first}</span>
          {draft.verified && (
            <span className="pcard__verified">
              <LinkedInMark size={17} />
            </span>
          )}
          <span className="pcard__tags">
            {(draft.impactAreas.length ? draft.impactAreas : ["Your cause"]).slice(0, 2).map((t) => (
              <span key={t} className="tag tag--outline tag--xs">
                {t}
              </span>
            ))}
          </span>
        </div>
        <div className="pcard__bar pcard__bar--open">
          <div className="pcard__bar-row">
            <span className="pcard__expand">
              <Icon name="chevronDown" size={18} />
            </span>
            <span className="pcard__place">
              {flagEmoji(draft.countryCode)} {draft.city || "Your city"}
            </span>
            <div className="pcard__actions">
              <span className="pcard__btn pcard__btn--live">
                <Icon name="video" size={17} />
              </span>
              <span className="pcard__btn">
                <Icon name="calendar" size={17} />
              </span>
            </div>
          </div>
          <div className="pcard__intro">
            <p>{draft.headline || "Your one-liner shows up here."}</p>
          </div>
        </div>
      </article>
    </div>
  );
}
