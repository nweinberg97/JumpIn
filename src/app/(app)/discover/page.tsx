"use client";

import { useMemo, useState } from "react";
import { LiveCard } from "@/components/cards/LiveCard";
import { PhotoCard } from "@/components/cards/PhotoCard";
import { Icon } from "@/components/Icon";
import { effectiveStatus, firstName } from "@/lib/availability";
import { matchesQuery, sharedGround } from "@/lib/match";
import { useJumpIn, useNow, visibleMembers } from "@/lib/store";
import type { Member } from "@/lib/types";

interface Filters {
  openNow: boolean;
  onlineNow: boolean;
  impactAreas: string[];
  interests: string[];
  skills: string[];
  city: string;
}

const EMPTY: Filters = { openNow: false, onlineNow: false, impactAreas: [], interests: [], skills: [], city: "" };
const NEW_DAYS = 14;

function topValues(members: Member[], pick: (m: Member) => string[], limit: number) {
  const counts = new Map<string, number>();
  members.forEach((m) => pick(m).forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1)));
  // Shared tags first (they're the useful filters), then fill with the rest.
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const common = sorted.filter(([, n]) => n > 1);
  return (common.length >= 6 ? common : sorted).slice(0, limit).map(([v]) => v);
}

export default function DiscoverPage() {
  const state = useJumpIn();
  const { viewer } = state;
  const now = useNow(30_000);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [showFilters, setShowFilters] = useState(false);

  const members = visibleMembers(state);

  const scored = useMemo(
    () =>
      members
        .map((m) => ({ m, score: viewer ? sharedGround(viewer, m).score : 0 }))
        .sort((a, b) => b.score - a.score),
    [members, viewer],
  );

  const facets = useMemo(
    () => ({
      impactAreas: topValues(members, (m) => m.impactAreas, 9),
      interests: topValues(members, (m) => m.interests, 12),
      skills: topValues(members, (m) => m.skills, 10),
      cities: [...new Set(members.map((m) => m.city))].sort(),
    }),
    [members],
  );

  const activeCount =
    Number(filters.openNow) +
    Number(filters.onlineNow) +
    filters.impactAreas.length +
    filters.interests.length +
    filters.skills.length +
    Number(Boolean(filters.city));
  const searching = query.trim().length > 0 || activeCount > 0;

  const results = useMemo(() => {
    if (!searching) return [];
    const has = (list: string[], wanted: string[]) =>
      wanted.every((w) => list.some((x) => x.toLowerCase() === w.toLowerCase()));
    return scored
      .map((s) => s.m)
      .filter((m) => matchesQuery(m, query))
      .filter((m) => !filters.openNow || effectiveStatus(m, now) === "open")
      .filter((m) => !filters.onlineNow || m.onlineStatus === "online")
      .filter((m) => has(m.impactAreas, filters.impactAreas))
      .filter((m) => has(m.interests, filters.interests))
      .filter((m) => has(m.skills, filters.skills))
      .filter((m) => !filters.city || m.city === filters.city)
      .sort((a, b) => Number(effectiveStatus(b, now) === "open") - Number(effectiveStatus(a, now) === "open"));
  }, [searching, scored, query, filters, now]);

  const openNow = scored.filter((s) => effectiveStatus(s.m, now) === "open").map((s) => s.m);
  // Each person appears in one grid section only.
  const recommended = scored.filter((s) => s.score > 0).slice(0, 8).map((s) => s.m);
  const shown = new Set(recommended.map((m) => m.id));
  const newcomers = [...members]
    .filter((m) => !shown.has(m.id) && now - Date.parse(m.joinedAt) < NEW_DAYS * 86_400_000)
    .sort((a, b) => Date.parse(b.joinedAt) - Date.parse(a.joinedAt));
  newcomers.forEach((m) => shown.add(m.id));
  const everyoneElse = scored.map((s) => s.m).filter((m) => !shown.has(m.id));

  const toggle = (key: "impactAreas" | "interests" | "skills", value: string) =>
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  return (
    <div className="discover">
      <section className="discover-hero">
        <div className="container">
          <h1 className="discover-hero__title">
            <span>Find</span> Changemakers.
          </h1>
          <p className="discover-hero__sub">
            {viewer ? `Who should you meet today, ${firstName(viewer.name)}?` : "Who should you meet today?"}
            {openNow.length > 0 && (
              <>
                {" "}
                <strong>{openNow.length} people are open to JumpIn right now.</strong>
              </>
            )}
          </p>

          <div className="searchbar">
            <Icon name="search" size={20} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people, causes, skills, projects…"
              aria-label="Search people"
            />
            <button
              className={`searchbar__filter ${showFilters || activeCount ? "searchbar__filter--on" : ""}`}
              onClick={() => setShowFilters((s) => !s)}
              aria-expanded={showFilters}
              aria-controls="filters"
            >
              <Icon name="sliders" size={19} />
              <span className="sr-only">Filters</span>
              {activeCount > 0 && <span className="count-dot">{activeCount}</span>}
            </button>
          </div>

          <div className="quick-filters">
            <button
              className={`chip chip--onblue ${filters.openNow ? "chip--on" : ""}`}
              onClick={() => setFilters((f) => ({ ...f, openNow: !f.openNow }))}
              aria-pressed={filters.openNow}
            >
              <Icon name="unlock" size={14} /> Open to JumpIn now
            </button>
            <button
              className={`chip chip--onblue ${filters.onlineNow ? "chip--on" : ""}`}
              onClick={() => setFilters((f) => ({ ...f, onlineNow: !f.onlineNow }))}
              aria-pressed={filters.onlineNow}
            >
              <span className="presence-dot presence-dot--online presence-dot--inline" /> Online now
            </button>
            {facets.impactAreas.slice(0, 5).map((a) => (
              <button
                key={a}
                className={`chip chip--onblue ${filters.impactAreas.includes(a) ? "chip--on" : ""}`}
                onClick={() => toggle("impactAreas", a)}
                aria-pressed={filters.impactAreas.includes(a)}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </section>

      {showFilters && (
        <section id="filters" className="filters container" aria-label="Filters">
          <FilterGroup title="Impact area" values={facets.impactAreas} selected={filters.impactAreas} onToggle={(v) => toggle("impactAreas", v)} />
          <FilterGroup title="Interests" values={facets.interests} selected={filters.interests} onToggle={(v) => toggle("interests", v)} />
          <FilterGroup title="Skills" values={facets.skills} selected={filters.skills} onToggle={(v) => toggle("skills", v)} />
          <div className="filter-group">
            <label className="filter-group__title" htmlFor="city">
              Location
            </label>
            <select
              id="city"
              className="input input--select"
              value={filters.city}
              onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
            >
              <option value="">Anywhere</option>
              {facets.cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="filters__foot">
            <button className="btn btn--ghost btn--sm" onClick={() => setFilters(EMPTY)} disabled={!activeCount}>
              Clear filters
            </button>
            <button className="btn btn--primary btn--sm" onClick={() => setShowFilters(false)}>
              Show {searching ? results.length : members.length} people
            </button>
          </div>
        </section>
      )}

      <div className="container discover__body">
        {searching ? (
          <section className="section">
            <header className="section__head">
              <h2 className="section__title">
                {results.length} {results.length === 1 ? "person" : "people"}
              </h2>
              <button
                className="link-quiet"
                onClick={() => {
                  setQuery("");
                  setFilters(EMPTY);
                }}
              >
                Clear search
              </button>
            </header>
            {results.length ? (
              <div className="card-grid">
                {results.map((m) => (
                  <PhotoCard key={m.id} member={m} />
                ))}
              </div>
            ) : (
              <div className="empty">
                <p className="empty__title">No one matches that yet.</p>
                <p>Try a broader cause like &ldquo;Climate&rdquo; or &ldquo;Community&rdquo;, or turn off a filter.</p>
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="section" aria-labelledby="open-now">
              <header className="section__head">
                <h2 className="section__title" id="open-now">
                  <span className="live-dot" aria-hidden="true" /> Open to JumpIn now
                </h2>
                <p className="section__hint">No requests, no back-and-forth. Click and talk.</p>
              </header>
              {openNow.length ? (
                <div className="live-row">
                  {openNow.map((m) => (
                    <LiveCard key={m.id} member={m} />
                  ))}
                </div>
              ) : (
                <div className="empty empty--slim">Nobody is open this minute. Schedule a JumpIn with anyone below.</div>
              )}
            </section>

            {recommended.length > 0 && (
              <section className="section" aria-labelledby="recommended">
                <header className="section__head">
                  <h2 className="section__title" id="recommended">
                    People you might want to meet
                  </h2>
                  <p className="section__hint">Based on the causes, interests and skills you share.</p>
                </header>
                <div className="card-grid">
                  {recommended.map((m, i) => (
                    <PhotoCard key={m.id} member={m} priority={i < 3} />
                  ))}
                </div>
              </section>
            )}

            {newcomers.length > 0 && (
              <section className="section" aria-labelledby="new">
                <header className="section__head">
                  <h2 className="section__title" id="new">
                    New to JumpIn
                  </h2>
                  <p className="section__hint">Joined in the last two weeks. Say hi.</p>
                </header>
                <div className="card-grid card-grid--compact">
                  {newcomers.map((m) => (
                    <PhotoCard key={m.id} member={m} />
                  ))}
                </div>
              </section>
            )}

            {everyoneElse.length > 0 && (
              <section className="section" aria-labelledby="everyone">
                <header className="section__head">
                  <h2 className="section__title" id="everyone">
                    More of the community
                  </h2>
                </header>
                <div className="card-grid">
                  {everyoneElse.map((m) => (
                    <PhotoCard key={m.id} member={m} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  values,
  selected,
  onToggle,
}: {
  title: string;
  values: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="filter-group">
      <p className="filter-group__title">{title}</p>
      <div className="chip-row">
        {values.map((v) => (
          <button
            key={v}
            className={`chip ${selected.includes(v) ? "chip--on" : ""}`}
            onClick={() => onToggle(v)}
            aria-pressed={selected.includes(v)}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
