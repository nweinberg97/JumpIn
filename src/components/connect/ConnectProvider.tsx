"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { jumpInRoute } from "@/lib/availability";
import { useJumpIn } from "@/lib/store";
import type { Member } from "@/lib/types";
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
  | null;

export function ConnectProvider({ children }: { children: ReactNode }) {
  const { connections } = useJumpIn();
  const [active, setActive] = useState<Active>(null);

  const jumpIn = useCallback(
    (member: Member) => {
      const route = jumpInRoute(member, connections, Date.now());
      if (route.mode === "schedule") setActive({ kind: "schedule", member, reason: route.reason });
      else setActive({ kind: "jump", member, mode: route.mode });
    },
    [connections],
  );

  const schedule = useCallback((member: Member, reason?: string) => {
    setActive({ kind: "schedule", member, reason });
  }, []);

  const close = useCallback(() => setActive(null), []);

  return (
    <ConnectContext.Provider value={{ jumpIn, schedule }}>
      {children}
      {active?.kind === "jump" && <JumpInDialog member={active.member} mode={active.mode} onClose={close} />}
      {active?.kind === "schedule" && (
        <ScheduleDialog member={active.member} reason={active.reason} onClose={close} />
      )}
    </ConnectContext.Provider>
  );
}

export const useConnect = () => useContext(ConnectContext);
