import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./getAccessToken";

/**
 * Base URL of the chat microservice.
 *
 * - In production it should come from `VITE_CHAT_SERVER_URL`.
 * - During local development it falls back to `http://localhost:5000`.
 */
const CHAT_SERVER_URL =
  import.meta.env.VITE_CHAT_SERVER_URL || "http://localhost:5000";

let socket: Socket | null = null;

/**
 * Connect to the chat server with JWT‑based authentication.
 *
 * Behavior:
 * - Reuses an existing connected socket when possible.
 * - Attempts to reconnect a previously created (but disconnected) socket.
 * - Creates a new Socket.IO client using a JWT obtained via `getAccessToken`.
 *
 * @returns The connected `Socket` instance, or `null` if no auth token is available.
 */
export async function connectToChat(): Promise<Socket | null> {
  // If socket exists and is connected, return it
  if (socket && socket.connected) {
    console.log("[SOCKET] Already connected to chat server");
    return socket;
  }

  // If socket exists but is not connected, try to reconnect
  if (socket && !socket.connected) {
    console.log("[SOCKET] Reconnecting existing socket...");
    socket.connect();
    return socket;
  }

  // Get access token
  const token = await getAccessToken();
  if (!token) {
    console.error("[SOCKET] ❌ No access token available");
    return null;
  }

  console.log(`[SOCKET] Creating new connection to chat server: ${CHAT_SERVER_URL}`);
  console.log("[SOCKET] Connecting with JWT token...");

  // Create new socket connection with authentication
  socket = io(CHAT_SERVER_URL, {
    auth: {
      token: token,
    },
    autoConnect: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 45000,
  });

  // Set up connection event listeners only once
  socket.on("connect", () => {
    console.log("[SOCKET] ✅ Connected to chat server");
  });

  socket.on("connect_error", (error) => {
    if (error.message === "timeout") {
      console.log("[SOCKET] Connection attempt is still pending, retrying...");
      return;
    }
    console.error("[SOCKET] ❌ Connection error:", error.message);
  });

  socket.on("disconnect", (reason) => {
    console.log("[SOCKET] ⚠️ Disconnected:", reason);
  });

  return socket;
}

/**
 * Cleanly disconnect the current Socket.IO client from the chat server.
 *
 * After calling this function, `getSocket()` will return `null` until
 * `connectToChat()` is invoked again.
 */
export function disconnectFromChat() {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("[SOCKET] Disconnected from chat server");
  }
}

/**
 * Get the currently cached Socket.IO instance, if any.
 *
 * Note: this function does **not** establish a connection by itself; it only
 * returns the instance previously created by `connectToChat()`.
 *
 * @returns The existing `Socket` instance or `null` when not connected.
 */
export function getSocket(): Socket | null {
  return socket;
}

// Export socket for backward compatibility (will be null until connectToChat is called)
export { socket };
