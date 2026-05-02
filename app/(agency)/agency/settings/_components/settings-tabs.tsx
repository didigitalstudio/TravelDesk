"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/agency/settings", label: "General", exact: true },
  { href: "/agency/settings/operators", label: "Operadores" },
  { href: "/agency/settings/telegram", label: "Telegram" },
  { href: "/agency/settings/integrations", label: "Integraciones" },
];

export function SettingsTabs() {
  const pathname = usePathname() ?? "";
  return (
    <nav
      aria-label="Configuración"
      className="surface-flat flex flex-wrap gap-1 p-1"
    >
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
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
  );
}
