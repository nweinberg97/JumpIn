import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { AVATAR_BUCKET } from "../supabase/config";
import type { Connection, Member, Report, SafetyState, Session, Viewer, WarmIntro } from "../types";
import type { JumpInRepository } from "./repository";
import {
  connectionFromRow,
  introFromRow,
  isUuid,
  MEMBER_SELECT,
  memberFromRow,
  presenceUpdate,
  profileUpdate,
  projectRows,
  viewerFromRow,
  weeklyRows,
  type ConnectionRow,
  type MemberRow,
  type WarmIntroRow,
} from "./rows";

/**
 * The real backend: Supabase, read and written as the signed-in person.
 * Row-level security decides what they can see and change (see
 * supabase/migrations), so this class never needs to filter for safety.
 *
 * Anything involving another person (calls, invites, warm intros) is written
 * by server routes with the secret key; here those are read-only.
 */
export class SupabaseRepository implements JumpInRepository {
  private online = new Set<string>();
  private channel: RealtimeChannel | null = null;

  constructor(private db: SupabaseClient) {}

  private async user() {
    const { data } = await this.db.auth.getSession();
    return data.session?.user ?? null;
  }

  private async uid() {
    const user = await this.user();
    if (!user) throw new Error("Not signed in");
    return user.id;
  }

  private fail(what: string, error: { message: string } | null) {
    if (error) throw new Error(`${what}: ${error.message}`);
  }

  async getSession(): Promise<Session | null> {
    const user = await this.user();
    if (!user) return null;
    const provider = user.app_metadata?.provider === "linkedin_oidc" ? "linkedin" : "google";
    return {
      userId: user.id,
      provider,
      linked: { linkedin: provider === "linkedin", google: false, instagram: false },
      createdAt: user.created_at,
    };
  }

  /** Signing out of the real account; keeping a session is Supabase's job. */
  async saveSession(session: Session | null) {
    if (!session) await this.db.auth.signOut();
  }

  async getViewer(): Promise<Viewer | null> {
    const user = await this.user();
    if (!user) return null;
    const { data, error } = await this.db.from("members").select(MEMBER_SELECT).eq("id", user.id).maybeSingle();
    this.fail("Loading your profile", error);
    if (!data) return null;
    const viewer = viewerFromRow(data as MemberRow, user.email ?? "");
    // Session.linked.google mirrors whether Calendar is connected.
    return viewer;
  }

  async saveViewer(viewer: Viewer): Promise<Viewer> {
    const id = await this.uid();
    let avatarUrl = viewer.avatarUrl;
    if (avatarUrl.startsWith("data:")) avatarUrl = await this.uploadAvatar(id, avatarUrl);
    const next = { ...viewer, avatarUrl };

    const profile = await this.db.from("members").update(profileUpdate(next)).eq("id", id);
    this.fail("Saving your profile", profile.error);
    const presence = await this.db.from("presence").update(presenceUpdate(next)).eq("member_id", id);
    this.fail("Saving your status", presence.error);

    // Weekly hours and projects are small lists: replace them wholesale.
    const delWeekly = await this.db.from("weekly_availability").delete().eq("member_id", id);
    this.fail("Saving your weekly hours", delWeekly.error);
    const weekly = weeklyRows(id, next.weeklyAvailability);
    if (weekly.length) this.fail("Saving your weekly hours", (await this.db.from("weekly_availability").insert(weekly)).error);

    const delProjects = await this.db.from("projects").delete().eq("member_id", id);
    this.fail("Saving your projects", delProjects.error);
    const projects = projectRows(id, next.projects);
    if (projects.length) this.fail("Saving your projects", (await this.db.from("projects").insert(projects)).error);

    return (await this.getViewer()) ?? next;
  }

