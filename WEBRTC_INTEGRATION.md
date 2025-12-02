# WebRTC Audio/Video Integration Guide

This document describes the WebRTC audio/video integration implemented for the Charlaton meeting platform.

## Architecture Overview

The Charlaton platform uses a microservices architecture with three backend services:

1. **Backend API (Port 3000)**: REST API for user authentication, room management, and data persistence
2. **WebSocket Chat Server (Port 5000)**: Real-time messaging and WebRTC signaling
3. **WebRTC Server (Port 5050)**: Alternative WebRTC signaling server (optional)

The frontend integrates with these services to provide:

- Real-time chat messaging
- Audio/video peer-to-peer connections
- User presence tracking
- Room management

## WebRTC Connection Model

### 1:1 Peer Connection Model

The implementation uses a **1:1 peer connection model** where each participant creates individual `RTCPeerConnection` instances to every other participant in the room. This is different from a centralized media server (MCU/SFU) approach.

**Example**: In a room with 4 users (A, B, C, D):

- User A creates connections to: B, C, D (3 connections)
- User B creates connections to: A, C, D (3 connections)
- User C creates connections to: A, B, D (3 connections)
- User D creates connections to: A, B, C (3 connections)

Total connections in the room: 6 unique peer-to-peer connections (n \* (n-1) / 2)

## Integration Flow

### 1. Initial Room Join

```typescript
// User authenticates and joins room
const token = await getAccessToken(); // JWT from backend API

// Connect to WebSocket chat server
const socket = await connectToChat(); // Uses token for auth

// Join room via WebSocket
socket.emit("join_room", roomId);

// Wait for success response
socket.on("join_room_success", async (response) => {
  // Initialize WebRTC
  await webrtcManager.initialize(roomId, userId, socket);

  // Start local media
  await webrtcManager.startLocalMedia(audioEnabled, videoEnabled);

  // Request list of users in room
  socket.emit("joins_in_room", roomId);
});
```

### 2. Establishing Peer Connections

```typescript
// Receive list of users in the room
socket.on("room_users", async (userIds: string[]) => {
  // Create peer connections to all existing users
  for (const userId of userIds) {
    if (userId !== currentUserId) {
      await webrtcManager.sendOffer(userId, handleRemoteStream);
    }
  }
});
```

### 3. WebRTC Signaling Flow

The signaling process uses the WebSocket chat server to exchange:

#### Offer/Answer Exchange

```
User A (New)                    User B (Existing)
    |                                  |
    |-------- webrtc_offer ----------->|
    |        (SDP offer)                |
    |                                  |
    |<------- webrtc_answer -----------|
    |        (SDP answer)               |
```

#### ICE Candidate Exchange

```
User A                          User B
    |                                  |
    |---- webrtc_ice_candidate ------->|
    |<--- webrtc_ice_candidate ---------|
    |                                  |
    | (Multiple candidates exchanged)  |
```

### 4. Remote Stream Handling

```typescript
// Handle remote stream callback
const handleRemoteStream = (stream: MediaStream, userId: string) => {
  // Store stream in state
  setRemoteStreams((prev) => {
    const updated = new Map(prev);
    updated.set(userId, stream);
    return updated;
  });

  // Create audio element
  const audio = new Audio();
  audio.autoplay = true;
  audio.srcObject = stream;
};
```

## WebSocket Events

### Client → Server Events

| Event                  | Payload                               | Description                     |
| ---------------------- | ------------------------------------- | ------------------------------- |
| `join_room`            | `roomId: string`                      | Join a room for chat and WebRTC |
| `joins_in_room`        | `roomId: string`                      | Request list of users in room   |
| `message`              | `{ msg, visibility, target }`         | Send chat message               |
| `webrtc_offer`         | `{ roomId, targetUserId, sdp }`       | Send WebRTC offer               |
| `webrtc_answer`        | `{ roomId, targetUserId, sdp }`       | Send WebRTC answer              |
| `webrtc_ice_candidate` | `{ roomId, targetUserId, candidate }` | Send ICE candidate              |
| `leaveRoom`            | -                                     | Leave the room                  |

### Server → Client Events

| Event                  | Payload                      | Description                       |
| ---------------------- | ---------------------------- | --------------------------------- |
| `join_room_success`    | `{ user, message, success }` | Successfully joined room          |
| `join_room_error`      | `{ user, message, success }` | Failed to join room               |
| `room_users`           | `string[]`                   | Array of user IDs in room         |
| `usersOnline`          | `OnlineUser[]`               | List of online users with details |
| `newMessage`           | `Message`                    | New chat message received         |
| `webrtc_offer`         | `{ senderId, sdp }`          | Received WebRTC offer             |
| `webrtc_answer`        | `{ senderId, sdp }`          | Received WebRTC answer            |
| `webrtc_ice_candidate` | `{ senderId, candidate }`    | Received ICE candidate            |
| `userLeft`             | `{ userId, ... }`            | User left the room                |
| `userDisconnected`     | `{ user, ... }`              | User disconnected                 |

## Environment Configuration

### Backend Services

All backend services must use the **same JWT secrets** for token verification:

#### Backend API (.env)

```bash
PORT=3000
ACCESS_SECRET=your_shared_secret_here
REFRESH_SECRET=your_refresh_secret_here
FRONTEND_URL=http://localhost:5173
```

#### WebSocket Chat Server (.env)

```bash
PORT=5000
ACCESS_SECRET=your_shared_secret_here  # Must match backend
JWT_SECRET=your_shared_secret_here     # Must match backend
FRONTEND_URL=http://localhost:5173
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

#### WebRTC Server (.env) - Optional

```bash
PORT=5050
ACCESS_SECRET=your_shared_secret_here  # Must match backend
JWT_SECRET=your_shared_secret_here     # Must match backend
FRONTEND_URL=http://localhost:5173
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

