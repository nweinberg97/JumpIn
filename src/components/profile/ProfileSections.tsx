"use client";

import { IMPACT_AREAS, SUGGESTED_INTERESTS, SUGGESTED_SKILLS } from "@/lib/data/seed";
import { authService } from "@/lib/services/authService";
import { useJumpIn } from "@/lib/store";
import type { Viewer } from "@/lib/types";
import { Icon, InstagramMark, LinkedInMark } from "../Icon";
import { COUNTRIES, Field, LoomField, PhotoField, TagPicker } from "./Fields";

export type SetDraft = (patch: Partial<Viewer>) => void;

/** Shared by onboarding (one section per step) and My profile (all at once). */

export function IdentitySection({ draft, set }: { draft: Viewer; set: SetDraft }) {
  return (
    <div className="form-stack">
      <PhotoField name={draft.name} value={draft.avatarUrl} onChange={(avatarUrl) => set({ avatarUrl })} />
      <Field label="Your name" htmlFor="name">
        <input id="name" className="input" value={draft.name} onChange={(e) => set({ name: e.target.value })} autoComplete="name" />
      </Field>
      <Field
        label="Your one-liner"
        htmlFor="headline"
        hint={`${draft.headline.length}/160 · What would you want someone to know before saying hi?`}
      >
        <textarea
          id="headline"
          className="input"
          rows={2}
          maxLength={160}
          value={draft.headline}
          onChange={(e) => set({ headline: e.target.value })}
          placeholder="e.g. Building tools that help people turn good intentions into action."
        />
      </Field>
      <div className="form-row">
        <Field label="City" htmlFor="city">
          <input id="city" className="input" value={draft.city} onChange={(e) => set({ city: e.target.value })} placeholder="Vancouver" />
        </Field>
        <Field label="Country" htmlFor="country">
          <select
            id="country"
            className="input input--select"
            value={draft.countryCode}
            onChange={(e) => set({ countryCode: e.target.value })}
          >
            <option value="">Choose…</option>
            {COUNTRIES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}

export function CaresSection({ draft, set }: { draft: Viewer; set: SetDraft }) {
  return (
    <div className="form-stack">
      <Field label="Impact areas" hint="The parts of the world you're working to make better.">
        <TagPicker value={draft.impactAreas} onChange={(impactAreas) => set({ impactAreas })} suggestions={IMPACT_AREAS} max={5} tone="peri" />
      </Field>
      <Field label="Interests">
        <TagPicker value={draft.interests} onChange={(interests) => set({ interests })} suggestions={SUGGESTED_INTERESTS} />
      </Field>
      <Field label="Skills you could share">
        <TagPicker value={draft.skills} onChange={(skills) => set({ skills })} suggestions={SUGGESTED_SKILLS} />
      </Field>
    </div>
  );
}

export function WorkSection({ draft, set }: { draft: Viewer; set: SetDraft }) {
  const project = draft.projects[0] ?? { name: "", description: "" };
  const setProject = (patch: Partial<typeof project>) => {
    const next = { ...project, ...patch };
    set({ projects: next.name || next.description ? [next, ...draft.projects.slice(1)] : draft.projects.slice(1) });
  };
  return (
    <div className="form-stack">
      <Field label="What I do" htmlFor="what" hint="One sentence. The thing you'd say at a dinner party.">
        <textarea
          id="what"
          className="input"
          rows={2}
          maxLength={200}
          value={draft.whatIDo}
          onChange={(e) => set({ whatIDo: e.target.value })}
          placeholder="e.g. Product designer working at the intersection of technology, health, and human behaviour."
        />
      </Field>
      <Field label="About" htmlFor="bio" optional hint="Your story, what you're looking for, and who you'd love to meet.">
        <textarea
          id="bio"
          className="input"
          rows={5}
          maxLength={900}
          value={draft.bio}
          onChange={(e) => set({ bio: e.target.value })}
        />
      </Field>
      <div className="subcard">
        <p className="subcard__title">A project you&apos;re working on</p>
        <Field label="Name" htmlFor="pname" optional>
          <input id="pname" className="input" value={project.name} onChange={(e) => setProject({ name: e.target.value })} placeholder="Buddy Up" />
        </Field>
        <Field label="One line about it" htmlFor="pdesc" optional>
          <input
            id="pdesc"
            className="input"
            value={project.description}
            onChange={(e) => setProject({ description: e.target.value })}
            placeholder="Pairs students with isolated seniors for weekly visits."
          />
        </Field>
      </div>
      <LoomField value={draft.loomUrl ?? ""} onChange={(loomUrl) => set({ loomUrl: loomUrl || undefined })} name={draft.name} />
    </div>
  );
}

export function LinksSection({ draft, set }: { draft: Viewer; set: SetDraft }) {
  const { integrations, session } = useJumpIn();
  const igLinked = session?.linked.instagram;
  const canConnectIg = integrations.instagram && session?.provider !== "demo";
  return (
    <div className="form-stack">
      <Field label="Email" htmlFor="email" hint={<><Icon name="shield" size={13} /> Private. Used for invites and reminders, never shown to other members.</>}>
        <input
          id="email"
          type="email"
          className="input"
          value={draft.email}
          onChange={(e) => set({ email: e.target.value })}
          autoComplete="email"
          placeholder="you@example.com"
        />
      </Field>
      <Field label="LinkedIn" htmlFor="li" optional hint={draft.verified ? "Your identity is verified with LinkedIn." : "Paste your profile URL so people can see more context."}>
        <div className="input-with-icon">
          <LinkedInMark size={18} />
          <input
            id="li"
            className="input"
            value={draft.linkedinUrl ?? ""}
            onChange={(e) => set({ linkedinUrl: e.target.value || undefined })}
            placeholder="linkedin.com/in/yourname"
            inputMode="url"
          />
        </div>
      </Field>
      <Field
        label="Instagram"
        htmlFor="ig"
        optional
        hint={
          igLinked
            ? `Connected as @${session?.instagramHandle}.`
            : canConnectIg
              ? "Connect to verify your handle (Business or Creator accounts), or just paste it."
              : "Paste your handle or profile URL."
        }
      >
        <div className="input-with-icon">
          <InstagramMark size={18} />
          <input
            id="ig"
            className="input"
            value={draft.instagramUrl ?? ""}
            onChange={(e) => set({ instagramUrl: e.target.value || undefined })}
            placeholder="@yourhandle"
          />
          {canConnectIg && !igLinked && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => authService.connectInstagram("/me")}>
              Connect
            </button>
          )}
        </div>
      </Field>
      <Field label="Website" htmlFor="web" optional>
        <div className="input-with-icon">
          <Icon name="globe" size={18} />
          <input
            id="web"
            className="input"
            value={draft.websiteUrl ?? ""}
            onChange={(e) => set({ websiteUrl: e.target.value || undefined })}
            placeholder="yourproject.org"
            inputMode="url"
          />
        </div>
      </Field>
    </div>
  );
}
