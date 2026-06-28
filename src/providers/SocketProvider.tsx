"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  emit: (event: string, data?: unknown) => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string, callback?: (...args: unknown[]) => void) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  emit: () => {},
  on: () => {},
  off: () => {},
});

export function useSocket() {
  return useContext(SocketContext);
}

interface SocketProviderProps {
  children: React.ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { data: session, status } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      return;
    }

    // Prevent duplicate connections
    if (socketRef.current?.connected) {
      return;
    }

    const getSocketUrl = () => {
      if (typeof window !== "undefined") {
        if (process.env.NODE_ENV === "production") {
          return process.env.NEXT_PUBLIC_SOCKET_URL && !process.env.NEXT_PUBLIC_SOCKET_URL.includes("localhost")
            ? process.env.NEXT_PUBLIC_SOCKET_URL
            : window.location.origin;
        }
        return process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
      }
      return process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_APP_URL || "";
    };

    const socketInstance = io(getSocketUrl(), {
        path: "/api/socket/io",
        transports: ["websocket", "polling"],
        auth: {
          userId: (session.user as Record<string, unknown>).id,
        },
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
      }
    );

    const joinRoom = () => {
      setIsConnected(true);
      if (session?.user) {
        socketInstance.emit("join", (session.user as Record<string, unknown>).id);
      }
    };

    socketInstance.on("connect", joinRoom);
    if (socketInstance.connected) {
      joinRoom();
    }

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      setIsConnected(false);
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    return () => {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [session?.user, status]);

  const emit = useCallback(
    (event: string, data?: unknown) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit(event, data);
      }
    },
    []
  );

  const on = useCallback(
    (event: string, callback: (...args: unknown[]) => void) => {
      socketRef.current?.on(event, callback);
    },
    []
  );

  const off = useCallback(
    (event: string, callback?: (...args: unknown[]) => void) => {
      if (callback) {
        socketRef.current?.off(event, callback);
      } else {
        socketRef.current?.off(event);
      }
    },
    []
  );

  return (
    <SocketContext.Provider value={{ socket, isConnected, emit, on, off }}>
      {children}
    </SocketContext.Provider>
  );
}
