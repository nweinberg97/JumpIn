import { browserClient } from "../supabase/browser";
import type { Connection, SafetyState, Session, Viewer, WarmIntro } from "../types";
import { LocalRepository } from "./localRepository";
import type { JumpInRepository } from "./repository";
import { SupabaseRepository } from "./supabaseRepository";

/**
 * The single place the app chooses where data lives.
 *
 *  demo → LocalRepository: seeded members + this browser's storage. Used
 *         when no backend is configured, and whenever someone explores the
 *         demo (even on the live site, so new members can practise).
 *  live → SupabaseRepository: the real database, when Supabase keys are set
 *         and the person is signed in.
 *
 * Components never see the difference: they call `actions` in store.ts.
 */
class SwitchingRepository implements JumpInRepository {
  readonly local = new LocalRepository();
  readonly live: SupabaseRepository | null;
  private active: JumpInRepository = this.local;
  mode: "demo" | "live" = "demo";

  constructor() {
    const db = typeof window === "undefined" ? null : browserClient();
    this.live = db ? new SupabaseRepository(db) : null;
  }

  /** Decide which store to use: a running demo wins, then a real sign-in. */
  async resolve(): Promise<"demo" | "live"> {
    const demo = await this.local.getSession();
    const live = !demo && this.live ? await this.live.getSession().catch(() => null) : null;
    this.mode = live ? "live" : "demo";
    this.active = live ? this.live! : this.local;
    return this.mode;
  }

  /** Switch to the demo for this browser (the real account stays signed in). */
  enterDemo() {
    this.mode = "demo";
    this.active = this.local;
  }

  getSession() {
    return this.active.getSession();
  }
  saveSession(session: Session | null) {
    return this.active.saveSession(session);
  }
  getViewer() {
    return this.active.getViewer();
  }
  saveViewer(viewer: Viewer) {
    return this.active.saveViewer(viewer);
  }
  listMembers() {
    return this.active.listMembers();
  }
  listConnections() {
    return this.active.listConnections();
  }
  saveConnection(connection: Connection) {
    return this.active.saveConnection(connection);
  }
  listIntros() {
    return this.active.listIntros();
  }
  saveIntro(intro: WarmIntro) {
    return this.active.saveIntro(intro);
  }
  getSafety() {
    return this.active.getSafety();
  }
  saveSafety(safety: SafetyState) {
    return this.active.saveSafety(safety);
  }
  reset() {
    return this.active.reset();
  }
  subscribe(onChange: () => void) {
    return this.mode === "live" && this.live ? this.live.subscribe(onChange) : () => {};
  }
}

export const repository = new SwitchingRepository();
