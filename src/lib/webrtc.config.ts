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
  private isInitialized = false;
  private defaultOnRemoteStream: ((stream: MediaStream, userId: string) => void) | undefined;

  /**
   * Initialize the WebRTC manager
   *
   * @param roomId - The room ID to join
   * @param userId - The current user's ID
   * @param webrtcSocket - The WebSocket connection for WebRTC signaling
   * @param onRemoteStream - Default callback when remote stream is available
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(
    roomId: string,
    userId: string,
    webrtcSocket: Socket,
    onRemoteStream?: (stream: MediaStream, userId: string) => void
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
    this.defaultOnRemoteStream = onRemoteStream;

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

    // Store the onRemoteStream callback for later use
    const storedCallback = onRemoteStream;

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
        `[WEBRTC] Track kind: ${event.track.kind}, enabled: ${event.track.enabled}, readyState: ${event.track.readyState}`
      );
      console.log(`[WEBRTC] Streams count: ${event.streams.length}`);
      
      if (event.streams && event.streams[0]) {
        // Use the stream provided by the event directly
        const incomingStream = event.streams[0];
        
        console.log(`[WEBRTC] Stream has ${incomingStream.getTracks().length} tracks`);
        incomingStream.getTracks().forEach(track => {
          console.log(`[WEBRTC]   - ${track.kind}: enabled=${track.enabled}, readyState=${track.readyState}`);
        });
        
        // Update remoteStream with the incoming stream
        // Clear existing tracks first
        remoteStream.getTracks().forEach(track => {
          remoteStream.removeTrack(track);
        });
        
        // Add all tracks from incoming stream
        incomingStream.getTracks().forEach((track) => {
          remoteStream.addTrack(track);
          console.log(`[WEBRTC] Added ${track.kind} track to remoteStream`);
        });

        // Call the callback with the updated stream
        if (storedCallback) {
          console.log(
            `[WEBRTC] Calling onRemoteStream callback for ${targetUserId}`
          );
          storedCallback(remoteStream, targetUserId);
        } else {
          console.warn(
            `[WEBRTC] ⚠️ No onRemoteStream callback registered for ${targetUserId}`
          );
        }
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
      console.error(`[WEBRTC] roomId: ${this.roomId}, socket: ${!!this.socket}`);
      return;
    }

    console.log(`[WEBRTC] 📤 Creating and sending offer to ${targetUserId}`);
    console.log(`[WEBRTC] Socket connected: ${this.socket.connected}, Socket ID: ${this.socket.id}`);

    const peerConnection = await this.createPeerConnection(
      targetUserId,
      onRemoteStream
    );

    if (!peerConnection) {
      console.error("[WEBRTC] Failed to create peer connection");
      return;
    }

    console.log(`[WEBRTC] Peer connection created for ${targetUserId}`);
    console.log(`[WEBRTC] Connection state: ${peerConnection.connectionState}`);
    console.log(`[WEBRTC] ICE connection state: ${peerConnection.iceConnectionState}`);
    console.log(`[WEBRTC] Signaling state: ${peerConnection.signalingState}`);

    try {
      // Ensure we have local tracks before creating offer
      if (this.localStream) {
        console.log(`[WEBRTC] Local stream has ${this.localStream.getTracks().length} tracks before offer`);
        this.localStream.getTracks().forEach(track => {
          console.log(`[WEBRTC]   - ${track.kind}: enabled=${track.enabled}, readyState=${track.readyState}`);
        });
      } else {
        console.warn("[WEBRTC] ⚠️ NO LOCAL STREAM when creating offer!");
      }

      console.log(`[WEBRTC] Creating offer for ${targetUserId}...`);
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      console.log(`[WEBRTC] Offer created for ${targetUserId}:`, offer.type);
      
      await peerConnection.setLocalDescription(offer);
      console.log(`[WEBRTC] Local description set for ${targetUserId}`);

      console.log(`[WEBRTC] Emitting webrtc_offer to socket...`);
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

    console.log(`[WEBRTC] 🔵 Handling offer from ${senderId}`);
    console.log(`[WEBRTC] Offer type: ${sdp.type}`);

    // Create peer connection with the default onRemoteStream callback stored during initialization
    const peerConnection = await this.createPeerConnection(senderId, this.defaultOnRemoteStream);

    if (!peerConnection) {
      console.error("[WEBRTC] Failed to create peer connection for offer");
      return;
    }

    console.log(`[WEBRTC] Peer connection created, setting remote description...`);

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      console.log(`[WEBRTC] ✅ Remote description set for ${senderId}`);
      console.log(`[WEBRTC] Connection state: ${peerConnection.connectionState}`);
      console.log(`[WEBRTC] Signaling state: ${peerConnection.signalingState}`);

      // Ensure we have local tracks before creating answer
      if (this.localStream) {
        console.log(`[WEBRTC] Local stream has ${this.localStream.getTracks().length} tracks before answer`);
        this.localStream.getTracks().forEach(track => {
          console.log(`[WEBRTC]   - ${track.kind}: enabled=${track.enabled}, readyState=${track.readyState}`);
        });
      } else {
        console.warn("[WEBRTC] ⚠️ NO LOCAL STREAM when creating answer!");
      }

      console.log(`[WEBRTC] Creating answer for ${senderId}...`);
      const answer = await peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      console.log(`[WEBRTC] Answer created for ${senderId}:`, answer.type);
      
      await peerConnection.setLocalDescription(answer);
      console.log(`[WEBRTC] Local description (answer) set for ${senderId}`);

      console.log(`[WEBRTC] Emitting webrtc_answer to socket...`);
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
    console.log(`[WEBRTC] 🟢 Handling answer from ${senderId}`);
    console.log(`[WEBRTC] Answer type: ${sdp.type}`);

    const peerInfo = this.peerConnections.get(senderId);

    if (!peerInfo) {
      console.error(`[WEBRTC] ❌ No peer connection found for ${senderId}`);
      console.error(`[WEBRTC] Available peers: ${Array.from(this.peerConnections.keys()).join(', ')}`);
      return;
    }

    console.log(`[WEBRTC] Peer connection found for ${senderId}`);
    console.log(`[WEBRTC] Current signaling state: ${peerInfo.connection.signalingState}`);

    try {
      await peerInfo.connection.setRemoteDescription(
        new RTCSessionDescription(sdp)
      );
      console.log(`[WEBRTC] ✅ Remote description (answer) set for ${senderId}`);
      console.log(`[WEBRTC] Connection state: ${peerInfo.connection.connectionState}`);
      console.log(`[WEBRTC] ICE connection state: ${peerInfo.connection.iceConnectionState}`);
      console.log(`[WEBRTC] Signaling state: ${peerInfo.connection.signalingState}`);
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
    console.log(`[WEBRTC] 🧊 Handling ICE candidate from ${senderId}`);
    console.log(`[WEBRTC] Candidate: ${candidate.candidate?.substring(0, 50)}...`);

    const peerInfo = this.peerConnections.get(senderId);

    if (!peerInfo) {
      console.error(
        `[WEBRTC] ❌ No peer connection found for ICE candidate from ${senderId}`
      );
      console.error(`[WEBRTC] Available peers: ${Array.from(this.peerConnections.keys()).join(', ')}`);
      return;
    }

    console.log(`[WEBRTC] Peer connection found, adding ICE candidate`);
    console.log(`[WEBRTC] Current ICE connection state: ${peerInfo.connection.iceConnectionState}`);

    try {
      await peerInfo.connection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log(`[WEBRTC] ✅ ICE candidate added for ${senderId}`);
      console.log(`[WEBRTC] New ICE connection state: ${peerInfo.connection.iceConnectionState}`);
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
