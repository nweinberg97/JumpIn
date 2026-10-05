"use client";

import { DAY_NAMES, formatHHMM } from "@/lib/time";
import type { WeeklySlot } from "@/lib/types";
import { Icon } from "./Icon";

const TIMES = Array.from({ length: 33 }, (_, i) => {
  const mins = 6 * 60 + i * 30; // 6:00 → 22:00
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});

const ORDER: WeeklySlot["day"][] = [1, 2, 3, 4, 5, 6, 0];

const PRESETS: Array<{ label: string; slots: Array<[WeeklySlot["day"], string, string]> }> = [
  { label: "Weekday lunches", slots: [1, 2, 3, 4, 5].map((d) => [d as WeeklySlot["day"], "12:00", "13:00"]) },
  { label: "Two mornings", slots: [[2, "09:00", "11:00"], [4, "09:00", "11:00"]] },
  { label: "After work", slots: [[1, "17:30", "19:00"], [3, "17:30", "19:00"]] },
  { label: "Weekends", slots: [[6, "10:00", "12:00"], [0, "10:00", "12:00"]] },
];

const newId = () => `w-${Math.random().toString(36).slice(2, 9)}`;

/**
 * Recurring hours when people can schedule a JumpIn. Deliberately simple:
 * a few windows per week, in your own timezone. Calendar busy times are
 * subtracted automatically when Google is connected.
 */
export function WeeklyEditor({ value, onChange }: { value: WeeklySlot[]; onChange: (v: WeeklySlot[]) => void }) {
  const update = (id: string, patch: Partial<WeeklySlot>) =>
    onChange(
      value.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, ...patch };
        if (next.end <= next.start) next.end = TIMES[Math.min(TIMES.indexOf(next.start) + 2, TIMES.length - 1)];
        return next;
      }),
    );
  const remove = (id: string) => onChange(value.filter((s) => s.id !== id));
  const add = (day: WeeklySlot["day"]) => {
    const last = value.filter((s) => s.day === day).sort((a, b) => a.end.localeCompare(b.end)).pop();
    const startIdx = last ? Math.min(TIMES.indexOf(last.end) + 2, TIMES.length - 3) : TIMES.indexOf("12:00");
    onChange([...value, { id: newId(), day, start: TIMES[startIdx], end: TIMES[startIdx + 2] }]);
  };

  return (
    <div className="weekly">
      <div className="weekly__presets">
        <span className="field__hint">Quick start:</span>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="chip"
            onClick={() => onChange(p.slots.map(([day, start, end]) => ({ id: newId(), day, start, end })))}
          >
            {p.label}
          </button>
        ))}
      </div>
      <ul className="weekly__days">
        {ORDER.map((day) => {
          const slots = value.filter((s) => s.day === day).sort((a, b) => a.start.localeCompare(b.start));
          return (
            <li key={day} className={`weekly__day ${slots.length ? "weekly__day--on" : ""}`}>
              <span className="weekly__name">{DAY_NAMES[day]}</span>
              <div className="weekly__slots">
                {slots.length === 0 && <span className="weekly__none">Not available</span>}
                {slots.map((s) => (
                  <span key={s.id} className="weekly__slot">
                    <select
                      className="input input--sm input--select"
                      value={s.start}
                      onChange={(e) => update(s.id, { start: e.target.value })}
                      aria-label={`${DAY_NAMES[day]} start`}
                    >
                      {TIMES.slice(0, -1).map((t) => (
                        <option key={t} value={t}>
                          {formatHHMM(t)}
                        </option>
                      ))}
                    </select>
                    <span className="weekly__dash">–</span>
                    <select
                      className="input input--sm input--select"
                      value={s.end}
                      onChange={(e) => update(s.id, { end: e.target.value })}
                      aria-label={`${DAY_NAMES[day]} end`}
                    >
                      {TIMES.filter((t) => t > s.start).map((t) => (
                        <option key={t} value={t}>
                          {formatHHMM(t)}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="icon-btn icon-btn--sm" onClick={() => remove(s.id)} aria-label="Remove window">
                      <Icon name="x" size={15} />
                    </button>
                  </span>
                ))}
              </div>
              <button type="button" className="icon-btn icon-btn--sm weekly__add" onClick={() => add(day)} aria-label={`Add time on ${DAY_NAMES[day]}`}>
                <Icon name="plus" size={16} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
