"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { repository } from "./data";
import { buildDemoConnections, buildDemoViewer, buildNewViewer } from "./data/seed";
import { authService, type ServerSession } from "./services/authService";
import { api } from "./services/http";
import { getIntegrationStatus } from "./services/integrationService";
import type {
  AppAccess,
  AvailabilityStatus,
  Connection,
  IntegrationStatus,
  Member,
  Report,
  SafetyState,
  Session,
  Viewer,
  WarmIntro,
} from "./types";

/**
 * App state for the UI. Components read it with `useJumpIn()` and change it
 * only through `actions` — which in turn only talk to `repository` — so a
 * real backend can replace the local one without touching components.
 */

export interface AppState {
  ready: boolean;
  session: Session | null;
  viewer: Viewer | null;
  members: Member[];
  connections: Connection[];
  intros: WarmIntro[];
  safety: SafetyState;
  integrations: IntegrationStatus;
  /** "live" = the real database; "demo" = seeded members in this browser. */
  mode: "demo" | "live";
  /** Launch countdown, approval and founder access (see AppAccess). */
  access: AppAccess;
}

/** The demo is always fully open: it's for practising. */
export const DEMO_ACCESS: AppAccess = { live: false, launchAt: null, open: true, admin: false, membership: "approved" };

let state: AppState = {
  ready: false,
  session: null,
  viewer: null,
  members: [],
  connections: [],
  intros: [],
  safety: { blockedIds: [], reports: [] },
  integrations: { linkedin: false, google: false, instagram: false, email: false },
  mode: "demo",
  access: DEMO_ACCESS,
};

const listeners = new Set<() => void>();

