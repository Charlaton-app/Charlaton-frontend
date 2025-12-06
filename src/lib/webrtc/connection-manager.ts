/**
 * Connection Manager
 * 
 * Manages individual peer-to-peer WebRTC connections
 * Responsibilities:
 * - Create and manage RTCPeerConnection instances
 * - Handle ICE candidate exchange
 * - Manage local and remote media streams
 * - Track connection states
 */

import type { Socket } from "socket.io-client";
import type { PeerConnectionInfo, RemoteStreamCallback } from "./types";

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

export class ConnectionManager {
  private peerConnections = new Map<string, PeerConnectionInfo>();
  private socket: Socket | null = null;
  private roomId: string | null = null;
  private localStream: MediaStream | null = null;
  private onRemoteStreamCallback: RemoteStreamCallback | null = null;

  constructor() {
    console.log("[ConnectionManager] Initialized");
  }

  /**
   * Initialize the connection manager
   */
  initialize(roomId: string, socket: Socket, localStream: MediaStream | null): void {
    console.log(`[ConnectionManager] Initializing for room ${roomId}`);
    this.roomId = roomId;
    this.socket = socket;
    this.localStream = localStream;
  }

  /**
   * Set the local media stream
   */
  setLocalStream(stream: MediaStream | null): void {
    console.log(`[ConnectionManager] Setting local stream:`, stream?.id);
    this.localStream = stream;
  }

  /**
   * Set callback for remote streams
   */
  setOnRemoteStreamCallback(callback: RemoteStreamCallback): void {
    this.onRemoteStreamCallback = callback;
  }

