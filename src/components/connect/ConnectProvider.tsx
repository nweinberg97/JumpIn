"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { jumpInRoute } from "@/lib/availability";
import { useJumpIn } from "@/lib/store";
import type { Member } from "@/lib/types";
import { LaunchDialog } from "../Launch";
import { JumpInDialog } from "./JumpInDialog";
import { ScheduleDialog } from "./ScheduleDialog";

/**
 * One entry point for connecting with someone, used by every card and
 * profile. `jumpIn` decides the right flow from live state:
 * open + met before → straight into Meet; open + first time → short note;
 * not open → schedule.
 */
interface ConnectApi {
  jumpIn: (member: Member) => void;
  schedule: (member: Member, reason?: string) => void;
}

const ConnectContext = createContext<ConnectApi>({ jumpIn: () => {}, schedule: () => {} });

type Active =
  | { kind: "jump"; member: Member; mode: "direct" | "invite" }
  | { kind: "schedule"; member: Member; reason?: string }
  | { kind: "prelaunch"; member: Member }
  | null;

export function ConnectProvider({ children }: { children: ReactNode }) {
  const { connections, access } = useJumpIn();
  const [active, setActive] = useState<Active>(null);
  // Before launch, only the founder can start calls (to test them).
  const closed = access.live && !access.open && !access.admin;

  const jumpIn = useCallback(
    (member: Member) => {
      if (closed) return setActive({ kind: "prelaunch", member });
      const route = jumpInRoute(member, connections, Date.now());
      if (route.mode === "schedule") setActive({ kind: "schedule", member, reason: route.reason });
      else setActive({ kind: "jump", member, mode: route.mode });
    },
    [connections, closed],
  );

  const schedule = useCallback(
    (member: Member, reason?: string) => {
      setActive(closed ? { kind: "prelaunch", member } : { kind: "schedule", member, reason });
    },
    [closed],
  );

  const close = useCallback(() => setActive(null), []);

  return (
    <ConnectContext.Provider value={{ jumpIn, schedule }}>
      {children}
      {active?.kind === "jump" && <JumpInDialog member={active.member} mode={active.mode} onClose={close} />}
      {active?.kind === "prelaunch" && <LaunchDialog name={active.member.name} onClose={close} />}
      {active?.kind === "schedule" && (
        <ScheduleDialog member={active.member} reason={active.reason} onClose={close} />
      )}
    </ConnectContext.Provider>
  );
}

export const useConnect = () => useContext(ConnectContext);
