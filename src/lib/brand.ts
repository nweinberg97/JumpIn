/**
 * Details only the founder can fill in. Left blank on purpose: emails and
 * the policy pages fall back to neutral wording ("The JumpIn team") until
 * they're set. See LAUNCH_CHECKLIST.md → "Blanks to fill in".
 */
export const BRAND = {
  /** Signs the welcome emails ("Nathan, founder of JumpIn"). */
  founderName: "",
  /** Where members can reach you; shown in emails and the privacy policy. */
  contactEmail: "",
  /** The person or company responsible for JumpIn, for the privacy policy and terms. */
  legalName: "",
  /** Whose law governs the terms. Confirm this is right for you. */
  jurisdiction: "British Columbia, Canada",
  /** When the privacy policy and terms take effect, e.g. "November 2, 2026". */
  policyEffectiveDate: "",
};

export const signOff = () => (BRAND.founderName ? `${BRAND.founderName}, founder of JumpIn` : "The JumpIn team");
export const contactLine = () => (BRAND.contactEmail ? `Questions? Write to ${BRAND.contactEmail}.` : "Questions? Just reply to this email.");
