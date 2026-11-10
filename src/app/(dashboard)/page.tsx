"use client";

import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";

import { PLATFORMS, PlatformIcon } from "@/components/PlatformBadge";
import { Card, PageHeader, Spinner } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { useBotSettings, useChannels, useConversations, useKnowledge, useStats } from "@/lib/queries";

export default function DashboardPage() {
  const { data: stats, isPending } = useStats();
  const { data: needsHuman } = useConversations({ status: "needs_human" });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <PageHeader title="Dashboard" description="An overview of your customer conversations." />

      {isPending || !stats ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Unread messages" value={stats.conversations.unread_messages} />
            <StatCard label="Need your reply" value={stats.conversations.needs_human} highlight={stats.conversations.needs_human > 0} />
            <StatCard label="Received (24h)" value={stats.last_24h.received} />
            <StatCard label="Answered by bot (24h)" value={stats.last_24h.bot_replies} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <h2 className="text-sm font-semibold text-ink">Waiting for a human</h2>
                <Link href="/inbox" className="text-xs font-medium text-brand hover:underline">
                  Open inbox →
                </Link>
              </div>
              {needsHuman?.results.length ? (
                <ul className="divide-y divide-line">
                  {needsHuman.results.slice(0, 8).map((c) => (
                    <li key={c.id}>
                      <Link href={`/inbox?c=${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                        <PlatformIcon platform={c.channel.platform} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{c.contact.display_name}</p>
                          <p className="truncate text-xs text-muted">{c.last_message_preview}</p>
                        </div>
                        <span className="text-xs text-muted">{timeAgo(c.last_message_at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-8 text-center text-sm text-muted">Nothing waiting. The bot has everything covered. 🎉</p>
              )}
            </Card>

            <div className="space-y-6">
              <SetupChecklist />
              <Card>
                <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">By platform</h2>
                {stats.by_platform.length ? (
                  <ul className="divide-y divide-line">
                    {stats.by_platform.map((row) => (
                      <li key={row.platform} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                        <PlatformIcon platform={row.platform} size="sm" />
                        <span className="flex-1 text-ink">{PLATFORMS[row.platform]?.label ?? row.platform}</span>
                        <span className="text-muted">{row.conversations} chats</span>
                        {row.unread > 0 && <span className="text-xs font-semibold text-brand">{row.unread} new</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-6 text-sm text-muted">No conversations yet.</p>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${highlight ? "text-warning" : "text-ink"}`}>{value}</p>
    </Card>
  );
}

function SetupChecklist() {
  const { data: channels } = useChannels();
  const { data: knowledge } = useKnowledge();
  const { data: bot } = useBotSettings();

  const steps = [
    { done: !!channels?.some((c) => c.platform !== "demo"), label: "Connect a social account", href: "/channels" },
    { done: (knowledge?.length ?? 0) >= 3, label: "Add at least 3 knowledge entries", href: "/knowledge" },
    { done: !!bot && bot.business_name !== "My Business", label: "Describe your business for the bot", href: "/bot" },
    { done: !!bot?.llm_configured, label: "Optional: connect a free AI model", href: "/bot" },
  ];
  if (steps.every((s) => s.done)) return null;

  return (
    <Card>
      <h2 className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">Get set up</h2>
      <ul className="space-y-1 p-2">
        {steps.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-surface-2">
              {s.done ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4 text-muted" />}
              <span className={s.done ? "text-muted line-through" : "text-ink"}>{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
