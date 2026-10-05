"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { JumpInLogo } from "@/components/Icon";
import { authService } from "@/lib/services/authService";
import { actions } from "@/lib/store";

/**
 * Landing spot after a real OAuth callback. The server has already set an
 * encrypted session cookie; here we mirror it into the app's local state and
 * route to onboarding (new people) or where they were going.
 */
export default function AuthComplete() {
  const router = useRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const linking = params.get("link");
      const next = params.get("next");
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;

      const server = await authService.fetchServerSession();
      if (!server) {
        setError(true);
        return;
      }
      const viewer = linking ? await actions.linkServerSession(server) : await actions.adoptServerSession(server);
      if (!viewer?.onboarded) router.replace("/onboarding");
      else router.replace(safeNext ?? "/discover");
    })();
  }, [router]);

  return (
    <div className="boot">
      <JumpInLogo size={44} />
      <p className="boot__text">{error ? "We couldn't finish signing you in." : "Signing you in…"}</p>
      {error && (
        <a className="btn btn--primary" href="/">
          Back to JumpIn
        </a>
      )}
    </div>
  );
}
