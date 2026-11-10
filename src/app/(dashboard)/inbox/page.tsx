"use client";

import clsx from "clsx";
import { AlertCircle, ArrowLeft, Bot, CheckCheck, Inbox as InboxIcon, Search, SendHorizonal, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { PLATFORMS, PlatformIcon, PlatformLabel } from "@/components/PlatformBadge";
import { Alert, Badge, Button, EmptyState, Select, Spinner, Textarea, Toggle } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { clockTime, initials, timeAgo } from "@/lib/format";
import {
  useConversation,
  useConversations,
  useMarkRead,
  useMessages,
  useSendMessage,
  useUpdateConversation,
  type ConversationFilters,
} from "@/lib/queries";
import type { Conversation, ConversationStatus, Message, Platform } from "@/lib/types";

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <Inbox />
    </Suspense>
  );
}

const TABS: { label: string; status: ConversationStatus | ""; unread?: boolean }[] = [
  { label: "All", status: "" },
  { label: "Unread", status: "", unread: true },
  { label: "Needs human", status: "needs_human" },
  { label: "Resolved", status: "closed" },
];

function Inbox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = Number(searchParams.get("c")) || null;

  const [tab, setTab] = useState(0);
  const [platform, setPlatform] = useState<Platform | "">("");
  const [search, setSearch] = useState("");

  const filters: ConversationFilters = {
    platform,
    status: TABS[tab].status,
    unread: TABS[tab].unread,
    search: search.trim(),
  };

  const select = (id: number | null) => router.replace(id ? `${pathname}?c=${id}` : pathname, { scroll: false });

  return (
    <div className="flex h-full min-h-[calc(100dvh-7rem)] md:min-h-0">
      {/* Conversation list */}
      <section
        className={clsx(
          "flex w-full flex-col border-line bg-surface md:w-80 md:shrink-0 md:border-r lg:w-96",
          selectedId && "hidden md:flex",
        )}
      >
        <div className="space-y-3 border-b border-line p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or message"
              className="h-9 w-full rounded-lg border border-line bg-surface-2 pr-3 pl-9 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-1 overflow-x-auto">
              {TABS.map((t, i) => (
                <button
                  key={t.label}
                  onClick={() => setTab(i)}
                  className={clsx(
                    "shrink-0 rounded-md px-2 py-1 text-xs font-medium",
                    tab === i ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface-2",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform | "")}
              className="h-7! w-auto! px-2! text-xs!"
              aria-label="Filter by platform"
            >
              <option value="">All apps</option>
              {(Object.keys(PLATFORMS) as Platform[]).map((p) => (
                <option key={p} value={p}>
                  {PLATFORMS[p].label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <ConversationList filters={filters} selectedId={selectedId} onSelect={select} />
      </section>

      {/* Chat */}
      <section className={clsx("min-w-0 flex-1 flex-col", selectedId ? "flex" : "hidden md:flex")}>
        {selectedId ? (
          <ChatPanel key={selectedId} id={selectedId} onBack={() => select(null)} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState icon={<InboxIcon className="size-8" />} title="Select a conversation">
              Messages from all your connected apps show up on the left.
            </EmptyState>
          </div>
        )}
      </section>
    </div>
  );
}

function ConversationList({
  filters,
  selectedId,
  onSelect,
}: {
  filters: ConversationFilters;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const { data, isPending, error } = useConversations(filters);

  if (isPending) return <Spinner className="m-6" />;
  if (error) return <div className="p-3"><Alert>{errorMessage(error)}</Alert></div>;
  if (!data.results.length) {
    return (
      <EmptyState title="No conversations">
        When customers message you, they appear here. No accounts yet? Add a <Link href="/channels" className="text-brand underline">Demo channel</Link> to try it out.
      </EmptyState>
    );
  }

  return (
    <ul className="flex-1 divide-y divide-line overflow-y-auto">
      {data.results.map((c) => (
        <li key={c.id}>
          <button
            onClick={() => onSelect(c.id)}
            className={clsx(
              "flex w-full items-start gap-3 px-3 py-3 text-left transition-colors",
              selectedId === c.id ? "bg-brand-soft" : "hover:bg-surface-2",
            )}
          >
            <Avatar conversation={c} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className={clsx("truncate text-sm text-ink", c.unread_count > 0 ? "font-semibold" : "font-medium")}>
                  {c.contact.display_name}
                </p>
                <span className="shrink-0 text-[11px] text-muted">{timeAgo(c.last_message_at)}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <p className={clsx("flex-1 truncate text-xs", c.unread_count > 0 ? "text-ink" : "text-muted")}>
                  {c.last_message_preview || "No messages"}
                </p>
                {c.status === "needs_human" && <span className="size-2 shrink-0 rounded-full bg-warning" title="Needs human" />}
                {c.unread_count > 0 && (
                  <span className="shrink-0 rounded-full bg-brand px-1.5 text-[10px] font-semibold text-brand-ink">
                    {c.unread_count}
                  </span>
                )}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Avatar({ conversation }: { conversation: Conversation }) {
  return (
    <div className="relative shrink-0">
      <span className="flex size-10 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-muted">
        {initials(conversation.contact.display_name)}
      </span>
      <span className="absolute -right-0.5 -bottom-0.5 rounded-full ring-2 ring-surface">
        <PlatformIcon platform={conversation.channel.platform} size="sm" />
      </span>
    </div>
  );
}

function ChatPanel({ id, onBack }: { id: number; onBack: () => void }) {
  const { data: conversation, isPending } = useConversation(id);
  const { data: messages } = useMessages(id);
  const update = useUpdateConversation(id);
  const { mutate: markRead } = useMarkRead();
  const bottomRef = useRef<HTMLDivElement>(null);

  const unread = conversation?.unread_count ?? 0;
  useEffect(() => {
    if (unread > 0) markRead(id);
  }, [id, unread, markRead]);

  const lastMessageId = messages?.at(-1)?.id;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [lastMessageId]);

  if (isPending || !conversation) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const closed = conversation.status === "closed";

  return (
    <>
      <header className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-3 py-2.5 md:px-4">
        <button onClick={onBack} className="rounded-md p-1 text-muted hover:bg-surface-2 md:hidden" aria-label="Back">
          <ArrowLeft className="size-5" />
        </button>
        <Avatar conversation={conversation} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{conversation.contact.display_name}</p>
          <div className="flex items-center gap-2">
            <PlatformLabel platform={conversation.channel.platform} />
            <span className="truncate text-xs text-muted">· {conversation.channel.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {conversation.status === "needs_human" && <Badge tone="warning">Needs human</Badge>}
          <label className="flex items-center gap-2 text-xs text-muted" title="When off, the bot won't reply in this chat">
            <Bot className="size-4" />
            Bot
            <Toggle
              checked={conversation.bot_enabled}
              onChange={(v) => update.mutate({ bot_enabled: v })}
              disabled={update.isPending}
              label="Auto-reply bot for this conversation"
            />
          </label>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => update.mutate({ status: closed ? "open" : "closed" })}
            disabled={update.isPending}
          >
            <CheckCheck className="size-3.5" />
            {closed ? "Reopen" : "Resolve"}
          </Button>
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto bg-bg px-3 py-4 md:px-6">
        {messages?.map((m) => <MessageBubble key={m.id} message={m} />)}
        <div ref={bottomRef} />
      </div>

      <Composer conversationId={id} platform={conversation.channel.platform} />
    </>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const inbound = message.direction === "in";
  const bot = message.sender === "bot";
  return (
    <div className={clsx("flex", inbound ? "justify-start" : "justify-end")}>
      <div className="max-w-[85%] md:max-w-[70%]">
        <div
          className={clsx(
            "rounded-2xl px-3.5 py-2 text-sm break-words whitespace-pre-wrap",
            inbound && "rounded-bl-md border border-line bg-bubble-in text-ink",
            !inbound && bot && "rounded-br-md bg-bubble-bot text-ink",
            !inbound && !bot && "rounded-br-md bg-bubble-out text-white",
          )}
        >
          {message.text}
        </div>
        <div className={clsx("mt-1 flex items-center gap-1.5 px-1 text-[11px] text-muted", !inbound && "justify-end")}>
          {bot && (
            <span className="inline-flex items-center gap-0.5">
              <Bot className="size-3" /> Bot ·
            </span>
          )}
          {message.sender === "agent" && (
            <span className="inline-flex items-center gap-0.5">
              <UserRound className="size-3" /> You ·
            </span>
          )}
          {clockTime(message.created_at)}
          {message.status === "failed" && (
            <span className="inline-flex items-center gap-0.5 text-danger" title={message.error}>
              <AlertCircle className="size-3" /> Not delivered
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Composer({ conversationId, platform }: { conversationId: number; platform: Platform }) {
  const [text, setText] = useState("");
  const send = useSendMessage(conversationId);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const value = text.trim();
    if (!value || send.isPending) return;
    send.mutate(value, { onSuccess: () => setText("") });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={submit} className="border-t border-line bg-surface p-3">
      {send.isError && (
        <div className="mb-2">
          <Alert>
            Couldn&apos;t deliver: {errorMessage(send.error)}
            {platform !== "telegram" && platform !== "demo" && (
              <> Meta only allows replies within 24 hours of the customer&apos;s last message.</>
            )}
          </Alert>
        </div>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`Reply via ${PLATFORMS[platform]?.label ?? platform}…  (Enter to send, Shift+Enter for new line)`}
          rows={1}
          className="max-h-40 min-h-10 resize-none"
        />
        <Button type="submit" loading={send.isPending} disabled={!text.trim()} className="h-10" aria-label="Send">
          {!send.isPending && <SendHorizonal className="size-4" />}
        </Button>
      </div>
    </form>
  );
}
