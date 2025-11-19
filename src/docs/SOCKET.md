# Socket Chat Implementation - Frontend

## Overview

The chat uses **Socket.IO** to connect the frontend ([`eisc-meet`](eisc-meet/src/socket/socketConfig.ts)) with the backend ([`eisc-chat`](eisc-chat/api/index.ts)) for real-time messaging.

## Step-by-Step Flow

### 1. Socket Connection

```typescript
// src/socket/socketConfig.ts
const socket = io('https://eisc-chat.onrender.com', {
  autoConnect: false, // Manual connection control
  reconnection: true,
  transports: ['websocket', 'polling']
});
```

### 2. User Joins Chat

When a user enters the chat page:

```typescript
// src/pages/chat/Chat.tsx
useEffect(() => {
  if (user) {
    socket.connect(); // Connect to backend
    socket.emit('newUser', user.uid); // Register user
  }
}, [user]);
```

**Backend receives:**
- Adds user to `onlineUsers` map
- Broadcasts updated user list to all clients

### 3. Receive Online Users

```typescript
socket.on('usersOnline', (users: OnlineUser[]) => {
  setOnlineUsers(users.length);
});
```

### 4. Load Message History

```typescript
useEffect(() => {
  const fetchMessages = async () => {
    const response = await fetch(`${BACKEND_URL}/api/messages`);
    const data = await response.json();
    setMessages(data);
  };
  fetchMessages();
}, []);
```

### 5. Send Message

```typescript
const handleSendMessage = () => {
  socket.emit('sendMessage', {
    senderId: user.uid,
    text: message
  });
};
```

**Backend receives:**
- Saves message to Firestore
- Broadcasts to all connected clients via `newMessage` event

### 6. Receive New Messages

```typescript
socket.on('newMessage', (message: ReceiveMessagePayload) => {
  setMessages(prev => [...prev, message]);
});
```

### 7. User Disconnects

```typescript
useEffect(() => {
  return () => {
    socket.disconnect(); // Clean up on unmount
  };
}, []);
```

**Backend receives:**
- Removes user from `onlineUsers`
- Broadcasts updated user list

## Event Flow Diagram

```
Frontend              Backend              Firestore
   |                     |                     |
   |--newUser(userId)--->|                     |
   |                     |--Save user--------->|
   |<--usersOnline(list)-|                     |
   |                     |                     |
   |--sendMessage(data)->|                     |
   |                     |--Save message------>|
   |<--newMessage(msg)---|                     |
   |                     |                     |
   |--disconnect()------>|                     |
   |                     |--Remove user------->|
   |<--usersOnline(list)-|                     |
```

## Key Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `newUser` | Client → Server | Register user in chat |
| `usersOnline` | Server → Client | Update online users count |
| `sendMessage` | Client → Server | Send new message |
| `newMessage` | Server → Client | Receive broadcasted message |
| `disconnect` | Client → Server | User leaves chat |

## Files Involved

- **Frontend:** [`eisc-meet/src/socket/socketConfig.ts`](eisc-meet/src/socket/socketConfig.ts), [`eisc-meet/src/pages/chat/Chat.tsx`](eisc-meet/src/pages/chat/Chat.tsx)
- **Backend:** [`eisc-chat/api/index.ts`](eisc-chat/api/index.ts), [`eisc-chat/api/types.ts`](eisc-chat/api/types.ts)
- **Database:** Firestore collection `messages`