/**
 * Every email JumpIn sends, as pure functions: data in, { subject, html,
 * text } out. No sending or secrets here, so the founder can preview them
 * all at /email-previews, and they're unit-tested.
 *
 * Design: one white card on JumpIn's warm paper, the wordmark on top, one
 * clear button. Plain table layout and inline styles, which is what email
 * clients reliably render. Every value is escaped.
 */
import { BRAND, contactLine, signOff } from "../brand";
import type { IntroPayload } from "../intro";
import type { InvitePayload } from "../invite";

export interface Email {
  subject: string;
  html: string;
  text: string;
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const first = (name: string) => name.trim().split(/\s+/)[0] || "there";
const para = (s: string) => escapeHtml(s).replace(/\n/g, "<br>");

const INK = "#14161C";
const MUTED = "#4A4F5C";
const QUIET = "#858A96";
const PERI = "#5B7FE3";

function button(href: string, label: string, primary = true) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 26px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;font-family:Arial,sans-serif;${
    primary ? `background:${PERI};color:#fff;` : `background:#fff;color:${INK};border:1.5px solid ${INK};`
  }">${escapeHtml(label)}</a>`;
}

/** Rows of HTML (each a <tr>) inside the shared card. */
function layout(opts: { preheader: string; rows: string[]; footer: string }) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"></head>
<body style="margin:0;background:#F7F5F0;padding:28px 12px;font-family:Arial,Helvetica,sans-serif;color:${INK}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto">
<tr><td style="padding:0 8px 14px"><span style="display:inline-block;width:22px;height:22px;border-radius:7px;background:${PERI};vertical-align:middle"></span>
<span style="font-size:18px;font-weight:800;vertical-align:middle;margin-left:6px">JumpIn</span></td></tr>
</table>
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #E4E1D8">
<tr><td style="height:18px;line-height:18px;font-size:0">&nbsp;</td></tr>
${opts.rows.join("\n")}
<tr><td style="padding:4px 32px 28px;font-size:12px;line-height:1.5;color:${QUIET}">${opts.footer}</td></tr>
</table></body></html>`;
}

const title = (s: string) => `<tr><td style="padding:12px 32px 6px;font-size:24px;line-height:1.25;font-weight:800">${s}</td></tr>`;
const body = (html: string) => `<tr><td style="padding:8px 32px;font-size:15px;line-height:1.6;color:${INK}">${html}</td></tr>`;
const actions = (html: string) => `<tr><td style="padding:18px 32px 24px">${html}</td></tr>`;
const steps = (items: string[]) =>
  `<tr><td style="padding:4px 32px 8px"><table role="presentation" width="100%">${items
    .map(
      (s, i) =>
        `<tr><td style="width:30px;vertical-align:top;padding:6px 0"><span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:50%;background:#E1F6EE;color:#157A5B;font-weight:700;font-size:12px">${i + 1}</span></td><td style="padding:6px 0;font-size:15px;line-height:1.5">${s}</td></tr>`,
    )
    .join("")}</table></td></tr>`;
const signature = () => body(`<span style="color:${MUTED}">${escapeHtml(signOff())}</span>`);
const card = (name: string, headline: string, avatarUrl?: string) => {
  const photo =
    avatarUrl && /^https:\/\//.test(avatarUrl)
      ? `<img src="${escapeHtml(avatarUrl)}" width="60" height="60" alt="" style="border-radius:50%;object-fit:cover;display:block">`
      : `<span style="display:inline-block;width:60px;height:60px;line-height:60px;text-align:center;border-radius:50%;background:#fff;font-weight:800;font-size:20px">${escapeHtml(first(name)[0] ?? "")}</span>`;
  return `<tr><td style="padding:12px 32px"><table role="presentation" width="100%" style="background:#E8EDFC;border-radius:12px"><tr>
<td style="padding:16px;width:60px;vertical-align:top">${photo}</td>
<td style="padding:16px 16px 16px 0;vertical-align:top"><div style="font-size:17px;font-weight:800">${escapeHtml(name)}</div>
<div style="font-size:14px;line-height:1.45;color:${MUTED};margin-top:4px">${escapeHtml(headline)}</div></td></tr></table></td></tr>`;
};

const membersFooter = () => `You're getting this because you joined JumpIn. ${escapeHtml(contactLine())}`;

// ── Onboarding ─────────────────────────────────────────────────────────────