### Frontend (.env)

```bash
# Backend API
VITE_API_URL=http://localhost:3000

# WebSocket Chat Server
VITE_CHAT_SERVER_URL=http://localhost:5000

# WebRTC Server (optional, currently using chat server for signaling)
VITE_WEBRTC_SERVER_URL=http://localhost:5050

# Firebase
VITE_FIREBASE_API=your_firebase_api_key
VITE_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase config
```

## Running the Application

### 1. Start Backend Services

```bash
# Terminal 1: Backend API
cd Charlaton-backend
npm install
npm run dev  # Runs on port 3000

# Terminal 2: WebSocket Chat Server
cd charlaton-chat
npm install
npm run dev  # Runs on port 5000

# Terminal 3: WebRTC Server (optional)
cd charlaton-WebRTC
npm install
npm run dev  # Runs on port 5050
```

### 2. Start Frontend

```bash
# Terminal 4: Frontend
cd Charlaton-frontend
npm install
npm run dev  # Runs on port 5173
```

### 3. Test the Integration

1. Open browser and navigate to `http://localhost:5173`
2. Login or create an account
3. Create or join a meeting room
4. Open another browser window/tab (incognito mode recommended)
5. Login with a different account
6. Join the same meeting room
7. Click the microphone button to enable audio
8. Both users should hear each other's audio

## Troubleshooting

### WebSocket Connection Issues

**Problem**: "Failed to connect to chat server"

**Solution**:

1. Verify chat server is running on port 5000
2. Check CORS configuration in chat server
3. Verify JWT token is valid and not expired
4. Check browser console for detailed error messages

### WebRTC Connection Issues

**Problem**: "No audio from remote users"

**Solution**:

1. Verify both users have microphone permission
2. Check browser console for WebRTC errors
3. Verify ICE candidates are being exchanged
4. Test with STUN server: `stun:stun.l.google.com:19302`
5. Check firewall/NAT settings

### Audio Echo

**Problem**: Hearing your own voice back

**Solution**:

- The local audio element should be muted: `<audio ref={localAudioRef} muted autoPlay />`
- This is already implemented in the Meeting component

### User List Not Updating

**Problem**: Participants list doesn't reflect users joining/leaving

**Solution**:

1. Verify `usersOnline` event is being emitted by server
2. Check `join_room_success` event handler in frontend
3. Verify room participants are being fetched from backend API
4. Check browser console for state update logs

## Deployment Considerations

### HTTPS Requirement

WebRTC requires HTTPS in production environments. Browsers block getUserMedia() on HTTP (except localhost).

**Solution**:

1. Deploy frontend with HTTPS (Vercel, Netlify, etc.)
2. Deploy backend services with HTTPS (Render, Railway, etc.)
3. Update environment variables with HTTPS URLs

### TURN Server for Production

STUN servers help with NAT traversal, but may not work in all network configurations. For production, consider adding a TURN server.

**Example TURN Configuration**:

```typescript
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  {
    urls: "turn:your-turn-server.com:3478",
    username: "username",
    credential: "password",
  },
];
```

### Scalability Considerations

The 1:1 peer connection model has limitations:

- **Bandwidth**: Each user uploads their stream to n-1 other users
- **CPU**: More connections = more encoding/decoding
- **Recommended**: Max 6-8 users per room for good quality

For larger rooms, consider:

1. Implementing an SFU (Selective Forwarding Unit)
2. Using a media server like Janus, Mediasoup, or Kurento
3. Cloud services like Twilio, Agora, or LiveKit

## Testing Checklist

- [ ] User can join a room via WebSocket
- [ ] WebRTC initializes after successful room join
- [ ] Local audio can be toggled on/off
- [ ] When second user joins, peer connection is established
- [ ] Audio streams are exchanged between users
- [ ] ICE candidates are exchanged successfully
- [ ] Remote audio is played through audio elements
- [ ] User can leave room and connections are cleaned up
- [ ] Chat messages are sent and received correctly
- [ ] Participant list updates when users join/leave
- [ ] Multiple users (3+) can connect in the same room
- [ ] Connection recovers after temporary network issues

## Code Structure

### Frontend

```
src/
├── lib/
│   ├── socket.config.ts      # WebSocket connection management
│   ├── webrtc.config.ts      # WebRTC peer connection management
│   └── getAccessToken.ts     # JWT token management
├── pages/
│   └── meeting/
│       ├── Meeting.tsx        # Main meeting component
│       └── Meeting.scss       # Meeting styles
└── services/
    ├── room.service.ts        # Room API calls
    └── message.service.ts     # Message API calls
```

### Backend Services

```
charlaton-chat/
├── src/
│   ├── index.ts              # Main server with Socket.IO
│   ├── config/
│   │   └── firebase.ts       # Firebase Admin SDK
│   ├── services/
│   │   ├── messageService.ts
│   │   ├── roomService.ts
│   │   └── userConnection.ts
│   └── types/
│       └── index.ts          # TypeScript types

charlaton-WebRTC/
├── src/
│   ├── index.ts              # WebRTC signaling server
│   ├── config/
│   │   └── firebase.ts
│   └── types/
│       └── index.ts
```

## Additional Resources

- [WebRTC API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [STUN/TURN Servers](https://www.metered.ca/tools/openrelay/)

## Support

For issues or questions:

1. Check browser console for error messages
2. Review server logs for connection issues
3. Verify environment configuration
4. Test with different browsers/networks
5. Check firewall and network settings