function set(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;

let loading: Promise<void> | null = null;

let unsubscribe: (() => void) | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/** Someone's status changed, or someone came online: refresh what's shown. */
function scheduleRefresh() {
  if (refreshTimer) return;
  refreshTimer = setTimeout(async () => {
    refreshTimer = null;
    try {
      const [members, connections] = await Promise.all([repository.listMembers(), repository.listConnections()]);
      set({ members, connections });
    } catch {
      /* transient: the next change will try again */
    }
  }, 400);
}

async function loadAccess(mode: "demo" | "live"): Promise<AppAccess> {
  if (mode === "demo") return DEMO_ACCESS;
  try {
    return await api<AppAccess>("/api/app-state");
  } catch {
    return { live: true, launchAt: null, open: false, admin: false, membership: null };
  }
}

async function load() {
  const mode = await repository.resolve();
  unsubscribe?.();
  unsubscribe = repository.subscribe(scheduleRefresh);
  const accessP = loadAccess(mode);
  const [session, viewer, members, connections, intros, safety] = await Promise.all([
    repository.getSession(),
    repository.getViewer(),
    repository.listMembers(),
    repository.listConnections(),
    repository.listIntros(),
    repository.getSafety(),
  ]);
  set({ ready: true, session, viewer, members, connections, intros, safety, mode, access: await accessP });
  getIntegrationStatus().then((integrations) => set({ integrations }));
}

export function ensureLoaded() {
  if (!loading) loading = load();
  return loading;
}

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

async function saveViewer(viewer: Viewer) {
  await repository.saveViewer(viewer);
  set({ viewer });
  return viewer;
}

export const actions = {
  /** Demo sign-in: a complete profile and a little history, no credentials. */
  async signInDemo() {
    repository.enterDemo();
    const now = Date.now();
    await repository.reset();
    const session: Session = {
      userId: "me",
      provider: "demo",
      linked: { linkedin: false, google: false, instagram: false },
      createdAt: new Date(now).toISOString(),
    };
    const viewer = buildDemoViewer(now);
    await repository.saveSession(session);
    await repository.saveViewer(viewer);
    for (const c of buildDemoConnections(now).reverse()) await repository.saveConnection(c);
    loading = load();
    await loading;
  },

  /** Demo sign-in with a blank profile, to try onboarding without OAuth. */
  async signInDemoFresh() {
    repository.enterDemo();
    const now = Date.now();
    await repository.reset();
    await repository.saveSession({
      userId: "me",
      provider: "demo",
      linked: { linkedin: false, google: false, instagram: false },
      createdAt: new Date(now).toISOString(),
    });
    await repository.saveViewer(buildNewViewer({}, now));
    loading = load();
    await loading;
  },

  /** After a real LinkedIn/Google OAuth callback, mirror the server session locally. */
  async adoptServerSession(server: ServerSession) {
    const existing = await repository.getViewer();
    const session: Session = {
      userId: "me",
      provider: server.provider,
      linked: server.linked,
      instagramHandle: server.instagramHandle,
      createdAt: new Date().toISOString(),
    };
    await repository.saveSession(session);
    const fresh = !existing || existing.email !== (server.profile.email ?? existing.email);
    const viewer: Viewer = fresh
      ? buildNewViewer({
          name: server.profile.name,
          email: server.profile.email,
          avatarUrl: server.profile.picture,
          verified: server.linked.linkedin,
        })
      : {
          ...existing!,
          verified: existing!.verified || server.linked.linkedin,
          calendarConnected: existing!.calendarConnected || server.linked.google,
        };
    // The Connector badge is the server's call, never the browser's.
    viewer.isConnector = Boolean(server.connector);
    if (server.linked.google) viewer.calendarConnected = true;
    await repository.saveViewer(viewer);
    if (fresh) {
      for (const c of await repository.listConnections()) {
        await repository.saveConnection({ ...c, status: "cancelled" });
      }
    }
    loading = load();
    await loading;
    return viewer;
  },

  /**
   * After "Connect Google Calendar" (or Instagram): add the linked identity
   * to the current account without touching the profile.
   */
  async linkServerSession(server: ServerSession) {
    await ensureLoaded();
    if (!state.session || !state.viewer) return actions.adoptServerSession(server);
    await actions.setSessionLinked(
      { google: server.linked.google || state.session.linked.google, instagram: server.linked.instagram },
      server.instagramHandle,
    );
    if (server.linked.google) await actions.updateViewer({ calendarConnected: true });
    return state.viewer;
  },

  /** Reload everything, e.g. right after a real sign-in. */
  async reload() {
    loading = load();
    await loading;
    return state.viewer;
  },

  async signOut() {
    // Leaving the demo on the live site keeps the real account signed in.
    const leavingDemo = state.mode === "demo";
    if (leavingDemo) await authService.signOutPrototype();
    else await authService.signOut();
    await repository.saveSession(null);
    set({ session: null });
    // Back to the real account, if there is one signed in underneath.
    if (leavingDemo && repository.live) {
      loading = load();
      await loading;
    }
  },

  async resetDemo() {
    await authService.signOutPrototype();
    await repository.reset();
    loading = load();
    await loading;
  },

  async updateViewer(patch: Partial<Viewer>) {
    if (!state.viewer) return null;
    return saveViewer({ ...state.viewer, ...patch });
  },

  /** "Right now" status. minutes = null → open until switched off. */
  async setAvailability(status: AvailabilityStatus, minutes?: number | null) {
    if (!state.viewer) return;
    const availability =
      status === "open"
        ? {
            status,
            openUntil: minutes ? new Date(Date.now() + minutes * 60_000).toISOString() : undefined,
          }
        : { status };
    await saveViewer({ ...state.viewer, availability });
  },

  async saveConnection(connection: Connection) {
    await repository.saveConnection(connection);
    set({ connections: await repository.listConnections() });
    return connection;
  },

  newConnectionId: () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : uid("c"),
  newIntroId: () => uid("i"),

  async saveIntro(intro: WarmIntro) {
    await repository.saveIntro(intro);
    set({ intros: await repository.listIntros() });
    return intro;
  },

  async updateConnection(id: string, patch: Partial<Connection>) {
    const existing = state.connections.find((c) => c.id === id);
    if (!existing) return;
    await actions.saveConnection({ ...existing, ...patch });
  },

  async setSessionLinked(patch: Partial<Session["linked"]>, instagramHandle?: string) {
    if (!state.session) return;
    const session = {
      ...state.session,
      linked: { ...state.session.linked, ...patch },
      instagramHandle: instagramHandle ?? state.session.instagramHandle,
    };
    await repository.saveSession(session);
    set({ session });
  },

  async block(memberId: string) {
    const safety = {
      ...state.safety,
      blockedIds: [...new Set([...state.safety.blockedIds, memberId])],
    };
    await repository.saveSafety(safety);
    set({ safety });
  },

  async unblock(memberId: string) {
    const safety = {
      ...state.safety,
      blockedIds: state.safety.blockedIds.filter((id) => id !== memberId),
    };
    await repository.saveSafety(safety);
    set({ safety });
  },

  async report(memberId: string, reason: string, details?: string) {
    const report: Report = {
      id: uid("r"),
      memberId,
      reason,
      details,
      createdAt: new Date().toISOString(),
    };
    const safety = { ...state.safety, reports: [...state.safety.reports, report] };
    await repository.saveSafety(safety);
    set({ safety });
  },
};

/** Subscribe a component to app state. */
export function useJumpIn(): AppState {
  useEffect(() => {
    ensureLoaded();
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Members the viewer can see: not blocked. */
export function visibleMembers(s: AppState) {
  const blocked = new Set(s.safety.blockedIds);
  return s.members.filter((m) => !blocked.has(m.id));
}

/** A clock that ticks, for countdowns and expiring "open" windows. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
