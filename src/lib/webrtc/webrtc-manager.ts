/**
 * WebRTC Manager
 * 
 * Main coordinator for WebRTC functionality
 * Orchestrates all WebRTC modules:
 * - MediaManager: Local media streams
 * - ConnectionManager: Peer connections
 * - SignalingManager: WebRTC signaling
 * - ParticipantManager: Participant events
 */

import type { Socket } from "socket.io-client";
import { MediaManager } from "./media-manager";
import { ConnectionManager } from "./connection-manager";
import { SignalingManager } from "./signaling-manager";
import { ParticipantManager } from "./participant-manager";
import type { 
  RemoteStreamCallback, 
  ParticipantEventCallback, 
  UserData,
  MediaState
} from "./types";

export class WebRTCManager {
  private mediaManager: MediaManager;
  private connectionManager: ConnectionManager;
  private signalingManager: SignalingManager;
  private participantManager: ParticipantManager;
  
  private isInitialized = false;
  private roomId: string | null = null;
  private userId: string | null = null;

  // Event callbacks
  private onRemoteStreamCallback: RemoteStreamCallback | null = null;
  private onUserJoinedCallback: ParticipantEventCallback | null = null;
  private onUserLeftCallback: ParticipantEventCallback | null = null;
  private onMediaStateChangeCallback: ((userId: string, state: MediaState) => void) | null = null;

  constructor() {
    console.log("[WebRTCManager] 🚀 Initializing WebRTC Manager");
    
    this.mediaManager = new MediaManager();
    this.connectionManager = new ConnectionManager();
    this.signalingManager = new SignalingManager();
    this.participantManager = new ParticipantManager();
    
    console.log("[WebRTCManager] ✅ All modules created");
  }

  /**
   * Initialize the WebRTC system
   */
  async initialize(roomId: string, userId: string, socket: Socket): Promise<void> {
    if (this.isInitialized) {
      console.log("[WebRTCManager] Already initialized");
      return;
    }

    console.log(`[WebRTCManager] 🔧 Initializing for room ${roomId}, user ${userId}`);
    console.log(`[WebRTCManager] Socket connected: ${socket.connected}, ID: ${socket.id}`);

    this.roomId = roomId;
    this.userId = userId;

    // Initialize connection manager (must be done before signaling/participant managers)
    this.connectionManager.initialize(roomId, socket, null); // localStream will be set later

    // Initialize signaling manager
    this.signalingManager.initialize(roomId, userId, socket, this.connectionManager);
    
    // Set up remote stream callback
    if (this.onRemoteStreamCallback) {
      this.signalingManager.setOnRemoteStreamCallback(this.onRemoteStreamCallback);
      this.connectionManager.setOnRemoteStreamCallback(this.onRemoteStreamCallback);
    }

    // Initialize participant manager
    this.participantManager.initialize(roomId, userId, socket, this.signalingManager);
    
    // Set up participant callbacks
    if (this.onUserJoinedCallback) {
      this.participantManager.setOnUserJoined(this.onUserJoinedCallback);
    }
    
    if (this.onUserLeftCallback) {
      this.participantManager.setOnUserLeft((userData) => {
        // Close connection when user leaves
        const userId = userData.userId || userData.id;
        this.connectionManager.closePeerConnection(userId);
        
        // Call user callback
        if (this.onUserLeftCallback) {
          this.onUserLeftCallback(userData);
        }
      });
    }

    this.isInitialized = true;
    console.log("[WebRTCManager] ✅ Initialization complete");
  }

  /**
   * Start local media
   */
  async startLocalMedia(audioEnabled: boolean = true, videoEnabled: boolean = false): Promise<MediaStream | null> {
    console.log(`[WebRTCManager] 🎬 Starting local media - audio: ${audioEnabled}, video: ${videoEnabled}`);
    
    const stream = await this.mediaManager.startMedia(audioEnabled, videoEnabled);
    
    if (stream) {
      // Update connection manager with new stream
      this.connectionManager.setLocalStream(stream);
      
      // If there are already existing peer connections (from received offers),
      // update them with the new stream
      const existingPeers = this.connectionManager.getAllPeerConnections();
      if (existingPeers.size > 0) {
        console.log(`[WebRTCManager] 🔄 Updating ${existingPeers.size} existing peer connections with local stream`);
        this.connectionManager.updateLocalStream(stream);
        
        // Renegotiate with all existing peers to send our tracks
        for (const [userId] of existingPeers) {
          console.log(`[WebRTCManager] 🔄 Renegotiating with ${userId} to send local tracks`);
          await this.signalingManager.sendOffer(userId);
        }
      }
      
      // Mark participant manager as ready to send offers
      this.participantManager.setReady();
      
      console.log("[WebRTCManager] ✅ Local media started and configured");
    }
    
    return stream;
  }

