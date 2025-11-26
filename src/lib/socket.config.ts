import { io, Socket } from "socket.io-client";

// Configuración del socket para desarrollo y producción
const CHAT_SERVER_URL = import.meta.env.VITE_CHAT_SERVER_URL || "http://localhost:4000";

console.log("[SOCKET] Connecting to chat server:", CHAT_SERVER_URL);

/**
 * Socket.IO instance for real-time chat
 * Note: Requires JWT token for authentication
 */
export const socket: Socket = io(CHAT_SERVER_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  // Auth will be set dynamically when connecting
  auth: {},
});

/**
 * Connect to chat server with JWT token
 * @param accessToken - JWT access token from authentication
 */
export function connectToChat(accessToken: string) {
  if (socket.connected) {
    console.log("[SOCKET] Already connected");
    return;
  }

  // Set JWT token for authentication
  socket.auth = { token: accessToken };
  
  console.log("[SOCKET] Connecting with JWT token...");
  socket.connect();
}

/**
 * Disconnect from chat server
 */
export function disconnectFromChat() {
  if (socket.connected) {
    console.log("[SOCKET] Disconnecting...");
    socket.disconnect();
  }
}
