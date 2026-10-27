import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { profileGaps } from "../../src/lib/admin";
import {
  connectionFromRow,
  introFromRow,
  isUuid,
  memberFromRow,
  presenceUpdate,
  profileUpdate,
  projectRows,
  viewerFromRow,
  weeklyRows,
  type MemberRow,
} from "../../src/lib/data/rows";

const row: MemberRow = {
  id: "7f1c2b9e-0000-4000-8000-000000000001",
  name: "Priya Natarajan",
  avatar_url: null,
  headline: "Community solar in BC",
  what_i_do: "Co-ops that let renters own solar.",
  bio: "About me.",
  city: "Vancouver",
  country_code: "CA",
  timezone: "America/Vancouver",
  interests: ["Mentorship"],
  impact_areas: ["Climate"],
  skills: ["Facilitation"],
  loom_url: null,
  linkedin_url: "https://www.linkedin.com/in/priya",
  instagram_url: null,
  website_url: "",
  jump_in_policy: "met",
  profile_hidden: false,
  onboarded: true,
  verified: true,
  calendar_connected: false,
  is_connector: true,
  joined_at: "2026-10-26T18:00:00Z",
  presence: [{ status: "open", open_until: "2026-10-26T19:00:00Z" }],
  weekly_availability: [
    { id: "w2", day: 3, start_time: "14:00:00", end_time: "16:00:00" },
    { id: "w1", day: 1, start_time: "09:00:00", end_time: "11:30:00" },
  ],
  projects: [
    { name: "Second", description: "", url: null, position: 1 },
    { name: "First", description: "d", url: "https://example.com", position: 0 },
  ],
};

describe("memberFromRow", () => {
  const m = memberFromRow(row, true);
  it("maps the profile and badges", () => {
    assert.equal(m.name, "Priya Natarajan");
    assert.equal(m.avatarUrl, "");
    assert.equal(m.isConnector, true);
    assert.equal(m.jumpInPolicy, "met");
    assert.equal(m.onlineStatus, "online");
    assert.equal(m.websiteUrl, undefined, "empty links become undefined");
  });
  it("reads presence whether it arrives as an object or a one-item array", () => {
    assert.deepEqual(m.availability, { status: "open", openUntil: "2026-10-26T19:00:00Z" });
    const asObject = memberFromRow({ ...row, presence: { status: "later", open_until: null } }, false);
    assert.deepEqual(asObject.availability, { status: "later" });
    assert.deepEqual(memberFromRow({ ...row, presence: null }, false).availability, { status: "later" });
  });
  it("sorts weekly hours and projects, trimming seconds", () => {
    assert.deepEqual(
      m.weeklyAvailability.map((w) => [w.day, w.start, w.end]),
      [
        [1, "09:00", "11:30"],
        [3, "14:00", "16:00"],
      ],
    );
    assert.deepEqual(m.projects.map((p) => p.name), ["First", "Second"]);
  });
});

describe("writing a profile back", () => {
  const viewer = { ...viewerFromRow(row, "priya@example.com"), countryCode: "ca", name: "  " };
  it("only sends the columns members may change", () => {
    const update = profileUpdate(viewer);
    assert.equal("verified" in update, false);
    assert.equal("is_connector" in update, false);
    assert.equal("calendar_connected" in update, false);
    assert.equal(update.country_code, "CA");
    assert.equal(update.name, "New member", "a blank name never violates the name check");
  });
  it("clears open_until unless open", () => {
    assert.deepEqual(presenceUpdate({ availability: { status: "later" } }), { status: "later", open_until: null });
    assert.deepEqual(presenceUpdate({ availability: { status: "open" } }), { status: "open", open_until: null });
  });
  it("drops empty or backwards rows", () => {
    const weekly = weeklyRows(row.id, [
      { id: "a", day: 1, start: "09:00", end: "10:00" },
      { id: "b", day: 2, start: "12:00", end: "11:00" },
    ]);
    assert.equal(weekly.length, 1);
    const projects = projectRows(row.id, [
      { name: " Solar ", description: " x ", url: " " },
      { name: "", description: "nameless" },
    ]);
    assert.deepEqual(projects, [{ member_id: row.id, name: "Solar", description: "x", url: null, position: 0 }]);
  });
});

describe("shared rows from the viewer's side", () => {
  const me = "7f1c2b9e-0000-4000-8000-00000000000a";
  const other = "7f1c2b9e-0000-4000-8000-00000000000b";
  const base = {
    id: "c1",
    type: "jumpin" as const,
    status: "invited" as const,
    scheduled_at: null,
    duration_minutes: 30,
    meet_link: "https://meet.google.com/abc-defg-hij",
    calendar_event_id: null,
    note: null,
    created_at: "2026-10-26T18:00:00Z",
  };
  it("the other person is whoever isn't me, either way round", () => {
    assert.equal(connectionFromRow({ ...base, initiator_id: me, recipient_id: other }, me).otherUserId, other);
    assert.equal(connectionFromRow({ ...base, initiator_id: other, recipient_id: me }, me).otherUserId, other);
  });
  it("maps intros to members and to new people", () => {
    const common = { id: "i1", subject_id: other, recipient_name: "Nia", note: "hi", created_at: base.created_at };
    assert.deepEqual(introFromRow({ ...common, recipient_member_id: me, recipient_email: null }).recipient, {
      kind: "member",
      memberId: me,
      name: "Nia",
    });
    assert.equal(introFromRow({ ...common, recipient_member_id: null, recipient_email: "nia@example.com" }).recipient.kind, "email");
  });
  it("recognises database ids", () => {
    assert.equal(isUuid(me), true);
    assert.equal(isUuid("c-lq2x-abc12"), false);
  });
});

describe("profileGaps (matches the database function)", () => {
  it("lists what a new member still needs", () => {
    assert.deepEqual(
      profileGaps({ avatar_url: null, headline: "", what_i_do: "", bio: "", impact_areas: [], onboarded: false }),
      ["photo", "headline", "what I do", "about", "impact areas", "onboarding"],
    );
    assert.deepEqual(profileGaps({ ...row, avatar_url: "https://x/y.jpg" }), []);
  });
});
