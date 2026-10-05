import type { Connection, Member, SafetyState, Session, Viewer } from "../types";
import type { JumpInRepository } from "./repository";
import { buildSeedMembers } from "./seed";

/**
 * Prototype persistence: seeded members + localStorage.
 *
 * Members are other people, so in the prototype they're read-only seed data.
 * Their "open for the next 45 minutes" windows are anchored to a seed epoch
 * that refreshes every few hours, so the network looks alive whenever you
 * come back to it.
 */

const PREFIX = "jumpin:v1:";
const SEED_TTL_MS = 3 * 60 * 60 * 1000;

const KEYS = {
  session: `${PREFIX}session`,
  viewer: `${PREFIX}viewer`,
  connections: `${PREFIX}connections`,
  safety: `${PREFIX}safety`,
  seedEpoch: `${PREFIX}seedEpoch`,
};

/** Storage that survives SSR and private-mode browsers. */
function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const s = window.localStorage;
    const probe = `${PREFIX}probe`;
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

const memory = new Map<string, string>();

function read<T>(key: string, fallback: T): T {
  const s = storage();
  const raw = s ? s.getItem(key) : memory.get(key) ?? null;
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  const raw = JSON.stringify(value);
  const s = storage();
  if (s) s.setItem(key, raw);
  else memory.set(key, raw);
}

function remove(key: string) {
  const s = storage();
  if (s) s.removeItem(key);
  memory.delete(key);
}

function seedEpoch(): number {
  const now = Date.now();
  const stored = read<number>(KEYS.seedEpoch, 0);
  if (stored && now - stored < SEED_TTL_MS) return stored;
  write(KEYS.seedEpoch, now);
  return now;
}

export class LocalRepository implements JumpInRepository {
  async getSession() {
    return read<Session | null>(KEYS.session, null);
  }

  async saveSession(session: Session | null) {
    if (session) write(KEYS.session, session);
    else remove(KEYS.session);
  }

  async getViewer() {
    return read<Viewer | null>(KEYS.viewer, null);
  }

  async saveViewer(viewer: Viewer) {
    write(KEYS.viewer, viewer);
    return viewer;
  }

  async listMembers(): Promise<Member[]> {
    return buildSeedMembers(seedEpoch());
  }

  async listConnections() {
    return read<Connection[]>(KEYS.connections, []);
  }

  async saveConnection(connection: Connection) {
    const all = await this.listConnections();
    const i = all.findIndex((c) => c.id === connection.id);
    if (i >= 0) all[i] = connection;
    else all.unshift(connection);
    write(KEYS.connections, all);
    return connection;
  }

  async getSafety() {
    return read<SafetyState>(KEYS.safety, { blockedIds: [], reports: [] });
  }

  async saveSafety(safety: SafetyState) {
    write(KEYS.safety, safety);
    return safety;
  }

  async reset() {
    Object.values(KEYS).forEach(remove);
  }

  /** Used by the demo sign-in to start from a known history. */
  async seedConnections(connections: Connection[]) {
    write(KEYS.connections, connections);
  }
}
