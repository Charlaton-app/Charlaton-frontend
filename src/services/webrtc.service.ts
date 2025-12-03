/**
 * WebRTC Service
 * 
 * High-level service for managing WebRTC connections in the application.
 * This service provides a clean API for:
 * - Initializing WebRTC connections
 * - Managing peer connections
 * - Handling media streams
 * - Sending and receiving signaling data
 */

import { connectToWebRTC } from "../lib/webrtcSocket.config";
import { webrtcManager } from "../lib/webrtc.config";
import { Socket } from "socket.io-client";

/**
 * WebRTC Service Class
 * Singleton service for managing WebRTC functionality
 */
class WebRTCService {
  private socket: Socket | null = null;
  private currentRoomId: string | null = null;
  private userId: string | null = null;
  private isConnected: boolean = false;

  /**
   * Initialize the WebRTC service and connect to the signaling server
   * 
   * @param roomId - The room ID to join
   * @param userId - The current user's ID
   * @param onRemoteStream - Callback when a remote stream is received
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(
    roomId: string,
    userId: string,
    onRemoteStream?: (stream: MediaStream, userId: string) => void
  ): Promise<boolean> {
    try {
      console.log(`[WEBRTC-SERVICE] Initializing for room ${roomId}, user ${userId}`);

      // Connect to WebRTC signaling server
      this.socket = await connectToWebRTC();
      
      if (!this.socket) {
        console.error("[WEBRTC-SERVICE] ❌ Failed to connect to WebRTC server");
        return false;
      }

      this.currentRoomId = roomId;
      this.userId = userId;

      // Wait for socket connection
      if (!this.socket.connected) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Connection timeout"));
          }, 5000);

          this.socket!.once("connect", () => {
            clearTimeout(timeout);
            resolve();
          });

          this.socket!.once("connect_error", (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      }

      // Join the room
      const joined = await this.joinRoom(roomId);
      
      if (!joined) {
        console.error("[WEBRTC-SERVICE] ❌ Failed to join room");
        return false;
      }

      // Initialize WebRTC manager
      await webrtcManager.initialize(roomId, userId, this.socket);

      // Set remote stream callback if provided
      if (onRemoteStream) {
        webrtcManager.setOnRemoteStreamCallback(onRemoteStream);
      }

      this.isConnected = true;
      console.log("[WEBRTC-SERVICE] ✅ Initialization complete");
      return true;

    } catch (error) {
      console.error("[WEBRTC-SERVICE] ❌ Initialization error:", error);
      return false;
    }
  }

  /**
   * Join a WebRTC room
   * 
   * @param roomId - The room ID to join
   * @returns Promise that resolves to true if successful
   */
  private async joinRoom(roomId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve(false);
        return;
      }

      // Set up listeners
      const onSuccess = () => {
        console.log("[WEBRTC-SERVICE] ✅ Successfully joined room");
        this.socket?.off("join_room_success", onSuccess);
        this.socket?.off("join_room_error", onError);
        resolve(true);
      };

      const onError = (error: { success: boolean; message: string; user?: unknown }) => {
        console.error("[WEBRTC-SERVICE] ❌ Failed to join room:", error);
        this.socket?.off("join_room_success", onSuccess);
        this.socket?.off("join_room_error", onError);
        resolve(false);
      };

      this.socket.once("join_room_success", onSuccess);
      this.socket.once("join_room_error", onError);