/** Right after someone signs up and is waiting for approval. */
export function waitlistEmail(d: { name: string; appUrl: string; demoUrl: string }): Email {
  const subject = "You're on the JumpIn list";
  const html = layout({
    preheader: "We onboard people one at a time. Here's what happens next.",
    rows: [
      title(`Thanks for joining, ${escapeHtml(first(d.name))}.`),
      body(
        "JumpIn is a private network for people building a better world, and we're bringing people in one at a time so it stays that way. We'll be in touch to welcome you in.",
      ),
      body("<strong>While you wait:</strong>"),
      steps([
        "Polish your profile. A clear photo and one sentence on what you're building make people want to talk to you.",
        "Try the demo to see how jumping into a conversation works.",
      ]),
      actions(`${button(`${d.appUrl}/me`, "Polish my profile")}&nbsp;&nbsp;${button(d.demoUrl, "Try the demo", false)}`),
      signature(),
    ],
    footer: membersFooter(),
  });
  const text = `Thanks for joining, ${first(d.name)}.\n\nJumpIn is a private network for people building a better world, and we're bringing people in one at a time. We'll be in touch to welcome you in.\n\nWhile you wait:\n1. Polish your profile: ${d.appUrl}/me\n2. Try the demo: ${d.demoUrl}\n\n${signOff()}`;
  return { subject, html, text };
}

/** When the founder approves someone (or they join through a warm intro). */
export function welcomeEmail(d: { name: string; appUrl: string; launchLabel: string | null; invitedBy?: string | null }): Email {
  const subject = "You're in. Welcome to JumpIn";
  const when = d.launchLabel
    ? `Calls open on <strong>${escapeHtml(d.launchLabel)}</strong>. Until then, you can see who's here and get your profile ready.`
    : "Calls open at launch, and we'll email you the moment they do. Until then, you can see who's here and get your profile ready.";
  const html = layout({
    preheader: "You're approved. Three things to do before calls open.",
    rows: [
      title(`You're in, ${escapeHtml(first(d.name))}.`),
      body(
        `${d.invitedBy ? `${escapeHtml(d.invitedBy)} vouched for you, and you` : "You"}'re now part of JumpIn: people who'd rather have a real conversation than collect connections.`,
      ),
      body(when),
      steps([
        "<strong>Finish your profile.</strong> Photo, what you do, and the causes you care about.",
        "<strong>Set your weekly hours</strong>, so people can book time with you.",
        "<strong>Learn the one button that matters.</strong> When you're free, set yourself to <em>Open to JumpIn</em> for half an hour. Anyone who's open can jump straight into a Google Meet with you.",
      ]),
      actions(button(`${d.appUrl}/discover`, "Open JumpIn")),
      signature(),
    ],
    footer: membersFooter(),
  });
  const text = `You're in, ${first(d.name)}.\n\n${d.launchLabel ? `Calls open on ${d.launchLabel}.` : "Calls open at launch."}\n\n1. Finish your profile.\n2. Set your weekly hours.\n3. When you're free, set yourself to Open to JumpIn for half an hour.\n\nOpen JumpIn: ${d.appUrl}/discover\n\n${signOff()}`;
  return { subject, html, text };
}

/** When the founder gives someone the Connector badge. */
export function connectorEmail(d: { name: string; appUrl: string }): Email {
  const subject = "You're a JumpIn Connector";
  const html = layout({
    preheader: "You can now introduce people to each other, and bring new people in.",
    rows: [
      title(`You're a Connector, ${escapeHtml(first(d.name))}.`),
      body(
        "Connectors are the people we trust to vouch for others. You now have a Connector badge, and a new button on every profile: <strong>Introduce</strong>.",
      ),
      steps([
        "Open someone's profile and press <strong>Introduce</strong>.",
        "Pick who should meet them: someone already on JumpIn, or anyone by email.",
        "Add a line on why. They get the profile and your note. People new to JumpIn can join straight away, with no waitlist, because you vouched for them.",
      ]),
      body(`<span style="color:${MUTED}">You can send up to 20 intros a day. Each intro link works once, for the email you sent it to.</span>`),
      actions(button(`${d.appUrl}/discover`, "Make an intro")),
      signature(),
    ],
    footer: membersFooter(),
  });
  const text = `You're a Connector, ${first(d.name)}.\n\nOpen someone's profile and press Introduce, pick who should meet them (a member, or anyone by email), and add a line on why. New people can join straight away because you vouched for them.\n\n${d.appUrl}/discover\n\n${signOff()}`;
  return { subject, html, text };
}