  /**
   * Create a peer connection to a remote user
   */
  async createPeerConnection(
    targetUserId: string,
    onRemoteStream?: RemoteStreamCallback
  ): Promise<RTCPeerConnection | null> {
    if (!this.socket || !this.roomId) {
      console.error("[ConnectionManager] Cannot create peer - not initialized");
      return null;
    }

    // Check if connection already exists
    if (this.peerConnections.has(targetUserId)) {
      console.log(`[ConnectionManager] Connection to ${targetUserId} already exists`);
      return this.peerConnections.get(targetUserId)!.connection;
    }

    console.log(`[ConnectionManager] 🔗 Creating peer connection to ${targetUserId}`);

    const peerConnection = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
    });

    const remoteStream = new MediaStream();

    // Add local tracks to the peer connection
    if (this.localStream) {
      const tracks = this.localStream.getTracks();
      console.log(`[ConnectionManager] Adding ${tracks.length} local tracks to ${targetUserId}`);
      tracks.forEach((track) => {
        console.log(`[ConnectionManager]   - Adding ${track.kind} track (enabled: ${track.enabled}, id: ${track.id})`);
        const sender = peerConnection.addTrack(track, this.localStream!);
        console.log(`[ConnectionManager]   - Track added via sender:`, sender.track?.id);
      });
      
      // Verify tracks were added
      const senders = peerConnection.getSenders();
      console.log(`[ConnectionManager] ✅ Total senders for ${targetUserId}: ${senders.length}`);
      senders.forEach(sender => {
        if (sender.track) {
          console.log(`[ConnectionManager]   - Sender has ${sender.track.kind} track (id: ${sender.track.id})`);
        }
      });
    } else {
      console.warn(`[ConnectionManager] ⚠️ No local stream when creating peer to ${targetUserId}`);
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket && this.roomId) {
        console.log(`[ConnectionManager] 📤 Sending ICE candidate to ${targetUserId}`);
        this.socket.emit("webrtc_ice_candidate", {
          roomId: this.roomId,
          targetUserId,
          candidate: event.candidate,
        });
      }
    };

    // Handle incoming remote tracks
    peerConnection.ontrack = (event) => {
      console.log(`[ConnectionManager] 📥 Received remote track from ${targetUserId}`);
      console.log(`[ConnectionManager]   - Track: ${event.track.kind}, enabled: ${event.track.enabled}, readyState: ${event.track.readyState}`);
      console.log(`[ConnectionManager]   - Streams count: ${event.streams.length}`);
      
      if (event.streams.length > 0) {
        event.streams[0].getTracks().forEach((track) => {
          console.log(`[ConnectionManager]   - Adding ${track.kind} to remote stream (enabled: ${track.enabled}, state: ${track.readyState})`);
          remoteStream.addTrack(track);
        });
      } else {
        console.warn(`[ConnectionManager] ⚠️ No streams in track event from ${targetUserId}`);
      }

      // Call the callback
      const handler = onRemoteStream || this.onRemoteStreamCallback;
      if (handler) {
        console.log(`[ConnectionManager] 📞 Invoking remote stream callback for ${targetUserId}`);
        handler(remoteStream, targetUserId);
      } else {
        console.warn(`[ConnectionManager] ⚠️ No callback registered for ${targetUserId}`);
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`[ConnectionManager] Connection state [${targetUserId}]: ${peerConnection.connectionState}`);
      
      if (peerConnection.connectionState === "connected") {
        console.log(`[ConnectionManager] ✅ Successfully connected to ${targetUserId}`);
      } else if (
        peerConnection.connectionState === "failed" ||
        peerConnection.connectionState === "closed"
      ) {
        console.log(`[ConnectionManager] ❌ Connection to ${targetUserId} ${peerConnection.connectionState}`);
        this.closePeerConnection(targetUserId);
      }
    };

    // Store the peer connection
    this.peerConnections.set(targetUserId, {
      connection: peerConnection,
      userId: targetUserId,
      remoteStream,
    });

    console.log(`[ConnectionManager] ✅ Peer connection created for ${targetUserId}`);
    return peerConnection;
  }

  /**
   * Get an existing peer connection
   */
  getPeerConnection(userId: string): RTCPeerConnection | null {
    return this.peerConnections.get(userId)?.connection || null;
  }

  /**
   * Get all peer connections
   */
  getAllPeerConnections(): Map<string, PeerConnectionInfo> {
    return this.peerConnections;
  }

  /**
   * Close a peer connection
   */
  closePeerConnection(userId: string): void {
    const peerInfo = this.peerConnections.get(userId);
    if (peerInfo) {
      console.log(`[ConnectionManager] 🔌 Closing connection to ${userId}`);
      
      // Stop all remote tracks
      peerInfo.remoteStream.getTracks().forEach((track) => {
        track.stop();
      });
      
      // Close the peer connection
      peerInfo.connection.close();
      
      // Remove from map
      this.peerConnections.delete(userId);
      console.log(`[ConnectionManager] ✅ Connection to ${userId} closed`);
    }
  }

  /**
   * Update local stream for all existing connections
   */
  updateLocalStream(stream: MediaStream): void {
    console.log(`[ConnectionManager] 🔄 Updating local stream for all peers`);
    this.localStream = stream;

    this.peerConnections.forEach(({ connection }, userId) => {
      const senders = connection.getSenders();

      stream.getTracks().forEach((track) => {
        const existingSender = senders.find(
          (s) => s.track && s.track.kind === track.kind
        );

        if (existingSender) {
          console.log(`[ConnectionManager] Replacing ${track.kind} track for ${userId}`);
          existingSender.replaceTrack(track).catch((err) =>
            console.error(`[ConnectionManager] ❌ Error replacing track:`, err)
          );
        } else {
          console.log(`[ConnectionManager] Adding new ${track.kind} track for ${userId}`);
          connection.addTrack(track, stream);
        }
      });
    });
  }

  /**
   * Get the local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Cleanup all connections
   */
  cleanup(): void {
    console.log(`[ConnectionManager] 🧹 Cleaning up all connections`);
    
    this.peerConnections.forEach((_, userId) => {
      this.closePeerConnection(userId);
    });
    
    this.peerConnections.clear();
    this.socket = null;
    this.roomId = null;
    this.localStream = null;
    this.onRemoteStreamCallback = null;
    
    console.log("[ConnectionManager] ✅ Cleanup complete");
  }
}
