/**
 * Hash-based stand-in for the Next.js router, used only by the static demo
 * build (GitHub Pages has no server, so routes live after the #:
 * …/JumpIn/#/discover). The real app uses Next.js routing.
 */
import { useEffect, useState } from "react";

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** "#/people/maddison?x=1" → { path: "/people/maddison", search: "?x=1" } */
export function current() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, search = ""] = raw.split("?");
  return { path: path || "/", search: search ? `?${search}` : "" };
}

export function hrefFor(path: string) {
  return `${location.pathname}#${path}`;
}

export function navigate(href: string, replace = false) {
  if (/^https?:\/\//i.test(href)) {
    location.href = href;
    return;
  }
  const url = hrefFor(href);
  if (replace) history.replaceState(null, "", url);
  else history.pushState(null, "", url);
  window.scrollTo(0, 0);
  notify();
}

window.addEventListener("hashchange", notify);
window.addEventListener("popstate", notify);

export function useLocation() {
  const [, set] = useState(0);
  useEffect(() => {
    const l = () => set((x) => x + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return current().path;
}

let params: Record<string, string> = {};
export const setParams = (p: Record<string, string>) => (params = p);
export const getParams = () => params;
