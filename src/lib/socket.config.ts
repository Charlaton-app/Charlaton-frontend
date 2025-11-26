import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./getAccessToken";

// Chat server URL (puerto 4000)
const CHAT_SERVER_URL =
  import.meta.env.VITE_CHAT_SERVER_URL || "http://localhost:4000";

let socket: Socket | null = null;

/**
 * Connect to the chat server with JWT authentication
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
 * Disconnect from the chat server
 */
export function disconnectFromChat() {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("[SOCKET] Disconnected from chat server");
  }
}

/**
 * Get the current socket instance
 */
export function getSocket(): Socket | null {
  return socket;
}

// Export socket for backward compatibility (will be null until connectToChat is called)
export { socket };
