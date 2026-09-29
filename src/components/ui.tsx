"use client";

import { Loader2 } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { cx } from "@/lib/cx";
import { formatScore, shortCriterion } from "@/lib/view";
import { useScrollToTarget } from "./motion/scroll";

/* ------------------------------------------------------------------ Button */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium select-none " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)] " +
  "active:translate-y-px disabled:pointer-events-none";
const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-white shadow-[var(--shadow-raise)] hover:bg-accent-hover " +
    "disabled:bg-hover disabled:text-muted disabled:shadow-none disabled:ring-1 disabled:ring-inset disabled:ring-line",
  secondary: "border border-line-strong bg-surface text-ink hover:border-faint hover:bg-hover disabled:bg-hover disabled:text-muted disabled:border-line",
  ghost: "text-ink-2 hover:bg-hover hover:text-ink disabled:text-muted",
  danger: "border border-line-strong bg-surface text-danger hover:bg-danger-soft disabled:bg-hover disabled:text-muted",
};
const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-sm",
  md: "h-8.5 px-3.5 text-sm",
};

export function buttonClass(variant: Variant = "secondary", size: Size = "md", extra?: string) {
  return cx(base, variants[variant], sizes[size], extra);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, className, children, disabled, type = "button", onClick, ...rest },
  ref,
) {
  // Loading is not disabled: the button keeps its colours, announces busy, and ignores clicks.
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={loading ? (e) => e.preventDefault() : onClick}
      {...rest}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({ href, variant = "secondary", size = "md", icon, children, className }: { href: string; variant?: Variant; size?: Size; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {icon}
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ Fields */

const control =
  "rounded-md border border-line-strong bg-surface text-sm text-ink placeholder:text-muted " +
  "transition-[border-color,box-shadow] duration-[var(--duration-fast)] " +
  "hover:border-faint focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent-soft " +
  "disabled:bg-hover disabled:text-muted aria-invalid:border-danger";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(control, "h-8.5 w-full px-2.5", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} data-lenis-prevent className={cx(control, "min-h-40 w-full resize-y px-3 py-2.5 text-body leading-relaxed", className)} {...rest} />;
});

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        control,
        "h-8 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 fill=%22none%22><path d=%22M1 1l4 4 4-4%22 stroke=%22%236b6963%22 stroke-width=%221.4%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')] bg-[position:right_9px_center] bg-no-repeat pl-2.5 pr-7",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Field({ label, htmlFor, hint, error, children }: { label: string; htmlFor: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-label font-medium text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-meta text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-meta text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ Segmented (tabs / toggles) */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; disabled?: boolean; title?: string }[];
  label: string;
  size?: Size;
  className?: string;
}) {
  const group = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cx("inline-flex rounded-md border border-line bg-rail p-0.5", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={o.disabled}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cx(
              "relative rounded-[5px] font-medium transition-colors duration-[var(--duration-fast)] disabled:text-faint",
              size === "sm" ? "h-6 px-2 text-meta" : "h-7 px-3 text-sm",
              active ? "text-ink" : "text-muted hover:text-ink",
            )}
          >
            {active ? (
              <motion.span
                layoutId={`seg-${group}`}
                aria-hidden
                className="absolute inset-0 rounded-[5px] bg-surface shadow-[var(--shadow-raise)] ring-1 ring-line"
                transition={{ type: "tween", duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              />
            ) : null}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ WeightRibbon (score composition, rubric weights) */

export interface RibbonItem { id: string; name: string; weight: number; points?: number; score?: number }

/** Ribbon slices are a fifth of a column: the tightest criterion names. Anything else falls back to the short label. */
const RIBBON_NAME: Record<string, string> = {
  "End-to-End Product Ownership": "Ownership",
  "Customer & Problem Discovery": "Discovery",
  "Shipping & Outcome Orientation": "Shipping",
  "Operating Without Structure": "Without structure",
  "Technical & Systems Fluency": "Technical",
  "Platform / Integration Ownership": "Platform",
  "Independent Product Decision-Making": "Decisions",
  "Cross-Functional Influence & Alignment": "Influence",
  "Reliability, Data & Systems Thinking": "Reliability",
  "Building Product Operating Systems": "Product ops",
};
const ribbonName = (n: string) => RIBBON_NAME[n] ?? shortCriterion(n) ?? n;

export function WeightRibbon({ items, label, mode = "points", className }: { items: RibbonItem[]; label: string; mode?: "points" | "weights"; className?: string }) {
  const scrollTo = useScrollToTarget();
  return (
    <ol data-ribbon aria-label={label} className={cx("@container grid gap-[3px]", className)} style={{ gridTemplateColumns: items.map((i) => `minmax(0,${i.weight}fr)`).join(" ") }}>
      {items.map((i) => {
        const fill = mode === "points" ? Math.max(0, Math.min(1, (i.points ?? 0) / i.weight)) : 0;
        const figure = mode === "points" ? `${formatScore(i.points ?? 0)}/${formatScore(i.weight)}` : `${formatScore(i.weight)}%`;
        const body = (
          <>
            <span className="relative block h-2 overflow-hidden rounded-[2px] bg-line transition-colors duration-[var(--duration-fast)] group-hover:bg-line-strong">
              {fill > 0 ? <span className={cx("absolute inset-y-0 left-0 rounded-[2px]", (i.score ?? 0) >= 4 ? "bg-accent" : "bg-ink-2")} style={{ width: `${fill * 100}%` }} /> : null}
            </span>
            <span className="mt-1.5 flex items-baseline justify-between gap-2 text-meta">
              {/* Never an ellipsis: the shortest name for the slice, allowed a second line. The full name is in the label and title.
                  Names show only when the ribbon itself is wide enough for them (a container query, not the viewport). */}
              <span className="hidden min-w-0 leading-snug text-pretty text-ink-2 decoration-line-strong underline-offset-4 group-hover:underline @min-[30rem]:block" title={i.name}>
                {ribbonName(i.name)}
              </span>
              <span className="tnum shrink-0 text-muted">{figure}</span>
            </span>
          </>
        );
        return (
          <li key={i.id} className="min-w-0">
            {mode === "points" ? (
              <a
                href={`#row-${i.id}`}
                className="group block rounded-sm"
                aria-label={`${i.name}: ${formatScore(i.points ?? 0)} of ${formatScore(i.weight)} points. Show evidence`}
                onClick={(e) => {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent("kh:criterion", { detail: i.id }));
                  requestAnimationFrame(() => requestAnimationFrame(() => scrollTo(`#row-${i.id}`, { focus: `#row-${i.id} button` })));
                }}
              >
                {body}
              </a>
            ) : (
              <div aria-label={`${i.name}: weight ${formatScore(i.weight)}%`}>{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ Skeleton / Empty */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} aria-hidden />;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 px-6 py-14 sm:items-center sm:text-center">
      <h3 className="text-name font-semibold text-ink">{title}</h3>
      <p className="max-w-[46ch] text-body text-muted">{body}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function SectionTitle({ children, aside, id }: { children: ReactNode; aside?: ReactNode; id?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 id={id} className="text-name font-semibold tracking-[-0.01em] text-ink">
        {children}
      </h2>
      {aside}
    </div>
  );
}
