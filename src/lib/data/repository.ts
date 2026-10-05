import type { Connection, Member, SafetyState, Session, Viewer } from "../types";

/**
 * Everything the UI knows about persistence goes through this interface.
 *
 * The prototype ships `LocalRepository` (seeded data + localStorage). A real
 * backend implements the same contract (e.g. `SupabaseRepository` calling
 * Postgres via row-level-secured queries) and is swapped in at
 * `src/lib/data/index.ts`. No component imports a storage API directly.
 *
 * Methods are async on purpose, even though localStorage is synchronous, so
 * the UI is already written for network latency.
 */
export interface JumpInRepository {
  getSession(): Promise<Session | null>;
  saveSession(session: Session | null): Promise<void>;

  getViewer(): Promise<Viewer | null>;
  saveViewer(viewer: Viewer): Promise<Viewer>;

  /** Every member the viewer is allowed to see (excludes the viewer). */
  listMembers(): Promise<Member[]>;

  listConnections(): Promise<Connection[]>;
  saveConnection(connection: Connection): Promise<Connection>;

  getSafety(): Promise<SafetyState>;
  saveSafety(safety: SafetyState): Promise<SafetyState>;

  /** Wipe local state (demo reset / sign out of the prototype). */
  reset(): Promise<void>;
}
