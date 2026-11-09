import { contact, LegalPage, who } from "@/components/LegalPage";
import { BRAND } from "@/lib/brand";

/**
 * DRAFT privacy policy, written to match what the app actually does.
 * Not legal advice: have it reviewed before launch. Blanks come from
 * src/lib/brand.ts.
 */
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        JumpIn is run by {who()}. This page explains what we collect, why, and the choices you have. In short: we collect
        what we need to help members talk to each other, we never sell it, and nobody else on JumpIn sees your email
        address.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>From your sign-in</strong> (Google, or LinkedIn if offered): your name, email address and profile photo.
          We don&apos;t get your password.
        </li>
        <li>
          <strong>Your profile</strong>: what you choose to add, such as your headline, what you do, bio, city, timezone,
          interests, causes, skills, projects, links and an intro video link.
        </li>
        <li>
          <strong>Your availability</strong>: your status (for example &ldquo;Open to JumpIn&rdquo;), how long you&apos;re open, and
          the weekly hours you set.
        </li>
        <li>
          <strong>Google Calendar, only if you connect it</strong>: we read when you&apos;re busy (never what your events are) so
          nobody books over them, and we create the Google Meet events for your JumpIns.
        </li>
        <li>
          <strong>Your activity on JumpIn</strong>: calls you start or accept, invites and notes you send, warm intros, people
          you block, and reports you make.
        </li>
        <li>
          <strong>Warm intros</strong>: if a Connector introduces you before you&apos;ve joined, we receive your name and email
          from them, only to send that introduction.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To show your profile and availability to other approved members, and to start and schedule calls.</li>
        <li>To send emails you&apos;d expect: invites, warm intros, your welcome, and the launch announcement.</li>
        <li>To keep JumpIn safe: reviewing members before approval, and handling blocks and reports.</li>
      </ul>
      <p>We don&apos;t sell your information or use it for advertising.</p>

      <h2>Who can see what</h2>
      <ul>
        <li>Other approved members see your profile and availability, unless you hide your profile or block them.</li>
        <li>Your email address is never shown to other members. Emails come from a JumpIn address.</li>
        <li>The JumpIn team can see member records, to approve members and keep the community safe.</li>
      </ul>

      <h2>Services we use</h2>
      <p>
        We rely on a few providers to run JumpIn: Supabase (database and sign-in), Vercel (hosting), Google (sign-in,
        Calendar and Meet), LinkedIn (sign-in, if offered) and Resend (email). They process data on our behalf, under
        their own security and privacy commitments. Your data may be stored in Canada or the United States.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your account while it&apos;s active. If you ask us to delete it, we delete your profile and activity, except
        what we must keep for safety or legal reasons (for example, a report about misconduct).
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Edit or hide your profile at any time in the app.</li>
        <li>Disconnect Google Calendar from the Availability page.</li>
        <li>Ask for a copy of your data, a correction, or deletion by writing to {contact()}.</li>
      </ul>

      <h2>Age</h2>
      <p>JumpIn is for adults. You must be 18 or older to join.</p>

      <h2>Changes</h2>
      <p>If we change this policy in a meaningful way, we&apos;ll tell members by email before it takes effect.</p>

      <h2>Contact</h2>
      <p>
        Questions or requests: {contact()}. This policy is governed by the laws of {BRAND.jurisdiction}.
      </p>
    </LegalPage>
  );
}
