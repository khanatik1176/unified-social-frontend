"use client";

import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Bot, BookOpen, Cable, Inbox, LayoutDashboard, LogOut, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { Spinner } from "@/components/ui";
import { clearTokens, useAccessToken, useMounted } from "@/lib/auth";
import { useMe, useStats } from "@/lib/queries";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/channels", label: "Channels", icon: Cable },
  { href: "/knowledge", label: "Knowledge base", icon: BookOpen },
  { href: "/bot", label: "Bot settings", icon: Bot },
];

export function AppShell({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const token = useAccessToken();
  const router = useRouter();

  useEffect(() => {
    if (mounted && !token) router.replace("/login");
  }, [mounted, token, router]);

  if (!mounted || !token) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col md:flex-row">
      <Sidebar />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { data: stats } = useStats();
  const unread = stats?.conversations.unread_messages ?? 0;

  function logout() {
    clearTokens();
    queryClient.clear();
    router.replace("/login");
  }

  return (
    <aside className="flex shrink-0 flex-col border-line bg-surface md:h-full md:w-60 md:border-r">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 md:border-b-0 md:py-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-ink">
            <MessagesSquare className="size-4" />
          </span>
          <span className="font-semibold text-ink">Unified Inbox</span>
        </div>
        <button onClick={logout} className="rounded-md p-1.5 text-muted hover:bg-surface-2 md:hidden" aria-label="Log out">
          <LogOut className="size-4" />
        </button>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b border-line px-2 py-2 md:flex-1 md:flex-col md:border-b-0 md:px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active ? "bg-brand-soft font-medium text-brand" : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon className="size-4" />
              {label}
              {href === "/inbox" && unread > 0 && (
                <span className="ml-auto rounded-full bg-brand px-1.5 text-[11px] font-semibold text-brand-ink">{unread}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="hidden items-center justify-between border-t border-line px-4 py-3 md:flex">
        <span className="truncate text-sm text-muted">{me?.username}</span>
        <button onClick={logout} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Log out" title="Log out">
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );
}
