import clsx from "clsx";

import type { Platform } from "@/lib/types";

export const PLATFORMS: Record<Platform, { label: string; short: string; color: string }> = {
  facebook: { label: "Messenger", short: "FB", color: "#0866ff" },
  instagram: { label: "Instagram", short: "IG", color: "#d62976" },
  whatsapp: { label: "WhatsApp", short: "WA", color: "#1fa855" },
  telegram: { label: "Telegram", short: "TG", color: "#229ed9" },
  demo: { label: "Demo", short: "DM", color: "#6b7280" },
};

export function PlatformIcon({ platform, size = "md" }: { platform: Platform; size?: "sm" | "md" }) {
  const p = PLATFORMS[platform] ?? PLATFORMS.demo;
  return (
    <span
      title={p.label}
      style={{ backgroundColor: p.color }}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        size === "sm" ? "size-4 text-[7px]" : "size-6 text-[9px]",
      )}
    >
      {p.short}
    </span>
  );
}

export function PlatformLabel({ platform }: { platform: Platform }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <PlatformIcon platform={platform} size="sm" />
      {PLATFORMS[platform]?.label ?? platform}
    </span>
  );
}
