"use client";

import clsx from "clsx";
import { Bot, RotateCcw, SendHorizonal, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Alert, Badge, Button, Card, Field, Input, PageHeader, Spinner, Textarea, Toggle } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { useBotSettings, useSaveBotSettings, useTestBot } from "@/lib/queries";
import type { BotSettings, BotTestResult } from "@/lib/types";

export default function BotPage() {
  const { data, isPending, error } = useBotSettings();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <PageHeader title="Bot settings" description="Control how the auto-reply bot talks to your customers, and try it out." />
      {isPending ? (
        <Spinner />
      ) : error ? (
        <Alert>{errorMessage(error)}</Alert>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <SettingsForm settings={data} />
          </div>
          <div className="lg:col-span-2">
            <Playground />
          </div>
        </div>
      )}
    </div>
  );
}

type FormState = Omit<BotSettings, "llm_configured" | "llm_model" | "updated_at">;

function SettingsForm({ settings }: { settings: BotSettings }) {
  const save = useSaveBotSettings();
  const [form, setForm] = useState<FormState>({
    enabled: settings.enabled,
    business_name: settings.business_name,
    business_description: settings.business_description,
    tone: settings.tone,
    greeting_message: settings.greeting_message,
    fallback_message: settings.fallback_message,
    handoff_keywords: settings.handoff_keywords,
    use_llm: settings.use_llm,
    match_threshold: settings.match_threshold,
  });
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate(form);
  }

  return (
    <form onSubmit={submit}>
      <Card className="space-y-5 p-5">
        <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-2 p-3">
          <div>
            <p className="text-sm font-medium text-ink">Auto-reply bot</p>
            <p className="text-xs text-muted">When off, all messages wait for you in the Inbox.</p>
          </div>
          <Toggle checked={form.enabled} onChange={(v) => set("enabled", v)} label="Enable bot" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name">
            <Input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} required />
          </Field>
          <Field label="Tone" hint="e.g. friendly and short, formal, playful">
            <Input value={form.tone} onChange={(e) => set("tone", e.target.value)} />
          </Field>
        </div>

        <Field label="About your business" hint="What you sell, where you are, hours, anything general. Used by the AI model.">
          <Textarea
            value={form.business_description}
            onChange={(e) => set("business_description", e.target.value)}
            rows={4}
            placeholder="We are an online clothing shop in Dhaka selling men's and women's fashion…"
          />
        </Field>

        <Field label="Greeting reply" hint="Sent when a customer just says hi (in no-AI mode).">
          <Textarea value={form.greeting_message} onChange={(e) => set("greeting_message", e.target.value)} rows={2} />
        </Field>

        <Field label="Hand-over message" hint="Sent when the bot can't answer. The chat is then marked 'Needs human' and the bot pauses in that chat.">
          <Textarea value={form.fallback_message} onChange={(e) => set("fallback_message", e.target.value)} rows={2} />
        </Field>

        <Field label="Hand-over keywords" hint="Comma separated. If a customer writes any of these, you take over.">
          <Input value={form.handoff_keywords} onChange={(e) => set("handoff_keywords", e.target.value)} />
        </Field>

        <div className="space-y-4 rounded-lg border border-line p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-ink">
                <Sparkles className="size-4 text-brand" /> Use AI model
                {settings.llm_configured ? (
                  <Badge tone="success">{settings.llm_model}</Badge>
                ) : (
                  <Badge tone="warning">Not configured</Badge>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                Writes natural answers from your knowledge base. Free options: Google Gemini, Groq or local Ollama. Set{" "}
                <code>LLM_BASE_URL</code>, <code>LLM_API_KEY</code> and <code>LLM_MODEL</code> in the backend <code>.env</code>.
              </p>
            </div>
            <Toggle checked={form.use_llm} onChange={(v) => set("use_llm", v)} label="Use AI" />
          </div>
          <Field
            label={`Match strictness (no-AI mode): ${form.match_threshold.toFixed(2)}`}
            hint="Higher means the bot only answers when the question closely matches an entry. Otherwise it hands over."
          >
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.05}
              value={form.match_threshold}
              onChange={(e) => set("match_threshold", Number(e.target.value))}
              className="w-full accent-brand"
            />
          </Field>
        </div>

        {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
        {save.isSuccess && <Alert tone="success">Saved.</Alert>}
        <div className="flex justify-end">
          <Button type="submit" loading={save.isPending}>
            Save settings
          </Button>
        </div>
      </Card>
    </form>
  );
}

type ChatItem = { role: "user" | "assistant"; content: string; meta?: BotTestResult };

const SOURCE_LABEL: Record<BotTestResult["source"], string> = {
  llm: "AI answer",
  knowledge: "Knowledge base match",
  greeting: "Greeting",
  fallback: "Couldn't answer → hand over",
  handoff: "Asked for a human → hand over",
};

function Playground() {
  const test = useTestBot();
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [text, setText] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message) return;
    const history = chat.map(({ role, content }) => ({ role, content }));
    setChat((c) => [...c, { role: "user", content: message }]);
    setText("");
    test.mutate(
      { message, history },
      { onSuccess: (data) => setChat((c) => [...c, { role: "assistant", content: data.reply, meta: data }]) },
    );
  }

  return (
    <Card className="flex h-[560px] flex-col lg:sticky lg:top-6">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Bot className="size-4" /> Test the bot
          </p>
          <p className="text-xs text-muted">Nothing is sent to customers. Save settings first.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setChat([])} aria-label="Reset chat">
          <RotateCcw className="size-3.5" />
        </Button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto bg-bg p-4">
        {chat.length === 0 && (
          <p className="pt-10 text-center text-sm text-muted">Ask something a customer would ask, like “delivery charge koto?”</p>
        )}
        {chat.map((m, i) => (
          <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className="max-w-[85%]">
              <div
                className={clsx(
                  "rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap",
                  m.role === "user" ? "rounded-br-md bg-bubble-out text-white" : "rounded-bl-md bg-bubble-bot text-ink",
                )}
              >
                {m.content}
              </div>
              {m.meta && (
                <p className="mt-1 px-1 text-[11px] text-muted">
                  {SOURCE_LABEL[m.meta.source]}
                  {m.meta.matched_entries.length > 0 && <> · from “{m.meta.matched_entries[0].question}”</>}
                </p>
              )}
            </div>
          </div>
        ))}
        {test.isPending && <Spinner className="size-4" />}
        {test.isError && <Alert>{errorMessage(test.error)}</Alert>}
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-line p-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a customer message…" />
        <Button type="submit" disabled={!text.trim() || test.isPending} aria-label="Send">
          <SendHorizonal className="size-4" />
        </Button>
      </form>
    </Card>
  );
}
