"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Portrait } from "@/components/Avatar";
import { useConnect } from "@/components/connect/ConnectProvider";
import { Dialog } from "@/components/Dialog";
import { Icon, InstagramMark, LinkedInMark } from "@/components/Icon";
import { LoomEmbed } from "@/components/LoomEmbed";
import { PresenceLabel, StatusPill } from "@/components/StatusPill";
import { TagList } from "@/components/Tags";
import { useToast } from "@/components/Toast";
import { firstName, jumpInRoute } from "@/lib/availability";
import { flagEmoji, sharedGround } from "@/lib/match";
import { actions, useJumpIn, useNow } from "@/lib/store";
import { formatWhen, localTimeFor, relativeTime } from "@/lib/time";

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { members, viewer, connections, safety } = useJumpIn();
  const { jumpIn, schedule } = useConnect();
  const toast = useToast();
  const now = useNow(1000);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);

  const member = members.find((m) => m.id === id);

  if (!member || safety.blockedIds.includes(member.id)) {
    return (
      <div className="container page">
        <div className="empty">
          <p className="empty__title">This profile isn&apos;t available.</p>
          <p>They may have hidden their profile, or you&apos;ve blocked them.</p>
          <Link href="/discover" className="btn btn--primary">
            Meet other people
          </Link>
        </div>
      </div>
    );
  }

  const first = firstName(member.name);
  const route = jumpInRoute(member, connections, now);
  const shared = viewer ? sharedGround(viewer, member) : null;
  const history = connections.filter((c) => c.otherUserId === member.id && c.status !== "cancelled");
  const upcoming = history.find((c) => c.status === "scheduled" && c.scheduledAt && Date.parse(c.scheduledAt) > now);
  const whyTalk = [
    shared?.impactAreas.length ? `You both care about ${shared.impactAreas.join(" + ")}.` : null,
    shared?.interests.length ? `You're both into ${shared.interests.join(" + ")}.` : null,
    shared?.skills.length ? `You both know ${shared.skills.join(" + ")}.` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="profile">
      <div className="container">
        <button className="back-link" onClick={() => (window.history.length > 1 ? router.back() : router.push("/discover"))}>
          <Icon name="arrowLeft" size={16} /> Back
        </button>

        <section className="profile-hero">
          <div className="profile-hero__photo">
            <Portrait name={member.name} src={member.avatarUrl} width={720} height={860} priority />
            {member.onlineStatus === "online" && <span className="pcard__online pcard__online--lg" />}
          </div>

          <div className="profile-hero__info">
            <div className="profile-hero__top">
              <PresenceLabel online={member.onlineStatus} />
              <div className="popover-anchor">
                <button className="icon-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="More options" aria-expanded={menuOpen}>
                  <Icon name="more" size={20} />
                </button>
                {menuOpen && (
                  <div className="popover popover--menu popover--right" role="menu">
                    <button role="menuitem" onClick={() => { setMenuOpen(false); setReporting(true); }}>
                      <Icon name="flag" size={17} /> Report {first}
                    </button>
                    <button role="menuitem" onClick={() => { setMenuOpen(false); setBlocking(true); }}>
                      <Icon name="slash" size={17} /> Block {first}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <h1 className="profile-hero__name">
              {member.name}
              {member.verified && (
                <span className="verified-chip" title="Identity verified with LinkedIn">
                  <LinkedInMark size={16} /> Verified
                </span>
              )}
            </h1>
            <p className="profile-hero__place">
              <span>{flagEmoji(member.countryCode)}</span> {member.city}
              <span className="dot-sep" />
              <Icon name="clock" size={14} /> {localTimeFor(member.timezone, now)} for {first}
            </p>
            <p className="profile-hero__headline">{member.headline}</p>

            <div className={`avail-card avail-card--${route.mode === "schedule" ? "closed" : "open"}`}>
              <div className="avail-card__top">
                <StatusPill member={member} />
                {route.mode === "direct" && <span className="met-chip">You&apos;ve met</span>}
              </div>
              <p className="avail-card__copy">
                {route.mode === "direct" && `${first} is open right now. You've met before, so you'll go straight into the call.`}
                {route.mode === "invite" && `${first} is open right now. Send a quick note and you'll be talking in a minute.`}
                {route.mode === "schedule" && route.reason}
              </p>
              <div className="avail-card__actions">
                {route.mode !== "schedule" ? (
                  <button className="btn btn--jump btn--lg" onClick={() => jumpIn(member)}>
                    <Icon name="video" size={20} /> {route.mode === "direct" ? "Jump straight in" : "Jump In"}
                  </button>
                ) : (
                  <button className="btn btn--jump btn--lg" onClick={() => schedule(member, route.reason)}>
                    <Icon name="calendar" size={20} /> Schedule a JumpIn
                  </button>
                )}
                {route.mode !== "schedule" && (
                  <button className="btn btn--outline btn--lg" onClick={() => schedule(member)}>
                    <Icon name="calendar" size={18} /> Schedule
                  </button>
                )}
              </div>
              {upcoming && (
                <p className="avail-card__upcoming">
                  <Icon name="check" size={14} /> You have a JumpIn booked {formatWhen(Date.parse(upcoming.scheduledAt!))}
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="profile-body">
          <div className="profile-main">
            {whyTalk.length > 0 && (
              <section className="why">
                <p className="eyebrow">Why you two might talk</p>
                {whyTalk.map((w) => (
                  <p key={w} className="why__line">
                    <Icon name="sparkle" size={16} /> {w}
                  </p>
                ))}
              </section>
            )}

            <section className="block">
              <h2 className="block__title">What I do</h2>
              <p className="lede">{member.whatIDo}</p>
            </section>

            {member.loomUrl && (
              <section className="block">
                <LoomEmbed url={member.loomUrl} name={member.name} firstName={first} avatarUrl={member.avatarUrl} />
              </section>
            )}

            <section className="block">
              <h2 className="block__title">About</h2>
              <p className="prose">{member.bio}</p>
            </section>

            {member.projects.length > 0 && (
              <section className="block">
                <h2 className="block__title">Working on</h2>
                <div className="projects">
                  {member.projects.map((p) => (
                    <article key={p.name} className="project">
                      <h3>
                        {p.url ? (
                          <a href={p.url} target="_blank" rel="noreferrer">
                            {p.name} <Icon name="external" size={14} />
                          </a>
                        ) : (
                          p.name
                        )}
                      </h3>
                      <p>{p.description}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="profile-side">
            <section className="side-block">
              <h2 className="side-block__title">Impact areas</h2>
              <TagList items={member.impactAreas} tone="peri" highlight={shared?.impactAreas} />
            </section>
            <section className="side-block">
              <h2 className="side-block__title">Interests</h2>
              <TagList items={member.interests} highlight={shared?.interests} />
            </section>
            <section className="side-block">
              <h2 className="side-block__title">Skills</h2>
              <TagList items={member.skills} highlight={shared?.skills} />
            </section>

            {history.length > 0 && (
              <section className="side-block">
                <h2 className="side-block__title">You and {first}</h2>
                <ul className="mini-history">
                  {history.slice(0, 4).map((c) => (
                    <li key={c.id}>
                      <Icon name={c.type === "jumpin" ? "video" : "calendar"} size={15} />
                      {c.status === "scheduled" && c.scheduledAt
                        ? `Scheduled for ${formatWhen(Date.parse(c.scheduledAt))}`
                        : c.status === "invited"
                          ? `Invite sent ${relativeTime(Date.parse(c.createdAt), now)}`
                          : `${c.type === "jumpin" ? "Jumped in" : "Met"} ${relativeTime(Date.parse(c.scheduledAt ?? c.createdAt), now)}`}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(member.linkedinUrl || member.instagramUrl || member.websiteUrl) && (
              <section className="side-block">
                <h2 className="side-block__title">Elsewhere</h2>
                <div className="elsewhere">
                  {member.linkedinUrl && (
                    <a href={member.linkedinUrl} target="_blank" rel="noreferrer">
                      <LinkedInMark size={18} /> LinkedIn
                    </a>
                  )}
                  {member.instagramUrl && (
                    <a href={member.instagramUrl} target="_blank" rel="noreferrer">
                      <InstagramMark size={18} /> Instagram
                    </a>
                  )}
                  {member.websiteUrl && (
                    <a href={member.websiteUrl} target="_blank" rel="noreferrer">
                      <Icon name="globe" size={18} /> Website
                    </a>
                  )}
                </div>
              </section>
            )}

            <p className="privacy-note">
              <Icon name="shield" size={15} />
              JumpIn connects you without sharing either of your email addresses.
            </p>
          </aside>
        </div>
      </div>

      {/* Phones: keep the main action in reach while reading the profile. */}
      <div className="mobile-cta">
        <StatusPill member={member} size="sm" />
        {route.mode !== "schedule" ? (
          <button className="btn btn--jump" onClick={() => jumpIn(member)}>
            <Icon name="video" size={18} /> {route.mode === "direct" ? "Jump straight in" : "Jump In"}
          </button>
        ) : (
          <button className="btn btn--jump" onClick={() => schedule(member, route.reason)}>
            <Icon name="calendar" size={18} /> Schedule
          </button>
        )}
      </div>

      <ReportDialog
        open={reporting}
        name={first}
        onClose={() => setReporting(false)}
        onSubmit={async (reason, details) => {
          await actions.report(member.id, reason, details);
          setReporting(false);
          toast(`Thanks. Our team will review your report about ${first}.`);
        }}
      />

      <Dialog open={blocking} onClose={() => setBlocking(false)} label={`Block ${first}`} size="sm">
        <div className="confirm">
          <h2 className="confirm__title">Block {first}?</h2>
          <p>
            You won&apos;t see each other in JumpIn, and {first} won&apos;t be able to jump in or schedule with you. They
            aren&apos;t notified. You can unblock them in Settings.
          </p>
          <div className="confirm__actions">
            <button className="btn btn--ghost" onClick={() => setBlocking(false)}>
              Cancel
            </button>
            <button
              className="btn btn--danger"
              onClick={async () => {
                await actions.block(member.id);
                setBlocking(false);
                toast(`${first} is blocked.`);
                router.push("/discover");
              }}
            >
              Block
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

const REASONS = [
  "Made me feel unsafe or uncomfortable",
  "Spam or selling",
  "Fake profile or impersonation",
  "Inappropriate behaviour on a call",
  "Something else",
];

function ReportDialog({
  open,
  name,
  onClose,
  onSubmit,
}: {
  open: boolean;
  name: string;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  return (
    <Dialog open={open} onClose={onClose} label={`Report ${name}`} size="sm">
      <form
        className="confirm"
        onSubmit={(e) => {
          e.preventDefault();
          if (reason) onSubmit(reason, details);
        }}
      >
        <h2 className="confirm__title">Report {name}</h2>
        <p>Reports are private. {name} won&apos;t know who made it.</p>
        <fieldset className="radio-list">
          <legend className="sr-only">Reason</legend>
          {REASONS.map((r) => (
            <label key={r} className={`radio ${reason === r ? "radio--on" : ""}`}>
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
              {r}
            </label>
          ))}
        </fieldset>
        <textarea
          className="input"
          rows={3}
          placeholder="Anything else we should know? (optional)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
        <div className="confirm__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--danger" disabled={!reason}>
            Send report
          </button>
        </div>
      </form>
    </Dialog>
  );
}
