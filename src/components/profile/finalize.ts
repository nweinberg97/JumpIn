import type { Viewer } from "@/lib/types";
import { normaliseSocial } from "./Fields";

/** Tidy a profile draft before saving: trim text, normalise links. */
export function finalizeProfile(draft: Viewer): Viewer {
  const opt = (v?: string) => (v && v.trim() ? v.trim() : undefined);
  return {
    ...draft,
    name: draft.name.trim(),
    headline: draft.headline.trim(),
    whatIDo: draft.whatIDo.trim(),
    bio: draft.bio.trim(),
    city: draft.city.trim(),
    email: draft.email.trim(),
    linkedinUrl: opt(draft.linkedinUrl) && normaliseSocial("linkedin", draft.linkedinUrl!),
    instagramUrl: opt(draft.instagramUrl) && normaliseSocial("instagram", draft.instagramUrl!),
    websiteUrl: opt(draft.websiteUrl) && normaliseSocial("web", draft.websiteUrl!),
    loomUrl: opt(draft.loomUrl),
    projects: draft.projects.filter((p) => p.name.trim() || p.description.trim()),
  };
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