  /**
   * Stop local media
   */
  stopLocalMedia(): void {
    console.log("[WebRTCManager] 🛑 Stopping local media");
    this.mediaManager.stopMedia();
    this.connectionManager.setLocalStream(null);
  }

  /**
   * Toggle audio
   */
  toggleAudio(enabled: boolean): void {
    console.log(`[WebRTCManager] 🎤 Toggling audio: ${enabled}`);
    this.mediaManager.toggleAudio(enabled);
  }

  /**
   * Toggle video
   */
  toggleVideo(enabled: boolean): void {
    console.log(`[WebRTCManager] 📹 Toggling video: ${enabled}`);
    this.mediaManager.toggleVideo(enabled);
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.mediaManager.getLocalStream();
  }

  /**
   * Update local stream (e.g., when adding video to audio-only stream)
   */
  updateLocalStream(stream: MediaStream): void {
    console.log("[WebRTCManager] 🔄 Updating local stream");
    this.mediaManager.setLocalStream(stream);
    this.connectionManager.updateLocalStream(stream);
  }

  /**
   * Send offer to a specific user
   */
  async sendOffer(targetUserId: string, onRemoteStream?: RemoteStreamCallback): Promise<void> {
    console.log(`[WebRTCManager] 📤 Sending offer to ${targetUserId}`);
    
    // Temporarily set callback if provided
    if (onRemoteStream) {
      this.signalingManager.setOnRemoteStreamCallback(onRemoteStream);
      this.connectionManager.setOnRemoteStreamCallback(onRemoteStream);
    }
    
    await this.signalingManager.sendOffer(targetUserId);
  }

  /**
   * Set callback for remote streams
   */
  setOnRemoteStreamCallback(callback: RemoteStreamCallback): void {
    console.log("[WebRTCManager] Setting remote stream callback");
    this.onRemoteStreamCallback = callback;
    this.signalingManager.setOnRemoteStreamCallback(callback);
    this.connectionManager.setOnRemoteStreamCallback(callback);
  }

  /**
   * Set callback for user joined events
   */
  setOnUserJoined(callback: ParticipantEventCallback): void {
    console.log("[WebRTCManager] Setting user joined callback");
    this.onUserJoinedCallback = callback;
    if (this.isInitialized) {
      this.participantManager.setOnUserJoined(callback);
    }
  }

  /**
   * Set callback for user left events
   */
  setOnUserLeft(callback: ParticipantEventCallback): void {
    console.log("[WebRTCManager] Setting user left callback");
    this.onUserLeftCallback = callback;
    if (this.isInitialized) {
      this.participantManager.setOnUserLeft((userData) => {
        const userId = userData.userId || userData.id;
        this.connectionManager.closePeerConnection(userId);
        callback(userData);
      });
    }
  }

  /**
   * Set callback for media state changes
   */
  setOnMediaStateChange(callback: (userId: string, state: MediaState) => void): void {
    console.log("[WebRTCManager] Setting media state change callback");
    this.onMediaStateChangeCallback = callback;
  }

  /**
   * Get all active peer connections
   */
  getActivePeers(): string[] {
    const peers = Array.from(this.connectionManager.getAllPeerConnections().keys());
    console.log(`[WebRTCManager] Active peers: ${peers.length}`);
    return peers;
  }

  /**
   * Cleanup all WebRTC resources
   */
  cleanup(): void {
    console.log("[WebRTCManager] 🧹 Starting cleanup");
    
    this.participantManager.cleanup();
    this.signalingManager.cleanup();
    this.connectionManager.cleanup();
    this.mediaManager.cleanup();
    
    this.isInitialized = false;
    this.roomId = null;
    this.userId = null;
    this.onRemoteStreamCallback = null;
    this.onUserJoinedCallback = null;
    this.onUserLeftCallback = null;
    this.onMediaStateChangeCallback = null;
    
    console.log("[WebRTCManager] ✅ Cleanup complete");
  }
}

// Export singleton instance
export const webrtcManager = new WebRTCManager();
