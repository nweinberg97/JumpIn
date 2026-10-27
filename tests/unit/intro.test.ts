import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { decodeIntro, defaultIntroNote, encodeDemoIntro, isEmail, type IntroPayload } from "../../src/lib/intro";
import { isConnectorEmail } from "../../src/server/env";

const payload: IntroPayload = {
  introId: "i-1",
  fromName: "John Ellis",
  subject: { id: "sarah", name: "Sarah Chen", headline: "Product designer building tools for climate action." },
  recipientName: "Nia Okafor",
  recipientIsNew: true,
  note: "Hi Nia, meet Sarah. Ünïcödé and emoji 🌱 survive the round trip.",
  expiresAt: "2026-11-25T00:00:00.000Z",
};

describe("warm intro links", () => {
  it("round-trips a demo intro, marked as unsigned", () => {
    const decoded = decodeIntro(encodeDemoIntro(payload));
    assert.deepEqual(decoded, { payload, signed: false });
  });

  it("treats any other signature as signed (the server verifies it)", () => {
    const body = encodeDemoIntro(payload).split(".")[0];
    assert.equal(decodeIntro(`${body}.abc123`)?.signed, true);
  });

  it("rejects garbage and incomplete payloads", () => {
    assert.equal(decodeIntro("not-a-token"), null);
    assert.equal(decodeIntro("!!!.demo"), null);
    const missing = encodeDemoIntro({ ...payload, subject: { ...payload.subject, name: "" } });
    assert.equal(decodeIntro(missing), null);
  });

  it("writes a default note addressed to the recipient", () => {
    const note = defaultIntroNote("Nia", "Sarah", "John");
    assert.match(note, /^Hi Nia,/);
    assert.match(note, /meet Sarah/);
    assert.match(note, /John$/);
    assert.match(defaultIntroNote("", "Sarah", "John"), /^Hi there,/);
  });
});

describe("isEmail", () => {
  it("accepts ordinary addresses", () => {
    assert.equal(isEmail("nia@example.com"), true);
    assert.equal(isEmail("  nia.okafor+jumpin@mail.example.org "), true);
  });
  it("rejects things that aren't", () => {
    for (const bad of ["", "nia", "nia@", "@example.com", "nia@example", "nia @example.com"]) {
      assert.equal(isEmail(bad), false, bad);
    }
  });
});

describe("Connector badge (CONNECTOR_EMAILS)", () => {
  afterEach(() => {
    delete process.env.CONNECTOR_EMAILS;
  });

  it("nobody is a Connector when the list is empty", () => {
    assert.equal(isConnectorEmail("founder@example.com"), false);
  });

  it("matches listed emails, ignoring case and spaces", () => {
    process.env.CONNECTOR_EMAILS = " Founder@Example.com, ava@example.com ";
    assert.equal(isConnectorEmail("founder@example.com"), true);
    assert.equal(isConnectorEmail("AVA@example.com"), true);
    assert.equal(isConnectorEmail("ben@example.com"), false);
    assert.equal(isConnectorEmail(undefined), false);
  });
});
