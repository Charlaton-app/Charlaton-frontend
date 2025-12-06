/**
 * Signaling Manager
 * 
 * Manages WebRTC signaling through Socket.IO
 * Responsibilities:
 * - Handle offer/answer exchange
 * - Manage ICE candidate exchange
 * - Coordinate signaling with connection manager
 */

import type { Socket } from "socket.io-client";
import type { ConnectionManager } from "./connection-manager";
import type { RemoteStreamCallback } from "./types";

export class SignalingManager {
  private socket: Socket | null = null;
  private roomId: string | null = null;
  private connectionManager: ConnectionManager | null = null;
  private onRemoteStreamCallback: RemoteStreamCallback | null = null;

  constructor() {
    console.log("[SignalingManager] Initialized");
  }

  /**
   * Initialize the signaling manager
   */
  initialize(
    roomId: string,
    userId: string,
    socket: Socket,
    connectionManager: ConnectionManager
  ): void {
    console.log(`[SignalingManager] Initializing for room ${roomId}, user ${userId}`);
    
    this.roomId = roomId;
    this.socket = socket;
    this.connectionManager = connectionManager;
    
    this.setupListeners();
    console.log("[SignalingManager] ✅ Initialization complete");
  }

  /**
   * Set callback for remote streams
   */
  setOnRemoteStreamCallback(callback: RemoteStreamCallback): void {
    this.onRemoteStreamCallback = callback;
  }

  /**
   * Setup WebRTC signaling listeners
   */
  private setupListeners(): void {
    if (!this.socket) {
      console.error("[SignalingManager] No socket available");
      return;
    }

    console.log("[SignalingManager] Setting up signaling listeners");

    // Handle incoming offers
    this.socket.on("webrtc_offer", async ({ senderId, sdp }) => {
      console.log(`[SignalingManager] 📥 Received OFFER from ${senderId}`);
      await this.handleOffer(senderId, sdp);
    });

    // Handle incoming answers
    this.socket.on("webrtc_answer", async ({ senderId, sdp }) => {
      console.log(`[SignalingManager] 📥 Received ANSWER from ${senderId}`);
      await this.handleAnswer(senderId, sdp);
    });

    // Handle incoming ICE candidates
    this.socket.on("webrtc_ice_candidate", async ({ senderId, candidate }) => {
      console.log(`[SignalingManager] 📥 Received ICE candidate from ${senderId}`);
      await this.handleIceCandidate(senderId, candidate);
    });

    console.log("[SignalingManager] ✅ Listeners configured");
  }

  /**
   * Handle incoming offer
   */
  private async handleOffer(senderId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.connectionManager || !this.socket || !this.roomId) {
      console.error("[SignalingManager] Cannot handle offer - not initialized");
      return;
    }

    try {
      console.log(`[SignalingManager] 📨 Processing offer from ${senderId}`);
      
      // Get existing peer connection if it exists
      let peerConnection = await this.connectionManager.createPeerConnection(
        senderId,
        this.onRemoteStreamCallback || undefined
      );

      if (!peerConnection) {
        console.error(`[SignalingManager] Failed to create peer connection for ${senderId}`);
        return;
      }

      // Perfect negotiation pattern: handle signaling state collisions
      const currentState = peerConnection.signalingState;
      const isPolite = this.userId! < senderId;
      
      // Detect collision: we have a local offer pending
      const offerCollision = currentState === 'have-local-offer';
      
      if (offerCollision) {
        console.log(`[SignalingManager] ⚠️ Offer collision detected (state: ${currentState})`);
        console.log(`[SignalingManager] This peer is ${isPolite ? 'POLITE' : 'IMPOLITE'}`);
        
        if (!isPolite) {
          // Impolite peer: ignore the incoming offer
          console.log(`[SignalingManager] 🚫 Impolite peer - ignoring offer from ${senderId}`);
          return;
        }
        
        // Polite peer: rollback our pending offer and accept theirs
        console.log(`[SignalingManager] 🤝 Polite peer - rolling back local offer`);
        await peerConnection.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit);
      }

