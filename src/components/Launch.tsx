"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/services/http";
import { LIVE } from "@/lib/supabase/config";
import { firstName } from "@/lib/availability";
import { actions, useJumpIn, useNow } from "@/lib/store";
import type { AppAccess } from "@/lib/types";
import { Dialog } from "./Dialog";
import { Icon, JumpInLogo } from "./Icon";

/** "3d 04h 12m" → the time left until launch, or null if no date / passed. */
export function timeLeft(launchAt: string | null, now: number) {
  if (!launchAt) return null;
  const ms = Date.parse(launchAt) - now;
  if (!(ms > 0)) return null;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { d, h, m, s: sec, label: d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}h ${pad(m)}m ${pad(sec)}s` };
}

export function launchDateLabel(launchAt: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(
    Date.parse(launchAt),
  );
}

/** Before launch, members are onboarded but calls are off. */
export function isPreLaunch(access: AppAccess) {
  return access.live && !access.open;
}

/** The strip across the top of the app until launch. */
export function LaunchBanner() {
  const { access } = useJumpIn();
  const now = useNow(1000);
  // People still waiting for approval see their own holding screen instead.
  if (!isPreLaunch(access) || (access.membership !== "approved" && !access.admin)) return null;
  const left = timeLeft(access.launchAt, now);
  return (
    <div className="launch-banner" role="status">
      <div className="launch-banner__inner container">
        <span className="launch-banner__tag">Onboarding</span>
        <span className="launch-banner__text">
          {left ? (
            <>
              JumpIn opens in <strong className="launch-banner__clock">{left.label}</strong>. Finish your profile, and
              practise in the demo.
            </>
          ) : (
            <>Calls open at launch. Finish your profile, and practise in the demo while you wait.</>
          )}
          {access.admin && <span className="launch-banner__admin"> You can test calls as the founder.</span>}
        </span>
        <PracticeButton className="btn btn--light btn--sm" />
      </div>
    </div>
  );
}

export function PracticeButton({ className = "btn btn--outline" }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      className={className}
      onClick={async () => {
        await actions.signInDemo();
        router.push("/discover");
      }}
    >
      <Icon name="play" size={15} /> Practise in the demo
    </button>
  );
}

/** Shown instead of a call when calls aren't open yet. */
export function LaunchDialog({ name, onClose }: { name: string; onClose: () => void }) {
  const { access } = useJumpIn();
  const now = useNow(1000);
  const left = timeLeft(access.launchAt, now);
  return (
    <Dialog open onClose={onClose} label="Calls open at launch" size="sm">
      <div className="confirm launch-dialog">
        <span className="launch-dialog__mark" aria-hidden="true">
          <Icon name="timer" size={26} />
        </span>
        <h2 className="confirm__title">Calls open at launch</h2>
        <p>
          {left ? (
            <>
              JumpIn goes live in <strong>{left.label}</strong>
              {access.launchAt && <> ({launchDateLabel(access.launchAt)})</>}. Then you can jump in with{" "}
              {firstName(name)}.
            </>
          ) : (
            <>We&apos;re onboarding members one by one. You&apos;ll get an email the moment calls open.</>
          )}
        </p>
        <p>Until then, try the whole thing with practice members in the demo.</p>
        <div className="confirm__actions">
          <button className="btn btn--ghost" onClick={onClose}>
            Got it
          </button>
          <PracticeButton className="btn btn--jump" />
        </div>
      </div>
    </Dialog>
  );
}

/** Signed in, but not approved yet. */
export function WaitlistPanel() {
  const { viewer, access } = useJumpIn();
  const first = viewer ? firstName(viewer.name) : "there";
  const suspended = access.membership === "suspended";
  return (
    <div className="container page page--narrow">
      <div className="waitlist">
        <JumpInLogo size={44} />
        {suspended ? (
          <>
            <h1 className="waitlist__title">Your account is paused</h1>
            <p className="waitlist__copy">Get in touch with the JumpIn team if you think this is a mistake.</p>
          </>
        ) : (
          <>
            <h1 className="waitlist__title">You&apos;re on the list, {first}.</h1>
            <p className="waitlist__copy">
              JumpIn is a curated network, so we onboard people one at a time. We&apos;ll be in touch to welcome you
              in. Your profile is saved, and you can keep polishing it.
            </p>
            <div className="waitlist__actions">
              <Link href="/me" className="btn btn--jump">
                <Icon name="user" size={16} /> Polish my profile
              </Link>
              <PracticeButton />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** The public launch date, for the landing page (no sign-in needed). */
export function usePublicLaunch() {
  const [launch, setLaunch] = useState<Pick<AppAccess, "launchAt" | "open"> | null>(null);
  useEffect(() => {
    if (!LIVE) return;
    api<AppAccess>("/api/app-state")
      .then((a) => setLaunch({ launchAt: a.launchAt, open: a.open }))
      .catch(() => setLaunch(null));
  }, []);
  return launch;
}

/** "Opens Monday, November 2 · 6d 04h 12m" on the landing page. */
export function LaunchCountdownLine() {
  const launch = usePublicLaunch();
  const now = useNow(1000);
  if (!launch || launch.open || !launch.launchAt) return null;
  const left = timeLeft(launch.launchAt, now);
  if (!left) return null;
  return (
    <p className="launch-line" role="status">
      <Icon name="timer" size={16} /> Opens {launchDateLabel(launch.launchAt)} · <strong>{left.label}</strong>
    </p>
  );
}
