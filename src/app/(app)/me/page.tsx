"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { CardPreview } from "@/components/profile/CardPreview";
import { finalizeProfile, isEmail } from "@/components/profile/finalize";
import { CaresSection, IdentitySection, LinksSection, WorkSection } from "@/components/profile/ProfileSections";
import { useToast } from "@/components/Toast";
import { actions, useJumpIn } from "@/lib/store";
import type { Viewer } from "@/lib/types";

const SECTIONS = [
  { id: "you", title: "Basics" },
  { id: "cares", title: "What you care about" },
  { id: "work", title: "What you're working on" },
  { id: "links", title: "Links & email" },
];

export default function MyProfile() {
  const { viewer } = useJumpIn();
  const toast = useToast();
  const [draft, setDraft] = useState<Viewer | null>(viewer);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft && viewer) setDraft(viewer);
  }, [viewer, draft]);

  // Picks up an Instagram handle verified via OAuth (?instagram=handle).
  useEffect(() => {
    const handle = new URLSearchParams(window.location.search).get("instagram");
    if (handle) {
      actions.setSessionLinked({ instagram: true }, handle);
      actions.updateViewer({ instagramUrl: `https://www.instagram.com/${handle}` });
      setDraft((d) => (d ? { ...d, instagramUrl: `https://www.instagram.com/${handle}` } : d));
    }
  }, []);

  if (!draft || !viewer) return null;

  const set = (patch: Partial<Viewer>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const dirty = JSON.stringify({ ...draft, availability: null }) !== JSON.stringify({ ...viewer, availability: null });

  const save = async () => {
    if (!draft.name.trim() || !draft.headline.trim()) return setError("Your name and one-liner can't be empty.");
    if (!draft.impactAreas.length) return setError("Pick at least one impact area.");
    if (!isEmail(draft.email)) return setError("Add a valid email address. It stays private.");
    setError(null);
    const saved = finalizeProfile({ ...draft, availability: viewer.availability });
    await actions.updateViewer(saved);
    setDraft(saved);
    toast("Profile saved");
  };

  return (
    <div className="container page page--with-aside">
      <div className="page-head">
        <div>
          <p className="eyebrow">My profile</p>
          <h1 className="page-title">How people get to know you</h1>
        </div>
        <Link href="/availability" className="btn btn--outline btn--sm">
          <Icon name="clock" size={16} /> Availability
        </Link>
      </div>

      <div className="edit-grid">
        <div className="edit-main">
          <nav className="section-nav" aria-label="Profile sections">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`}>
                {s.title}
              </a>
            ))}
          </nav>

          <section id="you" className="edit-section">
            <h2 className="edit-section__title">Basics</h2>
            <IdentitySection draft={draft} set={set} />
          </section>
          <section id="cares" className="edit-section">
            <h2 className="edit-section__title">What you care about</h2>
            <CaresSection draft={draft} set={set} />
          </section>
          <section id="work" className="edit-section">
            <h2 className="edit-section__title">What you&apos;re working on</h2>
            <WorkSection draft={draft} set={set} />
          </section>
          <section id="links" className="edit-section">
            <h2 className="edit-section__title">Links &amp; email</h2>
            <LinksSection draft={draft} set={set} />
          </section>
        </div>

        <aside className="edit-aside">
          <CardPreview draft={{ ...draft, availability: viewer.availability }} />
        </aside>
      </div>

      <div className={`savebar ${dirty ? "savebar--on" : ""}`} aria-hidden={!dirty}>
        <div className="savebar__inner">
          {error ? <span className="field__error">{error}</span> : <span>You have unsaved changes</span>}
          <div className="savebar__actions">
            <button className="btn btn--ghost btn--sm" onClick={() => { setDraft(viewer); setError(null); }} tabIndex={dirty ? 0 : -1}>
              Discard
            </button>
            <button className="btn btn--jump btn--sm" onClick={save} tabIndex={dirty ? 0 : -1}>
              Save profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
