import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import { JumpInLogo } from "./Icon";

/** Shared frame for the privacy policy, terms and How JumpIn works. */
export function LegalPage({ title, children, dated = true }: { title: string; children: ReactNode; dated?: boolean }) {
  return (
    <div className="legal">
      <header className="legal__head container">
        <Link href="/" className="brand">
          <JumpInLogo size={28} />
          <span>JumpIn</span>
        </Link>
      </header>
      <article className="legal__body container">
        <h1 className="legal__title">{title}</h1>
        {dated && (
          <p className="legal__date">
            {BRAND.policyEffectiveDate ? `Effective ${BRAND.policyEffectiveDate}` : "Draft: not yet in effect"}
          </p>
        )}
        {children}
        <p className="legal__foot">
          <Link href="/how-it-works">How JumpIn works</Link> · <Link href="/privacy">Privacy policy</Link> · <Link href="/terms">Terms</Link> ·{" "}
          <Link href="/">JumpIn</Link>
        </p>
      </article>
    </div>
  );
}

/** "Nathan Weinberg" / "us" style fallbacks while the details are blank. */
export const who = () => BRAND.legalName || "the team behind JumpIn";
export const contact = () => BRAND.contactEmail || "the email address on this page once it's published";
