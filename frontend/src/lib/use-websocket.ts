"use client";

import { useEffect, useRef, useState } from "react";

export interface WSEvent {
  type: string;
  task_id?: string;
  data: any;
}

export function useTaskWebSocket(taskId: string | null, onMessage?: (evt: WSEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!taskId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const backendHost = process.env.NEXT_PUBLIC_WS_HOST || (host.includes(":3000") ? "127.0.0.1:8000" : host);
    const wsUrl = `${protocol}//${backendHost}/ws/tasks/${taskId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const parsed: WSEvent = JSON.parse(event.data);
        if (onMessage) {
          onMessage(parsed);
        }
      } catch (err) {
        console.error("WS Parse error", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [taskId]);

  const send = (data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === "string" ? data : JSON.stringify(data));
    }
  };

  return { isConnected, send };
}

export function useGlobalWebSocket(onMessage?: (evt: WSEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const backendHost =
      process.env.NEXT_PUBLIC_WS_HOST ||
      (host.includes(":3000") ? "127.0.0.1:8000" : host);
    const wsUrl = `${protocol}//${backendHost}/ws/global`;

    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isDisposed = false;

    const connect = () => {
      if (isDisposed) return;
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isDisposed) setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const parsed: WSEvent = JSON.parse(event.data);
            if (onMessage && !isDisposed) {
              onMessage(parsed);
            }
          } catch (err) {
            console.error("Global WS Parse error", err);
          }
        };

        ws.onclose = () => {
          if (!isDisposed) {
            setIsConnected(false);
            reconnectTimeout = setTimeout(connect, 5000);
          }
        };

        ws.onerror = () => {
          if (!isDisposed) setIsConnected(false);
        };
      } catch {
        if (!isDisposed) setIsConnected(false);
      }
    };

    connect();

    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  return { isConnected };
}
