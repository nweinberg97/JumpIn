"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, JumpInLogo } from "@/components/Icon";
import { CardPreview } from "@/components/profile/CardPreview";
import { finalizeProfile, isEmail } from "@/components/profile/finalize";
import { CaresSection, IdentitySection, LinksSection, WorkSection } from "@/components/profile/ProfileSections";
import { StatusControl } from "@/components/StatusControl";
import { WeeklyEditor } from "@/components/WeeklyEditor";
import { actions, useJumpIn } from "@/lib/store";
import { POLICY_COPY } from "@/lib/policy";
import type { JumpInPolicy, Viewer } from "@/lib/types";

const STEPS = [
  { key: "you", title: "Who are you?", sub: "A face and a sentence. That's most of it." },
  { key: "cares", title: "What do you care about?", sub: "This is how JumpIn finds people you'll click with." },
  { key: "work", title: "What are you working on?", sub: "Give people something to ask you about." },
  { key: "links", title: "Where else can people find you?", sub: "All optional except email, which stays private." },
  { key: "avail", title: "When can people jump in?", sub: "You can change this any time from the top of every page." },
] as const;


export default function Onboarding() {
  const { ready, session, viewer } = useJumpIn();
  const router = useRouter();
  const [draft, setDraft] = useState<Viewer | null>(null);
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!session || !viewer) router.replace("/");
    else if (!draft) setDraft(viewer);
  }, [ready, session, viewer, draft, router]);

  if (!draft) {
    return (
      <div className="boot">
        <JumpInLogo size={40} />
      </div>
    );
  }

  const set = (patch: Partial<Viewer>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const problems: string[] = [];
  if (step === 0) {
    if (!draft.name.trim()) problems.push("Add your name.");
    if (!draft.headline.trim()) problems.push("Add a one-liner so people know who you are.");
  }
  if (step === 1 && !draft.impactAreas.length) problems.push("Pick at least one impact area.");
  if (step === 3 && !isEmail(draft.email)) problems.push("Add a valid email. It's never shown to anyone.");

  const next = async () => {
    setTried(true);
    if (problems.length) return;
    setTried(false);
    const saved = finalizeProfile(draft);
    if (step < STEPS.length - 1) {
      const keep = { ...saved, availability: viewer?.availability ?? saved.availability };
      await actions.updateViewer(keep);
      setDraft(keep);
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      await actions.updateViewer({
        ...saved,
        availability: viewer?.availability ?? saved.availability,
        onboarded: true,
        joinedAt: new Date().toISOString(),
      });
      router.push("/discover");
    }
  };

  const current = STEPS[step];

  return (
    <div className="onboarding">
      <header className="onboarding__top">
        <span className="brand">
          <JumpInLogo size={28} /> <span>JumpIn</span>
        </span>
        <ol className="progress" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s.key} className={`progress__step ${i < step ? "progress__step--done" : ""} ${i === step ? "progress__step--on" : ""}`}>
              <span className="sr-only">
                Step {i + 1}: {s.title}
              </span>
            </li>
          ))}
        </ol>
        <span className="onboarding__count">
          {step + 1} of {STEPS.length}
        </span>
      </header>

      <div className="onboarding__grid">
        <section className="onboarding__form">
          <h1 className="onboarding__title">{current.title}</h1>
          <p className="onboarding__sub">{current.sub}</p>

          {step === 0 && <IdentitySection draft={draft} set={set} />}
          {step === 1 && <CaresSection draft={draft} set={set} />}
          {step === 2 && <WorkSection draft={draft} set={set} />}
          {step === 3 && <LinksSection draft={draft} set={set} />}
          {step === 4 && (
            <div className="form-stack">
              <div className="field">
                <span className="field__label">Right now</span>
                {viewer && <StatusControl viewer={viewer} />}
                <p className="field__hint">Saved instantly.</p>
              </div>
              <div className="field">
                <span className="field__label">Weekly hours for scheduled JumpIns</span>
                <WeeklyEditor value={draft.weeklyAvailability} onChange={(weeklyAvailability) => set({ weeklyAvailability })} />
              </div>
              <div className="field">
                <span className="field__label">Who can jump in with you instantly?</span>
                <div className="radio-cards">
                  {(Object.keys(POLICY_COPY) as JumpInPolicy[]).map((p) => (
                    <label key={p} className={`radio-card ${draft.jumpInPolicy === p ? "radio-card--on" : ""}`}>
                      <input type="radio" name="policy" checked={draft.jumpInPolicy === p} onChange={() => set({ jumpInPolicy: p })} />
                      <strong>{POLICY_COPY[p].title}</strong>
                      <span>{POLICY_COPY[p].sub}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tried && problems.length > 0 && (
            <div className="callout callout--warn" role="alert">
              {problems.join(" ")}
            </div>
          )}

          <div className="onboarding__nav">
            {step > 0 ? (
              <button className="btn btn--ghost" onClick={() => setStep(step - 1)}>
                <Icon name="arrowLeft" size={16} /> Back
              </button>
            ) : (
              <span />
            )}
            <button className="btn btn--jump btn--lg" onClick={next}>
              {step === STEPS.length - 1 ? "Start meeting people" : "Continue"} <Icon name="arrowRight" size={18} />
            </button>
          </div>
        </section>

        <aside className="onboarding__preview">
          <CardPreview draft={{ ...draft, availability: viewer?.availability ?? draft.availability }} />
        </aside>
      </div>
    </div>
  );
}
