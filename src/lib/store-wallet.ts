"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "pc_store_wallet";
const EMPTY: string[] = [];

let cache: string[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function readStorage(): string[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): string[] {
  if (!loaded) {
    cache = readStorage();
    loaded = true;
  }
  return cache;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cache = readStorage();
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

// Lưu mã vào kho. Mã đã có thì bỏ qua.
export function saveToWallet(code: string): void {
  const current = getSnapshot();
  if (current.includes(code)) return;
  const next = [...current, code];
  cache = next;
  loaded = true;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

export function useSavedCodes(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
