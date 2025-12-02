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
  private userId: string | null = null; // Current user ID
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
    this.userId = userId; // Store current user ID
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
      console.log(`[WEBRTC] 🔍 Offer SDP analysis:`);
      if (sdp && sdp.sdp) {
        const hasAudio = sdp.sdp.includes('m=audio');
        const hasVideo = sdp.sdp.includes('m=video');
        const audioActive = sdp.sdp.match(/m=audio.*\s+a=sendrecv/);
        const videoActive = sdp.sdp.match(/m=video.*\s+a=sendrecv/);
        console.log(`[WEBRTC]   - Has audio track: ${hasAudio}`);
        console.log(`[WEBRTC]   - Has video track: ${hasVideo}`);
        console.log(`[WEBRTC]   - Audio active (sendrecv): ${!!audioActive}`);
        console.log(`[WEBRTC]   - Video active (sendrecv): ${!!videoActive}`);
        console.log(`[WEBRTC]   - SDP length: ${sdp.sdp.length} chars`);
      }
      await this.handleOffer(senderId, sdp);
    });

    // Handle incoming WebRTC answers
    this.socket.on("webrtc_answer", async ({ senderId, sdp }) => {
      console.log(`[WEBRTC] 📥 Received answer from ${senderId}`);
      console.log(`[WEBRTC] 🔍 Answer SDP analysis:`);
      if (sdp && sdp.sdp) {
        const hasAudio = sdp.sdp.includes('m=audio');
        const hasVideo = sdp.sdp.includes('m=video');
        const audioActive = sdp.sdp.match(/m=audio.*\s+a=sendrecv/);
        const videoActive = sdp.sdp.match(/m=video.*\s+a=sendrecv/);
        console.log(`[WEBRTC]   - Has audio track: ${hasAudio}`);
        console.log(`[WEBRTC]   - Has video track: ${hasVideo}`);
        console.log(`[WEBRTC]   - Audio active (sendrecv): ${!!audioActive}`);
        console.log(`[WEBRTC]   - Video active (sendrecv): ${!!videoActive}`);
      }
      await this.handleAnswer(senderId, sdp);
    });

    // Handle incoming ICE candidates
    // Backend emits as "ice_candidate" (without webrtc_ prefix)
    this.socket.on("ice_candidate", async ({ senderId, candidate }) => {
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
      console.log(`[WEBRTC] 🎤 Audio tracks: ${this.localStream.getAudioTracks().length}`);
      console.log(`[WEBRTC] 📹 Video tracks: ${this.localStream.getVideoTracks().length}`);
      console.log(`[WEBRTC] 📊 Local stream ID: ${this.localStream.id}`);
      
      this.localStream.getTracks().forEach((track) => {
        console.log(`[WEBRTC] 🎬 Track details:`);
        console.log(`[WEBRTC]   - Kind: ${track.kind}`);
        console.log(`[WEBRTC]   - ID: ${track.id}`);
        console.log(`[WEBRTC]   - Label: ${track.label}`);
        console.log(`[WEBRTC]   - Enabled: ${track.enabled}`);
        console.log(`[WEBRTC]   - ReadyState: ${track.readyState}`);
        console.log(`[WEBRTC]   - Muted: ${track.muted}`);
        
        // Log track settings
        const settings = track.getSettings();
        if (track.kind === 'audio') {
          console.log(`[WEBRTC]   - Sample rate: ${settings.sampleRate}`);
          console.log(`[WEBRTC]   - Channel count: ${settings.channelCount}`);
        } else if (track.kind === 'video') {
          console.log(`[WEBRTC]   - Resolution: ${settings.width}x${settings.height}`);
          console.log(`[WEBRTC]   - Frame rate: ${settings.frameRate}`);
        }
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
    console.log(`[WEBRTC] New stream has ${stream.getTracks().length} tracks`);

    // Stop old tracks if they exist
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        // Only stop tracks that are not in the new stream
        const stillExists = stream.getTracks().some((t) => t.id === track.id);
        if (!stillExists) {
          console.log(`[WEBRTC] Stopping old ${track.kind} track ${track.id}`);
          track.stop();
        }
      });
    }

    // Replace reference
    this.localStream = stream;

    this.peerConnections.forEach(({ connection, userId }) => {
      const senders = connection.getSenders();
      console.log(`[WEBRTC] Updating tracks for peer connection to ${userId}`);

      stream.getTracks().forEach((track) => {
        const existingSender = senders.find(
          (s) => s.track && s.track.kind === track.kind
        );

        if (existingSender) {
          console.log(
            `[WEBRTC] Replacing ${track.kind} track on existing sender for ${userId}`
          );
          existingSender
            .replaceTrack(track)
            .then(() => {
              console.log(`[WEBRTC] ✅ Successfully replaced ${track.kind} track for ${userId}`);
            })
            .catch((err) =>
              console.error(
                `[WEBRTC] ❌ Error replacing ${track.kind} track for ${userId}:`,
                err
              )
            );
        } else {
          console.log(
            `[WEBRTC] Adding new ${track.kind} track to peer connection for ${userId}`
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
      if (event.candidate && this.socket && this.userId) {
        console.log(`[WEBRTC] 📤 Sending ICE candidate to room (target: ${targetUserId})`);
        // Backend expects: { senderId, candidate }
        // senderId should be the current user's ID, not socket.id
        this.socket.emit("webrtc_ice_candidate", {
          senderId: this.userId,
          candidate: event.candidate,
        });
      }
    };

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      console.log(`[WEBRTC] 📥 ========== RECEIVED REMOTE TRACK ==========`);
      console.log(`[WEBRTC] 📥 From user: ${targetUserId}`);
      console.log(`[WEBRTC] 📥 Track details:`);
      console.log(`[WEBRTC]   - Kind: ${event.track.kind}`);
      console.log(`[WEBRTC]   - ID: ${event.track.id}`);
      console.log(`[WEBRTC]   - Label: ${event.track.label}`);
      console.log(`[WEBRTC]   - Enabled: ${event.track.enabled}`);
      console.log(`[WEBRTC]   - ReadyState: ${event.track.readyState}`);
      console.log(`[WEBRTC]   - Muted: ${event.track.muted}`);
      console.log(`[WEBRTC] 📥 Streams count: ${event.streams.length}`);
      
      if (event.streams.length > 0) {
        console.log(`[WEBRTC] 📥 Stream ID: ${event.streams[0].id}`);
        console.log(`[WEBRTC] 📥 Stream tracks count: ${event.streams[0].getTracks().length}`);
      }
      
      // Get track settings
      const settings = event.track.getSettings();
      if (event.track.kind === 'audio') {
        console.log(`[WEBRTC] 🎤 Audio settings:`);
        console.log(`[WEBRTC]   - Sample rate: ${settings.sampleRate || 'N/A'}`);
        console.log(`[WEBRTC]   - Channel count: ${settings.channelCount || 'N/A'}`);
      } else if (event.track.kind === 'video') {
        console.log(`[WEBRTC] 📹 Video settings:`);
        console.log(`[WEBRTC]   - Resolution: ${settings.width}x${settings.height}`);
        console.log(`[WEBRTC]   - Frame rate: ${settings.frameRate}`);
      }
      
      // Check if track already exists in the stream
      const existingTrack = remoteStream.getTracks().find(
        (t) => t.id === event.track.id || t.kind === event.track.kind
      );
      
      if (!existingTrack) {
        console.log(`[WEBRTC] ➕ Adding remote ${event.track.kind} track to stream`);
        remoteStream.addTrack(event.track);
        console.log(`[WEBRTC] ✅ Remote stream now has ${remoteStream.getTracks().length} tracks`);
      } else {
        console.log(`[WEBRTC] 🔄 Track ${event.track.kind} already exists, updating reference`);
        remoteStream.removeTrack(existingTrack);
        remoteStream.addTrack(event.track);
        console.log(`[WEBRTC] ✅ Track replaced, stream has ${remoteStream.getTracks().length} tracks`);
      }

      // Listen for track state changes
      event.track.onended = () => {
        console.log(`[WEBRTC] Remote ${event.track.kind} track ended for ${targetUserId}`);
        remoteStream.removeTrack(event.track);
      };
      
      event.track.onmute = () => {
        console.log(`[WEBRTC] Remote ${event.track.kind} track muted for ${targetUserId}`);
      };
      
      event.track.onunmute = () => {
        console.log(`[WEBRTC] Remote ${event.track.kind} track unmuted for ${targetUserId}`);
      };

      const handler = onRemoteStream || this.onRemoteStreamCallback;
      if (handler) {
        console.log(
          `[WEBRTC] Calling onRemoteStream callback for ${targetUserId}`
        );
        // Call handler with the updated stream
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
      console.log(`[WEBRTC] 🔌 ========== CONNECTION STATE CHANGE ==========`);
      console.log(`[WEBRTC] 🔌 User: ${targetUserId}`);
      console.log(`[WEBRTC] 🔌 Connection State: ${peerConnection.connectionState}`);
      console.log(`[WEBRTC] 🔌 ICE Connection State: ${peerConnection.iceConnectionState}`);
      console.log(`[WEBRTC] 🔌 ICE Gathering State: ${peerConnection.iceGatheringState}`);
      console.log(`[WEBRTC] 🔌 Signaling State: ${peerConnection.signalingState}`);
      
      // Log current tracks being sent/received
      const senders = peerConnection.getSenders();
      const receivers = peerConnection.getReceivers();
      console.log(`[WEBRTC] 📤 Senders (outgoing): ${senders.length}`);
      senders.forEach((sender, index) => {
        if (sender.track) {
          console.log(`[WEBRTC]   ${index + 1}. ${sender.track.kind}: enabled=${sender.track.enabled}, readyState=${sender.track.readyState}`);
        } else {
          console.warn(`[WEBRTC]   ${index + 1}. NO TRACK`);
        }
      });
      console.log(`[WEBRTC] 📥 Receivers (incoming): ${receivers.length}`);
      receivers.forEach((receiver, index) => {
        if (receiver.track) {
          console.log(`[WEBRTC]   ${index + 1}. ${receiver.track.kind}: enabled=${receiver.track.enabled}, readyState=${receiver.track.readyState}`);
        }
      });

      if (peerConnection.connectionState === "connected") {
        console.log(`[WEBRTC] ✅ ========== SUCCESSFULLY CONNECTED to ${targetUserId} ==========`);
      } else if (
        peerConnection.connectionState === "failed" ||
        peerConnection.connectionState === "closed"
      ) {
        console.error(`[WEBRTC] ❌ Connection to ${targetUserId} ${peerConnection.connectionState}`);
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
      // Log senders BEFORE creating offer
      const sendersBeforeOffer = peerConnection.getSenders();
      console.log(`[WEBRTC] 🔍 ========== CREATING OFFER ==========`);
      console.log(`[WEBRTC] 🔍 Target user: ${targetUserId}`);
      console.log(`[WEBRTC] 🔍 Current user (senderId): ${this.userId}`);
      console.log(`[WEBRTC] 🔍 Senders before offer: ${sendersBeforeOffer.length}`);
      sendersBeforeOffer.forEach((sender, index) => {
        if (sender.track) {
          console.log(`[WEBRTC] 🔍 Sender ${index + 1}:`);
          console.log(`[WEBRTC]   - Kind: ${sender.track.kind}`);
          console.log(`[WEBRTC]   - Track ID: ${sender.track.id}`);
          console.log(`[WEBRTC]   - Enabled: ${sender.track.enabled}`);
          console.log(`[WEBRTC]   - ReadyState: ${sender.track.readyState}`);
          console.log(`[WEBRTC]   - Muted: ${sender.track.muted}`);
        } else {
          console.warn(`[WEBRTC] ⚠️ Sender ${index + 1} has NO track attached!`);
        }
      });
      
      console.log(`[WEBRTC] 🎬 Creating offer...`);
      const offer = await peerConnection.createOffer();
      
      console.log(`[WEBRTC] 📝 Offer created successfully`);
      console.log(`[WEBRTC] 📝 Offer SDP analysis:`);
      if (offer.sdp) {
        const hasAudio = offer.sdp.includes('m=audio');
        const hasVideo = offer.sdp.includes('m=video');
        const audioSendrecv = offer.sdp.includes('a=sendrecv') && hasAudio;
        const videoSendrecv = offer.sdp.includes('a=sendrecv') && hasVideo;
        
        console.log(`[WEBRTC]   - Type: ${offer.type}`);
        console.log(`[WEBRTC]   - SDP length: ${offer.sdp.length} chars`);
        console.log(`[WEBRTC]   - Has audio track: ${hasAudio}`);
        console.log(`[WEBRTC]   - Has video track: ${hasVideo}`);
        console.log(`[WEBRTC]   - Audio sendrecv: ${audioSendrecv}`);
        console.log(`[WEBRTC]   - Video sendrecv: ${videoSendrecv}`);
        
        // Log first 300 chars of SDP for debugging
        console.log(`[WEBRTC]   - SDP preview: ${offer.sdp.substring(0, 300)}...`);
      }
      
      await peerConnection.setLocalDescription(offer);
      console.log(`[WEBRTC] ✅ Local description set`);

      // Backend expects: { senderId, sdp }
      // senderId should be the current user's ID, not socket.id
      console.log(`[WEBRTC] 📤 Emitting offer to server:`);
      console.log(`[WEBRTC]   - Event: webrtc_offer`);
      console.log(`[WEBRTC]   - senderId: ${this.userId}`);
      console.log(`[WEBRTC]   - Target (for routing): ${targetUserId}`);
      
      this.socket.emit("webrtc_offer", {
        senderId: this.userId,
        sdp: offer,
      });

      console.log(`[WEBRTC] ✅ Offer successfully sent to server (from: ${this.userId}, target: ${targetUserId})`); 
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
      console.log(`[WEBRTC] 📝 ========== SETTING REMOTE DESCRIPTION (OFFER) ==========`);
      console.log(`[WEBRTC] 📝 From user: ${senderId}`);
      console.log(`[WEBRTC] 📝 Setting remote description...`);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      console.log(`[WEBRTC] ✅ Remote description set successfully`);
      
      // Log receivers after setting remote description
      const receivers = peerConnection.getReceivers();
      console.log(`[WEBRTC] 📥 Receivers after setRemoteDescription: ${receivers.length}`);
      receivers.forEach((receiver, index) => {
        if (receiver.track) {
          console.log(`[WEBRTC]   Receiver ${index + 1}: ${receiver.track.kind} (id: ${receiver.track.id})`);
        }
      });

      console.log(`[WEBRTC] 🎬 Creating answer for ${senderId}...`);
      const answer = await peerConnection.createAnswer();
      
      console.log(`[WEBRTC] 📝 Answer created successfully`);
      console.log(`[WEBRTC] 📝 Answer SDP analysis:`);
      if (answer.sdp) {
        const hasAudio = answer.sdp.includes('m=audio');
        const hasVideo = answer.sdp.includes('m=video');
        const audioSendrecv = answer.sdp.includes('a=sendrecv') && hasAudio;
        const videoSendrecv = answer.sdp.includes('a=sendrecv') && hasVideo;
        
        console.log(`[WEBRTC]   - Type: ${answer.type}`);
        console.log(`[WEBRTC]   - Has audio track: ${hasAudio}`);
        console.log(`[WEBRTC]   - Has video track: ${hasVideo}`);
        console.log(`[WEBRTC]   - Audio sendrecv: ${audioSendrecv}`);
        console.log(`[WEBRTC]   - Video sendrecv: ${videoSendrecv}`);
      }
      
      await peerConnection.setLocalDescription(answer);
      console.log(`[WEBRTC] ✅ Local description (answer) set successfully`);
      
      // Log senders in answer
      const senders = peerConnection.getSenders();
      console.log(`[WEBRTC] 📤 Senders in answer: ${senders.length}`);
      senders.forEach((sender, index) => {
        if (sender.track) {
          console.log(`[WEBRTC]   Sender ${index + 1}: ${sender.track.kind} (enabled: ${sender.track.enabled}, readyState: ${sender.track.readyState})`);
        }
      });

      // Backend expects: { senderId, sdp }
      // senderId should be the current user's ID, not socket.id
      console.log(`[WEBRTC] 📤 Emitting answer to server:`);
      console.log(`[WEBRTC]   - Event: webrtc_answer`);
      console.log(`[WEBRTC]   - senderId: ${this.userId}`);
      console.log(`[WEBRTC]   - Target (for routing): ${senderId}`);
      
      this.socket.emit("webrtc_answer", {
        senderId: this.userId,
        sdp: answer,
      });

      console.log(`[WEBRTC] ✅ Answer successfully sent to server (from: ${this.userId}, target: ${senderId})`); 
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
      console.log(`[WEBRTC] 📝 ========== SETTING REMOTE DESCRIPTION (ANSWER) ==========`);
      console.log(`[WEBRTC] 📝 From user: ${senderId}`);
      console.log(`[WEBRTC] 📝 Setting remote description (answer)...`);
      await peerInfo.connection.setRemoteDescription(
        new RTCSessionDescription(sdp)
      );
      console.log(`[WEBRTC] ✅ Remote description (answer) set successfully`);
      
      // Log final state after answer
      const pc = peerInfo.connection;
      console.log(`[WEBRTC] 🔍 Final connection state:`);
      console.log(`[WEBRTC]   - Signaling state: ${pc.signalingState}`);
      console.log(`[WEBRTC]   - ICE connection state: ${pc.iceConnectionState}`);
      console.log(`[WEBRTC]   - Connection state: ${pc.connectionState}`);
      
      const senders = pc.getSenders();
      const receivers = pc.getReceivers();
      console.log(`[WEBRTC] 📤 Final senders: ${senders.length}`);
      senders.forEach((sender, index) => {
        if (sender.track) {
          console.log(`[WEBRTC]   ${index + 1}. ${sender.track.kind} (enabled: ${sender.track.enabled})`);
        }
      });
      console.log(`[WEBRTC] 📥 Final receivers: ${receivers.length}`);
      receivers.forEach((receiver, index) => {
        if (receiver.track) {
          console.log(`[WEBRTC]   ${index + 1}. ${receiver.track.kind} (enabled: ${receiver.track.enabled})`);
        }
      });
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
