/**
 * Participant Manager
 * 
 * Manages participant state and events
 * Responsibilities:
 * - Track participants joining/leaving
 * - Coordinate connection establishment with new participants
 * - Handle participant state updates
 */

import type { Socket } from "socket.io-client";
import type { SignalingManager } from "./signaling-manager";
import type { UserData, ParticipantEventCallback } from "./types";

export class ParticipantManager {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private signalingManager: SignalingManager | null = null;
  private isReady = false; // Flag to prevent premature offer sending
  private pendingUsers: UserData[] = []; // Users waiting for connection when ready
  
  // Event callbacks
  private onUserJoinedCallback: ParticipantEventCallback | null = null;
  private onUserLeftCallback: ParticipantEventCallback | null = null;
  private onUsersOnlineCallback: ((users: UserData[]) => void) | null = null;

  constructor() {
    console.log("[ParticipantManager] Initialized");
  }

  /**
   * Initialize the participant manager
   */
  initialize(
    roomId: string,
    userId: string,
    socket: Socket,
    signalingManager: SignalingManager
  ): void {
    console.log(`[ParticipantManager] Initializing for room ${roomId}, user ${userId}`);
    
    this.userId = userId;
    this.socket = socket;
    this.signalingManager = signalingManager;
    
    this.setupListeners();
    console.log("[ParticipantManager] ✅ Initialization complete");
  }

  /**
   * Mark as ready to send offers (call after local stream is ready)
   */
  async setReady(): Promise<void> {
    console.log("[ParticipantManager] ✅ Marked as ready to send offers");
    this.isReady = true;
    
    // Connect to any users that joined while we were getting ready
    if (this.pendingUsers.length > 0 && this.signalingManager) {
      console.log(`[ParticipantManager] 🔗 Connecting to ${this.pendingUsers.length} pending users`);
      for (const user of this.pendingUsers) {
        try {
          console.log(`[ParticipantManager] Sending offer to pending user ${user.userId}`);
          await this.signalingManager.sendOffer(user.userId);
        } catch (error) {
          console.error(`[ParticipantManager] Error sending offer to ${user.userId}:`, error);
        }
      }
      this.pendingUsers = [];
    }
  }

  /**
   * Set callback for user joined events
   */
  setOnUserJoined(callback: ParticipantEventCallback): void {
    this.onUserJoinedCallback = callback;
  }

  /**
   * Set callback for user left events
   */
  setOnUserLeft(callback: ParticipantEventCallback): void {
    this.onUserLeftCallback = callback;
  }

  /**
   * Set callback for users online events
   */
  setOnUsersOnline(callback: (users: UserData[]) => void): void {
    this.onUsersOnlineCallback = callback;
  }

  /**
   * Setup participant event listeners
   */
  private setupListeners(): void {
    if (!this.socket) {
      console.error("[ParticipantManager] No socket available");
      return;
    }

    console.log("[ParticipantManager] Setting up participant listeners");

    // Handle users already in the room when joining
    this.socket.on("usersOnline", async (users: UserData[]) => {
      console.log("[ParticipantManager] 👥 Users online:", users.length);
      
      // Filter out current user
      const otherUsers = users.filter((u) => u.userId !== this.userId);
      console.log(`[ParticipantManager] Found ${otherUsers.length} other users`);

      // Notify callback
      if (this.onUsersOnlineCallback) {
        this.onUsersOnlineCallback(users);
      }

      // Only establish connections if we're ready (local stream available)
      if (!this.isReady) {
        console.log("[ParticipantManager] ⏸️ Not ready yet, storing pending users");
        this.pendingUsers = otherUsers;
        return;
      }

      // Establish connections to existing users
      if (this.signalingManager && otherUsers.length > 0) {
        console.log(`[ParticipantManager] 🔗 Establishing connections to ${otherUsers.length} users`);
        
        for (const user of otherUsers) {
          try {
            console.log(`[ParticipantManager] Sending offer to ${user.userId}`);
            await this.signalingManager.sendOffer(user.userId);
          } catch (error) {
            console.error(`[ParticipantManager] ❌ Error connecting to ${user.userId}:`, error);
          }
        }
      }
    });

    // Handle new user joining
    this.socket.on("user_joined", async (userData: UserData) => {
      console.log("[ParticipantManager] 👤 User joined:", userData.userId || userData.id);
      
      // Ignore if it's the current user
      if (userData.userId === this.userId || userData.id === this.userId) {
        console.log("[ParticipantManager] Ignoring self-join event");
        return;
      }

      console.log(`[ParticipantManager] New participant: ${userData.displayName || userData.email || userData.userId}`);

      // Notify callback
      if (this.onUserJoinedCallback) {
        this.onUserJoinedCallback(userData);
      }

      // Only send offer if we're ready (local stream available)
      if (!this.isReady) {
        console.log("[ParticipantManager] ⏸️ Not ready yet, adding user to pending list");
        this.pendingUsers.push(userData);
        return;
      }

      // Send offer to new user
      if (this.signalingManager) {
        const targetId = userData.userId || userData.id;
        console.log(`[ParticipantManager] 🔗 Sending offer to new user ${targetId}`);
        
        try {
          await this.signalingManager.sendOffer(targetId);
          console.log(`[ParticipantManager] ✅ Offer sent to ${targetId}`);
        } catch (error) {
          console.error(`[ParticipantManager] ❌ Error sending offer to ${targetId}:`, error);
        }
      }
    });

    // Handle user leaving
    this.socket.on("user_left", (userData: UserData) => {
      console.log("[ParticipantManager] 👋 User left:", userData.userId || userData.id);
      
      // Notify callback
      if (this.onUserLeftCallback) {
        this.onUserLeftCallback(userData);
      }
    });

    // Also listen for userLeft (alternative event name)
    this.socket.on("userLeft", (userData: UserData) => {
      console.log("[ParticipantManager] 👋 User left (userLeft event):", userData.userId || userData.id);
      
      // Notify callback
      if (this.onUserLeftCallback) {
        this.onUserLeftCallback(userData);
      }
    });

    // Handle user disconnected
    this.socket.on("userDisconnected", (userData: UserData) => {
      console.log("[ParticipantManager] 🔌 User disconnected:", userData.userId || userData.id);
      
      // Notify callback
      if (this.onUserLeftCallback) {
        this.onUserLeftCallback(userData);
      }
    });

    console.log("[ParticipantManager] ✅ Listeners configured");
  }

  /**
   * Cleanup participant listeners
   */
  cleanup(): void {
    if (this.socket) {
      console.log("[ParticipantManager] 🧹 Removing participant listeners");
      this.socket.off("usersOnline");
      this.socket.off("user_joined");
      this.socket.off("user_left");
      this.socket.off("userLeft");
      this.socket.off("userDisconnected");
    }

    this.socket = null;
    this.userId = null;
    this.signalingManager = null;
    this.onUserJoinedCallback = null;
    this.onUserLeftCallback = null;
    this.onUsersOnlineCallback = null;
    
    console.log("[ParticipantManager] ✅ Cleanup complete");
  }
}
