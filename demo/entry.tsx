/**
 * Static demo build of JumpIn for GitHub Pages.
 *
 * Renders the real app's pages with a hash router (see shims/). There is no
 * server, so /api/* calls fail and every integration uses its labelled demo
 * fallback, exactly as `npm run dev` does without credentials.
 */
import { createRoot } from "react-dom/client";
import type { ComponentType } from "react";
import "@/app/globals.css";
import { current, hrefFor, navigate, setParams, useLocation } from "./shims/router";
import Landing from "@/app/page";
import Onboarding from "@/app/onboarding/page";
import AuthComplete from "@/app/auth/complete/page";
import Invite from "@/app/invite/[token]/page";
import AppLayout from "@/app/(app)/layout";
import Discover from "@/app/(app)/discover/page";
import Profile from "@/app/(app)/people/[id]/page";
import Connections from "@/app/(app)/connections/page";
import Me from "@/app/(app)/me/page";
import Availability from "@/app/(app)/availability/page";
import Settings from "@/app/(app)/settings/page";

type Route = [RegExp, ComponentType, boolean, string[]];
const routes: Route[] = [
  [/^\/$/, Landing, false, []],
  [/^\/onboarding$/, Onboarding, false, []],
  [/^\/auth\/complete$/, AuthComplete, false, []],
  [/^\/invite\/([^/]+)$/, Invite, false, ["token"]],
  [/^\/discover$/, Discover, true, []],
  [/^\/people\/([^/]+)$/, Profile, true, ["id"]],
  [/^\/connections$/, Connections, true, []],
  [/^\/me$/, Me, true, []],
  [/^\/availability$/, Availability, true, []],
  [/^\/settings$/, Settings, true, []],
];

function App() {
  const path = useLocation();
  for (const [re, Page, inApp, names] of routes) {
    const m = path.match(re);
    if (!m) continue;
    const p: Record<string, string> = {};
    names.forEach((n, i) => (p[n] = decodeURIComponent(m[i + 1])));
    setParams(p);
    return inApp ? (
      <AppLayout>
        <Page />
      </AppLayout>
    ) : (
      <Page />
    );
  }
  navigate("/", true);
  return null;
}

// Plain <a href="/…"> links (e.g. the invite preview) become hash links.
document.addEventListener(
  "click",
  (e) => {
    const a = (e.target as Element | null)?.closest?.("a");
    const href = a?.getAttribute("href");
    // Skip links that are already hash links (from the Link shim) or external.
    if (!a || !href || !href.startsWith("/") || href.startsWith("//") || href.includes("#")) return;
    e.preventDefault();
    if (a.target === "_blank") window.open(hrefFor(href), "_blank", "noopener");
    else navigate(href);
  },
  true,
);

// Pages read window.location.search for notices; mirror the hash query there.
const syncSearch = () => {
  const { search } = current();
  if (search !== location.search) {
    history.replaceState(null, "", `${location.pathname}${search}${location.hash}`);
  }
};
syncSearch();
window.addEventListener("hashchange", syncSearch);

createRoot(document.getElementById("root")!).render(<App />);
