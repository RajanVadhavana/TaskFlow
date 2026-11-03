import React, { useState } from "react";
import { Trash2, Pencil, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Navbar from "./Navbar.jsx";
import Button from "./ui/Button.jsx";
import Badge from "./ui/Badge.jsx";
import IconButton from "./ui/IconButton.jsx";
import Skeleton from "./ui/Skeleton.jsx";
import Modal from "./ui/Modal.jsx";
import PriorityBadge from "./ui/PriorityBadge.jsx";

/**
 * ComponentDemo
 *
 * A visual showcase of every UI primitive in one page.
 * Reach it at http://localhost:5173/?demo during development.
 * Not linked from the production board.
 */
export default function ComponentDemo() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-text)]">
      {/* Header — same as the real board */}
      <Navbar
        onNewTask={() => toast.success("New task clicked!")}
        onActivity={() => toast("Activity log coming soon…", { icon: "🔔" })}
      />

      <main className="max-w-7xl mx-auto px-4 py-10 space-y-12">
        <header>
          <h1 className="text-2xl font-bold">Component Demo</h1>
          <p className="text-sm text-[color:var(--color-text-muted)] mt-1">
            Toggle the theme in the header to check both palettes.
            URL: <code className="font-mono text-xs">?demo</code>
          </p>
        </header>

        {/* ── Buttons ──────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-[color:var(--color-border)] pb-2">
            Button
          </h2>

          {/* Variants */}
          <div className="flex flex-wrap gap-3 items-center">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>

          {/* Sizes */}
          <div className="flex flex-wrap gap-3 items-center">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>

          {/* With icon */}
          <div className="flex flex-wrap gap-3 items-center">
            <Button variant="primary">
              <Loader2 size={14} className="animate-spin" aria-hidden />
              Loading…
            </Button>
            <Button variant="danger">
              <Trash2 size={14} aria-hidden />
              Delete
            </Button>
          </div>
        </section>

        {/* ── IconButton ───────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-[color:var(--color-border)] pb-2">
            IconButton
          </h2>
          <div className="flex flex-wrap gap-3 items-center">
            <IconButton aria-label="Edit" variant="ghost">
              <Pencil size={16} />
            </IconButton>
            <IconButton aria-label="Delete" variant="ghost">
              <Trash2 size={16} />
            </IconButton>
            <IconButton aria-label="Edit" variant="secondary" size="lg">
              <Pencil size={18} />
            </IconButton>
          </div>
        </section>

        {/* ── Badge ────────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-[color:var(--color-border)] pb-2">
            Badge
          </h2>
          <div className="flex flex-wrap gap-2 items-center">
            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
              New
            </Badge>
            <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Draft
            </Badge>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              Done
            </Badge>
          </div>
        </section>

        {/* ── PriorityBadge ─────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-[color:var(--color-border)] pb-2">
            PriorityBadge
          </h2>
          <div className="flex flex-wrap gap-2 items-center">
            <PriorityBadge priority="Low" />
            <PriorityBadge priority="Medium" />
            <PriorityBadge priority="High" />
          </div>
        </section>

        {/* ── Skeleton ─────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-[color:var(--color-border)] pb-2">
            Skeleton
          </h2>
          {/* Mimics a task card loading state */}
          <div className="card p-4 space-y-3 max-w-sm">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-5/6 rounded" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-5 w-14 rounded-md" />
            </div>
          </div>
        </section>

        {/* ── Modal ────────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-[color:var(--color-border)] pb-2">
            Modal
          </h2>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open Modal
          </Button>

          {modalOpen && (
            <Modal title="Example Modal" onClose={() => setModalOpen(false)}>
              <p className="text-sm text-[color:var(--color-text-muted)]">
                This modal renders in a React portal so it's always on top.
                Press <kbd className="font-mono text-xs">Esc</kbd> or click
                outside to close. Tab and Shift+Tab are trapped inside.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    toast.success("Confirmed!");
                    setModalOpen(false);
                  }}
                >
                  Confirm
                </Button>
              </div>
            </Modal>
          )}
        </section>

        {/* ── Cards / surfaces ─────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-[color:var(--color-border)] pb-2">
            Card surface
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 max-w-xl">
            <div className="card p-4">
              <p className="font-medium text-sm">Default card</p>
              <p className="text-xs text-[color:var(--color-text-muted)] mt-1">
                Hover to see shadow lift.
              </p>
            </div>
            <div className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <PriorityBadge priority="High" />
                  <p className="font-medium text-sm mt-2">Fix login bug</p>
                </div>
                <IconButton aria-label="Edit task" size="sm">
                  <Pencil size={14} />
                </IconButton>
              </div>
              <div className="flex gap-1.5 mt-3">
                <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-xs">
                  auth
                </Badge>
                <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-xs">
                  v2
                </Badge>
              </div>
            </div>
          </div>
        </section>

        {/* ── Input ────────────────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold border-b border-[color:var(--color-border)] pb-2">
            Input / Textarea
          </h2>
          <div className="space-y-3 max-w-sm">
            <input className="input" placeholder="Type something…" />
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Multi-line input…"
            />
            <select className="input">
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
        </section>
      </main>
    </div>
  );
}
