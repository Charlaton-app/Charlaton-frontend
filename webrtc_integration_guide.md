# 🎙️ Guía de Integración WebRTC - Frontend

Esta guía te ayudará a integrar el servidor WebRTC con tu aplicación frontend para establecer comunicación de audio en tiempo real entre usuarios.

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Configuración Inicial](#configuración-inicial)
3. [Conexión al Servidor](#conexión-al-servidor)
4. [Flujo de Conexión WebRTC](#flujo-de-conexión-webrtc)
5. [Implementación Paso a Paso](#implementación-paso-a-paso)
6. [Ejemplo Completo](#ejemplo-completo)
7. [Manejo de Errores](#manejo-de-errores)
8. [Mejores Prácticas](#mejores-prácticas)

---

## 🔧 Requisitos Previos

### Instalación de Dependencias

```bash
npm install socket.io-client
```

### Navegadores Compatibles

- Chrome 56+
- Firefox 52+
- Safari 11+
- Edge 79+

---

## ⚙️ Configuración Inicial

### 1. Variables de Entorno

Crea un archivo `.env` en tu proyecto frontend:

```env
VITE_WEBRTC_SERVER_URL=http://localhost:5050
VITE_JWT_TOKEN=your-jwt-token-here
```

### 2. Configuración de Socket.IO

```javascript
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_WEBRTC_SERVER_URL, {
  auth: {
    token: import.meta.env.VITE_JWT_TOKEN // O recuperar de tu sistema de autenticación
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});
```

---

## 🔌 Conexión al Servidor

### Autenticación

El servidor requiere un JWT válido que puede ser:
- Un token generado por tu backend
- Un Firebase ID Token

```javascript
// Ejemplo con Firebase
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;

if (user) {
  const token = await user.getIdToken();
  
  const socket = io(SERVER_URL, {
    auth: { token }
  });
}
```

### Unirse a una Sala

```javascript
socket.emit('join_room', {
  roomId: 'room-123',
  success: true // Debe ser true para unirse exitosamente
});

// Escuchar respuesta exitosa
socket.on('join_room_success', (data) => {
  console.log('✅ Conectado a la sala:', data);
  // Iniciar lógica WebRTC aquí
});

// Escuchar errores
socket.on('join_room_error', (error) => {
  console.error('❌ Error al unirse:', error.message);
});
```

---

## 🌐 Flujo de Conexión WebRTC

### Diagrama de Secuencia

```
Usuario A                    Servidor                    Usuario B
   |                            |                            |
   |-- join_room -------------->|                            |
   |<-- join_room_success ------|                            |
   |                            |<-- join_room --------------|
   |                            |-- user_joined ------------>|
   |                            |-- usersOnline ------------>|
   |                            |                            |
   |-- webrtc_offer ----------->|                            |
   |                            |-- webrtc_offer ----------->|
   |                            |<-- webrtc_answer ----------|
   |<-- webrtc_answer ----------|                            |
   |                            |                            |
   |-- webrtc_ice_candidate --->|                            |
   |                            |-- webrtc_ice_candidate --->|
   |<-- webrtc_ice_candidate ---|                            |
   |                            |<-- webrtc_ice_candidate ---|
   |                            |                            |
   [Conexión P2P establecida - Audio fluye directamente]
```

### Eventos del Servidor

| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `join_room` | Cliente → Servidor | Solicita unirse a una sala |
| `join_room_success` | Servidor → Cliente | Confirmación de unión exitosa |
| `join_room_error` | Servidor → Cliente | Error al unirse a la sala |
| `user_joined` | Servidor → Cliente | Notifica que un usuario se unió |
| `usersOnline` | Servidor → Cliente | Lista de usuarios en la sala |
| `webrtc_offer` | Cliente ↔ Servidor ↔ Cliente | Oferta SDP de WebRTC |
| `webrtc_answer` | Cliente ↔ Servidor ↔ Cliente | Respuesta SDP de WebRTC |
| `webrtc_ice_candidate` | Cliente ↔ Servidor ↔ Cliente | Candidatos ICE |
| `user_left` | Servidor → Cliente | Notifica que un usuario salió |

---

## 🛠️ Implementación Paso a Paso

### Paso 1: Crear la Clase WebRTC Manager

```javascript
class WebRTCManager {
  constructor(socket, localUserId) {
    this.socket = socket;
    this.localUserId = localUserId;
    this.peerConnections = new Map(); // userId -> RTCPeerConnection
    this.localStream = null;
    this.remoteStreams = new Map(); // userId -> MediaStream
    
    this.setupSocketListeners();
  }

  // Configuración de servidores ICE
  getIceServers() {
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Opcional: Agregar servidor TURN para mejor conectividad
        // {
        //   urls: 'turn:your-turn-server.com:3478',
        //   username: 'username',
        //   credential: 'password'
        // }
      ]
    };
  }

  setupSocketListeners() {
    // Cuando un nuevo usuario se une
    this.socket.on('user_joined', (user) => {
      console.log('👤 Usuario se unió:', user);
      // El usuario que ya estaba crea la oferta
      this.createOffer(user.id);
    });

    // Recibir oferta
    this.socket.on('webrtc_offer', async ({ senderId, sdp }) => {
      console.log('📨 Oferta recibida de:', senderId);
      await this.handleOffer(senderId, sdp);
    });

    // Recibir respuesta
    this.socket.on('webrtc_answer', async ({ senderId, sdp }) => {
      console.log('📨 Respuesta recibida de:', senderId);
      await this.handleAnswer(senderId, sdp);
    });

    // Recibir candidato ICE
    this.socket.on('webrtc_ice_candidate', async ({ senderId, candidate }) => {
      console.log('🧊 Candidato ICE de:', senderId);
      await this.handleIceCandidate(senderId, candidate);
    });

    // Cuando un usuario sale
    this.socket.on('user_left', (user) => {
      console.log('👋 Usuario salió:', user);
      this.closePeerConnection(user.id);
    });

    // Lista de usuarios online
    this.socket.on('usersOnline', (users) => {
      console.log('👥 Usuarios online:', users);
      // Actualizar UI con lista de usuarios
    });
  }

  // Iniciar captura de audio local
  async startLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      
      console.log('🎤 Stream local iniciado');
      return this.localStream;
    } catch (error) {
      console.error('❌ Error al obtener stream local:', error);
      throw error;
    }
  }

  // Crear conexión peer
  createPeerConnection(remoteUserId) {
    const pc = new RTCPeerConnection(this.getIceServers());
    
    // Agregar tracks locales
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    // Manejar candidatos ICE
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc_ice_candidate', {
          roomId: this.socket.data?.roomId || this.roomId,
          targetUserId: remoteUserId,
          candidate: event.candidate
        });
      }
    };

    // Manejar stream remoto
    pc.ontrack = (event) => {
      console.log('🎵 Stream remoto recibido de:', remoteUserId);
      const [remoteStream] = event.streams;
      this.remoteStreams.set(remoteUserId, remoteStream);
      
      // Reproducir audio remoto
      this.playRemoteStream(remoteUserId, remoteStream);
    };

    // Manejar cambios en estado de conexión
    pc.onconnectionstatechange = () => {
      console.log(`🔄 Estado de conexión con ${remoteUserId}:`, pc.connectionState);
      
      if (pc.connectionState === 'failed') {
        console.error('❌ Conexión fallida, reintentando...');
        this.createOffer(remoteUserId);
      }
    };

    this.peerConnections.set(remoteUserId, pc);
    return pc;
  }

  // Crear oferta (Usuario que ya está en la sala)
  async createOffer(remoteUserId) {
    try {
      const pc = this.createPeerConnection(remoteUserId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      this.socket.emit('webrtc_offer', {
        roomId: this.roomId,
        targetUserId: remoteUserId,
        sdp: offer
      });

      console.log('📤 Oferta enviada a:', remoteUserId);
    } catch (error) {
      console.error('❌ Error creando oferta:', error);
    }
  }

  // Manejar oferta recibida (Usuario que recién se une)
  async handleOffer(senderId, sdp) {
    try {
      const pc = this.createPeerConnection(senderId);
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.socket.emit('webrtc_answer', {
        roomId: this.roomId,
        targetUserId: senderId,
        sdp: answer
      });

      console.log('📤 Respuesta enviada a:', senderId);
    } catch (error) {
      console.error('❌ Error manejando oferta:', error);
    }
  }

  // Manejar respuesta recibida
  async handleAnswer(senderId, sdp) {
    try {
      const pc = this.peerConnections.get(senderId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        console.log('✅ Respuesta procesada de:', senderId);
      }
    } catch (error) {
      console.error('❌ Error manejando respuesta:', error);
    }
  }

  // Manejar candidato ICE
  async handleIceCandidate(senderId, candidate) {
    try {
      const pc = this.peerConnections.get(senderId);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('❌ Error agregando candidato ICE:', error);
    }
  }

  // Reproducir audio remoto
  playRemoteStream(userId, stream) {
    // Crear elemento audio si no existe
    let audioElement = document.getElementById(`audio-${userId}`);
    
    if (!audioElement) {
      audioElement = document.createElement('audio');
      audioElement.id = `audio-${userId}`;
      audioElement.autoplay = true;
      audioElement.playsInline = true;
      document.body.appendChild(audioElement);
    }

    audioElement.srcObject = stream;
  }

  // Cerrar conexión con un peer
  closePeerConnection(userId) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
    }

    const stream = this.remoteStreams.get(userId);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this.remoteStreams.delete(userId);
    }

    // Remover elemento audio
    const audioElement = document.getElementById(`audio-${userId}`);
    if (audioElement) {
      audioElement.remove();
    }
  }

  // Limpiar todas las conexiones
  cleanup() {
    // Cerrar todas las conexiones peer
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    // Detener stream local
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    // Detener streams remotos
    this.remoteStreams.forEach(stream => {
      stream.getTracks().forEach(track => track.stop());
    });
    this.remoteStreams.clear();

    // Remover elementos audio
    document.querySelectorAll('audio[id^="audio-"]').forEach(el => el.remove());
  }

  // Silenciar/Activar micrófono
  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }
}
```

---

## 📝 Ejemplo Completo

### React Component

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

function VoiceChat({ roomId, userToken }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  
  const socketRef = useRef(null);
  const webrtcManagerRef = useRef(null);

  useEffect(() => {
    // Inicializar Socket.IO
    socketRef.current = io('http://localhost:5050', {
      auth: { token: userToken }
    });

    // Manejar eventos de conexión
    socketRef.current.on('connect', () => {
      console.log('✅ Conectado al servidor');
      joinRoom();
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Desconectado del servidor');
      setIsConnected(false);
    });

    socketRef.current.on('join_room_success', async (data) => {
      console.log('✅ Unido a la sala:', data);
      setIsConnected(true);
      
      // Iniciar WebRTC
      await startVoiceChat();
    });

    socketRef.current.on('join_room_error', (error) => {
      console.error('❌ Error:', error);
      setError(error.message);
    });

    socketRef.current.on('usersOnline', (onlineUsers) => {
      setUsers(onlineUsers);
    });

    // Cleanup
    return () => {
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.cleanup();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId, userToken]);

  const joinRoom = () => {
    socketRef.current.emit('join_room', {
      roomId: roomId,
      success: true
    });
  };

  const startVoiceChat = async () => {
    try {
      // Crear WebRTC Manager
      webrtcManagerRef.current = new WebRTCManager(
        socketRef.current,
        socketRef.current.id
      );
      
      // Guardar roomId en el manager
      webrtcManagerRef.current.roomId = roomId;
      
      // Iniciar stream local
      await webrtcManagerRef.current.startLocalStream();
      
      console.log('🎤 Chat de voz iniciado');
    } catch (err) {
      console.error('Error iniciando chat de voz:', err);
      setError('No se pudo acceder al micrófono');
    }
  };

  const toggleMute = () => {
    if (webrtcManagerRef.current) {
      const enabled = webrtcManagerRef.current.toggleMute();
      setIsMuted(!enabled);
    }
  };

  if (error) {
    return (
      <div className="error">
        ❌ Error: {error}
      </div>
    );
  }

  return (
    <div className="voice-chat">
      <h2>🎙️ Chat de Voz - Sala: {roomId}</h2>
      
      <div className="status">
        {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
      </div>

      <div className="controls">
        <button onClick={toggleMute}>
          {isMuted ? '🔇 Activar micrófono' : '🎤 Silenciar'}
        </button>
      </div>

      <div className="users">
        <h3>Usuarios en la sala ({users.length})</h3>
        <ul>
          {users.map(user => (
            <li key={user.userId}>
              👤 {user.email}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default VoiceChat;
```

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>WebRTC Voice Chat</title>
  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
  <div id="app">
    <h1>🎙️ Chat de Voz WebRTC</h1>
    <div id="status">🔴 Desconectado</div>
    <button id="joinBtn">Unirse a la sala</button>
    <button id="muteBtn" disabled>🎤 Silenciar</button>
    <div id="users"></div>
  </div>

  <script>
    const ROOM_ID = 'test-room-123';
    const TOKEN = 'your-jwt-token';
    
    let socket;
    let webrtcManager;

    document.getElementById('joinBtn').addEventListener('click', async () => {
      // Conectar al servidor
      socket = io('http://localhost:5050', {
        auth: { token: TOKEN }
      });

      socket.on('connect', () => {
        console.log('Conectado');
        socket.emit('join_room', { roomId: ROOM_ID, success: true });
      });

      socket.on('join_room_success', async () => {
        document.getElementById('status').textContent = '🟢 Conectado';
        document.getElementById('muteBtn').disabled = false;
        
        // Iniciar WebRTC
        webrtcManager = new WebRTCManager(socket, socket.id);
        webrtcManager.roomId = ROOM_ID;
        await webrtcManager.startLocalStream();
      });

      socket.on('usersOnline', (users) => {
        const usersDiv = document.getElementById('users');
        usersDiv.innerHTML = '<h3>Usuarios:</h3>' + 
          users.map(u => `<div>👤 ${u.email}</div>`).join('');
      });
    });

    document.getElementById('muteBtn').addEventListener('click', () => {
      if (webrtcManager) {
        const enabled = webrtcManager.toggleMute();
        document.getElementById('muteBtn').textContent = 
          enabled ? '🎤 Silenciar' : '🔇 Activar';
      }
    });

    // Agregar la clase WebRTCManager aquí...
  </script>
</body>
</html>
```

---

## ⚠️ Manejo de Errores

### Errores Comunes

```javascript
// Error: No se puede acceder al micrófono
try {
  await navigator.mediaDevices.getUserMedia({ audio: true });
} catch (error) {
  if (error.name === 'NotAllowedError') {
    alert('Por favor, permite el acceso al micrófono');
  } else if (error.name === 'NotFoundError') {
    alert('No se encontró micrófono');
  }
}

// Error: Token inválido
socket.on('connect_error', (error) => {
  if (error.message === 'Authentication token required') {
    console.error('Token de autenticación requerido');
  }
});

// Error: Sala no existe
socket.on('join_room_error', (error) => {
  if (error.message === '404 room does not exist') {
    console.error('La sala no existe');
  }
});

// Error: Conexión WebRTC falló
pc.onconnectionstatechange = () => {
  if (pc.connectionState === 'failed') {
    console.error('Conexión fallida, considera usar servidor TURN');
  }
};
```

---

## ✅ Mejores Prácticas

### 1. Permisos de Micrófono

```javascript
// Solicitar permisos al inicio
async function requestMicrophonePermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop()); // Detener temporalmente
    return true;
  } catch (error) {
    console.error('Permiso denegado:', error);
    return false;
  }
}
```

### 2. Reconexión Automática

```javascript
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Servidor desconectó, reconectar manualmente
    socket.connect();
  }
  // Para otros casos, socket.io reconecta automáticamente
});
```

### 3. Configurar Servidor TURN

Para mejor conectividad en redes corporativas o NAT estricto:

```javascript
getIceServers() {
  return {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      {
        urls: 'turn:your-turn-server.com:3478',
        username: 'user',
        credential: 'pass'
      }
    ]
  };
}
```

### 4. Optimizar Calidad de Audio

```javascript
await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,      // Cancelación de eco
    noiseSuppression: true,       // Supresión de ruido
    autoGainControl: true,        // Control automático de ganancia
    sampleRate: 48000,            // Tasa de muestreo
    channelCount: 1               // Mono para menor ancho de banda
  }
});
```

### 5. Limpieza de Recursos

```javascript
// Siempre limpiar al desmontar componente
useEffect(() => {
  return () => {
    webrtcManager?.cleanup();
    socket?.disconnect();
  };
}, []);
```

---

## 🔒 Seguridad

### Validación de Token

```javascript
// Backend debe validar tokens
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const user = await verifyToken(token);
    socket.data.user = user;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});
```

### CORS

```javascript
// Configurar orígenes permitidos
const allowedOrigins = [
  'https://tu-app.com',
  'http://localhost:3000'
];
```

---

## 📊 Testing

### Probar Localmente

1. Abrir dos pestañas del navegador
2. Usar diferentes usuarios/tokens
3. Unirse a la misma sala
4. Verificar que el audio se escucha entre ambas

### Debug

```javascript
// Activar logs detallados
RTCPeerConnection.prototype.originalAddIceCandidate = 
  RTCPeerConnection.prototype.addIceCandidate;

RTCPeerConnection.prototype.addIceCandidate = function(candidate) {
  console.log('ICE candidate:', candidate);
  return this.originalAddIceCandidate(candidate);
};
```

---

## 📚 Recursos Adicionales

- [WebRTC Documentation](https://webrtc.org/)
- [Socket.IO Client API](https://socket.io/docs/v4/client-api/)
- [MDN WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Google WebRTC Samples](https://webrtc.github.io/samples/)

---

## 🆘 Soporte

Si encuentras problemas:

1. Verifica que el servidor esté corriendo en `http://localhost:5050`
2. Confirma que el token JWT sea válido
3. Asegúrate de que la sala exista en Firebase
4. Revisa los logs del navegador (F12 → Console)
5. Verifica permisos de micrófono

---

**¡Listo! Ahora tienes todo lo necesario para integrar WebRTC en tu frontend.** 🎉