"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

/**
 * Accessible modal: focus moves in on open and back on close, Escape and
 * backdrop click close it, the page behind doesn't scroll. On phones it
 * becomes a bottom sheet.
 */
export function Dialog({
  open,
  onClose,
  label,
  children,
  size = "md",
  tone = "paper",
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  tone?: "paper" | "peri";
  dismissible?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => {
      const target =
        panel.current?.querySelector<HTMLElement>("[data-autofocus]") ??
        panel.current?.querySelector<HTMLElement>("button, [href], input, textarea, select");
      (target ?? panel.current)?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
      if (e.key === "Tab" && panel.current) {
        const focusables = [
          ...panel.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])',
          ),
        ];
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      returnFocus.current?.focus?.();
    };
  }, [open, onClose, dismissible]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="dialog-root" onMouseDown={(e) => e.target === e.currentTarget && dismissible && onClose()}>
      <div
        ref={panel}
        className={`dialog dialog--${size} dialog--${tone}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
      >
        {dismissible && (
          <button className="dialog__close icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
