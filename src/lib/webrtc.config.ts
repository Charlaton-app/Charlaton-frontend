/**
 * WebRTC Configuration and Service
 * 
 * This module handles WebRTC peer-to-peer connections for audio and video streaming.
 * It follows a 1:1 connection model where each participant creates individual connections
 * to every other participant in the room.
 * 
 * Key responsibilities:
 * - Manage local media streams (audio/video)
 * - Create and manage peer connections
 * - Handle WebRTC signaling through the WebSocket chat server
 * - Forward ICE candidates and session descriptions
 */

import { io, Socket } from "socket.io-client";
import { getAccessToken } from "./getAccessToken";

/**
 * Base URL of the WebRTC signaling server
 */
const WEBRTC_SERVER_URL =
  import.meta.env.VITE_WEBRTC_SERVER_URL || "http://localhost:5050";

/**
 * STUN/TURN server configuration for NAT traversal
 */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/**
 * Peer connection configuration
 */
interface PeerConnectionInfo {
  connection: RTCPeerConnection;
  userId: string;
  remoteStream: MediaStream;
}

/**
 * WebRTC Manager class
 * Handles all WebRTC connections for a room
 */
class WebRTCManager {
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, PeerConnectionInfo> = new Map();
  private socket: Socket | null = null;
  private roomId: string | null = null;
  private userId: string | null = null;
  private isInitialized = false;

