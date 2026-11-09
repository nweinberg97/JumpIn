import { contact, LegalPage, who } from "@/components/LegalPage";
import { BRAND } from "@/lib/brand";

/**
 * DRAFT terms of use, written for how JumpIn works. Not legal advice:
 * have them reviewed before launch. Blanks come from src/lib/brand.ts.
 */
export default function TermsPage() {
  return (
    <LegalPage title="Terms of use">
      <p>
        These terms are an agreement between you and {who()} (&ldquo;JumpIn&rdquo;, &ldquo;we&rdquo;). By joining JumpIn you agree to
        them, and to our privacy policy.
      </p>

      <h2>Membership</h2>
      <ul>
        <li>You must be 18 or older and use your real name and photo.</li>
        <li>JumpIn is curated: we review people before approving them, and may decline or pause an account at our discretion.</li>
        <li>Keep your sign-in secure. You&apos;re responsible for what happens under your account.</li>
      </ul>

      <h2>How to treat people</h2>
      <ul>
        <li>Be respectful and honest. No harassment, discrimination or hateful conduct.</li>
        <li>No spam, selling or recruiting people who didn&apos;t ask for it.</li>
        <li>Don&apos;t record a call without everyone&apos;s clear consent.</li>
        <li>Respect people&apos;s availability. &ldquo;Not right now&rdquo; is a complete answer.</li>
        <li>Use block and report when something isn&apos;t right. We review every report.</li>
      </ul>

      <h2>Calls</h2>
      <p>
        Calls happen on Google Meet, under Google&apos;s own terms. JumpIn helps you start and schedule them, but we
        don&apos;t join, record or control what happens in a call.
      </p>

      <h2>Connectors and warm intros</h2>
      <p>
        Connectors are members we trust to introduce people. If you&apos;re a Connector, only introduce people you know and
        would vouch for, and only share someone&apos;s email if you believe they&apos;d welcome the introduction.
      </p>

      <h2>Your content</h2>
      <p>
        You own what you put on your profile. You give JumpIn permission to show it to other members and use it to run
        the service. Don&apos;t post anything you don&apos;t have the right to share.
      </p>

      <h2>Ending things</h2>
      <p>
        You can leave at any time by writing to {contact()}. We may suspend or remove accounts that break these terms or
        put members at risk.
      </p>

      <h2>No guarantees</h2>
      <p>
        JumpIn is provided as is. We work hard to keep it running and safe, but we can&apos;t promise it will always be
        available or error-free, and we aren&apos;t responsible for what members say or do. To the extent the law allows, our
        liability is limited to the amount you paid us, if any.
      </p>

      <h2>Changes and law</h2>
      <p>
        If we change these terms in a meaningful way, we&apos;ll tell members by email first. These terms are governed by
        the laws of {BRAND.jurisdiction}. Questions: {contact()}.
      </p>
    </LegalPage>
  );
}
