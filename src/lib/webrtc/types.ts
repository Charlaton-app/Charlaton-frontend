/**
 * WebRTC Types
 * 
 * Centralized type definitions for WebRTC functionality
 */

import type { Socket } from "socket.io-client";

/**
 * Peer connection information
 */
export interface PeerConnectionInfo {
  connection: RTCPeerConnection;
  userId: string;
  remoteStream: MediaStream;
}

/**
 * Media state for a participant
 */
export interface MediaState {
  micEnabled: boolean;
  cameraEnabled: boolean;
}

/**
 * User data from WebRTC server
 */
export interface UserData {
  id: string;
  userId: string;
  email: string;
  nickname?: string;
  displayName?: string;
  user?: {
    id: string;
    email: string;
    nickname?: string;
    displayName?: string;
  };
}

/**
 * Room join response
 */
export interface JoinRoomResponse {
  success: boolean;
  message?: string;
  roomId?: string;
}

/**
 * WebRTC configuration
 */
export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  roomId: string;
  userId: string;
  socket: Socket;
}

/**
 * Callback for remote stream events
 */
export type RemoteStreamCallback = (stream: MediaStream, userId: string) => void;

/**
 * Callback for participant events
 */
export type ParticipantEventCallback = (userData: UserData) => void;

/**
 * Callback for media state change events
 */
export type MediaStateChangeCallback = (userId: string, state: MediaState) => void;
