"use client";

import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";

/* ------------------------------------------------------------------ Toast */

type Toast = { id: number; tone: "ok" | "error"; text: string };
const ToastCtx = createContext<(tone: Toast["tone"], text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((tone: Toast["tone"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 7000 : 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6" aria-live="polite" role="status">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex max-w-sm animate-rise items-start gap-2.5 rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink shadow-[var(--shadow-pop)]"
          >
            {t.tone === "ok" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden /> : <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ------------------------------------------------------------------ Modal (native <dialog>: focus trap, Esc, inert background) */

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="modal-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-line bg-surface p-0 text-ink shadow-[var(--shadow-pop)] backdrop:bg-ink/25 open:animate-rise"
    >
      <div className="px-5 pt-5 pb-4">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 id="modal-title" className="text-name font-semibold">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="-mr-1 rounded-sm p-1 text-muted hover:bg-hover hover:text-ink" aria-label="Close">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        {children}
      </div>
      <div className="flex justify-end gap-2 border-t border-line bg-canvas px-5 py-3">{footer}</div>
    </dialog>
  );
}

/* ------------------------------------------------------------------ Drawer (mobile navigation) */

export function Drawer({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <div className={cx("fixed inset-0 z-40 lg:hidden", open ? "" : "pointer-events-none")} inert={!open}>
      <div className={cx("absolute inset-0 bg-ink/20 transition-opacity duration-[var(--duration-base)]", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <aside
        aria-label={label}
        className={cx(
          "absolute inset-y-0 left-0 w-64 border-r border-line bg-rail shadow-[var(--shadow-pop)] transition-transform duration-[var(--duration-base)] ease-[var(--ease-out)]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {children}
      </aside>
    </div>
  );
}
