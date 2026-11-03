"use client";

import { useSyncExternalStore } from "react";

export interface CartItem {
  sku: string;
  name: string;
  price: number;
  quantity: number;
}

const STORAGE_KEY = "pc_store_cart";
const EMPTY: CartItem[] = [];

let cache: CartItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function readStorage(): CartItem[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): CartItem[] {
  if (!loaded) {
    cache = readStorage();
    loaded = true;
  }
  return cache;
}

function getServerSnapshot(): CartItem[] {
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

function write(items: CartItem[]): void {
  cache = items;
  loaded = true;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  listeners.forEach((listener) => listener());
}

export function addToCart(product: {
  sku: string;
  name: string;
  price: number;
}): void {
  const current = getSnapshot();
  const existing = current.find((item) => item.sku === product.sku);
  const next = existing
    ? current.map((item) =>
        item.sku === product.sku
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      )
    : [...current, { ...product, quantity: 1 }];
  write(next);
}

// Số lượng <= 0 thì xóa khỏi giỏ
export function setCartQuantity(sku: string, quantity: number): void {
  const current = getSnapshot();
  const next =
    quantity <= 0
      ? current.filter((item) => item.sku !== sku)
      : current.map((item) =>
          item.sku === sku ? { ...item, quantity } : item,
        );
  write(next);
}

export function removeFromCart(sku: string): void {
  write(getSnapshot().filter((item) => item.sku !== sku));
}

export function clearCart(): void {
  write([]);
}

export function useStoreCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  return { items, count, subtotal };
}
