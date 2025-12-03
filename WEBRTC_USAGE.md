# WebRTC Service Usage Guide

## Quick Start

```typescript
import { webrtcService } from '@/services/webrtc.service';

// 1. Initialize and join room
const success = await webrtcService.initialize(
  roomId,
  userId,
  (remoteStream, userId) => {
    // Handle remote stream
    const audioElement = document.getElementById(`audio-${userId}`) as HTMLAudioElement;
    if (audioElement) {
      audioElement.srcObject = remoteStream;
    }
  }
);

if (!success) {
  console.error('Failed to initialize WebRTC');
  return;
}

// 2. Start local media
const localStream = await webrtcService.startLocalMedia(true, false); // audio only

// 3. Connect to existing peers (optional - handled automatically)
await webrtcService.connectToPeer(targetUserId);

// 4. Toggle audio/video
webrtcService.toggleAudio(false); // mute
webrtcService.toggleVideo(true);  // enable camera

// 5. Cleanup when leaving
webrtcService.cleanup();
```

## API Reference

### Core Methods

- `initialize(roomId, userId, onRemoteStream)` - Initialize service and join room
- `startLocalMedia(audio, video)` - Capture local media
- `stopLocalMedia()` - Stop local media
- `connectToPeer(userId, onRemoteStream)` - Connect to specific peer
- `cleanup()` - Disconnect and cleanup all resources

### Media Controls

- `toggleAudio(enabled)` - Mute/unmute microphone
- `toggleVideo(enabled)` - Enable/disable camera
- `updateLocalStream(stream)` - Update stream for all peers

### Status & Info

- `isReady()` - Check if service is connected
- `getConnectionState(userId)` - Get peer connection state
- `getIceConnectionState(userId)` - Get ICE connection state
- `getPeerConnections()` - Get all active connections
- `getConnectionStats(userId)` - Get WebRTC statistics

### Advanced (Manual Signaling)

- `createOffer(userId)` - Manually create SDP offer
- `createAnswer(userId)` - Manually create SDP answer
- `addIceCandidate(userId, candidate)` - Add ICE candidate
- `setRemoteDescription(userId, sdp)` - Set remote SDP

## Environment Variables

Required in `.env`:

```env
VITE_WEBRTC_SERVER_URL=http://localhost:5050
VITE_STUN_SERVER_URL=stun:relay1.expressturn.com:3478
VITE_TURN_SERVER_URL=turn:relay1.expressturn.com:3480
VITE_TURN_USERNAME=your-username
VITE_TURN_CREDENTIAL=your-credential
```

## Events Flow

```
Frontend → Backend:
- join_room: { roomId, success }
- webrtc_offer: { senderId, sdp }
- webrtc_answer: { senderId, sdp }
- webrtc_ice_candidate: { senderId, candidate }

Backend → Frontend:
- join_room_success: { user, message, success }
- join_room_error: { success, message, user }
- user_joined: user
- usersOnline: [{ userId, email }]
- webrtc_offer: { senderId, sdp }
- webrtc_answer: { senderId, sdp }
- ice_candidate: { senderId, candidate }
- user_left: user
- webrtc_error: { message, success }
```

## Features

✅ Environment-based STUN/TURN configuration
✅ Automatic peer connection management
✅ SDP offer/answer handling
✅ ICE candidate exchange
✅ Remote stream callbacks
✅ Connection state monitoring
✅ TypeScript support
✅ Error handling
✅ Cleanup on disconnect
