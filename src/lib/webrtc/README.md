# WebRTC Module

Arquitectura modular para la gestión de videollamadas WebRTC en Charlaton.

## Estructura

- **types.ts** - Definiciones de tipos compartidos
- **media-manager.ts** - Gestión de audio/video local
- **connection-manager.ts** - Gestión de conexiones peer-to-peer
- **signaling-manager.ts** - Señalización WebRTC (offer/answer/ICE)
- **participant-manager.ts** - Eventos de participantes
- **webrtc-manager.ts** - Coordinador principal
- **index.ts** - Punto de entrada

## Uso Básico

```typescript
import { webrtcManager } from './webrtc';

// Inicializar
await webrtcManager.initialize(roomId, userId, socket);

// Iniciar medios
const stream = await webrtcManager.startLocalMedia(true, true);

// Configurar callback para streams remotos
webrtcManager.setOnRemoteStreamCallback((stream, userId) => {
  // Manejar stream remoto
});

// Limpiar al salir
webrtcManager.cleanup();
```

## Documentación

Ver `/docs/WEBRTC_REFACTORING_SUMMARY.md` para documentación completa.
