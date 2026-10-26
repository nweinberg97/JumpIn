import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { LIMITS, resetRateLimits, take } from "../../src/server/rateLimit";

describe("rate limits", () => {
  beforeEach(() => resetRateLimits());
  const t0 = Date.parse("2026-11-02T18:00:00Z");

  it("allows up to the hourly invite limit, then refuses", () => {
    const results = Array.from({ length: LIMITS.invite.max + 1 }, () => take("ava", "invite", t0));
    assert.equal(results.filter(Boolean).length, LIMITS.invite.max);
    assert.equal(results.at(-1), false);
  });

  it("counts each person separately", () => {
    for (let i = 0; i < LIMITS.invite.max; i++) take("ava", "invite", t0);
    assert.equal(take("ben", "invite", t0), true);
  });

  it("counts each action separately", () => {
    for (let i = 0; i < LIMITS.invite.max; i++) take("ava", "invite", t0);
    assert.equal(take("ava", "meeting", t0), true);
  });

  it("starts fresh in the next window", () => {
    for (let i = 0; i <= LIMITS.invite.max; i++) take("ava", "invite", t0);
    assert.equal(take("ava", "invite", t0 + LIMITS.invite.windowSeconds * 1000), true);
  });
});
