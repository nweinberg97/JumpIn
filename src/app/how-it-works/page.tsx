import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { ConnectorChip, VerifiedBadge } from "@/components/Tags";

/**
 * The house rules, in plain words: how joining, calls, badges and warm
 * intros work. Linked from Settings, the account menu, the warm intro
 * dialog and every footer.
 */
export default function HowItWorksPage() {
  return (
    <LegalPage title="How JumpIn works" dated={false}>
      <p>
        JumpIn is a private network for people working to make the world better. You can see who&apos;s free to talk right now and
        jump straight into a short Google Meet, or schedule a time that suits you both.
      </p>

      <nav className="guide-toc" aria-label="On this page">
        <a href="#joining">Joining</a>
        <a href="#calls">Calls</a>
        <a href="#badges">Badges</a>
        <a href="#intros">Warm intros</a>
        <a href="#rules">House rules</a>
        <a href="#privacy">Privacy &amp; safety</a>
      </nav>

      <h2 id="joining">Joining</h2>
      <ul>
        <li>JumpIn is curated. The JumpIn team reads every profile before approving it, one person at a time.</li>
        <li>
          A complete profile gets approved faster: a real photo, a headline, what you do, a short &ldquo;about&rdquo; and the causes you
          care about.
        </li>
        <li>If a Connector introduced you, you join straight away, with no waitlist.</li>
      </ul>

      <h2 id="calls">Calls</h2>
      <ul>
        <li>
          Set yourself to <strong>Open</strong> when you&apos;re happy to talk, for as long as you choose. Anyone can then press{" "}
          <strong>Jump In</strong> and send you a short note.
        </li>
        <li>You get the note with a Google Meet link and answer yes or &ldquo;not right now&rdquo;. Both are fine.</li>
        <li>Not free now? Use <strong>Schedule</strong> to pick a time from their availability.</li>
        <li>Calls happen on Google Meet. JumpIn never joins or records them.</li>
      </ul>

      <h2 id="badges">Badges</h2>
      <p>Badges are given by the JumpIn team. You can&apos;t ask for one, and they can be removed if they&apos;re misused.</p>
      <dl className="guide-badges">
        <div>
          <dt>
            <VerifiedBadge />
          </dt>
          <dd>
            JumpIn has confirmed who this person is: they signed in with LinkedIn, or the team checked their identity. On cards
            it shows as a small blue seal next to their name.
          </dd>
        </div>
        <div>
          <dt>
            <ConnectorChip />
          </dt>
          <dd>
            A member the founder onboarded personally and trusts to vouch for people. Connectors can send warm intros. On cards it
            shows as a small green link next to their name.
          </dd>
        </div>
      </dl>

      <h2 id="intros">Warm intros</h2>
      <p>
        A warm intro is a Connector sharing someone&apos;s profile with a person they should meet, with a note about why. The rules:
      </p>
      <ul>
        <li>
          <strong>Only introduce people you both know personally,</strong> and only when you think they&apos;d both welcome it.
        </li>
        <li>The person whose profile you share is always told who it went to.</li>
        <li>Someone new can join through your intro without the waitlist, but only with the email address it was sent to.</li>
        <li>Each intro link works once and expires after 30 days.</li>
        <li>Up to 20 intros a day. Intros are for people, never for selling or recruiting.</li>
      </ul>

      <h2 id="rules">House rules</h2>
      <ul>
        <li>Use your real name and a real photo.</li>
        <li>Be respectful and honest. No harassment, discrimination or hateful conduct.</li>
        <li>No selling, spam or recruiting people who didn&apos;t ask for it.</li>
        <li>&ldquo;Not right now&rdquo; is a complete answer. Don&apos;t push.</li>
        <li>If you say yes, show up. If something changes, let them know.</li>
        <li>Never record a call without everyone&apos;s clear consent.</li>
      </ul>

      <h2 id="privacy">Privacy &amp; safety</h2>
      <ul>
        <li>Your email is never shown to other members. Invites and intros come from JumpIn&apos;s own address.</li>
        <li>You can hide your profile at any time in Settings.</li>
        <li>
          Block or report anyone from the <strong>⋯</strong> menu on their profile. The JumpIn team reviews every report.
        </li>
      </ul>
      <p>
        The full details are in the <Link href="/terms">terms</Link> and the <Link href="/privacy">privacy policy</Link>.
      </p>
    </LegalPage>
  );
}
