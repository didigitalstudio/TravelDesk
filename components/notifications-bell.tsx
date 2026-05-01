"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/_actions/notifications";

export type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationsBell({
  initial,
}: {
  initial: NotificationItem[];
}) {
  const [list, setList] = useState(initial);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const unread = list.filter((n) => !n.readAt).length;

  function clickItem(n: NotificationItem) {
    if (!n.readAt) {
      start(async () => {
        await markNotificationRead(n.id);
        setList((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)),
        );
      });
    }
    setOpen(false);
  }

  function markAll() {
    start(async () => {
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setList((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? now })));
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg border border-zinc-300 px-2 py-1.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        aria-label="Notificaciones"
      >
        <span aria-hidden>🔔</span>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Notificaciones
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                disabled={pending}
                className="text-[11px] text-zinc-600 hover:underline dark:text-zinc-400"
              >
                Marcar todas leídas
              </button>
            )}
          </div>
          {list.length === 0 ? (
            <p className="px-3 py-6 text-xs text-zinc-500">Sin notificaciones.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-zinc-100 overflow-auto dark:divide-zinc-800">
              {list.slice(0, 12).map((n) => {
                const inner = (
                  <div className={`px-3 py-2.5 text-sm ${n.readAt ? "" : "bg-blue-50/40 dark:bg-blue-950/10"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <span className={n.readAt ? "" : "font-semibold"}>{n.title}</span>
                      <span className="shrink-0 text-[10px] text-zinc-400">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    {n.body && (
                      <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                        {n.body}
                      </p>
                    )}
                  </div>
                );
                return n.link ? (
                  <li key={n.id}>
                    <Link
                      href={n.link}
                      onClick={() => clickItem(n)}
                      className="block hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      {inner}
                    </Link>
                  </li>
                ) : (
                  <li
                    key={n.id}
                    onClick={() => clickItem(n)}
                    className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    {inner}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} d`;
}
