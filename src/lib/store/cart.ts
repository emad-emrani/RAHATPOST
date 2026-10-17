import { useSyncExternalStore } from "react";

/** Cart in localStorage: only product ids + quantities (prices always come from the server). */
export type CartLine = { id: string; qty: number };
const KEY = "rp-cart-v1";
const listeners = new Set<() => void>();
let cache: CartLine[] | null = null;
const EMPTY: CartLine[] = [];

function read(): CartLine[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    cache = Array.isArray(raw)
      ? raw
          .map((l) => ({ id: String(l?.id ?? ""), qty: Math.trunc(Number(l?.qty)) }))
          .filter((l) => /^[a-z0-9]{12,32}$/.test(l.id) && l.qty >= 1 && l.qty <= 20)
          .slice(0, 30)
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(lines: CartLine[]) {
  cache = lines;
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* private mode */
  }
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined")
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      cache = null;
      listeners.forEach((l) => l());
    }
  });

export function useCart(): CartLine[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => EMPTY,
  );
}

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);

export function addToCart(id: string, qty = 1) {
  const lines = [...read()];
  const i = lines.findIndex((l) => l.id === id);
  if (i >= 0) lines[i] = { id, qty: Math.min(20, lines[i].qty + qty) };
  else lines.push({ id, qty: Math.min(20, qty) });
  write(lines.slice(0, 30));
}

export function setQty(id: string, qty: number) {
  write(
    read().map((l) => (l.id === id ? { id, qty: Math.max(1, Math.min(20, Math.trunc(qty))) } : l)),
  );
}

export const removeFromCart = (id: string) => write(read().filter((l) => l.id !== id));
export const clearCart = () => write([]);
export const setCart = (lines: CartLine[]) => write(lines);
