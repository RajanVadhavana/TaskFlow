import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Modal
 *
 * Renders into document.body via a React portal so it always sits above
 * every other element regardless of stacking context.
 *
 * Accessibility:
 *  - role="dialog" + aria-modal="true"  → screen readers enter modal mode
 *  - aria-labelledby="modal-title"      → reader announces the title
 *  - Focus trap: Tab/Shift+Tab cycle only through focusable children
 *  - Esc closes the modal              (WCAG 2.1.2)
 *  - Scroll lock: body overflow hidden while open
 *
 * Props:
 *   title    : string   – shown as the modal heading
 *   onClose  : () => void
 *   children : ReactNode
 */
export default function Modal({ title, onClose, children }) {
  const dialogRef = useRef(null);

  // ── Scroll lock ─────────────────────────────────────────────────────────────
  // Prevent the page behind the modal from scrolling while it's open.
  // We restore overflow on cleanup so the page scrolls normally again.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ── Keyboard handling ────────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap: intercept Tab so focus never leaves the dialog.
      if (e.key === "Tab" && dialogRef.current) {
        // Collect all focusable elements inside the dialog.
        const focusable = Array.from(
          dialogRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.disabled);

        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          // Shift+Tab: if focus is on the first element, wrap to last.
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          // Tab: if focus is on the last element, wrap to first.
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // ── Auto-focus the dialog on open ───────────────────────────────────────────
  // Focus the first focusable element so keyboard users don't have to Tab to it.
  useEffect(() => {
    if (!dialogRef.current) return;
    const first = dialogRef.current.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (first) first.focus();
  }, []);

  const modal = (
    // Backdrop — clicking outside closes the modal.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        // Stop clicks inside from reaching the backdrop handler above.
        onClick={(e) => e.stopPropagation()}
        className="
          w-full max-w-md flex flex-col gap-4 p-6
          bg-[color:var(--color-surface)]
          border border-[color:var(--color-border)]
          rounded-xl shadow-card-hover
          transition-transform duration-200
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <h2
            id="modal-title"
            className="text-lg font-semibold text-[color:var(--color-text)]"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="
              p-1.5 rounded-lg
              text-[color:var(--color-text-muted)]
              hover:bg-[color:var(--color-surface-hover)]
              transition-colors duration-150
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]
            "
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* Body */}
        {children}
      </div>
    </div>
  );

  // Portal: render into document.body so stacking context doesn't clip the modal.
  return createPortal(modal, document.body);
}
