/**
 * WebRTC Configuration and Service
 *
 * DEPRECATED: This file is being phased out in favor of the modular architecture
 * in src/lib/webrtc/
 * 
 * New modular structure:
 * - MediaManager: Handles local media streams
 * - ConnectionManager: Manages peer connections
 * - SignalingManager: Handles WebRTC signaling
 * - ParticipantManager: Manages participant events
 * - WebRTCManager: Main coordinator
 *
 * For backward compatibility, this file re-exports the new manager.
 * Prefer importing directly from './webrtc' in new code.
 */

// Re-export the new modular WebRTC manager for backward compatibility
export { webrtcManager } from "./webrtc/index";
