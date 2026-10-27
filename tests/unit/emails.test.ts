import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  connectorEmail,
  escapeHtml,
  introducedNoticeEmail,
  launchEmail,
  samplePreviews,
  waitlistEmail,
  warmIntroEmail,
  welcomeEmail,
} from "../../src/lib/emails/templates";

const APP = "https://jumpin.example";

describe("email templates", () => {
  it("every email has a subject, HTML and a plain-text version", () => {
    const all = samplePreviews(APP, APP);
    assert.equal(all.length, 9);
    for (const { key, email } of all) {
      assert.ok(email.subject.length > 5, `${key} subject`);
      assert.match(email.html, /^<!doctype html>/, `${key} html`);
      assert.ok(email.text.length > 20, `${key} text`);
    }
  });

  it("escapes anything a member typed", () => {
    const evil = '<script>alert("x")</script>';
    const email = introducedNoticeEmail({ subjectName: "Sarah", fromName: evil, recipientName: "Nia", note: evil, appUrl: APP });
    assert.equal(email.html.includes("<script>"), false);
    assert.ok(email.html.includes(escapeHtml(evil)));
  });

  it("signs off as the team until the founder's name is filled in", () => {
    assert.match(waitlistEmail({ name: "Nia Okafor", appUrl: APP, demoUrl: APP }).text, /The JumpIn team$/);
  });

  it("welcome mentions the launch date, or says calls open at launch", () => {
    assert.match(welcomeEmail({ name: "Nia", appUrl: APP, launchLabel: "Monday, November 2" }).html, /Monday, November 2/);
    assert.match(welcomeEmail({ name: "Nia", appUrl: APP, launchLabel: null }).text, /Calls open at launch/);
    assert.match(welcomeEmail({ name: "Nia", appUrl: APP, launchLabel: null, invitedBy: "Ava" }).html, /Ava vouched for you/);
  });

  it("the new-person intro explains joining without the waitlist; the member one doesn't", () => {
    const base = {
      introId: "i",
      fromName: "Ava Thompson",
      subject: { id: "s", name: "Sarah Chen", headline: "Climate design" },
      recipientName: "Nia",
      note: "Meet Sarah",
      expiresAt: new Date().toISOString(),
    };
    assert.match(warmIntroEmail({ ...base, recipientIsNew: true }, { view: APP }).html, /no waitlist/);
    assert.doesNotMatch(warmIntroEmail({ ...base, recipientIsNew: false }, { view: APP }).html, /no waitlist/);
    assert.equal(warmIntroEmail({ ...base, recipientIsNew: true }, { view: APP }).subject, "Ava thinks you should meet Sarah");
  });

  it("links point at the app", () => {
    assert.ok(launchEmail({ name: "Nia", appUrl: APP }).html.includes(`${APP}/discover`));
    assert.ok(connectorEmail({ name: "Ava", appUrl: APP }).text.includes(`${APP}/discover`));
  });
});
