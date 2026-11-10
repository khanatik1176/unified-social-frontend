export type Platform = "facebook" | "instagram" | "whatsapp" | "telegram" | "demo";

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Channel {
  id: string;
  platform: Platform;
  platform_display: string;
  name: string;
  external_id: string;
  has_access_token: boolean;
  token_preview: string;
  webhook_url: string;
  is_active: boolean;
  conversation_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChannelInput {
  platform?: Platform;
  name?: string;
  external_id?: string;
  access_token?: string;
  is_active?: boolean;
}

export type ConversationStatus = "open" | "needs_human" | "closed";

export interface Conversation {
  id: number;
  channel: { id: string; platform: Platform; name: string };
  contact: { id: number; external_id: string; name: string; display_name: string };
  status: ConversationStatus;
  bot_enabled: boolean;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string;
  created_at: string;
}

export interface Message {
  id: number;
  conversation: number;
  direction: "in" | "out";
  sender: "customer" | "bot" | "agent";
  text: string;
  status: "received" | "sent" | "failed";
  error: string;
  created_at: string;
}

export interface KnowledgeEntry {
  id: number;
  question: string;
  answer: string;
  keywords: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type KnowledgeInput = Pick<KnowledgeEntry, "question" | "answer" | "keywords" | "category" | "is_active">;

export interface BotSettings {
  enabled: boolean;
  business_name: string;
  business_description: string;
  tone: string;
  greeting_message: string;
  fallback_message: string;
  handoff_keywords: string;
  use_llm: boolean;
  match_threshold: number;
  llm_configured: boolean;
  llm_model: string;
  updated_at: string;
}

export interface BotTestResult {
  reply: string;
  source: "llm" | "knowledge" | "greeting" | "fallback" | "handoff";
  handoff: boolean;
  matched_entries: { id: number; question: string }[];
}

export interface Stats {
  conversations: { total: number; open: number; needs_human: number; unread_messages: number };
  last_24h: { received: number; bot_replies: number; agent_replies: number; failed: number };
  by_platform: { platform: Platform; conversations: number; unread: number }[];
}

export interface SetupInfo {
  meta_webhook_url: string;
  meta_verify_token: string;
  meta_app_secret_configured: boolean;
  meta_graph_version: string;
  public_base_url: string;
  llm_configured: boolean;
  llm_model: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
}
