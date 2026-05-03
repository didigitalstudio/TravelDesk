"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ProModal } from "./pro-modal";

export type PortalNavItem = {
  href: string;
  label: string;
  proLocked?: boolean;
};

export function PortalSidebar({
  brandHref,
  portalLabel,
  navItems,
  tenantName,
  userEmail,
  topRightSlot,
  footerSlot,
}: {
  brandHref: string;
  portalLabel: string;
  navItems: PortalNavItem[];
  tenantName: string;
  userEmail: string;
  topRightSlot: React.ReactNode;
  footerSlot: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [proModal, setProModal] = useState<string | null>(null);

  // Cerrar drawer al cambiar de ruta.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll cuando el drawer está abierto.
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [mobileOpen]);

  const sidebarContent = (
    <>
      <div className="px-5 pt-5">
        <Link href={brandHref} className="group flex items-center gap-2.5">
          <span
            aria-hidden
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 text-[12px] font-bold text-zinc-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_4px_16px_-4px_rgba(129,140,248,0.6)]"
          >
            TD
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-zinc-100 transition-opacity group-hover:opacity-80">
              Travel Desk
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
              {portalLabel}
            </span>
          </div>
        </Link>
      </div>

      <nav className="mt-6 flex-1 overflow-y-auto px-3">
        <ul className="space-y-0.5 text-sm">
          {navItems.map((item) => {
            const active =
              item.href === brandHref
                ? pathname === item.href
                : pathname.startsWith(item.href);

            if (item.proLocked) {
              return (
                <li key={item.href}>
                  <button
                    onClick={() => { setMobileOpen(false); setProModal(item.label); }}
                    className="relative flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-left text-zinc-600 hover:bg-white/[0.03] hover:text-zinc-400 transition-colors"
                  >
                    {item.label}
                    <span className="ml-auto text-[8px] font-bold uppercase tracking-widest text-violet-400 border border-violet-500/40 rounded px-1.5 py-0.5 bg-violet-500/10">
                      Pro
                    </span>
                  </button>
                </li>
              );
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={
                    "relative flex items-center gap-2 rounded-lg px-3 py-2 transition-colors " +
                    (active
                      ? "bg-white/[0.06] text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                      : "text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-100")
                  }
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[color:var(--accent)]"
                    />
                  )}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-white/[0.06] px-4 py-4">
        <div className="mb-3 flex flex-col leading-tight">
          <span className="truncate text-xs font-medium text-zinc-200">{tenantName}</span>
          <span className="truncate text-[11px] text-zinc-500">{userEmail}</span>
        </div>
        {footerSlot}
      </div>
      {proModal && <ProModal feature={proModal} onClose={() => setProModal(null)} />}
    </>
  );

  return (
    <>
      {/* Topbar mobile (< md) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.06] bg-[color-mix(in_oklab,var(--surface-0)_85%,transparent)] px-4 py-3 backdrop-blur-xl md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          className="rounded-lg border border-white/[0.08] p-2 text-zinc-300 hover:bg-white/[0.04]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <Link href={brandHref} className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 text-[11px] font-bold text-zinc-950"
          >
            TD
          </span>
          <span className="text-sm font-semibold text-zinc-100">Travel Desk</span>
        </Link>
        <div className="flex items-center gap-2">{topRightSlot}</div>
      </header>

      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/[0.06] bg-[color-mix(in_oklab,var(--surface-0)_85%,transparent)] backdrop-blur-xl md:flex">
        {sidebarContent}
      </aside>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-white/[0.08] bg-[var(--surface-1)] shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
              className="absolute right-3 top-3 rounded-lg border border-white/[0.08] p-1.5 text-zinc-400 hover:bg-white/[0.04]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Topbar desktop con notif + portal label */}
      <div className="sticky top-0 z-10 hidden border-b border-white/[0.06] bg-[color-mix(in_oklab,var(--surface-0)_70%,transparent)] backdrop-blur-xl md:block md:pl-64">
        <div className="flex items-center justify-end gap-3 px-6 py-3">
          {topRightSlot}
        </div>
      </div>
    </>
  );
}
