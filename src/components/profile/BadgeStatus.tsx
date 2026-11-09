import Link from "next/link";
import type { Viewer } from "@/lib/types";
import { ConnectorChip, VerifiedBadge } from "../Tags";

/** "Your badges" on My profile: what you have, and how each one is earned. */
export function BadgeStatus({ viewer }: { viewer: Viewer }) {
  return (
    <section className="badge-status" aria-labelledby="badge-status-title">
      <h2 id="badge-status-title" className="badge-status__title">
        Your badges
      </h2>
      <ul className="badge-status__list">
        <li className={viewer.verified ? "" : "badge-status__item--off"}>
          <VerifiedBadge />
          <p>
            {viewer.verified
              ? "People can see JumpIn has confirmed who you are."
              : "Given when you sign in with LinkedIn, or when the JumpIn team confirms who you are."}
          </p>
        </li>
        <li className={viewer.isConnector ? "" : "badge-status__item--off"}>
          <ConnectorChip />
          <p>
            {viewer.isConnector
              ? "You can send warm intros. Only introduce people you both know."
              : "By invitation from the JumpIn team, for members trusted to make warm intros."}
          </p>
        </li>
      </ul>
      <Link href="/how-it-works#badges" className="link-quiet">
        How badges work
      </Link>
    </section>
  );
}