  /** Profile photos arrive as small JPEG data URLs; store them as files. */
  private async uploadAvatar(id: string, dataUrl: string) {
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${id}/${Date.now()}.jpg`;
    const { error } = await this.db.storage.from(AVATAR_BUCKET).upload(path, blob, {
      contentType: "image/jpeg",
      upsert: true,
    });
    this.fail("Uploading your photo", error);
    return this.db.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async listMembers(): Promise<Member[]> {
    const id = await this.uid();
    const { data, error } = await this.db.from("members").select(MEMBER_SELECT).neq("id", id).order("joined_at");
    this.fail("Loading members", error);
    return ((data ?? []) as MemberRow[]).filter((r) => r.onboarded).map((r) => memberFromRow(r, this.online.has(r.id)));
  }

  async listConnections(): Promise<Connection[]> {
    const id = await this.uid();
    const { data, error } = await this.db.from("connections").select("*").order("created_at", { ascending: false });
    this.fail("Loading your connections", error);
    return ((data ?? []) as ConnectionRow[]).map((r) => connectionFromRow(r, id));
  }

  /** Connections are shared rows the server owns; it checks you're part of it. */
  async saveConnection(connection: Connection): Promise<Connection> {
    const res = await fetch("/api/connections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(connection),
    });
    if (!res.ok) throw new Error(`Saving the call failed (${res.status})`);
    return connection;
  }

  async listIntros(): Promise<WarmIntro[]> {
    const { data, error } = await this.db
      .from("warm_intros")
      .select("id, subject_id, recipient_member_id, recipient_email, recipient_name, note, created_at")
      .order("created_at", { ascending: false });
    this.fail("Loading your warm intros", error);
    return ((data ?? []) as WarmIntroRow[]).map(introFromRow);
  }

  /** The server stored it when the intro was sent (POST /api/intros). */
  async saveIntro(intro: WarmIntro): Promise<WarmIntro> {
    return intro;
  }

  async getSafety(): Promise<SafetyState> {
    const [blocks, reports] = await Promise.all([
      this.db.from("blocks").select("blocked_id"),
      this.db.from("reports").select("id, member_id, reason, details, created_at"),
    ]);
    this.fail("Loading your blocks", blocks.error);
    this.fail("Loading your reports", reports.error);
    return {
      blockedIds: ((blocks.data ?? []) as Array<{ blocked_id: string }>).map((b) => b.blocked_id),
      reports: ((reports.data ?? []) as Array<{ id: string; member_id: string; reason: string; details: string | null; created_at: string }>).map(
        (r): Report => ({ id: r.id, memberId: r.member_id, reason: r.reason, details: r.details ?? undefined, createdAt: r.created_at }),
      ),
    };
  }

  async saveSafety(next: SafetyState): Promise<SafetyState> {
    const id = await this.uid();
    const current = await this.getSafety();
    const added = next.blockedIds.filter((b) => !current.blockedIds.includes(b));
    const removed = current.blockedIds.filter((b) => !next.blockedIds.includes(b));
    if (added.length) {
      this.fail("Blocking", (await this.db.from("blocks").insert(added.map((b) => ({ blocker_id: id, blocked_id: b })))).error);
    }
    for (const b of removed) {
      this.fail("Unblocking", (await this.db.from("blocks").delete().eq("blocker_id", id).eq("blocked_id", b)).error);
    }
    // New reports carry a client-made id; stored ones have the database's.
    const fresh = next.reports.filter((r) => !isUuid(r.id));
    if (fresh.length) {
      const rows = fresh.map((r) => ({ reporter_id: id, member_id: r.memberId, reason: r.reason.slice(0, 80), details: r.details ?? null }));
      this.fail("Sending your report", (await this.db.from("reports").insert(rows)).error);
    }
    return this.getSafety();
  }

  /** Demo-only (wipes local demo state); nothing to do for a real account. */
  async reset() {}

  /**
   * Live updates: who's online (Realtime Presence) and anyone's status
   * changing (database changes on `presence`). Calls `onChange` so the app
   * reloads the member list.
   */
  subscribe(onChange: () => void) {
    let stopped = false;
    void (async () => {
      const id = await this.uid().catch(() => null);
      if (!id || stopped) return;
      const channel = this.db.channel("lobby", { config: { presence: { key: id } } });
      channel
        .on("presence", { event: "sync" }, () => {
          this.online = new Set(Object.keys(channel.presenceState()));
          onChange();
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "presence" }, () => onChange())
        .on("postgres_changes", { event: "*", schema: "public", table: "connections" }, () => onChange())
        .on("postgres_changes", { event: "*", schema: "public", table: "invites" }, () => onChange())
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") await channel.track({ at: new Date().toISOString() });
        });
      this.channel = channel;
    })();
    return () => {
      stopped = true;
      if (this.channel) void this.db.removeChannel(this.channel);
      this.channel = null;
    };
  }
}
