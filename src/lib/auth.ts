"use client";

import { useSyncExternalStore } from "react";

const ACCESS_KEY = "usi.access";
const REFRESH_KEY = "usi.refresh";
const CHANGE_EVENT = "usi-auth-change";

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return typeof window === "undefined" ? null : safeGet(ACCESS_KEY);
}

export function getRefreshToken() {
  return typeof window === "undefined" ? null : safeGet(REFRESH_KEY);
}

export function setTokens(access: string, refresh?: string) {
  try {
    window.localStorage.setItem(ACCESS_KEY, access);
    if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearTokens() {
  try {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Current access token (null on the server and when logged out). */
export function useAccessToken() {
  return useSyncExternalStore(subscribe, getAccessToken, () => null);
}

const noopSubscribe = () => () => {};

/** False during server render / hydration, true afterwards. */
export function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
