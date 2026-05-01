"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type PortalNavItem = { href: string; label: string };

export function PortalHeader({
  brandHref,
  portalLabel,
  navItems,
  rightSlot,
}: {
  brandHref: string;
  portalLabel: string;
  navItems: PortalNavItem[];
  rightSlot: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[color-mix(in_oklab,var(--surface-0)_85%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-2">
          <Link href={brandHref} className="group flex items-center gap-2">
            <span
              aria-hidden
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 text-[11px] font-bold text-zinc-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_4px_16px_-4px_rgba(129,140,248,0.6)]"
            >
              TD
            </span>
            <span className="text-base font-semibold tracking-tight transition-opacity group-hover:opacity-80">
              Travel Desk
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
            {navItems.map((item) => {
              const active =
                item.href === brandHref
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    "rounded-lg px-2.5 py-1 transition-colors " +
                    (active
                      ? "bg-white/[0.06] text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100")
                  }
                >
                  {item.label}
                </Link>
              );
            })}
            <span className="ml-2 hidden text-[10px] uppercase tracking-[0.18em] text-zinc-500 lg:inline">
              {portalLabel}
            </span>
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">{rightSlot}</div>
      </div>
    </header>
  );
}
