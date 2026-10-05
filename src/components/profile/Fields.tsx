"use client";

import { useRef, useState, type ReactNode } from "react";
import { Avatar } from "../Avatar";
import { Icon } from "../Icon";
import { LoomEmbed, loomId } from "../LoomEmbed";

export function Field({
  label,
  hint,
  optional,
  children,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  optional?: boolean;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
        {optional && <span className="optional">Optional</span>}
      </label>
      {children}
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}

/** Choose from suggestions or add your own. */
export function TagPicker({
  value,
  onChange,
  suggestions,
  placeholder = "Add your own and press Enter",
  max = 8,
  tone = "outline",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions: string[];
  placeholder?: string;
  max?: number;
  tone?: "outline" | "peri";
}) {
  const [draft, setDraft] = useState("");
  const lower = value.map((v) => v.toLowerCase());
  const toggle = (t: string) =>
    onChange(lower.includes(t.toLowerCase()) ? value.filter((v) => v.toLowerCase() !== t.toLowerCase()) : value.length < max ? [...value, t] : value);
  const options = [...new Set([...suggestions, ...value])];
  const add = () => {
    const t = draft.trim().replace(/\s+/g, " ");
    if (t && !lower.includes(t.toLowerCase()) && value.length < max) onChange([...value, t]);
    setDraft("");
  };
  return (
    <div className="tag-picker">
      <div className="chip-row">
        {options.map((t) => {
          const on = lower.includes(t.toLowerCase());
          return (
            <button
              key={t}
              type="button"
              className={`chip ${on ? `chip--on ${tone === "peri" ? "chip--peri" : ""}` : ""}`}
              aria-pressed={on}
              onClick={() => toggle(t)}
            >
              {on && <Icon name="check" size={13} />}
              {t}
            </button>
          );
        })}
      </div>
      <div className="tag-picker__add">
        <input
          className="input input--sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          maxLength={32}
          aria-label="Add your own"
        />
        <button type="button" className="btn btn--ghost btn--sm" onClick={add} disabled={!draft.trim()}>
          <Icon name="plus" size={15} /> Add
        </button>
      </div>
      <p className="field__hint">
        {value.length}/{max} selected
      </p>
    </div>
  );
}

/** Downscale an uploaded image to a square-ish JPEG data URL (~50KB). */
async function resizeImage(file: File, size = 480): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = size / Math.min(img.width, img.height);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = Math.round(size * 1.15);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoField({ name, value, onChange }: { name: string; value: string; onChange: (v: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="photo-field">
      <Avatar name={name || "You"} src={value} size={96} ring />
      <div className="photo-field__actions">
        <button type="button" className="btn btn--outline btn--sm" onClick={() => input.current?.click()}>
          <Icon name="image" size={16} /> {value ? "Change photo" : "Upload a photo"}
        </button>
        {value && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange("")}>
            Remove
          </button>
        )}
        <p className="field__hint">A clear, friendly photo of your face. People jump in with people, not logos.</p>
        {error && <p className="field__error">{error}</p>}
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 12 * 1024 * 1024) {
              setError("That image is over 12MB. Try a smaller one.");
              return;
            }
            try {
              setError(null);
              onChange(await resizeImage(file));
            } catch {
              setError("We couldn't read that image.");
            }
          }}
        />
      </div>
    </div>
  );
}

export function LoomField({ value, onChange, name }: { value: string; onChange: (v: string) => void; name: string }) {
  const valid = !value || loomId(value);
  return (
    <Field
      label="Intro video (Loom)"
      optional
      htmlFor="loom"
      hint={
        value && !valid
          ? "That doesn't look like a Loom share link. It'll show as a plain link instead."
          : "A 1–2 minute hello is the fastest way for people to get to know you. Paste a loom.com/share link."
      }
    >
      <input
        id="loom"
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder="https://www.loom.com/share/…"
        inputMode="url"
      />
      {value && valid && (
        <div className="loom-preview">
          <LoomEmbed url={value} name={name} firstName={name.split(" ")[0] || "me"} />
        </div>
      )}
    </Field>
  );
}

export const COUNTRIES: Array<[string, string]> = [
  ["AU", "Australia"],
  ["BR", "Brazil"],
  ["CA", "Canada"],
  ["DE", "Germany"],
  ["FR", "France"],
  ["GB", "United Kingdom"],
  ["IE", "Ireland"],
  ["IN", "India"],
  ["JP", "Japan"],
  ["KE", "Kenya"],
  ["MX", "Mexico"],
  ["NG", "Nigeria"],
  ["NL", "Netherlands"],
  ["NZ", "New Zealand"],
  ["PT", "Portugal"],
  ["SG", "Singapore"],
  ["US", "United States"],
  ["ZA", "South Africa"],
];

/** Accepts a URL or @handle and returns a normalised profile URL. */
export function normaliseSocial(kind: "linkedin" | "instagram" | "web", raw: string) {
  const v = raw.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (kind === "instagram") return `https://www.instagram.com/${v.replace(/^@/, "")}`;
  if (kind === "linkedin") return v.includes("linkedin.com") ? `https://${v}` : `https://www.linkedin.com/in/${v.replace(/^@/, "")}`;
  return `https://${v}`;
}
