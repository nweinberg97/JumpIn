import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSlots, zonedToEpoch } from "../../src/lib/time";
import type { WeeklySlot } from "../../src/lib/types";

describe("zonedToEpoch", () => {
  it("converts winter wall-clock time (PST, UTC-8)", () => {
    assert.equal(zonedToEpoch(2026, 1, 15, "09:00", "America/Vancouver"), Date.parse("2026-01-15T17:00:00Z"));
  });
  it("converts summer wall-clock time (PDT, UTC-7)", () => {
    assert.equal(zonedToEpoch(2026, 7, 15, "09:00", "America/Vancouver"), Date.parse("2026-07-15T16:00:00Z"));
  });
  it("handles the day clocks spring forward", () => {
    // DST starts 2026-03-08 at 02:00 in Vancouver; 09:00 that day is PDT.
    assert.equal(zonedToEpoch(2026, 3, 8, "09:00", "America/Vancouver"), Date.parse("2026-03-08T16:00:00Z"));
  });
  it("handles a half-hour offset zone", () => {
    assert.equal(zonedToEpoch(2026, 1, 15, "09:00", "Asia/Kolkata"), Date.parse("2026-01-15T03:30:00Z"));
  });
});

describe("buildSlots", () => {
  // Sunday 1 Nov 2026, midnight UTC. London is on GMT (UTC+0) by then.
  const now = Date.parse("2026-11-01T00:00:00Z");
  const mondayMorning: WeeklySlot[] = [{ id: "w1", day: 1, start: "09:00", end: "10:00" }];

  it("offers 30-minute slots inside the member's weekly hours", () => {
    const { slots } = buildSlots({ weekly: mondayMorning, memberTimeZone: "Europe/London", busy: [], now, daysAhead: 7 });
    assert.deepEqual(
      slots.map((s) => new Date(s.start).toISOString()),
      ["2026-11-02T09:00:00.000Z", "2026-11-02T09:30:00.000Z"],
    );
  });

  it("hides slots that clash with the booker's calendar, and counts them", () => {
    const busy = [{ start: Date.parse("2026-11-02T09:15:00Z"), end: Date.parse("2026-11-02T09:45:00Z") }];
    const result = buildSlots({ weekly: mondayMorning, memberTimeZone: "Europe/London", busy, now, daysAhead: 7 });
    assert.equal(result.slots.length, 0);
    assert.equal(result.hiddenForBusy, 2);
  });

  it("hides slots outside 7 AM–10 PM for the booker, and counts them", () => {
    // 09:00 in London is 01:00 in Vancouver.
    const result = buildSlots({
      weekly: mondayMorning,
      memberTimeZone: "Europe/London",
      busy: [],
      now,
      daysAhead: 7,
      viewerTimeZone: "America/Vancouver",
    });
    assert.equal(result.slots.length, 0);
    assert.equal(result.hiddenForHours, 2);
  });

  it("never offers a slot less than an hour away", () => {
    const soon = Date.parse("2026-11-02T08:45:00Z");
    const { slots } = buildSlots({ weekly: mondayMorning, memberTimeZone: "Europe/London", busy: [], now: soon, daysAhead: 1 });
    assert.deepEqual(slots.map((s) => new Date(s.start).toISOString()), []);
  });
});
