"use client";

import { Check, Copy, Pencil, Plus, Send, Trash2, Webhook } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";

import { PLATFORMS, PlatformIcon } from "@/components/PlatformBadge";
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Toggle } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import {
  useChannels,
  useDeleteChannel,
  useSaveChannel,
  useSetTelegramWebhook,
  useSetupInfo,
  useSimulateMessage,
} from "@/lib/queries";
import type { Channel, Platform } from "@/lib/types";

const PLATFORM_HELP: Record<Platform, { idLabel?: string; tokenLabel?: string; steps: ReactNode[] }> = {
  facebook: {
    idLabel: "Facebook Page ID",
    tokenLabel: "Page access token",
    steps: [
      <>Create a free app at <Ext href="https://developers.facebook.com/apps">developers.facebook.com</Ext> and add the <b>Messenger</b> product.</>,
      <>Under Messenger → Settings, connect your Page and generate a <b>Page access token</b>.</>,
      <>Set the webhook to the <b>Meta webhook URL</b> and <b>verify token</b> shown above, and subscribe the Page to <code>messages</code>.</>,
      <>Your Page ID is in your Page → About → Page transparency (or Meta Business Suite settings).</>,
    ],
  },
  instagram: {
    idLabel: "Instagram account ID",
    tokenLabel: "Page access token (of the linked Facebook Page)",
    steps: [
      <>Switch your Instagram to a <b>Professional</b> (Business/Creator) account and link it to your Facebook Page.</>,
      <>In the same Meta app, add Instagram messaging, and allow “Connected tools” in Instagram → Settings → Messages.</>,
      <>Subscribe the webhook (same URL &amp; verify token) to the Instagram <code>messages</code> field.</>,
      <>Use your Instagram professional account ID (shown in the Meta app dashboard) and the linked Page&apos;s access token.</>,
    ],
  },
  whatsapp: {
    idLabel: "Phone number ID",
    tokenLabel: "Access token (System user token recommended)",
    steps: [
      <>In your Meta app add the <b>WhatsApp</b> product. Meta gives you a free test number, or add your own number.</>,
      <>Copy the <b>Phone number ID</b> from WhatsApp → API Setup.</>,
      <>Create a permanent token: Business Settings → System users → Generate token with <code>whatsapp_business_messaging</code>.</>,
      <>Set the webhook (same URL &amp; verify token) and subscribe to the <code>messages</code> field.</>,
    ],
  },
  telegram: {
    tokenLabel: "Bot token",
    steps: [
      <>Open Telegram, chat with <b>@BotFather</b>, send <code>/newbot</code> and follow the steps.</>,
      <>Paste the bot token here. We&apos;ll check it automatically.</>,
      <>After saving, click <b>Register webhook</b> (needs <code>PUBLIC_BASE_URL</code> set to a public HTTPS URL on the backend).</>,
    ],
  },
  demo: {
    steps: [
      <>A fake channel for testing on your computer. Nothing is sent anywhere.</>,
      <>After creating it, use <b>Simulate message</b> to pretend to be a customer and watch the bot reply in the Inbox.</>,
    ],
  },
};

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-brand underline">
      {children}
    </a>
  );
}

