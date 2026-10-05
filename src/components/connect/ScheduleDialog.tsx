"use client";

import { useEffect, useMemo, useState } from "react";
import { firstName } from "@/lib/availability";
import { calendarService } from "@/lib/services/calendarService";
import { meetingService, type MeetingResult } from "@/lib/services/meetingService";
import { actions, useJumpIn } from "@/lib/store";
import {
  buildSlots,
  formatDay,
  formatTime,
  formatWhen,
  groupByDay,
  timeZoneLabel,
  viewerTimeZone,
  type Interval,
  type Slot,
} from "@/lib/time";
import type { Member } from "@/lib/types";
import { Avatar } from "../Avatar";
import { Dialog } from "../Dialog";
import { Icon } from "../Icon";
import { DemoBadge } from "../Tags";

const DAYS_AHEAD = 14;

/**
 * Schedule a JumpIn: their weekly hours, minus your busy times (Google
 * free/busy when connected) and anything already booked in JumpIn.
 */
export function ScheduleDialog({
  member,
  reason,
  onClose,
}: {
  member: Member;
  reason?: string;
  onClose: () => void;
}) {
  const { viewer, connections } = useJumpIn();
  const them = firstName(member.name);
  const tz = viewerTimeZone();

  const [busy, setBusy] = useState<Interval[] | null>(null);
  const [busySource, setBusySource] = useState<"google" | "demo">("demo");
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<"pick" | "saving" | "done">("pick");
  const [result, setResult] = useState<MeetingResult | null>(null);

  useEffect(() => {
    const now = Date.now();
    calendarService
      .getBusy({ timeMin: now, timeMax: now + DAYS_AHEAD * 86_400_000, timeZone: tz })
      .then(({ busy, source }) => {
        setBusy(busy);
        setBusySource(source);
      });
  }, [tz]);

  // Already-booked JumpIns count as busy for both of you: no double-booking.
  const booked = useMemo<Interval[]>(
    () =>
      connections
        .filter((c) => c.status === "scheduled" && c.scheduledAt)
        .map((c) => {
          const start = Date.parse(c.scheduledAt!);
          return { start, end: start + c.durationMinutes * 60_000 };
        }),
    [connections],
  );

  const { slots, hiddenForBusy, hiddenForHours } = useMemo(
    () =>
      busy
        ? buildSlots({
            weekly: member.weeklyAvailability,
            memberTimeZone: member.timezone,
            busy: [...busy, ...booked],
            daysAhead: DAYS_AHEAD,
            viewerTimeZone: tz,
          })
        : { slots: [], hiddenForBusy: 0, hiddenForHours: 0 },
    [busy, booked, member.weeklyAvailability, member.timezone, tz],
  );

  const days = useMemo(() => groupByDay(slots, tz), [slots, tz]);
  const activeDay = days.find((d) => d.key === dayKey) ?? days[0];

  const confirm = async () => {
    if (!slot || !viewer) return;
    setPhase("saving");
    const created = await meetingService.createScheduled({
      memberId: member.id,
      title: `JumpIn: ${viewer.name} + ${member.name}`,
      description: note ? `${note}\n\nScheduled on JumpIn.` : "Scheduled on JumpIn.",
      start: new Date(slot.start).toISOString(),
      end: new Date(slot.end).toISOString(),
    });
    await actions.saveConnection({
      id: actions.newConnectionId(),
      userId: viewer.id,
      otherUserId: member.id,
      type: "scheduled",
      status: "scheduled",
      createdAt: new Date().toISOString(),
      scheduledAt: new Date(slot.start).toISOString(),
      durationMinutes: 30,
      meetingUrl: created.meetingUrl,
      note: note || undefined,
      calendarEventId: created.eventId,
      source: created.source,
    });
    setResult(created);
    setPhase("done");
  };

  const calendarTemplate = slot
    ? `https://calendar.google.com/calendar/render?${new URLSearchParams({
        action: "TEMPLATE",
        text: `JumpIn with ${member.name}`,
        dates: `${toGCal(slot.start)}/${toGCal(slot.end)}`,
        details: "Scheduled on JumpIn.",
      }).toString()}`
    : "#";

  return (
    <Dialog open onClose={onClose} label={`Schedule a JumpIn with ${member.name}`} size="lg">
      <div className="schedule">
        <header className="schedule__head">
          <Avatar name={member.name} src={member.avatarUrl} size={48} ring online={member.onlineStatus} />
          <div>
            <p className="eyebrow">Schedule a JumpIn</p>
            <h2 className="schedule__title">30 minutes with {them}</h2>
          </div>
        </header>

        {reason && phase === "pick" && (
          <p className="callout">
            <Icon name="clock" size={16} />
            {reason}
          </p>
        )}

        {phase === "pick" && (
          <>
            <div className="schedule__context">
              <span className={`cal-status ${busySource === "google" ? "cal-status--on" : ""}`}>
                <Icon name={busySource === "google" ? "check" : "calendar"} size={15} />
                {busySource === "google"
                  ? "Google Calendar connected. Times you're busy are hidden."
                  : "Using demo calendar. Connect Google to use your real availability."}
              </span>
              <span className="tz">
                <Icon name="globe" size={15} /> Times in {timeZoneLabel(tz)}
              </span>
            </div>

            {!busy ? (
              <div className="slots-loading">Finding times that work for both of you…</div>
            ) : days.length === 0 ? (
              <div className="empty-inline">
                {hiddenForHours > 0
                  ? `${them}'s hours don't overlap with your daytime in the next two weeks. Catch them when they're open to JumpIn instead.`
                  : `${them} has no open times in the next two weeks. Try again soon, or jump in when they're open.`}
              </div>
            ) : (
              <>
                <div className="day-strip" role="tablist" aria-label="Day">
                  {days.map((d) => (
                    <button
                      key={d.key}
                      role="tab"
                      aria-selected={d.key === activeDay?.key}
                      className={`day-chip ${d.key === activeDay?.key ? "day-chip--on" : ""}`}
                      onClick={() => {
                        setDayKey(d.key);
                        setSlot(null);
                      }}
                    >
                      <span className="day-chip__dow">{formatDay(d.first, tz).split(",")[0]}</span>
                      <span className="day-chip__date">{formatDay(d.first, tz).split(", ")[1]}</span>
                      <span className="day-chip__count">{d.slots.length} times</span>
                    </button>
                  ))}
                </div>
                <div className="slot-grid" role="radiogroup" aria-label="Time">
                  {activeDay?.slots.map((s) => (
                    <button
                      key={s.id}
                      role="radio"
                      aria-checked={slot?.id === s.id}
                      className={`slot ${slot?.id === s.id ? "slot--on" : ""}`}
                      onClick={() => setSlot(s)}
                    >
                      {formatTime(s.start, tz)}
                    </button>
                  ))}
                </div>
                {(hiddenForBusy > 0 || hiddenForHours > 0) && (
                  <p className="fine-print">
                    {[
                      hiddenForBusy > 0 && `${hiddenForBusy} hidden because you're busy then`,
                      hiddenForHours > 0 && `${hiddenForHours} hidden because they're before 7 AM or after 10 PM for you`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    .
                  </p>
                )}
              </>
            )}

            {slot && (
              <div className="schedule__confirm">
                <label className="field">
                  <span className="field__label">
                    Anything {them} should know? <span className="optional">Optional</span>
                  </span>
                  <textarea
                    className="input"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={`e.g. I'd love to hear how you grew ${member.projects[0]?.name ?? "your project"}.`}
                  />
                </label>
                <button className="btn btn--jump btn--wide" onClick={confirm}>
                  <Icon name="calendar" size={18} /> Schedule for {formatWhen(slot.start, tz)}
                </button>
              </div>
            )}
          </>
        )}

        {phase === "saving" && (
          <div className="slots-loading">
            <span className="spinner" /> Creating the calendar event and Meet link…
          </div>
        )}

        {phase === "done" && slot && result && (
          <div className="booked">
            <div className="sent-mark" aria-hidden="true">
              <Icon name="check" size={26} />
            </div>
            <h3 className="jump__title">You&apos;re booked</h3>
            <p className="booked__when">{formatWhen(slot.start, tz)}</p>
            <p className="jump__sub">
              {result.source === "google"
                ? `It's on your Google Calendar with a Meet link, and ${them} has the invite.`
                : `Saved to your Connections. ${them} gets the details by email once a backend is connected.`}
            </p>
            <div className="booked__actions">
              {result.source === "google" && result.htmlLink ? (
                <a className="btn btn--outline" href={result.htmlLink} target="_blank" rel="noreferrer">
                  <Icon name="calendar" size={16} /> Open in Google Calendar
                </a>
              ) : (
                <a className="btn btn--outline" href={calendarTemplate} target="_blank" rel="noreferrer">
                  <Icon name="calendar" size={16} /> Add to Google Calendar
                </a>
              )}
              <button className="btn btn--primary" onClick={onClose}>
                Done
              </button>
            </div>
            {result.source === "demo" && <DemoBadge>Demo: no real calendar event was created</DemoBadge>}
          </div>
        )}
      </div>
    </Dialog>
  );
}

function toGCal(ms: number) {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
