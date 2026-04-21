import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  TursorWebSocketContext,
  type TursorWebSocketContextValue,
  type TursorWsStatus,
} from "./tursorWebSocketContext";
import { io, type Socket } from "socket.io-client";
import { getVsCodeApi } from "../vscodeApi";
import {
  setHostSocketBridgeHandler,
  type TursorSocketHostToWebview,
} from "../vscodeHostSocketBridge";

type Listener = (data: unknown) => void;

/** Prefer IPv4 loopback: `localhost` can resolve to ::1 while the server listens on 127.0.0.1 only. */
const DEFAULT_SOCKET_URL = "http://127.0.0.1:9090";
const DEFAULT_SOCKET_PATH = "/ws";
/** Polling first: extension host (Node) tolerates this; webview uses host bridge instead of browser XHR. */
const TRANSPORTS = ["polling", "websocket"] as const;

/** In extension webviews, `localhost` may resolve to ::1 while the dev server binds IPv4 only. */
function preferIpv4Loopback(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "localhost") {
      u.hostname = "127.0.0.1";
      return u.toString().replace(/\/$/, "");
    }
  } catch {
    /* ignore */
  }
  return url;
}

function resolveSocketUrl(): string {
  const fromEnv = import.meta.env.VITE_TURSOR_SOCKET_URL as string | undefined;
  const raw = fromEnv?.trim() ? fromEnv.trim() : DEFAULT_SOCKET_URL;
  return preferIpv4Loopback(raw);
}

function resolveSocketPath(): string {
  const fromEnv = import.meta.env.VITE_TURSOR_SOCKET_PATH as string | undefined;
  if (fromEnv?.trim()) return fromEnv.trim();
  return DEFAULT_SOCKET_PATH;
}

function disposeSocket(socket: Socket) {
  socket.removeAllListeners();
  socket.disconnect();
}

export function TursorWebSocketProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<TursorWsStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const listenersRef = useRef(new Set<Listener>());
  const socketRef = useRef<Socket | null>(null);
  const bridgeConnectedRef = useRef(false);

  const vscode = getVsCodeApi();

  const handleHostSocket = useCallback(
    (data: TursorSocketHostToWebview) => {
      if (data.event === "connected") {
        bridgeConnectedRef.current = true;
        setStatus("connected");
        setLastError(null);
        return;
      }

      if (data.event === "connect_error") {
        bridgeConnectedRef.current = false;
        setLastError(data.message);
        setStatus("error");
        return;
      }

      if (data.event === "disconnected") {
        bridgeConnectedRef.current = false;
        setStatus("disconnected");
        return;
      }

      if (data.event === "socket_error") {
        return;
      }

      if (data.event === "serverMessage") {
        listenersRef.current.forEach((fn) => {
          try {
            fn(data.payload);
          } catch {
            /* listener isolation */
          }
        });
      }
    },
    [],
  );

  useLayoutEffect(() => {
    if (vscode) {
      setHostSocketBridgeHandler(handleHostSocket);
    } else {
      setHostSocketBridgeHandler(null);
    }
    return () => {
      setHostSocketBridgeHandler(null);
    };
  }, [vscode, handleHostSocket]);

  const disconnect = useCallback(() => {
    if (vscode) {
      vscode.postMessage({ type: "tursorSocket", action: "disconnect" });
      bridgeConnectedRef.current = false;
      setStatus("disconnected");
      return;
    }

    const s = socketRef.current;
    if (s) {
      disposeSocket(s);
      socketRef.current = null;
    }
    setStatus("disconnected");
  }, [vscode]);

  const connect = useCallback(() => {
    const url = resolveSocketUrl();
    const path = resolveSocketPath();
    setLastError(null);
    setStatus("connecting");

    if (vscode) {
      if (bridgeConnectedRef.current) {
        return;
      }
      vscode.postMessage({
        type: "tursorSocket",
        action: "connect",
        url,
        path,
        transports: [...TRANSPORTS],
      });
      return;
    }

    if (socketRef.current?.connected) {
      return;
    }

    const stale = socketRef.current;
    if (stale) {
      disposeSocket(stale);
      socketRef.current = null;
    }

    const socket = io(url, {
      path,
      transports: [...TRANSPORTS],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connected");
      setLastError(null);
    });

    socket.on("disconnect", () => {
      setStatus("disconnected");
    });

    socket.on("connect_error", (err: unknown) => {
      setLastError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    });

    socket.on("message", (data: unknown) => {
      listenersRef.current.forEach((fn) => {
        try {
          fn(data);
        } catch {
          /* listener isolation */
        }
      });
    });
  }, [vscode]);

  const send = useCallback(
    (payload: unknown) => {
      if (vscode) {
        vscode.postMessage({
          type: "tursorSocket",
          action: "emit",
          event: "message",
          payload,
        });
        return;
      }
      socketRef.current?.emit("message", payload);
    },
    [vscode],
  );

  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value = useMemo<TursorWebSocketContextValue>(
    () => ({
      status,
      lastError,
      connect,
      disconnect,
      send,
      subscribe,
    }),
    [status, lastError, connect, disconnect, send, subscribe],
  );

  return (
    <TursorWebSocketContext.Provider value={value}>
      {children}
    </TursorWebSocketContext.Provider>
  );
}
