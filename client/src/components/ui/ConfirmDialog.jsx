import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";
import Button from "./Button.jsx";

/**
 * ConfirmDialog
 *
 * A small modal asking the user to confirm a destructive action.
 * Uses a portal so it always renders above everything else.
 *
 * Props:
 *   title      : string   – bold heading
 *   message    : string   – body text explaining what will be deleted
 *   confirmLabel : string – label for the danger button (default "Delete")
 *   onConfirm  : () => void – called when the user confirms
 *   onCancel   : () => void – called when the user cancels or presses Esc
 *   loading    : boolean  – disables buttons while the action runs
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  loading = false,
}) {
  const cancelRef = useRef(null);

  // Auto-focus the Cancel button so Enter won't accidentally confirm.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  // Close on Escape.
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  // Scroll lock while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const dialog = (
    // Backdrop — clicking outside cancels.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(e) => e.stopPropagation()}
        className="
          w-full max-w-sm flex flex-col gap-4 p-6
          bg-[color:var(--color-surface)]
          border border-[color:var(--color-border)]
          rounded-xl shadow-xl
        "
      >
        {/* Icon + title */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-900/30 shrink-0">
            <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400" aria-hidden />
          </div>
          <h2
            id="confirm-title"
            className="text-base font-semibold text-[color:var(--color-text)]"
          >
            {title}
          </h2>
        </div>

        {/* Body */}
        <p
          id="confirm-message"
          className="text-sm text-[color:var(--color-text-muted)] leading-relaxed"
        >
          {message}
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            ref={cancelRef}
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Deleting…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}

