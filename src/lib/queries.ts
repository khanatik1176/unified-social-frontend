"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "./api";
import type {
  BotSettings,
  BotTestResult,
  Channel,
  ChannelInput,
  Conversation,
  ConversationStatus,
  KnowledgeEntry,
  KnowledgeInput,
  Message,
  Paginated,
  Platform,
  SetupInfo,
  Stats,
  User,
} from "./types";

export const keys = {
  me: ["me"] as const,
  stats: ["stats"] as const,
  setup: ["setup-info"] as const,
  channels: ["channels"] as const,
  conversations: (filters: ConversationFilters) => ["conversations", filters] as const,
  allConversations: ["conversations"] as const,
  conversation: (id: number) => ["conversation", id] as const,
  messages: (id: number) => ["messages", id] as const,
  knowledge: ["knowledge"] as const,
  botSettings: ["bot-settings"] as const,
};

// Polling intervals: a free, simple way to get "live" updates.
const INBOX_POLL_MS = 5000;
const CHAT_POLL_MS = 3000;

/* ---------------- Auth / misc ---------------- */

export function useMe() {
  return useQuery({ queryKey: keys.me, queryFn: async () => (await api.get<User>("/auth/me/")).data });
}

export function useStats() {
  return useQuery({
    queryKey: keys.stats,
    queryFn: async () => (await api.get<Stats>("/stats/")).data,
    refetchInterval: 10000,
  });
}

export function useSetupInfo() {
  return useQuery({ queryKey: keys.setup, queryFn: async () => (await api.get<SetupInfo>("/setup-info/")).data });
}

/* ---------------- Channels ---------------- */

export function useChannels() {
  return useQuery({ queryKey: keys.channels, queryFn: async () => (await api.get<Channel[]>("/channels/")).data });
}

export function useSaveChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: ChannelInput }) =>
      id ? (await api.patch<Channel>(`/channels/${id}/`, data)).data : (await api.post<Channel>("/channels/", data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.channels }),
  });
}

export function useDeleteChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/channels/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.channels });
      qc.invalidateQueries({ queryKey: keys.allConversations });
    },
  });
}

export function useSetTelegramWebhook() {
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.post<{ detail: string; url: string }>(`/channels/${id}/set-telegram-webhook/`)).data,
  });
}

export function useSimulateMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, text, sender_name }: { id: string; text: string; sender_name: string }) =>
      (await api.post<{ conversation_id: number }>(`/channels/${id}/simulate/`, { text, sender_name })).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: keys.allConversations });
      qc.invalidateQueries({ queryKey: keys.messages(data.conversation_id) });
      qc.invalidateQueries({ queryKey: keys.stats });
    },
  });
}

/* ---------------- Inbox ---------------- */

export interface ConversationFilters {
  platform?: Platform | "";
  status?: ConversationStatus | "";
  unread?: boolean;
  search?: string;
}

export function useConversations(filters: ConversationFilters) {
  return useQuery({
    queryKey: keys.conversations(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.platform) params.platform = filters.platform;
      if (filters.status) params.status = filters.status;
      if (filters.unread) params.unread = "true";
      if (filters.search) params.search = filters.search;
      return (await api.get<Paginated<Conversation>>("/conversations/", { params })).data;
    },
    refetchInterval: INBOX_POLL_MS,
    placeholderData: (prev) => prev,
  });
}

export function useConversation(id: number | null) {
  return useQuery({
    queryKey: keys.conversation(id ?? 0),
    queryFn: async () => (await api.get<Conversation>(`/conversations/${id}/`)).data,
    enabled: id != null,
    refetchInterval: INBOX_POLL_MS,
  });
}

export function useMessages(conversationId: number | null) {
  return useQuery({
    queryKey: keys.messages(conversationId ?? 0),
    queryFn: async () => (await api.get<Message[]>(`/conversations/${conversationId}/messages/`)).data,
    enabled: conversationId != null,
    refetchInterval: CHAT_POLL_MS,
  });
}

export function useSendMessage(conversationId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) =>
      (await api.post<Message>(`/conversations/${conversationId}/messages/`, { text })).data,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.messages(conversationId) });
      qc.invalidateQueries({ queryKey: keys.conversation(conversationId) });
      qc.invalidateQueries({ queryKey: keys.allConversations });
    },
  });
}

export function useUpdateConversation(conversationId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Pick<Conversation, "status" | "bot_enabled">>) =>
      (await api.patch<Conversation>(`/conversations/${conversationId}/`, data)).data,
    onSuccess: (data) => {
      qc.setQueryData(keys.conversation(conversationId), data);
      qc.invalidateQueries({ queryKey: keys.allConversations });
      qc.invalidateQueries({ queryKey: keys.stats });
    },
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: number) => api.post(`/conversations/${conversationId}/mark-read/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.allConversations });
      qc.invalidateQueries({ queryKey: keys.stats });
    },
  });
}

/* ---------------- Knowledge base ---------------- */

export function useKnowledge() {
  return useQuery({
    queryKey: keys.knowledge,
    queryFn: async () => (await api.get<KnowledgeEntry[]>("/knowledge/")).data,
  });
}

export function useSaveKnowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: number; data: Partial<KnowledgeInput> }) =>
      id
        ? (await api.patch<KnowledgeEntry>(`/knowledge/${id}/`, data)).data
        : (await api.post<KnowledgeEntry>("/knowledge/", data)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.knowledge }),
  });
}

export function useDeleteKnowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => api.delete(`/knowledge/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.knowledge }),
  });
}

/* ---------------- Bot ---------------- */

export function useBotSettings() {
  return useQuery({
    queryKey: keys.botSettings,
    queryFn: async () => (await api.get<BotSettings>("/bot/settings/")).data,
  });
}

export function useSaveBotSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<BotSettings>) => (await api.patch<BotSettings>("/bot/settings/", data)).data,
    onSuccess: (data) => qc.setQueryData(keys.botSettings, data),
  });
}

export function useTestBot() {
  return useMutation({
    mutationFn: async (payload: { message: string; history: { role: "user" | "assistant"; content: string }[] }) =>
      (await api.post<BotTestResult>("/bot/test/", payload)).data,
  });
}