  /**
   * Initialize the WebRTC manager
   * 
   * @param roomId - The room ID to join
   * @param userId - The current user's ID
   * @param chatSocket - The WebSocket connection for signaling
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(
    roomId: string,
    userId: string,
    chatSocket: Socket
  ): Promise<void> {
    if (this.isInitialized) {
      console.log("[WEBRTC] Already initialized");
      return;
    }

    console.log(`[WEBRTC] Initializing for room ${roomId}, user ${userId}`);

    this.roomId = roomId;
    this.userId = userId;
    this.socket = chatSocket;

    // Setup WebRTC signaling listeners
    this.setupSignalingListeners();

    this.isInitialized = true;
    console.log("[WEBRTC] ✅ Initialization complete");
  }

  /**
   * Setup listeners for WebRTC signaling events
   */
  private setupSignalingListeners(): void {
    if (!this.socket) {
      console.error("[WEBRTC] No socket connection available");
      return;
    }

    console.log("[WEBRTC] Setting up signaling listeners");

    // Handle incoming WebRTC offers
    this.socket.on("webrtc_offer", async ({ senderId, sdp }) => {
      console.log(`[WEBRTC] 📥 Received offer from ${senderId}`);
      await this.handleOffer(senderId, sdp);
    });

    // Handle incoming WebRTC answers
    this.socket.on("webrtc_answer", async ({ senderId, sdp }) => {
      console.log(`[WEBRTC] 📥 Received answer from ${senderId}`);
      await this.handleAnswer(senderId, sdp);
    });

    // Handle incoming ICE candidates
    this.socket.on("webrtc_ice_candidate", async ({ senderId, candidate }) => {
      console.log(`[WEBRTC] 📥 Received ICE candidate from ${senderId}`);
      await this.handleIceCandidate(senderId, candidate);
    });

    // Handle user leaving
    this.socket.on("userLeft", ({ user }) => {
      if (user && user.id) {
        console.log(`[WEBRTC] User ${user.id} left, closing connection`);
        this.closePeerConnection(user.id);
      }
    });

    this.socket.on("userDisconnected", ({ user }) => {
      if (user && user.id) {
        console.log(`[WEBRTC] User ${user.id} disconnected, closing connection`);
        this.closePeerConnection(user.id);
      }
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
    try {
      console.log(`[WEBRTC] Starting local media - audio: ${audioEnabled}, video: ${videoEnabled}`);

      const constraints: MediaStreamConstraints = {
        audio: audioEnabled,
        video: videoEnabled,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("[WEBRTC] ✅ Local media stream acquired");

      return this.localStream;
    } catch (error) {
      console.error("[WEBRTC] ❌ Error accessing media devices:", error);
      throw error;
    }
  }

  /**
   * Stop local media streams
   */
  stopLocalMedia(): void {
    if (this.localStream) {
      console.log("[WEBRTC] Stopping local media");
      this.localStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.localStream = null;
    }
  }

  /**
   * Toggle local audio track
   * 
   * @param enabled - Whether audio should be enabled
   */
  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
      console.log(`[WEBRTC] Audio ${enabled ? "enabled" : "disabled"}`);
    }
  }

  /**
   * Toggle local video track
   * 
   * @param enabled - Whether video should be enabled
   */
  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
      console.log(`[WEBRTC] Video ${enabled ? "enabled" : "disabled"}`);
    }
  }

  /**
   * Create a peer connection to another user
   * 
   * @param targetUserId - The ID of the user to connect to
   * @param onRemoteStream - Callback when remote stream is available
   * @returns The created peer connection
   */
  async createPeerConnection(
    targetUserId: string,
    onRemoteStream?: (stream: MediaStream, userId: string) => void
  ): Promise<RTCPeerConnection | null> {
    if (!this.roomId || !this.socket) {
      console.error("[WEBRTC] Cannot create peer connection - not initialized");
      return null;
    }

    if (this.peerConnections.has(targetUserId)) {
      console.log(`[WEBRTC] Peer connection to ${targetUserId} already exists`);
      return this.peerConnections.get(targetUserId)!.connection;
    }

    console.log(`[WEBRTC] Creating peer connection to ${targetUserId}`);

    const peerConnection = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
    });

    const remoteStream = new MediaStream();

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket && this.roomId) {
        console.log(`[WEBRTC] 📤 Sending ICE candidate to ${targetUserId}`);
        this.socket.emit("webrtc_ice_candidate", {
          roomId: this.roomId,
          targetUserId,
          candidate: event.candidate,
        });
      }
    };

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      console.log(`[WEBRTC] 📥 Received remote track from ${targetUserId}`);
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });

      if (onRemoteStream) {
        onRemoteStream(remoteStream, targetUserId);
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(
        `[WEBRTC] Connection state with ${targetUserId}: ${peerConnection.connectionState}`
      );

      if (
        peerConnection.connectionState === "failed" ||
        peerConnection.connectionState === "closed"
      ) {
        console.log(`[WEBRTC] Connection to ${targetUserId} failed/closed`);
        this.closePeerConnection(targetUserId);
      }
    };

    // Store peer connection
    this.peerConnections.set(targetUserId, {
      connection: peerConnection,
      userId: targetUserId,
      remoteStream,
    });

    return peerConnection;
  }

  /**
   * Create and send an offer to another user
   * 
   * @param targetUserId - The ID of the user to send the offer to
   * @param onRemoteStream - Callback when remote stream is available
   */
  async sendOffer(
    targetUserId: string,
    onRemoteStream?: (stream: MediaStream, userId: string) => void
  ): Promise<void> {
    if (!this.roomId || !this.socket) {
      console.error("[WEBRTC] Cannot send offer - not initialized");
      return;
    }

    console.log(`[WEBRTC] 📤 Creating and sending offer to ${targetUserId}`);

    const peerConnection = await this.createPeerConnection(
      targetUserId,
      onRemoteStream
    );

    if (!peerConnection) {
      console.error("[WEBRTC] Failed to create peer connection");
      return;
    }

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      this.socket.emit("webrtc_offer", {
        roomId: this.roomId,
        targetUserId,
        sdp: offer,
      });

      console.log(`[WEBRTC] ✅ Offer sent to ${targetUserId}`);
    } catch (error) {
      console.error(`[WEBRTC] ❌ Error creating offer for ${targetUserId}:`, error);
    }
  }

  /**
   * Handle incoming offer from another user
   * 
   * @param senderId - The ID of the user who sent the offer
   * @param sdp - The session description
   */
  private async handleOffer(
    senderId: string,
    sdp: RTCSessionDescriptionInit
  ): Promise<void> {
    if (!this.roomId || !this.socket) {
      console.error("[WEBRTC] Cannot handle offer - not initialized");
      return;
    }

    console.log(`[WEBRTC] Handling offer from ${senderId}`);

    const peerConnection = await this.createPeerConnection(senderId);

    if (!peerConnection) {
      console.error("[WEBRTC] Failed to create peer connection for offer");
      return;
    }

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      this.socket.emit("webrtc_answer", {
        roomId: this.roomId,
        targetUserId: senderId,
        sdp: answer,
      });

      console.log(`[WEBRTC] ✅ Answer sent to ${senderId}`);
    } catch (error) {
      console.error(`[WEBRTC] ❌ Error handling offer from ${senderId}:`, error);
    }
  }

  /**
   * Handle incoming answer from another user
   * 
   * @param senderId - The ID of the user who sent the answer
   * @param sdp - The session description
   */
  private async handleAnswer(
    senderId: string,
    sdp: RTCSessionDescriptionInit
  ): Promise<void> {
    console.log(`[WEBRTC] Handling answer from ${senderId}`);

    const peerInfo = this.peerConnections.get(senderId);

    if (!peerInfo) {
      console.error(`[WEBRTC] No peer connection found for ${senderId}`);
      return;
    }

    try {
      await peerInfo.connection.setRemoteDescription(
        new RTCSessionDescription(sdp)
      );
      console.log(`[WEBRTC] ✅ Remote description set for ${senderId}`);
    } catch (error) {
      console.error(`[WEBRTC] ❌ Error handling answer from ${senderId}:`, error);
    }
  }

  /**
   * Handle incoming ICE candidate from another user
   * 
   * @param senderId - The ID of the user who sent the candidate
   * @param candidate - The ICE candidate
   */
  private async handleIceCandidate(
    senderId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    const peerInfo = this.peerConnections.get(senderId);

    if (!peerInfo) {
      console.error(`[WEBRTC] No peer connection found for ICE candidate from ${senderId}`);
      return;
    }

    try {
      await peerInfo.connection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log(`[WEBRTC] ✅ ICE candidate added for ${senderId}`);
    } catch (error) {
      console.error(`[WEBRTC] ❌ Error adding ICE candidate from ${senderId}:`, error);
    }
  }

  /**
   * Close a peer connection to a specific user
   * 
   * @param userId - The ID of the user to disconnect from
   */
  closePeerConnection(userId: string): void {
    const peerInfo = this.peerConnections.get(userId);

    if (peerInfo) {
      console.log(`[WEBRTC] Closing peer connection to ${userId}`);
      peerInfo.connection.close();
      this.peerConnections.delete(userId);
    }
  }

  /**
   * Close all peer connections and cleanup
   */
  cleanup(): void {
    console.log("[WEBRTC] Cleaning up all connections");

    // Close all peer connections
    this.peerConnections.forEach((peerInfo, userId) => {
      console.log(`[WEBRTC] Closing connection to ${userId}`);
      peerInfo.connection.close();
    });
    this.peerConnections.clear();

    // Stop local media
    this.stopLocalMedia();

    // Remove event listeners
    if (this.socket) {
      this.socket.off("webrtc_offer");
      this.socket.off("webrtc_answer");
      this.socket.off("webrtc_ice_candidate");
      this.socket.off("userLeft");
      this.socket.off("userDisconnected");
    }

    this.isInitialized = false;
    this.roomId = null;
    this.userId = null;
    this.socket = null;

    console.log("[WEBRTC] ✅ Cleanup complete");
  }

  /**
   * Get all active peer connections
   * 
   * @returns Map of user IDs to peer connection info
   */
  getPeerConnections(): Map<string, PeerConnectionInfo> {
    return this.peerConnections;
  }

  /**
   * Get the local media stream
   * 
   * @returns The local media stream or null
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Check if the manager is initialized
   * 
   * @returns True if initialized, false otherwise
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Export a singleton instance
export const webrtcManager = new WebRTCManager();

// Export the class for testing purposes
export { WebRTCManager };
