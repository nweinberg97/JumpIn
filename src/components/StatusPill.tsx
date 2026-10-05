"use client";

import { effectiveStatus, formatCountdown, formatDurationShort, openRemainingMs, STATUS_COPY } from "@/lib/availability";
import { useNow } from "@/lib/store";
import type { Member } from "@/lib/types";
import { Icon } from "./Icon";

/**
 * Availability at a glance, using the legend from the original designs:
 *  unlocked + mint = open to JumpIn (with time left)
 *  clock + amber   = available later
 *  locked + grey   = not available
 */
export function StatusPill({
  member,
  size = "md",
  showTimer = true,
  tone = "light",
}: {
  member: Pick<Member, "availability">;
  size?: "sm" | "md";
  showTimer?: boolean;
  tone?: "light" | "overlay";
}) {
  const now = useNow(1000);
  const status = effectiveStatus(member, now);
  const remaining = openRemainingMs(member, now);
  const icon = status === "open" ? "unlock" : status === "later" ? "clock" : "lock";
  const label =
    status === "open"
      ? size === "sm"
        ? "Open"
        : "Open to JumpIn"
      : status === "later"
        ? size === "sm"
          ? "Later"
          : "Available later"
        : size === "sm"
          ? "Away"
          : "Not available";

  return (
    <span className={`status-pill status-pill--${status} status-pill--${size} status-pill--${tone}`}>
      <Icon name={icon} size={size === "sm" ? 13 : 15} />
      <span>{label}</span>
      {status === "open" && showTimer && remaining !== null && (
        <span className="status-pill__timer" title={`${formatDurationShort(remaining)} left`}>
          {size === "sm" ? formatDurationShort(remaining) : formatCountdown(remaining)}
        </span>
      )}
      <span className="sr-only">{STATUS_COPY[status].blurb}</span>
    </span>
  );
}

/** "Online" is shown separately from willingness to talk. */
export function PresenceLabel({ online }: { online: Member["onlineStatus"] }) {
  return (
    <span className={`presence-label presence-label--${online}`}>
      <span className={`presence-dot presence-dot--${online} presence-dot--inline`} />
      {online === "online" ? "Online now" : "Offline"}
    </span>
  );
}
