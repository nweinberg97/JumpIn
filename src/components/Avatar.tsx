"use client";

import { useState } from "react";
import { photo } from "@/lib/data/photos";
import type { OnlineStatus } from "@/lib/types";

const TINTS = ["#C9D6F7", "#C7EEDF", "#F6DDB8", "#E8D3F2", "#F3CFCB", "#D4E6C3"];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

/**
 * Member photo with graceful fallback to initials, plus an optional
 * online dot (green = online, grey = offline).
 */
export function Avatar({
  name,
  src,
  size = 40,
  online,
  ring,
  className = "",
}: {
  name: string;
  src?: string;
  size?: number;
  online?: OnlineStatus;
  ring?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const tint = TINTS[name.length % TINTS.length];
  const showImg = src && !failed;
  return (
    <span
      className={`avatar ${ring ? "avatar--ring" : ""} ${className}`}
      style={{ width: size, height: size, ["--avatar-tint" as string]: tint }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo(src, size * 2, size * 2)} alt="" onError={() => setFailed(true)} />
      ) : (
        <span className="avatar__initials" style={{ fontSize: Math.max(11, size * 0.36) }}>
          {initials(name)}
        </span>
      )}
      {online && (
        <span
          className={`presence-dot presence-dot--${online}`}
          aria-label={online === "online" ? "Online" : "Offline"}
          style={{ width: Math.max(9, size * 0.26), height: Math.max(9, size * 0.26) }}
        />
      )}
    </span>
  );
}

/** Large portrait for cards and profiles, with the same fallback. */
export function Portrait({
  name,
  src,
  width,
  height,
  className = "",
  priority,
}: {
  name: string;
  src?: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const tint = TINTS[name.length % TINTS.length];
  return (
    <div className={`portrait ${className}`} style={{ ["--avatar-tint" as string]: tint }}>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo(src, width, height)}
          alt={name}
          loading={priority ? "eager" : "lazy"}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="portrait__initials">{initials(name)}</span>
      )}
    </div>
  );
}
