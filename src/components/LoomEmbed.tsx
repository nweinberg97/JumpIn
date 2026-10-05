"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { Portrait } from "./Avatar";

/** loom.com/share/<id> or loom.com/embed/<id> → <id>; anything else → null. */
export function loomId(url?: string) {
  if (!url) return null;
  const m = url.match(/^https?:\/\/(?:www\.)?loom\.com\/(?:share|embed)\/([a-f0-9]{16,64})/i);
  return m ? m[1] : null;
}

/**
 * "Get to know Sarah → 2 min intro". Shows a poster first and only loads
 * Loom's player when clicked, so profiles stay fast. Unrecognised URLs fall
 * back to a plain external link.
 */
export function LoomEmbed({ url, name, firstName, avatarUrl }: { url: string; name: string; firstName: string; avatarUrl?: string }) {
  const [playing, setPlaying] = useState(false);
  const id = loomId(url);

  if (!id) {
    return (
      <a className="loom loom--link" href={url} target="_blank" rel="noreferrer">
        <span className="loom__play">
          <Icon name="play" size={18} />
        </span>
        <span>
          <strong>Get to know {firstName}</strong>
          <span className="loom__meta">Watch their intro video</span>
        </span>
        <Icon name="external" size={16} />
      </a>
    );
  }

  if (playing) {
    return (
      <div className="loom loom--player">
        <iframe
          src={`https://www.loom.com/embed/${id}?autoplay=1&hide_owner=true&hide_share=true`}
          title={`${name}'s intro video`}
          allow="autoplay; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button className="loom loom--poster" onClick={() => setPlaying(true)}>
      <Portrait name={name} src={avatarUrl} width={640} height={360} className="loom__bg" />
      <span className="loom__overlay">
        <span className="loom__play loom__play--big">
          <Icon name="play" size={24} />
        </span>
        <span className="loom__text">
          <strong>Get to know {firstName} →</strong>
          <span className="loom__meta">Intro video on Loom</span>
        </span>
      </span>
    </button>
  );
}
