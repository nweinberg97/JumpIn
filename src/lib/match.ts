import type { Member } from "./types";

const norm = (s: string) => s.trim().toLowerCase();

function overlap(a: string[], b: string[]) {
  const set = new Set(a.map(norm));
  return b.filter((x) => set.has(norm(x)));
}

export interface SharedGround {
  impactAreas: string[];
  interests: string[];
  skills: string[];
  score: number;
}

/** What two people have in common, weighted towards shared causes. */
export function sharedGround(viewer: Member, other: Member): SharedGround {
  const impactAreas = overlap(viewer.impactAreas, other.impactAreas);
  const interests = overlap(viewer.interests, other.interests);
  const skills = overlap(viewer.skills, other.skills);
  return {
    impactAreas,
    interests,
    skills,
    score: impactAreas.length * 3 + interests.length * 2 + skills.length,
  };
}

/** "You both care about Climate + Community" */
export function sharedLine(shared: SharedGround): string | null {
  if (shared.impactAreas.length) {
    return `You both care about ${shared.impactAreas.slice(0, 2).join(" + ")}`;
  }
  if (shared.interests.length) {
    return `You're both into ${shared.interests.slice(0, 2).join(" + ")}`;
  }
  return null;
}

/** Free-text search across everything a person might be found by. */
export function matchesQuery(member: Member, query: string) {
  const q = norm(query);
  if (!q) return true;
  const haystack = [
    member.name,
    member.headline,
    member.whatIDo,
    member.bio,
    member.city,
    ...member.interests,
    ...member.impactAreas,
    ...member.skills,
    ...member.projects.flatMap((p) => [p.name, p.description]),
  ]
    .join(" \u0001 ")
    .toLowerCase();
  return q.split(/\s+/).every((term) => haystack.includes(term));
}

/** "GB" → 🇬🇧 */
export function flagEmoji(countryCode: string) {
  if (!/^[A-Za-z]{2}$/.test(countryCode)) return "";
  return countryCode
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}
