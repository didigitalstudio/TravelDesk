"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ProModal } from "@/components/pro-modal";

const TABS = [
  { href: "/agency/settings", label: "General", exact: true, featureKey: null },
  { href: "/agency/settings/operators", label: "Operadores", exact: false, featureKey: "multi_user" },
  { href: "/agency/settings/telegram", label: "Telegram", exact: false, featureKey: "telegram" },
  { href: "/agency/settings/integrations", label: "Integraciones", exact: false, featureKey: "google_drive" },
];

export function SettingsTabs({ features = {} }: { features?: Record<string, boolean> }) {
  const pathname = usePathname() ?? "";
  const [proModal, setProModal] = useState<string | null>(null);

  return (
    <>
      <nav
        aria-label="Configuración"
        className="surface-flat flex flex-wrap gap-1 p-1"
      >
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          const locked = tab.featureKey !== null && !(features[tab.featureKey] ?? false);

          if (locked) {
            return (
              <button
                key={tab.href}
                type="button"
                onClick={() => setProModal(tab.label)}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors text-zinc-600 hover:bg-white/[0.04] hover:text-zinc-400"
              >
                {tab.label}
                <span className="text-[8px] font-bold uppercase tracking-widest text-violet-400 border border-violet-500/40 rounded px-1.5 py-0.5 bg-violet-500/10 leading-none">
                  Pro
                </span>
              </button>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={
                "rounded-md px-3 py-1.5 text-sm transition-colors " +
                (active
                  ? "bg-white/[0.08] text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100")
              }
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {proModal && <ProModal feature={proModal} onClose={() => setProModal(null)} />}
    </>
  );
}