export default function ChannelsPage() {
  const { data: channels, isPending, error } = useChannels();
  const [editing, setEditing] = useState<Channel | "new" | null>(null);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      <PageHeader
        title="Channels"
        description="Connect your Facebook Page, Instagram, WhatsApp and Telegram. All use free official APIs."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Add channel
          </Button>
        }
      />

      <SetupInfoCard />

      <div className="mt-6">
        {isPending ? (
          <Spinner />
        ) : error ? (
          <Alert>{errorMessage(error)}</Alert>
        ) : channels.length === 0 ? (
          <Card>
            <EmptyState icon={<Webhook className="size-8" />} title="No channels yet">
              Add your first channel. Tip: start with a <b>Demo</b> channel to test the bot without any account.
            </EmptyState>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {channels.map((c) => (
              <ChannelCard key={c.id} channel={c} onEdit={() => setEditing(c)} />
            ))}
          </div>
        )}
      </div>

      {editing && (
        <ChannelForm channel={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="mb-1 text-xs text-muted">{label}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md bg-surface-2 px-2 py-1.5 font-mono text-xs text-ink">{value}</code>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Copy ${label}`}
          onClick={() => {
            navigator.clipboard?.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function SetupInfoCard() {
  const { data } = useSetupInfo();
  if (!data) return null;
  const isHttps = data.meta_webhook_url.startsWith("https://");
  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-ink">Meta webhook (Facebook, Instagram, WhatsApp)</h2>
        {data.meta_app_secret_configured ? (
          <Badge tone="success">App secret set</Badge>
        ) : (
          <Badge tone="warning">META_APP_SECRET not set</Badge>
        )}
        {data.llm_configured ? <Badge tone="success">AI: {data.llm_model}</Badge> : <Badge>AI not configured</Badge>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <CopyField label="Callback URL" value={data.meta_webhook_url} />
        <CopyField label="Verify token" value={data.meta_verify_token} />
      </div>
      {!isHttps && (
        <Alert tone="warning">
          Meta and Telegram need a public <b>HTTPS</b> URL. For local testing run a free tunnel (e.g.{" "}
          <code>cloudflared tunnel --url http://localhost:8000</code>) and set <code>PUBLIC_BASE_URL</code> in the
          backend <code>.env</code>.
        </Alert>
      )}
    </Card>
  );
}

function ChannelCard({ channel, onEdit }: { channel: Channel; onEdit: () => void }) {
  const save = useSaveChannel();
  const remove = useDeleteChannel();
  const tgWebhook = useSetTelegramWebhook();
  const [simOpen, setSimOpen] = useState(false);

  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start gap-3">
        <PlatformIcon platform={channel.platform} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{channel.name}</p>
          <p className="text-xs text-muted">
            {PLATFORMS[channel.platform]?.label}
            {channel.external_id && <> · {channel.platform === "telegram" ? "@" : "ID "}{channel.external_id}</>}
          </p>
        </div>
        <Toggle
          checked={channel.is_active}
          onChange={(v) => save.mutate({ id: channel.id, data: { is_active: v } })}
          label="Active"
          disabled={save.isPending}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
        <span>{channel.conversation_count} conversations</span>
        {channel.token_preview && <span>· token {channel.token_preview}</span>}
        {!channel.is_active && <Badge tone="warning">Paused</Badge>}
      </div>

      {channel.platform === "telegram" && (
        <div className="mt-3 space-y-2">
          <CopyField label="Webhook URL" value={channel.webhook_url} />
          {tgWebhook.isSuccess && <Alert tone="success">{tgWebhook.data.detail}</Alert>}
          {tgWebhook.isError && <Alert>{errorMessage(tgWebhook.error)}</Alert>}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
        {channel.platform === "telegram" && (
          <Button size="sm" variant="secondary" loading={tgWebhook.isPending} onClick={() => tgWebhook.mutate(channel.id)}>
            <Webhook className="size-3.5" /> Register webhook
          </Button>
        )}
        {channel.platform === "demo" && (
          <Button size="sm" variant="secondary" onClick={() => setSimOpen(true)}>
            <Send className="size-3.5" /> Simulate message
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <Pencil className="size-3.5" /> Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-danger!"
          loading={remove.isPending}
          onClick={() => {
            if (confirm(`Delete "${channel.name}" and all its conversations?`)) remove.mutate(channel.id);
          }}
        >
          <Trash2 className="size-3.5" /> Delete
        </Button>
      </div>

      {simOpen && <SimulateModal channel={channel} onClose={() => setSimOpen(false)} />}
    </Card>
  );
}

function ChannelForm({ channel, onClose }: { channel: Channel | null; onClose: () => void }) {
  const save = useSaveChannel();
  const [platform, setPlatform] = useState<Platform>(channel?.platform ?? "demo");
  const [name, setName] = useState(channel?.name ?? "");
  const [externalId, setExternalId] = useState(channel?.external_id ?? "");
  const [token, setToken] = useState("");
  const help = PLATFORM_HELP[platform];

  function submit(e: FormEvent) {
    e.preventDefault();
    const data = {
      platform,
      name: name.trim() || PLATFORMS[platform].label,
      ...(help.idLabel ? { external_id: externalId.trim() } : {}),
      ...(token.trim() ? { access_token: token.trim() } : {}),
    };
    save.mutate({ id: channel?.id, data }, { onSuccess: onClose });
  }

  return (
    <Modal open onClose={onClose} title={channel ? `Edit ${channel.name}` : "Add channel"} wide>
      <form onSubmit={submit} className="space-y-4">
        {!channel && (
          <Field label="Platform">
            <Select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
              {(Object.keys(PLATFORMS) as Platform[]).map((p) => (
                <option key={p} value={p}>
                  {p === "demo" ? "Demo (local testing)" : PLATFORMS[p].label}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="rounded-lg bg-surface-2 p-3">
          <p className="mb-2 text-xs font-semibold text-ink">How to connect</p>
          <ol className="list-decimal space-y-1 pl-4 text-xs text-muted">
            {help.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>

        <Field label="Display name" hint="Only shown in this dashboard.">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`My ${PLATFORMS[platform].label}`} />
        </Field>
        {help.idLabel && (
          <Field label={help.idLabel}>
            <Input value={externalId} onChange={(e) => setExternalId(e.target.value)} required inputMode="numeric" />
          </Field>
        )}
        {help.tokenLabel && (
          <Field
            label={help.tokenLabel}
            hint={channel?.has_access_token ? `Saved (${channel.token_preview}). Leave blank to keep it.` : "Stored on your server only. Never shown again."}
          >
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required={!channel?.has_access_token}
              autoComplete="off"
            />
          </Field>
        )}

        {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            {channel ? "Save" : "Add channel"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function SimulateModal({ channel, onClose }: { channel: Channel; onClose: () => void }) {
  const simulate = useSimulateMessage();
  const [senderName, setSenderName] = useState("Test Customer");
  const [text, setText] = useState("");
  const [sent, setSent] = useState<number | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    simulate.mutate(
      { id: channel.id, text, sender_name: senderName },
      {
        onSuccess: (data) => {
          setSent(data.conversation_id);
          setText("");
        },
      },
    );
  }

  return (
    <Modal open onClose={onClose} title="Simulate a customer message">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Customer name" hint="Use a different name to start a new conversation.">
          <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} />
        </Field>
        <Field label="Message">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="How much is delivery?" required autoFocus />
        </Field>
        {simulate.isError && <Alert>{errorMessage(simulate.error)}</Alert>}
        {sent && (
          <Alert tone="success">
            Sent! <Link href={`/inbox?c=${sent}`} className="underline">Open the conversation</Link> to see the bot&apos;s reply.
          </Alert>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="submit" loading={simulate.isPending}>
            Send as customer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