/** "JumpIn is live": once, to every approved member. */
export function launchEmail(d: { name: string; appUrl: string }): Email {
  const subject = "JumpIn is live. Come say hi";
  const html = layout({
    preheader: "Calls are open. Set yourself to Open to JumpIn and see who says hello.",
    rows: [
      title(`We're live, ${escapeHtml(first(d.name))}.`),
      body("Everyone you've seen on JumpIn can now jump into a conversation. Here's the fastest way to have your first one:"),
      steps([
        "Set yourself to <strong>Open to JumpIn</strong> for 30 minutes.",
        "Look at who else is open right now, and press <strong>Jump In</strong> on someone interesting.",
        "Not free today? Set your weekly hours, and people can book a time instead.",
      ]),
      actions(button(`${d.appUrl}/discover`, "Open JumpIn")),
      signature(),
    ],
    footer: `You're getting this because you were onboarded to JumpIn. ${escapeHtml(contactLine())}`,
  });
  const text = `We're live, ${first(d.name)}.\n\n1. Set yourself to Open to JumpIn for 30 minutes.\n2. Press Jump In on someone interesting who's open.\n3. Not free today? Set your weekly hours.\n\nOpen JumpIn: ${d.appUrl}/discover\n\n${signOff()}`;
  return { subject, html, text };
}

// ── Calls ──────────────────────────────────────────────────────────────────

/** A first-time JumpIn: the note, and Yes / Not right now. */
export function inviteEmail(p: InvitePayload, links: { yes: string; no: string; view: string }): Email {
  const from = first(p.fromName);
  const subject = `${from} would like to jump into a call`;
  const html = layout({
    preheader: `${from} is in a Google Meet now. Are you free?`,
    rows: [
      body(para(p.note)),
      card(p.fromName, p.fromHeadline ?? "", p.fromAvatarUrl),
      `<tr><td style="padding:16px 32px 4px;font-size:18px;font-weight:800">Are you still free to connect with ${escapeHtml(from)}?</td></tr>`,
      actions(`${button(links.yes, "Yes, join the call")}&nbsp;&nbsp;${button(links.no, "Not right now", false)}`),
      body(`<span style="font-size:13px;color:${MUTED}">This invite expires in 2 hours. Saying no is fine: ${escapeHtml(from)} can book a time instead.</span>`),
    ],
    footer: `Sent by JumpIn on behalf of ${escapeHtml(p.fromName)}. Your email address was not shared. <a href="${escapeHtml(links.view)}" style="color:${PERI}">View in browser</a>`,
  });
  const text = `${p.note}\n\nAre you still free to connect with ${from}?\nYes: ${links.yes}\nNot right now: ${links.no}`;
  return { subject, html, text };
}

// ── Warm intros ────────────────────────────────────────────────────────────

/** To the person being introduced to someone: "Ava thinks you should meet Sarah". */
export function warmIntroEmail(p: IntroPayload, links: { view: string }): Email {
  const from = first(p.fromName);
  const subjectFirst = first(p.subject.name);
  const subject = `${from} thinks you should meet ${subjectFirst}`;
  const cta = p.recipientIsNew ? `Meet ${subjectFirst} on JumpIn` : `See ${subjectFirst}'s profile`;
  const rows = [
    body(para(p.note)),
    card(p.subject.name, p.subject.headline, p.subject.avatarUrl),
    actions(button(links.view, cta)),
  ];
  if (p.recipientIsNew) {
    rows.push(
      body(
        `<span style="font-size:13px;color:${MUTED}">JumpIn is a private network for people building a better world. ${escapeHtml(from)} is a Connector, so you can join straight away, with no waitlist. Sign in with this email address so the intro counts.</span>`,
      ),
    );
  }
  const html = layout({
    preheader: `${from} vouched for this introduction.`,
    rows,
    footer: `Sent by JumpIn on behalf of ${escapeHtml(p.fromName)}. Nobody's email address was shared.`,
  });
  const text = `${p.note}\n\n${p.subject.name}: ${p.subject.headline}\n\n${cta}: ${links.view}`;
  return { subject, html, text };
}

/** To the person whose profile was shared: so an intro never surprises them. */
export function introducedNoticeEmail(d: { subjectName: string; fromName: string; recipientName: string; note: string; appUrl: string }): Email {
  const from = first(d.fromName);
  const to = first(d.recipientName);
  const subject = `${from} introduced you to ${to}`;
  const html = layout({
    preheader: `${from} shared your profile with ${to}.`,
    rows: [
      title(`${escapeHtml(from)} introduced you to ${escapeHtml(to)}.`),
      body(`${escapeHtml(from)} shared your JumpIn profile with ${escapeHtml(d.recipientName)}, with this note:`),
      `<tr><td style="padding:8px 32px"><div style="border-left:3px solid #8FE3C9;padding:6px 14px;font-size:15px;line-height:1.6;color:${MUTED}">${para(d.note)}</div></td></tr>`,
      body(`If ${escapeHtml(to)} reaches out, you'll know why. To make it easy, open yourself to JumpIn for half an hour when you're free.`),
      actions(button(`${d.appUrl}/discover`, "Open JumpIn")),
    ],
    footer: membersFooter(),
  });
  const text = `${from} introduced you to ${d.recipientName}, with this note:\n\n${d.note}\n\n${d.appUrl}/discover`;
  return { subject, html, text };
}

