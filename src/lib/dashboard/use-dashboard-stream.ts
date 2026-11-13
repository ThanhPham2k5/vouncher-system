"use client";

import { useEffect, useRef, useState } from "react";

export type DashboardEventType =
  | "REDEMPTION_SUCCESS"
  | "REDEMPTION_FAILED"
  | "CLAIMED";

export interface DashboardEvent {
  type: DashboardEventType;
  voucherId: number;
  code: string | null;
  discountAmount: number | null;
  finalAmount: number | null;
  occurredAt: string;
}

interface Options {
  onEvent: (event: DashboardEvent) => void;
  onReconnect?: () => void;
}

// Nhận sự kiện qua BFF /api/admin/realtime. EventSource tự kết nối lại khi mất kết nối.
export function useDashboardStream({ onEvent, onReconnect }: Options) {
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef({ onEvent, onReconnect });

  useEffect(() => {
    handlersRef.current = { onEvent, onReconnect };
  }, [onEvent, onReconnect]);

  useEffect(() => {
    let opened = false;
    const source = new EventSource("/api/admin/realtime");

    source.onopen = () => {
      setConnected(true);
      // Kết nối lại: tải lại số liệu để bù các sự kiện đã bỏ lỡ
      if (opened) handlersRef.current.onReconnect?.();
      opened = true;
    };
    source.onerror = () => setConnected(false);
    source.addEventListener("dashboard", (raw) => {
      try {
        const data = JSON.parse((raw as MessageEvent<string>).data);
        handlersRef.current.onEvent(data as DashboardEvent);
      } catch {
        // Bỏ qua sự kiện không đọc được
      }
    });

    return () => source.close();
  }, []);

  return { connected };
}
