"use client";

import { useEffect, useState } from "react";
import { GoogleMark, Icon } from "@/components/Icon";
import { StatusControl } from "@/components/StatusControl";
import { DemoBadge } from "@/components/Tags";
import { useToast } from "@/components/Toast";
import { WeeklyEditor } from "@/components/WeeklyEditor";
import { POLICY_COPY } from "@/lib/policy";
import { googleService } from "@/lib/services/googleService";
import { actions, useJumpIn } from "@/lib/store";
import { cityFromTimeZone, timeZoneLabel } from "@/lib/time";
import type { JumpInPolicy, WeeklySlot } from "@/lib/types";

export default function AvailabilityPage() {
  const { viewer, session, integrations } = useJumpIn();
  const toast = useToast();
  const [weekly, setWeekly] = useState<WeeklySlot[] | null>(null);

  useEffect(() => {
    if (viewer && !weekly) setWeekly(viewer.weeklyAvailability);
  }, [viewer, weekly]);

  if (!viewer || !weekly) return null;

  const weeklyDirty = JSON.stringify(weekly) !== JSON.stringify(viewer.weeklyAvailability);
  const realGoogle = Boolean(session?.linked.google);
  const connected = viewer.calendarConnected;

  const connect = () => {
    if (integrations.google) googleService.connectCalendar("/availability");
    else {
      actions.updateViewer({ calendarConnected: true });
      toast("Demo calendar connected");
    }
  };

  return (
    <div className="container page page--narrow">
      <div className="page-head">
        <div>
          <p className="eyebrow">Availability</p>
          <h1 className="page-title">My JumpIn availability</h1>
          <p className="page-sub">Set it once. Your calendar keeps it honest.</p>
        </div>
      </div>

      <section className="panel">
        <header className="panel__head">
          <h2 className="panel__title">Right now</h2>
          <span className="panel__hint">Also in the top bar on every page</span>
        </header>
        <StatusControl viewer={viewer} />
      </section>

      <section className="panel">
        <header className="panel__head">
          <h2 className="panel__title">Weekly hours</h2>
          <span className="panel__hint">
            <Icon name="globe" size={14} /> {cityFromTimeZone(viewer.timezone)} · {timeZoneLabel(viewer.timezone)}
          </span>
        </header>
        <p className="panel__copy">When people can schedule a 30-minute JumpIn with you.</p>
        <WeeklyEditor value={weekly} onChange={setWeekly} />
        <div className="panel__foot">
          <button className="btn btn--ghost btn--sm" disabled={!weeklyDirty} onClick={() => setWeekly(viewer.weeklyAvailability)}>
            Reset
          </button>
          <button
            className="btn btn--primary btn--sm"
            disabled={!weeklyDirty}
            onClick={async () => {
              await actions.updateViewer({ weeklyAvailability: weekly });
              toast("Weekly hours saved");
            }}
          >
            Save hours
          </button>
        </div>
      </section>

      <section className="panel">
        <header className="panel__head">
          <h2 className="panel__title">Calendar</h2>
        </header>
        <div className={`calendar-card ${connected ? "calendar-card--on" : ""}`}>
          <GoogleMark size={28} />
          <div className="calendar-card__text">
            <strong>{connected ? "Google Calendar connected" : "Connect Google Calendar"}</strong>
            <span>
              {connected
                ? realGoogle
                  ? "Busy times are hidden from your schedule, and JumpIns create real Meet links."
                  : "Using a demo calendar. Busy times are simulated so you can see double-booking protection."
                : "JumpIn reads only when you're busy (never event details) so nobody books you twice, and creates Meet links for your JumpIns."}
            </span>
            {connected && !realGoogle && <DemoBadge />}
          </div>
          {connected ? (
            <span className="connected-check">
              <Icon name="check" size={18} />
            </span>
          ) : (
            <button className="btn btn--outline btn--sm" onClick={connect}>
              Connect
            </button>
          )}
        </div>
        {connected && (
          <div className="panel__foot panel__foot--left">
            <button className="link-quiet" onClick={() => actions.updateViewer({ calendarConnected: false })}>
              Disconnect calendar
            </button>
          </div>
        )}
        {!integrations.google && !connected && (
          <p className="fine-print">
            Google isn&apos;t configured on this server, so connecting uses a demo calendar. Add Google credentials to
            use your real one.
          </p>
        )}
      </section>

      <section className="panel">
        <header className="panel__head">
          <h2 className="panel__title">Who can jump in instantly</h2>
        </header>
        <div className="radio-cards">
          {(Object.keys(POLICY_COPY) as JumpInPolicy[]).map((p) => (
            <label key={p} className={`radio-card ${viewer.jumpInPolicy === p ? "radio-card--on" : ""}`}>
              <input
                type="radio"
                name="policy"
                checked={viewer.jumpInPolicy === p}
                onChange={() => {
                  actions.updateViewer({ jumpInPolicy: p });
                  toast("Saved");
                }}
              />
              <strong>{POLICY_COPY[p].title}</strong>
              <span>{POLICY_COPY[p].sub}</span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
