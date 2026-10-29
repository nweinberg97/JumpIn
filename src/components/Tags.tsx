import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function Tag({
  children,
  tone = "outline",
  active,
}: {
  children: ReactNode;
  tone?: "outline" | "mint" | "peri" | "soft";
  active?: boolean;
}) {
  return <span className={`tag tag--${tone} ${active ? "tag--active" : ""}`}>{children}</span>;
}

export function TagList({
  items,
  tone,
  highlight = [],
  max,
}: {
  items: string[];
  tone?: "outline" | "mint" | "peri" | "soft";
  highlight?: string[];
  max?: number;
}) {
  const hl = new Set(highlight.map((h) => h.toLowerCase()));
  const shown = max ? items.slice(0, max) : items;
  return (
    <span className="tag-list">
      {shown.map((t) => (
        <Tag key={t} tone={hl.has(t.toLowerCase()) ? "mint" : tone} active={hl.has(t.toLowerCase())}>
          {t}
        </Tag>
      ))}
      {max && items.length > max && <Tag tone="soft">+{items.length - max}</Tag>}
    </span>
  );
}

/** Small "Demo mode" marker, so faked integrations are never mistaken for real ones. */
export function DemoBadge({ children = "Demo mode" }: { children?: ReactNode }) {
  return <span className="demo-badge">{children}</span>;
}

/**
 * The two badges. Verified: we know who this is (LinkedIn sign-in, or the
 * JumpIn team checked). Connector: onboarded by the founder and trusted to
 * make warm intros. Both are given, never requested.
 */
export const BADGE_COPY = {
  verified: "Verified: JumpIn has confirmed who this person is",
  connector: "Connector: onboarded by the JumpIn team and trusted to make warm intros",
} as const;

export function VerifiedBadge({ compact }: { compact?: boolean }) {
  return (
    <span className={`badge badge--verified ${compact ? "badge--compact" : ""}`} title={BADGE_COPY.verified}>
      <Icon name="verified" size={compact ? 14 : 16} />
      {compact ? <span className="sr-only">Verified</span> : "Verified"}
    </span>
  );
}

export function ConnectorChip({ compact }: { compact?: boolean }) {
  return (
    <span className={`badge badge--connector ${compact ? "badge--compact" : ""}`} title={BADGE_COPY.connector}>
      <Icon name="link2" size={compact ? 13 : 16} />
      {compact ? <span className="sr-only">Connector</span> : "Connector"}
    </span>
  );
}
