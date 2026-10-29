import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { effectiveStatus, hasMet, jumpInRoute } from "../../src/lib/availability";
import { displayStatus } from "../../src/lib/connections";
import type { AvailabilityStatus, Connection, JumpInPolicy, Member } from "../../src/lib/types";

const NOW = Date.parse("2026-11-02T18:00:00Z");
const minutes = (n: number) => new Date(NOW + n * 60_000).toISOString();

function member(status: AvailabilityStatus, policy: JumpInPolicy = "anyone", openUntil?: string): Member {
  return {
    id: "sarah",
    name: "Sarah Chen",
    availability: { status, openUntil },
    jumpInPolicy: policy,
  } as Member;
}

function connection(status: Connection["status"], patch: Partial<Connection> = {}): Connection {
  return {
    id: "c1",
    userId: "me",
    otherUserId: "sarah",
    type: "jumpin",
    status,
    createdAt: minutes(-120),
    meetingUrl: "https://meet.google.com/abc-defg-hij",
    durationMinutes: 30,
    source: "google",
    ...patch,
  };
}

const met = [connection("completed")];

describe("effectiveStatus", () => {
  it("keeps an open window that hasn't ended", () => {
    assert.equal(effectiveStatus(member("open", "anyone", minutes(30)), NOW), "open");
  });
  it("treats an open window with no end as open", () => {
    assert.equal(effectiveStatus(member("open"), NOW), "open");
  });
  it("turns an expired open window into 'later'", () => {
    assert.equal(effectiveStatus(member("open", "anyone", minutes(-1)), NOW), "later");
  });
});

describe("jumpInRoute: the README's decision table", () => {
  const cases: Array<[string, Member, Connection[], string]> = [
    ["open + met + anyone → straight in", member("open", "anyone"), met, "direct"],
    ["open + met + 'people I've met' → straight in", member("open", "met"), met, "direct"],
    ["open + first time + anyone → short note", member("open", "anyone"), [], "invite"],
    ["open + first time + 'people I've met' → schedule", member("open", "met"), [], "schedule"],
    ["open + policy 'nobody' → schedule, even if met", member("open", "nobody"), met, "schedule"],
    ["available later → schedule", member("later"), met, "schedule"],
    ["not available → schedule", member("unavailable"), met, "schedule"],
    ["expired open window → schedule", member("open", "anyone", minutes(-5)), met, "schedule"],
  ];
  for (const [name, m, conns, mode] of cases) {
    it(name, () => assert.equal(jumpInRoute(m, conns, NOW).mode, mode));
  }

  it("explains why it's scheduling, using their first name", () => {
    const route = jumpInRoute(member("open", "met"), [], NOW);
    assert.equal(route.mode, "schedule");
    assert.match(route.mode === "schedule" ? route.reason : "", /^Sarah takes instant JumpIns/);
  });
});

describe("hasMet", () => {
  it("counts a completed JumpIn", () => assert.equal(hasMet("sarah", met, NOW), true));
  it("does not count an unanswered invite", () => assert.equal(hasMet("sarah", [connection("invited")], NOW), false));
  it("does not count a declined invite", () => assert.equal(hasMet("sarah", [connection("declined")], NOW), false));
  it("counts a scheduled call once it has happened", () => {
    const past = connection("scheduled", { type: "scheduled", scheduledAt: minutes(-90) });
    assert.equal(hasMet("sarah", [past], NOW), true);
  });
  it("does not count a scheduled call still to come", () => {
    const future = connection("scheduled", { type: "scheduled", scheduledAt: minutes(60) });
    assert.equal(hasMet("sarah", [future], NOW), false);
  });
  it("only counts connections with that person", () => {
    assert.equal(hasMet("josh", met, NOW), false);
  });
});

describe("displayStatus", () => {
  it("shows a fresh invite as waiting", () => {
    assert.equal(displayStatus(connection("invited", { createdAt: minutes(-10) }), NOW), "waiting");
  });
  it("lapses an invite after two hours", () => {
    assert.equal(displayStatus(connection("invited", { createdAt: minutes(-121) }), NOW), "no-answer");
  });
  it("walks a scheduled call through upcoming → live → met", () => {
    const at = (offset: number) => connection("scheduled", { type: "scheduled", scheduledAt: minutes(offset) });
    assert.equal(displayStatus(at(15), NOW), "upcoming");
    assert.equal(displayStatus(at(-10), NOW), "live");
    assert.equal(displayStatus(at(-45), NOW), "met");
  });
});