/** To the Connector, when someone they invited joins. */
export function introJoinedEmail(d: { connectorName: string; newName: string; subjectName: string; appUrl: string }): Email {
  const subject = `${first(d.newName)} joined JumpIn through your intro`;
  const html = layout({
    preheader: "Your warm intro worked.",
    rows: [
      title(`${escapeHtml(first(d.newName))} is in.`),
      body(
        `${escapeHtml(d.newName)} joined JumpIn through your intro to ${escapeHtml(d.subjectName)}. Because you vouched for them, they skipped the waitlist. Thank you for growing JumpIn the right way.`,
      ),
      actions(button(`${d.appUrl}/connections`, "See your intros")),
    ],
    footer: membersFooter(),
  });
  const text = `${d.newName} joined JumpIn through your intro to ${d.subjectName}. Thank you!\n\n${d.appUrl}/connections`;
  return { subject, html, text };
}

/** Sample data for /email-previews. */
export function samplePreviews(appUrl: string, demoUrl: string): Array<{ key: string; label: string; when: string; email: Email }> {
  const intro: IntroPayload = {
    introId: "preview",
    fromName: "Ava Thompson",
    subject: { id: "sarah", name: "Sarah Chen", headline: "Product designer building tools for climate action." },
    recipientName: "Nia Okafor",
    recipientIsNew: true,
    recipientEmailHint: "n•••@example.com",
    note: "Hi Nia,\n\nYou two are both obsessed with getting renters onto solar. Sarah's the person I mentioned. Worth 20 minutes!\n\nAva",
    expiresAt: new Date().toISOString(),
  };
  return [
    { key: "waitlist", label: "You're on the list", when: "Someone signs up and is waiting for approval", email: waitlistEmail({ name: "Nia Okafor", appUrl, demoUrl }) },
    { key: "welcome", label: "You're in", when: "You approve someone, or they join through a warm intro", email: welcomeEmail({ name: "Nia Okafor", appUrl, launchLabel: "Monday, November 2 at 10:00 AM", invitedBy: "Ava Thompson" }) },
    { key: "connector", label: "You're a Connector", when: "You give someone the Connector badge", email: connectorEmail({ name: "Ava Thompson", appUrl }) },
    { key: "intro", label: "Warm intro (new person)", when: "A Connector introduces someone who isn't on JumpIn yet", email: warmIntroEmail(intro, { view: `${appUrl}/intro/preview` }) },
    {
      key: "intro-member",
      label: "Warm intro (member)",
      when: "A Connector introduces two members",
      email: warmIntroEmail({ ...intro, recipientIsNew: false, recipientEmailHint: undefined }, { view: `${appUrl}/intro/preview` }),
    },
    { key: "introduced", label: "You were introduced", when: "Someone's profile is shared in a warm intro", email: introducedNoticeEmail({ subjectName: "Sarah Chen", fromName: "Ava Thompson", recipientName: "Nia Okafor", note: intro.note, appUrl }) },
    { key: "joined", label: "Your intro joined", when: "Someone joins through a Connector's intro", email: introJoinedEmail({ connectorName: "Ava Thompson", newName: "Nia Okafor", subjectName: "Sarah Chen", appUrl }) },
    {
      key: "invite",
      label: "JumpIn invite",
      when: "Someone jumps in with a person they haven't met",
      email: inviteEmail(
        {
          connectionId: "preview",
          fromName: "Ava Thompson",
          fromHeadline: "Community energy organiser",
          toMemberId: "sarah",
          toName: "Sarah Chen",
          note: "Hi Sarah,\n\nI saw you on JumpIn and I think what you're building is awesome! Would love to learn about it if you're still free to chat.\n\nAva",
          meetingUrl: "https://meet.google.com/abc-defg-hij",
          expiresAt: new Date().toISOString(),
        },
        { yes: `${appUrl}/invite/preview?pick=yes`, no: `${appUrl}/invite/preview?pick=no`, view: `${appUrl}/invite/preview` },
      ),
    },
    { key: "launch", label: "JumpIn is live", when: "You press Send to everyone on launch day", email: launchEmail({ name: "Nia Okafor", appUrl }) },
  ];
}

export { BRAND };