      // Set remote description
      console.log(`[SignalingManager] Setting remote description for ${senderId}`);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));

      // Create and send answer
      console.log(`[SignalingManager] Creating answer for ${senderId}`);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      console.log(`[SignalingManager] 📤 Sending ANSWER to ${senderId}`);
      this.socket.emit("webrtc_answer", {
        roomId: this.roomId,
        targetUserId: senderId,
        sdp: answer,
      });

      console.log(`[SignalingManager] ✅ Answer sent to ${senderId}`);
    } catch (error) {
      console.error(`[SignalingManager] ❌ Error handling offer from ${senderId}:`, error);
    }
  }

  /**
   * Handle incoming answer
   */
  private async handleAnswer(senderId: string, sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.connectionManager) {
      console.error("[SignalingManager] Cannot handle answer - not initialized");
      return;
    }

    try {
      console.log(`[SignalingManager] 📨 Processing answer from ${senderId}`);
      
      const peerConnection = this.connectionManager.getPeerConnection(senderId);
      if (!peerConnection) {
        console.error(`[SignalingManager] No peer connection found for ${senderId}`);
        return;
      }

      // Check if we're in the correct state to receive an answer
      const currentState = peerConnection.signalingState;
      if (currentState !== 'have-local-offer') {
        console.log(`[SignalingManager] ⚠️ Unexpected answer in state ${currentState} from ${senderId}, ignoring`);
        return;
      }

      console.log(`[SignalingManager] Setting remote description for ${senderId}`);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      
      console.log(`[SignalingManager] ✅ Answer processed from ${senderId}`);
    } catch (error) {
      console.error(`[SignalingManager] ❌ Error handling answer from ${senderId}:`, error);
    }
  }

  /**
   * Handle incoming ICE candidate
   */
  private async handleIceCandidate(
    senderId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    if (!this.connectionManager) {
      console.error("[SignalingManager] Cannot handle ICE candidate - not initialized");
      return;
    }

    try {
      const peerConnection = this.connectionManager.getPeerConnection(senderId);
      if (!peerConnection) {
        console.warn(`[SignalingManager] No peer connection for ${senderId}, buffering ICE candidate`);
        // In a production system, you might want to buffer these candidates
        return;
      }

      console.log(`[SignalingManager] Adding ICE candidate for ${senderId}`);
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log(`[SignalingManager] ✅ ICE candidate added for ${senderId}`);
    } catch (error) {
      console.error(`[SignalingManager] ❌ Error adding ICE candidate from ${senderId}:`, error);
    }
  }

  /**
   * Send an offer to a remote user
   */
  async sendOffer(targetUserId: string): Promise<void> {
    if (!this.connectionManager || !this.socket || !this.roomId) {
      console.error("[SignalingManager] Cannot send offer - not initialized");
      return;
    }

    try {
      console.log(`[SignalingManager] 📤 Initiating offer to ${targetUserId}`);
      
      // Create peer connection
      const peerConnection = await this.connectionManager.createPeerConnection(
        targetUserId,
        this.onRemoteStreamCallback || undefined
      );

      if (!peerConnection) {
        console.error(`[SignalingManager] Failed to create peer connection for ${targetUserId}`);
        return;
      }

      // Create and set local description
      console.log(`[SignalingManager] Creating offer for ${targetUserId}`);
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      
      await peerConnection.setLocalDescription(offer);

      // Send offer through socket
      console.log(`[SignalingManager] 📤 Sending OFFER to ${targetUserId}`);
      this.socket.emit("webrtc_offer", {
        roomId: this.roomId,
        targetUserId,
        sdp: offer,
      });

      console.log(`[SignalingManager] ✅ Offer sent to ${targetUserId}`);
    } catch (error) {
      console.error(`[SignalingManager] ❌ Error sending offer to ${targetUserId}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup signaling listeners
   */
  cleanup(): void {
    if (this.socket) {
      console.log("[SignalingManager] 🧹 Removing signaling listeners");
      this.socket.off("webrtc_offer");
      this.socket.off("webrtc_answer");
      this.socket.off("webrtc_ice_candidate");
    }

    this.socket = null;
    this.roomId = null;
    this.connectionManager = null;
    this.onRemoteStreamCallback = null;
    
    console.log("[SignalingManager] ✅ Cleanup complete");
  }
}
