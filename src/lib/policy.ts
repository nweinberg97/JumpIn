import type { JumpInPolicy } from "./types";

export const POLICY_COPY: Record<JumpInPolicy, { title: string; sub: string }> = {
  anyone: { title: "Anyone on JumpIn", sub: "Verified members can jump in whenever you're open." },
  met: { title: "People I've met", sub: "Everyone else schedules first, then can jump in next time." },
  nobody: { title: "Nobody right now", sub: "Scheduled JumpIns only." },
};
