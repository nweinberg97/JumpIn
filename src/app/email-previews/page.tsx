"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { JumpInLogo } from "@/components/Icon";
import { samplePreviews, type Email } from "@/lib/emails/templates";

type Preview = { key: string; label: string; when: string; email: Email };

/**
 * Every email JumpIn sends, rendered with sample data, so the founder can
 * read and approve the words before anything goes out. No real data here.
 */
export default function EmailPreviews() {
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [active, setActive] = useState("waitlist");

  useEffect(() => {
    const origin = window.location.origin;
    setPreviews(samplePreviews(origin, origin));
  }, []);

  const current = previews.find((p) => p.key === active) ?? previews[0];

  return (
    <div className="email-previews">
      <header className="email-previews__head container">
        <Link href="/" className="brand">
          <JumpInLogo size={28} />
          <span>JumpIn</span>
        </Link>
        <div>
          <h1 className="email-previews__title">Every email JumpIn sends</h1>
          <p className="email-previews__sub">Sample data. Nothing is sent from this page.</p>
        </div>
      </header>
      <div className="email-previews__body container">
        <nav className="email-previews__list" aria-label="Emails">
          {previews.map((p) => (
            <button
              key={p.key}
              className={`email-previews__item ${current?.key === p.key ? "email-previews__item--on" : ""}`}
              onClick={() => setActive(p.key)}
            >
              <strong>{p.label}</strong>
              <span>{p.when}</span>
            </button>
          ))}
        </nav>
        {current && (
          <section className="email-previews__view">
            <p className="email-previews__subject">
              <span>Subject</span> {current.email.subject}
            </p>
            <iframe title={current.label} className="email-previews__frame" srcDoc={current.email.html} sandbox="" />
          </section>
        )}
      </div>
    </div>
  );
}
