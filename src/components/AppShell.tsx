"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { effectiveStatus, firstName } from "@/lib/availability";
import { actions, useJumpIn, useNow } from "@/lib/store";
import { Avatar } from "./Avatar";
import { ConnectProvider } from "./connect/ConnectProvider";
import { Icon, JumpInLogo, type IconName } from "./Icon";
import { StatusControl } from "./StatusControl";
import { StatusPill } from "./StatusPill";
import { ToastProvider } from "./Toast";

const NAV: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/discover", label: "Meet people", icon: "compass" },
  { href: "/connections", label: "Connections", icon: "users" },
];

/** Signed-in chrome: nav, your own status (always one tap away), guards. */
export function AppShell({ children }: { children: ReactNode }) {
  const state = useJumpIn();
  const router = useRouter();
  const pathname = usePathname();
  const { ready, session, viewer } = state;

  useEffect(() => {
    if (!ready) return;
    if (!session || !viewer) router.replace("/");
    else if (!viewer.onboarded) router.replace("/onboarding");
  }, [ready, session, viewer, router]);

  if (!ready || !session || !viewer || !viewer.onboarded) {
    return (
      <div className="boot">
        <JumpInLogo size={40} />
      </div>
    );
  }

  return (
    <ToastProvider>
      <ConnectProvider>
        <div className="shell">
          <header className="topbar">
            <div className="topbar__inner">
              <Link href="/discover" className="brand">
                <JumpInLogo size={30} />
                <span>JumpIn</span>
              </Link>
              <nav className="topnav" aria-label="Main">
                {NAV.map((n) => (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`topnav__link ${pathname?.startsWith(n.href) ? "topnav__link--on" : ""}`}
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>
              <div className="topbar__right">
                {session.provider === "demo" && (
                  <span className="demo-badge demo-badge--nav" title="Signed in with the demo account">
                    Demo
                  </span>
                )}
                <MyStatus />
                <UserMenu />
              </div>
            </div>
          </header>
          <main className="main">{children}</main>
          <MobileTabs />
        </div>
      </ConnectProvider>
    </ToastProvider>
  );
}

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

/** Your own availability, visible on every screen, never buried in settings. */
function MyStatus() {
  const { viewer } = useJumpIn();
  const { open, setOpen, ref } = usePopover();
  if (!viewer) return null;
  return (
    <div className="popover-anchor" ref={ref}>
      <button className="my-status" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="dialog">
        <span className="my-status__label">You&apos;re</span>
        <StatusPill member={viewer} size="sm" />
        <Icon name="chevronDown" size={15} />
      </button>
      {open && (
        <div className="popover popover--status" role="dialog" aria-label="Your availability">
          <p className="popover__title">Right now</p>
          <StatusControl viewer={viewer} compact />
          <Link href="/availability" className="popover__foot" onClick={() => setOpen(false)}>
            Weekly hours &amp; calendar <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { viewer } = useJumpIn();
  const router = useRouter();
  const { open, setOpen, ref } = usePopover();
  if (!viewer) return null;
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  return (
    <div className="popover-anchor" ref={ref}>
      <button className="user-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Account menu">
        <Avatar name={viewer.name} src={viewer.avatarUrl} size={36} online={viewer.onlineStatus} />
      </button>
      {open && (
        <div className="popover popover--menu" role="menu">
          <div className="menu-head">
            <strong>{viewer.name}</strong>
            <span>{viewer.email || "No email yet"}</span>
          </div>
          <button role="menuitem" onClick={() => go("/me")}>
            <Icon name="user" size={17} /> My profile
          </button>
          <button role="menuitem" onClick={() => go("/availability")}>
            <Icon name="clock" size={17} /> Availability
          </button>
          <button role="menuitem" onClick={() => go("/settings")}>
            <Icon name="settings" size={17} /> Settings &amp; privacy
          </button>
          <hr />
          <button
            role="menuitem"
            onClick={async () => {
              await actions.signOut();
              router.replace("/");
            }}
          >
            <Icon name="logout" size={17} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MobileTabs() {
  const pathname = usePathname();
  const { viewer } = useJumpIn();
  const now = useNow(30_000);
  const status = viewer ? effectiveStatus(viewer, now) : "later";
  const tabs: Array<{ href: string; label: string; icon: IconName }> = [
    { href: "/discover", label: "Meet", icon: "compass" },
    { href: "/connections", label: "Connections", icon: "users" },
    { href: "/availability", label: status === "open" ? "Open" : "Status", icon: status === "open" ? "unlock" : status === "later" ? "clock" : "lock" },
    { href: "/me", label: viewer ? firstName(viewer.name) : "Me", icon: "user" },
  ];
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`tabbar__item ${pathname?.startsWith(t.href) ? "tabbar__item--on" : ""} ${
            t.href === "/availability" ? `tabbar__item--${status}` : ""
          }`}
        >
          <Icon name={t.icon} size={22} />
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
