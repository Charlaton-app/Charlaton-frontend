/**
 * WebRTC Socket Configuration
 * 
 * Manages connection to the dedicated WebRTC signaling server (port 5050)
 * This is SEPARATE from the chat server connection.
 */

import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./getAccessToken";

/**
 * Base URL of the WebRTC signaling microservice.
 *
 * - In production it should come from `VITE_WEBRTC_SERVER_URL`.
 * - During local development it falls back to `http://localhost:5050`.
 */
const WEBRTC_SERVER_URL =
  import.meta.env.VITE_WEBRTC_SERVER_URL || "http://localhost:5050";

let webrtcSocket: Socket | null = null;

/**
 * Connect to the WebRTC signaling server with JWT‑based authentication.
 *
 * Behavior:
 * - Reuses an existing connected socket when possible.
 * - Attempts to reconnect a previously created (but disconnected) socket.
 * - Creates a new Socket.IO client using a JWT obtained via `getAccessToken`.
 *
 * @returns The connected `Socket` instance, or `null` if no auth token is available.
 */
export async function connectToWebRTC(): Promise<Socket | null> {
  // If socket exists and is connected, return it
  if (webrtcSocket && webrtcSocket.connected) {
    console.log("[WEBRTC-SOCKET] Already connected to WebRTC server");
    return webrtcSocket;
  }

  // If socket exists but is not connected, try to reconnect
  if (webrtcSocket && !webrtcSocket.connected) {
    console.log("[WEBRTC-SOCKET] Reconnecting existing socket...");
    webrtcSocket.connect();
    return webrtcSocket;
  }

  // Get access token
  const token = await getAccessToken();
  if (!token) {
    console.error("[WEBRTC-SOCKET] ❌ No access token available");
    return null;
  }

  console.log(
    `[WEBRTC-SOCKET] Creating new connection to WebRTC server: ${WEBRTC_SERVER_URL}`
  );
  console.log("[WEBRTC-SOCKET] Connecting with JWT token...");

  // Create new socket connection with authentication
  webrtcSocket = io(WEBRTC_SERVER_URL, {
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
  webrtcSocket.on("connect", () => {
    console.log("[WEBRTC-SOCKET] ✅ Connected to WebRTC server");
    console.log(`[WEBRTC-SOCKET] Socket ID: ${webrtcSocket?.id}`);
  });

  webrtcSocket.on("connect_error", (error) => {
    if (error.message === "timeout") {
      console.log("[WEBRTC-SOCKET] Connection attempt is still pending, retrying...");
      return;
    }
    console.error("[WEBRTC-SOCKET] ❌ Connection error:", error.message);
  });

  webrtcSocket.on("disconnect", (reason) => {
    console.log("[WEBRTC-SOCKET] ⚠️ Disconnected:", reason);
  });

  webrtcSocket.on("join_room_success", (data) => {
    console.log("[WEBRTC-SOCKET] ✅ Successfully joined WebRTC room:", data);
  });

  webrtcSocket.on("join_room_error", (data) => {
    console.error("[WEBRTC-SOCKET] ❌ Failed to join WebRTC room:", data);
  });

  return webrtcSocket;
}

/**
 * Cleanly disconnect the current Socket.IO client from the WebRTC server.
 *
 * After calling this function, `getWebRTCSocket()` will return `null` until
 * `connectToWebRTC()` is invoked again.
 */
export function disconnectFromWebRTC() {
  if (webrtcSocket) {
    console.log("[WEBRTC-SOCKET] Disconnecting from WebRTC server");
    webrtcSocket.disconnect();
    webrtcSocket = null;
  }
}

/**
 * Get the currently cached Socket.IO instance for WebRTC, if any.
 *
 * Note: this function does **not** establish a connection by itself; it only
 * returns the instance previously created by `connectToWebRTC()`.
 *
 * @returns The existing `Socket` instance or `null` when not connected.
 */
export function getWebRTCSocket(): Socket | null {
  return webrtcSocket;
}

// Export socket for backward compatibility (will be null until connectToWebRTC is called)
export { webrtcSocket };
