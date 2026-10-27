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
 * The Connector badge: someone the founder onboarded personally, trusted to
 * vouch for people with warm intros.
 */
export function ConnectorChip({ compact }: { compact?: boolean }) {
  return (
    <span
      className={`connector-chip ${compact ? "connector-chip--compact" : ""}`}
      title="Connector: onboarded by the JumpIn team and trusted to make warm intros"
    >
      <Icon name="link2" size={compact ? 14 : 16} />
      {!compact && "Connector"}
    </span>
  );
}