      // Emit join room event
      this.socket.emit("join_room", {
        roomId,
        success: true,
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        this.socket?.off("join_room_success", onSuccess);
        this.socket?.off("join_room_error", onError);
        resolve(false);
      }, 5000);
    });
  }

  /**
   * Start local media (audio and/or video)
   * 
   * @param audioEnabled - Enable audio capture
   * @param videoEnabled - Enable video capture
   * @returns Promise that resolves with the local media stream
   */
  async startLocalMedia(
    audioEnabled: boolean = true,
    videoEnabled: boolean = false
  ): Promise<MediaStream | null> {
    return webrtcManager.startLocalMedia(audioEnabled, videoEnabled);
  }

  /**
   * Stop local media streams
   */
  stopLocalMedia(): void {
    webrtcManager.stopLocalMedia();
  }

  /**
   * Create a peer connection to another user and send an offer
   * 
   * @param targetUserId - The ID of the user to connect to
   * @param onRemoteStream - Optional callback for remote stream
   */
  async connectToPeer(
    targetUserId: string,
    onRemoteStream?: (stream: MediaStream, userId: string) => void
  ): Promise<void> {
    await webrtcManager.sendOffer(targetUserId, onRemoteStream);
  }

  /**
   * Toggle local audio
   * 
   * @param enabled - Whether audio should be enabled
   */
  toggleAudio(enabled: boolean): void {
    webrtcManager.toggleAudio(enabled);
  }

  /**
   * Toggle local video
   * 
   * @param enabled - Whether video should be enabled
   */
  toggleVideo(enabled: boolean): void {
    webrtcManager.toggleVideo(enabled);
  }

  /**
   * Update the local stream (useful when toggling video on/off)
   * 
   * @param stream - The new media stream
   */
  updateLocalStream(stream: MediaStream): void {
    webrtcManager.updateLocalStream(stream);
  }

  /**
   * Get the local media stream
   * 
   * @returns The local media stream or null
   */
  getLocalStream(): MediaStream | null {
    return webrtcManager.getLocalStream();
  }

  /**
   * Get all active peer connections
   * 
   * @returns Map of user IDs to peer connection info
   */
  getPeerConnections(): Map<string, { connection: RTCPeerConnection; userId: string; remoteStream: MediaStream }> {
    return webrtcManager.getPeerConnections();
  }

  /**
   * Get the connection state of a peer
   * 
   * @param targetUserId - The user ID to check
   * @returns The connection state or null
   */
  getConnectionState(targetUserId: string): RTCPeerConnectionState | null {
    return webrtcManager.getConnectionState(targetUserId);
  }

  /**
   * Get the ICE connection state of a peer
   * 
   * @param targetUserId - The user ID to check
   * @returns The ICE connection state or null
   */
  getIceConnectionState(targetUserId: string): RTCIceConnectionState | null {
    return webrtcManager.getIceConnectionState(targetUserId);
  }

  /**
   * Get statistics for a peer connection
   * 
   * @param targetUserId - The user ID to get stats for
   * @returns Promise that resolves with RTCStatsReport or null
   */
  async getConnectionStats(targetUserId: string): Promise<RTCStatsReport | null> {
    return webrtcManager.getConnectionStats(targetUserId);
  }

  /**
   * Close a specific peer connection
   * 
   * @param userId - The ID of the user to disconnect from
   */
  closePeerConnection(userId: string): void {
    webrtcManager.closePeerConnection(userId);
  }

  /**
   * Clean up all connections and disconnect
   */
  cleanup(): void {
    console.log("[WEBRTC-SERVICE] Cleaning up");
    
    webrtcManager.cleanup();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.currentRoomId = null;
    this.userId = null;

    console.log("[WEBRTC-SERVICE] ✅ Cleanup complete");
  }

  /**
   * Check if the service is connected and ready
   * 
   * @returns True if connected, false otherwise
   */
  isReady(): boolean {
    return this.isConnected && webrtcManager.isReady();
  }

  /**
   * Get the current room ID
   * 
   * @returns The current room ID or null
   */
  getCurrentRoomId(): string | null {
    return this.currentRoomId;
  }

  /**
   * Get the current user ID
   * 
   * @returns The current user ID or null
   */
  getCurrentUserId(): string | null {
    return this.userId;
  }

  // ===== HELPER METHODS FOR MANUAL SIGNALING (Advanced Use) =====

  /**
   * Manually create an offer for a peer
   * Use this if you need direct control over the signaling process
   * 
   * @param targetUserId - The user ID to create an offer for
   * @returns Promise that resolves with the session description
   */
  async createOffer(targetUserId: string): Promise<RTCSessionDescriptionInit | null> {
    return webrtcManager.createOffer(targetUserId);
  }

  /**
   * Manually create an answer for a peer
   * Use this if you need direct control over the signaling process
   * 
   * @param targetUserId - The user ID to create an answer for
   * @returns Promise that resolves with the session description
   */
  async createAnswer(targetUserId: string): Promise<RTCSessionDescriptionInit | null> {
    return webrtcManager.createAnswer(targetUserId);
  }

  /**
   * Manually add an ICE candidate
   * Use this if you need direct control over the signaling process
   * 
   * @param targetUserId - The user ID
   * @param candidate - The ICE candidate
   * @returns Promise that resolves to true if successful
   */
  async addIceCandidate(
    targetUserId: string,
    candidate: RTCIceCandidateInit
  ): Promise<boolean> {
    return webrtcManager.addIceCandidate(targetUserId, candidate);
  }

  /**
   * Manually set remote description
   * Use this if you need direct control over the signaling process
   * 
   * @param targetUserId - The user ID
   * @param sdp - The session description
   * @returns Promise that resolves to true if successful
   */
  async setRemoteDescription(
    targetUserId: string,
    sdp: RTCSessionDescriptionInit
  ): Promise<boolean> {
    return webrtcManager.setRemoteDescription(targetUserId, sdp);
  }
}

// Export singleton instance
export const webrtcService = new WebRTCService();

// Export class for testing
export { WebRTCService };
