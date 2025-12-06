/**
 * WebRTC Module Entry Point
 * 
 * Exports all WebRTC functionality
 */

// Export the main WebRTC manager
export { WebRTCManager, webrtcManager } from "./webrtc-manager";

// Export types
export type {
  PeerConnectionInfo,
  MediaState,
  UserData,
  JoinRoomResponse,
  WebRTCConfig,
  RemoteStreamCallback,
  ParticipantEventCallback,
  MediaStateChangeCallback,
} from "./types";

// Export individual managers if needed
export { MediaManager } from "./media-manager";
export { ConnectionManager } from "./connection-manager";
export { SignalingManager } from "./signaling-manager";
export { ParticipantManager } from "./participant-manager";
