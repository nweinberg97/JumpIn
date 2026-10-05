"use client";

import { effectiveStatus, formatDurationShort, openRemainingMs, STATUS_COPY } from "@/lib/availability";
import { actions, useNow } from "@/lib/store";
import type { AvailabilityStatus, Viewer } from "@/lib/types";
import { Icon } from "./Icon";

const DURATIONS: Array<{ label: string; minutes: number | null }> = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "Until I turn it off", minutes: null },
];

const OPTIONS: Array<{ status: AvailabilityStatus; icon: "unlock" | "clock" | "lock" }> = [
  { status: "open", icon: "unlock" },
  { status: "later", icon: "clock" },
  { status: "unavailable", icon: "lock" },
];

/** "Right now" availability: three states, plus how long you're open for. */
export function StatusControl({ viewer, compact }: { viewer: Viewer; compact?: boolean }) {
  const now = useNow(1000);
  const status = effectiveStatus(viewer, now);
  const remaining = openRemainingMs(viewer, now);

  return (
    <div className={`status-control ${compact ? "status-control--compact" : ""}`}>
      <div className="status-options" role="radiogroup" aria-label="Your availability right now">
        {OPTIONS.map((o) => (
          <button
            key={o.status}
            role="radio"
            aria-checked={status === o.status}
            className={`status-option status-option--${o.status} ${status === o.status ? "status-option--on" : ""}`}
            onClick={() => actions.setAvailability(o.status, o.status === "open" ? 60 : undefined)}
          >
            <span className="status-option__icon">
              <Icon name={o.icon} size={18} />
            </span>
            <span className="status-option__text">
              <strong>{STATUS_COPY[o.status].label}</strong>
              {!compact && <span>{STATUS_COPY[o.status].blurb}</span>}
            </span>
          </button>
        ))}
      </div>
      {status === "open" && (
        <div className="duration-row">
          <span className="duration-row__label">
            <Icon name="timer" size={16} />
            {remaining !== null ? `Open for ${formatDurationShort(remaining)} more` : "Open until you turn it off"}
          </span>
          <div className="duration-chips">
            {DURATIONS.map((d) => (
              <button key={d.label} className="chip" onClick={() => actions.setAvailability("open", d.minutes)}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
