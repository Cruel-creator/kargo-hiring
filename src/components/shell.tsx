"use client";

import { Menu, Search, Settings, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Drawer } from "./overlay";
import { ButtonLink } from "./ui";

/* ------------------------------------------------------------------ Wordmark */

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-sm px-1 py-0.5 text-ink">
      {/* Container end-on: the Kargo mark */}
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <rect x="1" y="3" width="16" height="12" rx="2" className="fill-accent" />
        <path d="M5 6v6M9 6v6M13 6v6" stroke="white" strokeOpacity=".75" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <span className="text-name font-semibold tracking-[-0.02em]">
        Kargo <span className="font-normal text-muted">Hiring</span>
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ Sidebar */

function NavItem({ href, active, children, icon }: { href: string; active: boolean; children: ReactNode; icon?: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex h-8 items-center gap-2 rounded-md px-2 text-sm transition-colors duration-[var(--duration-fast)]",
        active ? "bg-selected font-medium text-ink" : "text-ink-2 hover:bg-hover hover:text-ink",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const params = useSearchParams();
  const role = params.get("role");
  const onHome = path === "/";
  return (
    <nav className="flex h-full flex-col gap-6 px-3 py-4" onClick={(e) => (e.target as HTMLElement).closest("a") && onNavigate?.()}>
      <Wordmark />
      <div className="flex flex-col gap-0.5">
        <p className="mb-1 px-2 text-label font-medium text-muted">Hiring</p>
        <NavItem href="/" active={onHome && !role}>
          All candidates
        </NavItem>
        <NavItem href="/?role=PM" active={onHome && role === "PM"}>
          Product Manager
        </NavItem>
        <NavItem href="/?role=SPM" active={onHome && role === "SPM"}>
          Senior Product Manager
        </NavItem>
      </div>
      <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-3">
        <NavItem href="/settings" active={path === "/settings"} icon={<Settings className="size-4 text-muted" aria-hidden />}>
          Settings
        </NavItem>
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow-[var(--shadow-pop)]">
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-[100dvh] border-r border-line bg-rail lg:block" aria-label="Primary">
        <Suspense>
          <SidebarNav />
        </Suspense>
      </aside>
      <Drawer open={open} onClose={() => setOpen(false)} label="Primary">
        <Suspense>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </Suspense>
      </Drawer>
      <div className="min-w-0">
        <div className="flex h-12 items-center gap-2 border-b border-line px-4 lg:hidden">
          <button type="button" onClick={() => setOpen(true)} className="-ml-1 rounded-md p-1.5 text-ink-2 hover:bg-hover" aria-label="Open navigation">
            <Menu className="size-5" aria-hidden />
          </button>
          <Wordmark />
        </div>
        <main id="main" className="mx-auto w-full max-w-[1240px] px-4 pb-20 sm:px-8 lg:px-12">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Page header: title + context, search and profile */

function SearchBox() {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => setQ(params.get("q") ?? ""), [params]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const apply = (value: string) => {
    const next = new URLSearchParams(path === "/" ? params.toString() : "");
    if (value.trim()) next.set("q", value.trim());
    else next.delete("q");
    const qs = next.toString();
    router.replace(`/${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        apply(q);
      }}
      className="relative w-full sm:w-64"
    >
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
      <label htmlFor="global-search" className="sr-only">
        Search candidates
      </label>
      <input
        ref={ref}
        id="global-search"
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          if (path === "/") apply(e.target.value);
        }}
        placeholder="Search candidates"
        className="h-8 w-full rounded-md border border-line bg-surface pr-8 pl-8 text-sm text-ink placeholder:text-muted transition-[border-color,box-shadow] duration-[var(--duration-fast)] hover:border-line-strong focus:border-accent focus:ring-3 focus:ring-accent-soft focus:outline-none"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded-[4px] border border-line px-1.5 text-label text-muted sm:block">/</kbd>
    </form>
  );
}

function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex size-8 items-center justify-center rounded-full border border-line bg-surface text-label font-semibold text-ink-2 hover:border-line-strong"
        aria-label="Account menu for Arjun Mehta"
      >
        AM
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-52 animate-rise rounded-lg border border-line bg-surface p-1 shadow-[var(--shadow-pop)]">
          <div className="px-2.5 py-2">
            <p className="text-sm font-medium text-ink">Arjun Mehta</p>
            <p className="text-meta text-muted">Founder, Kargo</p>
          </div>
          <div className="my-1 border-t border-line" />
          <Link role="menuitem" href="/settings" onClick={() => setOpen(false)} className="flex h-8 items-center gap-2 rounded-md px-2.5 text-sm text-ink-2 hover:bg-hover hover:text-ink">
            <Settings className="size-4 text-muted" aria-hidden /> Settings
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function HeaderTools({ upload = true }: { upload?: boolean }) {
  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <Suspense>
        <SearchBox />
      </Suspense>
      {upload ? (
        <ButtonLink href="/upload" variant="primary" icon={<Plus className="size-4" aria-hidden />} className="shrink-0">
          <span className="hidden sm:inline">Upload CV</span>
          <span className="sm:hidden">Upload</span>
        </ButtonLink>
      ) : null}
      <ProfileMenu />
    </div>
  );
}

export function PageHeader({ title, description, children, upload = true }: { title: ReactNode; description?: ReactNode; children?: ReactNode; upload?: boolean }) {
  return (
    <header className="flex flex-col gap-4 pt-8 pb-6 sm:flex-row sm:items-start sm:justify-between lg:pt-10">
      <div className="min-w-0">
        <h1 className="text-title font-semibold tracking-[-0.015em] text-ink">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
        {children}
      </div>
      <HeaderTools upload={upload} />
    </header>
  );
}
