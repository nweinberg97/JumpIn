"use client";

import { useMemo, useState } from "react";
import { firstName } from "@/lib/availability";
import { defaultIntroNote, isEmail } from "@/lib/intro";
import { IntroError, introService } from "@/lib/services/introService";
import { actions, useJumpIn, visibleMembers } from "@/lib/store";
import type { IntroRecipient, Member, WarmIntro } from "@/lib/types";
import { Avatar } from "../Avatar";
import { Dialog } from "../Dialog";
import { Icon } from "../Icon";
import { DemoBadge } from "../Tags";

type Who = "new" | "member";
type Phase = "compose" | "sending" | "sent";

/**
 * Warm intro: a Connector shares someone's profile with a person who should
 * meet them. The recipient is either already on JumpIn, or someone new who
 * gets an email and can join without waiting for approval.
 */
export function WarmIntroDialog({ member, onClose }: { member: Member; onClose: () => void }) {
  const state = useJumpIn();
  const { viewer } = state;
  const subjectFirst = firstName(member.name);
  const fromFirst = viewer ? firstName(viewer.name) : "";

  const [who, setWho] = useState<Who>("new");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Member | null>(null);
  const [note, setNote] = useState("");
  const [noteEdited, setNoteEdited] = useState(false);
  const [phase, setPhase] = useState<Phase>("compose");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<WarmIntro | null>(null);

  const recipientName = who === "member" ? picked?.name ?? "" : name.trim();
  const shownNote = noteEdited ? note : defaultIntroNote(firstName(recipientName), subjectFirst, fromFirst);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visibleMembers(state)
      .filter((m) => m.id !== member.id)
      .filter((m) => !q || m.name.toLowerCase().includes(q) || m.headline.toLowerCase().includes(q))
      .slice(0, 5);
  }, [state, member.id, query]);

  const recipient: IntroRecipient | null =
    who === "member"
      ? picked
        ? { kind: "member", memberId: picked.id, name: picked.name }
        : null
      : name.trim() && isEmail(email)
        ? { kind: "email", email: email.trim(), name: name.trim() }
        : null;
  const canSend = Boolean(recipient && shownNote.trim() && phase === "compose");

  const send = async () => {
    if (!viewer || !recipient) return;
    setPhase("sending");
    setError(null);
    try {
      const id = actions.newIntroId();
      const res = await introService.send({ introId: id, from: viewer, subject: member, recipient, note: shownNote });
      const intro: WarmIntro = {
        id,
        subjectId: member.id,
        recipient,
        note: shownNote,
        createdAt: new Date().toISOString(),
        introUrl: res.introUrl,
        source: res.source,
      };
      await actions.saveIntro(intro);
      setSent(intro);
      setPhase("sent");
    } catch (err) {
      setError(err instanceof IntroError ? err.message : "Something went wrong. Try again in a moment.");
      setPhase("compose");
    }
  };

  const recipientFirst = firstName(recipientName);

  return (
    <Dialog open onClose={onClose} label={`Warm intro for ${member.name}`} size="md" dismissible={phase !== "sending"}>
      <div className="jump intro">
        <div className="jump__pair" aria-hidden="true">
          <Avatar name={member.name} src={member.avatarUrl} size={52} ring />
          <span className={`jump__link ${phase === "sending" ? "jump__link--live" : ""} ${phase === "sent" ? "jump__link--done" : ""}`}>
            <span />
            <span />
            <span />
          </span>
          {who === "member" && picked ? (
            <Avatar name={picked.name} src={picked.avatarUrl} size={52} ring />
          ) : (
            <span className="intro__someone">
              <Icon name={recipientName ? "user" : "plus"} size={22} />
            </span>
          )}
        </div>

        {phase !== "sent" && (
          <>
            <h2 className="jump__title">Introduce {subjectFirst} to someone</h2>
            <p className="jump__sub">
              They&apos;ll get {subjectFirst}&apos;s profile and your note. Your word is why they&apos;ll say yes.
            </p>

            <div className="seg" role="radiogroup" aria-label="Who are you introducing?">
              <button type="button" role="radio" aria-checked={who === "new"} className={`seg__opt ${who === "new" ? "seg__opt--on" : ""}`} onClick={() => setWho("new")}>
                New to JumpIn
              </button>
              <button type="button" role="radio" aria-checked={who === "member"} className={`seg__opt ${who === "member" ? "seg__opt--on" : ""}`} onClick={() => setWho("member")}>
                Already a member
              </button>
            </div>

            {who === "new" ? (
              <div className="intro__fields">
                <label className="field">
                  <span className="field__label">Their name</span>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="off" data-autofocus />
                </label>
                <label className="field">
                  <span className="field__label">Their email</span>
                  <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="off" />
                </label>
                <p className="fine-print intro__vouch">
                  <Icon name="link2" size={14} /> Because you&apos;re a Connector, they can join JumpIn straight away with this
                  email. No waitlist.
                </p>
              </div>
            ) : (
              <div className="intro__fields">
                <label className="field">
                  <span className="field__label">Who should meet {subjectFirst}?</span>
                  <input
                    className="input"
                    placeholder="Search members"
                    value={picked ? picked.name : query}
                    onChange={(e) => {
                      setPicked(null);
                      setQuery(e.target.value);
                    }}
                    data-autofocus
                  />
                </label>
                {!picked && (
                  <ul className="intro__picker" role="listbox" aria-label="Members">
                    {candidates.map((m) => (
                      <li key={m.id}>
                        <button type="button" role="option" aria-selected={false} onClick={() => setPicked(m)}>
                          <Avatar name={m.name} src={m.avatarUrl} size={32} />
                          <span>
                            <strong>{m.name}</strong>
                            <small>{m.headline}</small>
                          </span>
                        </button>
                      </li>
                    ))}
                    {candidates.length === 0 && <li className="intro__none">No members match that.</li>}
                  </ul>
                )}
              </div>
            )}

            <label className="field">
              <span className="field__label">Why they should talk</span>
              <textarea
                className="note-box"
                value={shownNote}
                onChange={(e) => {
                  setNoteEdited(true);
                  setNote(e.target.value);
                }}
                rows={7}
                maxLength={1200}
              />
            </label>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <p className="fine-print">
              <Icon name="shield" size={14} /> Sent from JumpIn on your behalf. {subjectFirst}&apos;s email isn&apos;t shared.
            </p>
            <div className="jump__actions">
              <button className="btn btn--ghost" onClick={onClose} disabled={phase === "sending"}>
                Cancel
              </button>
              <button className="btn btn--jump" onClick={send} disabled={!canSend}>
                <Icon name="send" size={17} /> {phase === "sending" ? "Sending…" : "Send warm intro"}
              </button>
            </div>
          </>
        )}

        {phase === "sent" && sent && (
          <>
            <div className="sent-mark" aria-hidden="true">
              <Icon name="check" size={26} />
            </div>
            <h2 className="jump__title">Intro sent</h2>
            <p className="jump__sub">
              {sent.recipient.kind === "email"
                ? `${recipientFirst} will get ${subjectFirst}'s profile and your note, with a link to join JumpIn.`
                : `${recipientFirst} will see ${subjectFirst}'s profile and your note.`}
            </p>
            <button className="btn btn--jump btn--wide" onClick={onClose} data-autofocus>
              Done
            </button>
            <div className="jump__meta">
              <a href={sent.introUrl} target="_blank" rel="noreferrer" className="link-quiet">
                See what {recipientFirst} received <Icon name="external" size={13} />
              </a>
              {sent.source === "demo" && <DemoBadge>Demo: no email was sent</DemoBadge>}
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
