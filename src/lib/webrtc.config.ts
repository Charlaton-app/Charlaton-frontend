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

import { Socket } from "socket.io-client";

/**
 * STUN/TURN server configuration for NAT traversal
 */
const ICE_SERVERS: RTCIceServer[] = [
  { 
    urls: "stun:relay1.expressturn.com:3478"
  },
  { 
    urls: "turn:relay1.expressturn.com:3480",
    username: "000000002080065511",
    credential: "wt8JcNe7xofmCsmfdkwmXvG1QvA="
  },
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
  private isInitialized = false;
  private onRemoteStreamCallback:
    | ((stream: MediaStream, userId: string) => void)
    | null = null;

  /**
   * Initialize the WebRTC manager
   *
   * @param roomId - The room ID to join
   * @param userId - The current user's ID
   * @param webrtcSocket - The WebSocket connection for WebRTC signaling
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(
    roomId: string,
    userId: string,
    webrtcSocket: Socket
  ): Promise<void> {
    if (this.isInitialized) {
      console.log("[WEBRTC] Already initialized");
      return;
    }

    console.log(`[WEBRTC] Initializing for room ${roomId}, user ${userId}`);
    console.log(`[WEBRTC] Socket connected: ${webrtcSocket?.connected}`);
    console.log(`[WEBRTC] Socket ID: ${webrtcSocket?.id}`);

    this.roomId = roomId;
    this.socket = webrtcSocket;

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
        console.log(
          `[WEBRTC] User ${user.id} disconnected, closing connection`
        );
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
      console.log(
        `[WEBRTC] Starting local media - audio: ${audioEnabled}, video: ${videoEnabled}`
      );

      const constraints: MediaStreamConstraints = {
        audio: audioEnabled,
        video: videoEnabled,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("[WEBRTC] ✅ Local media stream acquired");
      console.log(
        `[WEBRTC] 🎤 Audio tracks: ${this.localStream.getAudioTracks().length}`
      );
      console.log(
        `[WEBRTC] 📹 Video tracks: ${this.localStream.getVideoTracks().length}`
      );
      this.localStream.getTracks().forEach((track) => {
        console.log(
          `[WEBRTC] Track: ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`
        );
      });

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
   * Update the local media stream used by all existing peer connections.
   * This is useful when the user toggles the camera and we obtain
   * a new MediaStream that includes video tracks.
   */
  updateLocalStream(stream: MediaStream): void {
    console.log("[WEBRTC] 🔄 Updating local stream for all peer connections");

    // Replace reference
    this.localStream = stream;

    this.peerConnections.forEach(({ connection }) => {
      const senders = connection.getSenders();

      stream.getTracks().forEach((track) => {
        const existingSender = senders.find(
          (s) => s.track && s.track.kind === track.kind
        );

        if (existingSender) {
          console.log(
            `[WEBRTC] Replacing ${track.kind} track on existing sender ${existingSender.track?.id}`
          );
          existingSender
            .replaceTrack(track)
            .catch((err) =>
              console.error(
                `[WEBRTC] ❌ Error replacing ${track.kind} track:`,
                err
              )
            );
        } else {
          console.log(
            `[WEBRTC] Adding new ${track.kind} track to peer connection`
          );
          connection.addTrack(track, stream);
        }
      });
    });
  }

  /**
   * Toggle local audio track
   *
   * @param enabled - Whether audio should be enabled
   */
  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      console.log(
        `[WEBRTC] 🎤 Toggling audio to ${enabled}, tracks: ${audioTracks.length}`
      );
      audioTracks.forEach((track) => {
        track.enabled = enabled;
        console.log(
          `[WEBRTC] Audio track ${track.id} enabled: ${track.enabled}`
        );
      });
    } else {
      console.warn("[WEBRTC] ⚠️ Cannot toggle audio: no local stream");
    }
  }

  /**
   * Toggle local video track
   *
   * @param enabled - Whether video should be enabled
   */
  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      console.log(
        `[WEBRTC] 📹 Toggling video to ${enabled}, tracks: ${videoTracks.length}`
      );
      videoTracks.forEach((track) => {
        track.enabled = enabled;
        console.log(
          `[WEBRTC] Video track ${track.id} enabled: ${track.enabled}`
        );
      });
    } else {
      console.warn("[WEBRTC] ⚠️ Cannot toggle video: no local stream");
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
      console.log(
        `[WEBRTC] Adding local tracks to peer connection for ${targetUserId}`
      );
      this.localStream.getTracks().forEach((track) => {
        console.log(
          `[WEBRTC] Adding ${track.kind} track (enabled: ${track.enabled}) to ${targetUserId}`
        );
        peerConnection.addTrack(track, this.localStream!);
      });
    } else {
      console.warn(
        `[WEBRTC] ⚠️ No local stream available when creating peer to ${targetUserId}`
      );
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
      console.log(
        `[WEBRTC] Track kind: ${event.track.kind}, enabled: ${event.track.enabled}`
      );
      console.log(`[WEBRTC] Streams count: ${event.streams.length}`);
      event.streams[0].getTracks().forEach((track) => {
        console.log(`[WEBRTC] Adding remote ${track.kind} track to stream`);
        remoteStream.addTrack(track);
      });

      const handler = onRemoteStream || this.onRemoteStreamCallback;
      if (handler) {
        console.log(
          `[WEBRTC] Calling onRemoteStream callback for ${targetUserId}`
        );
        handler(remoteStream, targetUserId);
      } else {
        console.warn(
          `[WEBRTC] ⚠️ No onRemoteStream callback registered for ${targetUserId}`
        );
      }
    };

    // Store peer connection

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

    this.peerConnections.set(targetUserId, {
      connection: peerConnection,
      userId: targetUserId,
      remoteStream,
    });

    return peerConnection;
  }

  /**
   * Configure a default handler for remote streams.
   * This is used when peer connections are created implicitly
   * from incoming offers/answers.
   */
  setOnRemoteStreamCallback(
    handler: (stream: MediaStream, userId: string) => void
  ): void {
    this.onRemoteStreamCallback = handler;
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
      console.error(
        `[WEBRTC] ❌ Error creating offer for ${targetUserId}:`,
        error
      );
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
      console.error(
        `[WEBRTC] ❌ Error handling offer from ${senderId}:`,
        error
      );
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
      console.error(
        `[WEBRTC] ❌ Error handling answer from ${senderId}:`,
        error
      );
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
      console.error(
        `[WEBRTC] No peer connection found for ICE candidate from ${senderId}`
      );
      return;
    }

    try {
      await peerInfo.connection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log(`[WEBRTC] ✅ ICE candidate added for ${senderId}`);
    } catch (error) {
      console.error(
        `[WEBRTC] ❌ Error adding ICE candidate from ${senderId}:`,
        error
      );
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
