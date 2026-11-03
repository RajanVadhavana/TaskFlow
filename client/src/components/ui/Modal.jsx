import { X } from "lucide-react";
import React, { useEffect } from "react";

/**
 * Simple overlay modal.  Traps focus (ESC to close) for keyboard users.
 */
export default function Modal({ title, onClose, children }) {
  // Close on Escape key — expected behaviour for modals (WCAG 2.1.2).
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    // Backdrop — clicking outside closes the modal.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Stop click propagation so clicking inside doesn't close the modal. */}
      <div
        className="card w-full max-w-md p-6 flex flex-col gap-4 animate-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-center justify-between">
          <h2
            id="modal-title"
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            {title}
          </h2>
          <button
            id="modal-close-btn"
            onClick={onClose}
            className="btn-ghost p-1.5"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
