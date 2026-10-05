"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar, Portrait } from "@/components/Avatar";
import { GoogleMark, Icon, InstagramMark, JumpInLogo, LinkedInMark } from "@/components/Icon";
import { photo, SCENE_PHOTOS, unsplash } from "@/lib/data/photos";
import { buildSeedMembers } from "@/lib/data/seed";
import { authService } from "@/lib/services/authService";
import { actions, useJumpIn } from "@/lib/store";

const SEED = buildSeedMembers();
const byId = (id: string) => SEED.find((m) => m.id === id)!;
const DEMO_AVATAR = unsplash("1595211877493-41a4e5f236b3");

const SLIDES = [
  {
    key: "people",
    title: "PEOPLE",
    copy: "Find amazing people that want to make a positive impact in the world. Change-makers, story-tellers, mentors, and collaborators that are looking for the good.",
  },
  {
    key: "now",
    title: "RIGHT NOW",
    copy: "See who's open to talk this minute and jump straight into a Google Meet. No connection requests. No calendar ping-pong. Just a conversation.",
  },
  {
    key: "trust",
    title: "TRUST",
    copy: "A private network of verified people. Your email stays private, and you decide who can jump in with you, and when.",
  },
] as const;

export default function Landing() {
  const { ready, session, viewer, integrations } = useJumpIn();
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const joinRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % SLIDES.length), 6500);
    return () => clearInterval(t);
  }, [paused]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get("auth");
    const provider = params.get("provider");
    const name = provider ? provider[0].toUpperCase() + provider.slice(1) : "That provider";
    if (auth === "not-configured") setNotice(`${name} sign-in isn't configured on this server yet, so use the demo for now.`);
    if (auth === "error") setNotice(`${name} sign-in didn't complete (${params.get("reason") ?? "unknown error"}). Try again or use the demo.`);
  }, []);

  const signedIn = ready && session && viewer;
  const go = () => joinRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const startDemo = async () => {
    setBusy(true);
    await actions.signInDemo();
    router.push("/discover");
  };

  const startFresh = async () => {
    setBusy(true);
    await actions.signInDemoFresh();
    router.push("/onboarding");
  };

  const current = SLIDES[slide];

  return (
    <div className="landing">
      <section
        className="hero"
        style={{ backgroundImage: `url(${photo(SCENE_PHOTOS.heroSelfie, 2000)})` }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="hero__shade" />
        <header className="hero__nav container">
          <span className="brand brand--light">
            <JumpInLogo size={32} />
            <span>JumpIn</span>
          </span>
          {signedIn ? (
            <Link href="/discover" className="btn btn--light btn--sm">
              Open JumpIn <Icon name="arrowRight" size={15} />
            </Link>
          ) : (
            <button className="btn btn--light btn--sm" onClick={go}>
              Sign in
            </button>
          )}
        </header>

        <div className="hero__body container">
          <div className="hero__copy" aria-live="polite">
            <p className="hero__kicker">A private network for people building a better world</p>
            <h1 key={current.key} className="hero__title">
              {current.title}
            </h1>
            <p key={`${current.key}-copy`} className="hero__text">
              {current.copy}
            </p>
            <button className="btn btn--go" onClick={signedIn ? () => router.push("/discover") : go}>
              GO
            </button>
          </div>

          <div className="hero__stage" aria-hidden="true">
            <div className={`stage stage--${current.key}`} key={current.key}>
              {current.key === "people" && (
                <>
                  <figure className="stage__card stage__card--main">
                    <Portrait name="Ally" src={byId("ally").avatarUrl} width={520} height={660} priority />
                  </figure>
                  <figure className="stage__card stage__card--side">
                    <Portrait name="Volunteers" src={SCENE_PHOTOS.beachCleanup} width={420} height={560} />
                  </figure>
                  <figure className="stage__card stage__card--far">
                    <Portrait name="Garden" src={SCENE_PHOTOS.communityGarden} width={320} height={460} />
                  </figure>
                </>
              )}
              {current.key === "now" && <StageLiveCard />}
              {current.key === "trust" && <StageLegend />}
            </div>
          </div>
        </div>

        <div className="hero__dots" role="tablist" aria-label="About JumpIn">
          {SLIDES.map((s, i) => (
            <button
              key={s.key}
              role="tab"
              aria-selected={i === slide}
              aria-label={s.title}
              className={`hero__dot ${i === slide ? "hero__dot--on" : ""}`}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>
      </section>

      <section className="how container" aria-labelledby="how">
        <h2 id="how" className="how__title">
          Less networking. <span>More talking.</span>
        </h2>
        <ol className="how__steps">
          <li>
            <span className="how__icon how__icon--open">
              <Icon name="unlock" size={22} />
            </span>
            <h3>See who&apos;s open</h3>
            <p>Every profile shows whether that person is free right now, and for how long.</p>
          </li>
          <li>
            <span className="how__icon how__icon--video">
              <Icon name="video" size={22} />
            </span>
            <h3>Jump in</h3>
            <p>One click creates a Google Meet. The first time, a short note goes along with it.</p>
          </li>
          <li>
            <span className="how__icon how__icon--cal">
              <Icon name="calendar" size={22} />
            </span>
            <h3>Or find a time</h3>
            <p>Not free now? Book a slot from their hours, checked against your calendar.</p>
          </li>
        </ol>
      </section>

      <section className="join" id="join" ref={joinRef} aria-labelledby="join-title">
        <div className="join__card">
          <JumpInLogo size={44} />
          <h2 id="join-title" className="join__title">
            {signedIn ? `Welcome back, ${viewer!.name.split(" ")[0]}` : "Join JumpIn"}
          </h2>
          <p className="join__sub">
            {signedIn
              ? "Pick up where you left off."
              : "Verified with LinkedIn so everyone here is a real person. Your email is never shown to other members."}
          </p>

          {notice && <p className="callout callout--warn">{notice}</p>}

          {signedIn ? (
            <Link href="/discover" className="btn btn--jump btn--wide btn--lg">
              Meet someone interesting <Icon name="arrowRight" size={18} />
            </Link>
          ) : (
            <div className="auth-buttons">
              <button
                className="btn btn--linkedin btn--wide btn--lg"
                onClick={() => authService.continueWithLinkedIn()}
                disabled={!integrations.linkedin}
              >
                <LinkedInMark size={20} /> Continue with LinkedIn
              </button>
              <button
                className="btn btn--outline btn--wide btn--lg"
                onClick={() => authService.continueWithGoogle()}
                disabled={!integrations.google}
              >
                <GoogleMark size={20} /> Continue with Google
              </button>
              {(!integrations.linkedin || !integrations.google) && (
                <p className="setup-note">
                  {!integrations.linkedin && !integrations.google
                    ? "LinkedIn and Google sign-in need credentials"
                    : `${!integrations.linkedin ? "LinkedIn" : "Google"} sign-in needs credentials`}{" "}
                  (see <code>.env.example</code>). Until then:
                </p>
              )}
              <div className="divider">
                <span>or</span>
              </div>
              <button className="btn btn--jump btn--wide btn--lg" onClick={startDemo} disabled={busy}>
                {busy ? <span className="spinner" /> : <Avatar name="John Ellis" src={DEMO_AVATAR} size={26} />}
                Explore the demo as John
              </button>
              <button className="link-quiet link-quiet--center" onClick={startFresh} disabled={busy}>
                Or try onboarding with a blank profile
              </button>
              <p className="fine-print fine-print--center">
                Demo mode uses seeded members and stores everything in this browser. No accounts needed.
              </p>
            </div>
          )}
          <p className="join__ig">
            <InstagramMark size={16} /> You can also connect Instagram after you join.
          </p>
        </div>
      </section>

      <footer className="footer container">
        <span className="brand">
          <JumpInLogo size={22} /> <span>JumpIn</span>
        </span>
        <span>A prototype. Built for people building a better world.</span>
      </footer>
    </div>
  );
}


function StageLiveCard() {
  const m = byId("maddison");
  return (
    <div className="stage__live">
      <div className="lcard lcard--static">
        <div className="lcard__body">
          <div className="lcard__head">
            <span className="lcard__name">
              Maddison <span className="lcard__flag">🇬🇧</span>
            </span>
            <Avatar name={m.name} src={m.avatarUrl} size={48} ring online="online" />
          </div>
          <p className="lcard__headline">{m.headline}</p>
          <div className="lcard__cta">
            <span className="btn btn--jump btn--sm">
              <Icon name="video" size={16} /> Jump In
            </span>
            <span className="lcard__timer">
              1:30:00 <Icon name="timer" size={17} />
            </span>
          </div>
        </div>
        <footer className="lcard__foot">
          <span className="lcard__go">
            <Icon name="arrowRight" size={18} />
          </span>
          <span className="lcard__tags">
            {["Connection", "Story", "Kindness"].map((t) => (
              <span key={t} className="tag tag--mint tag--xs">
                {t}
              </span>
            ))}
          </span>
        </footer>
      </div>
      <div className="stage__toast">
        <span className="sent-mark sent-mark--sm">
          <Icon name="check" size={14} />
        </span>
        Maddison said yes. Joining Meet…
      </div>
    </div>
  );
}

function StageLegend() {
  const rows: Array<[ReactNode, string, string]> = [
    [<Icon key="u" name="unlock" size={26} />, "Open to JumpIn", "Free to talk right now"],
    [<Icon key="l" name="lock" size={26} />, "Not available", "Heads down. Book a time instead"],
    [<Icon key="t" name="timer" size={26} />, "Availability timer", "How long they're open for"],
    [<Icon key="v" name="video" size={26} />, "Jump In", "Instant Google Meet"],
    [<Icon key="c" name="calendar" size={26} />, "Schedule", "Pick from their hours"],
  ];
  return (
    <div className="legend-card">
      {rows.map(([icon, title, sub]) => (
        <div key={title} className="legend-card__row">
          <span className="legend-card__icon">{icon}</span>
          <span>
            <strong>{title}</strong>
            <span>{sub}</span>
          </span>
        </div>
      ))}
      <div className="legend-card__row legend-card__row--dots">
        <span className="presence-dot presence-dot--online presence-dot--inline" /> Online
        <span className="presence-dot presence-dot--offline presence-dot--inline" /> Offline
      </div>
    </div>
  );
}
