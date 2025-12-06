# WebRTC Debugging Guide

## Arquitectura Modular

La nueva arquitectura divide las responsabilidades en módulos especializados:

### 1. **MediaManager** (`media-manager.ts`)
- **Responsabilidad**: Gestión de streams locales (audio/video)
- **Funciones clave**:
  - `startMedia()` - Inicia captura de medios
  - `stopMedia()` - Detiene todos los tracks
  - `toggleAudio()`/`toggleVideo()` - Activa/desactiva tracks
  - `getLocalStream()` - Obtiene el stream local actual

### 2. **ConnectionManager** (`connection-manager.ts`)
- **Responsabilidad**: Gestión de conexiones peer-to-peer
- **Funciones clave**:
  - `createPeerConnection()` - Crea nueva conexión RTCPeerConnection
  - `closePeerConnection()` - Cierra conexión específica
  - `updateLocalStream()` - Actualiza stream en todas las conexiones
  - `getAllPeerConnections()` - Lista todas las conexiones activas

### 3. **SignalingManager** (`signaling-manager.ts`)
- **Responsabilidad**: Manejo de señalización WebRTC
- **Funciones clave**:
  - `sendOffer()` - Envía oferta a un peer
  - `handleOffer()` - Procesa oferta entrante
  - `handleAnswer()` - Procesa respuesta entrante
  - `handleIceCandidate()` - Procesa candidatos ICE

### 4. **ParticipantManager** (`participant-manager.ts`)
- **Responsabilidad**: Gestión de participantes
- **Funciones clave**:
  - Maneja eventos `usersOnline`, `user_joined`, `user_left`
  - Coordina creación de conexiones cuando usuarios se unen
  - Notifica cambios de participantes a la UI

### 5. **WebRTCManager** (`webrtc-manager.ts`)
- **Responsabilidad**: Coordinador principal
- **Funciones clave**:
  - `initialize()` - Inicializa todo el sistema
  - `startLocalMedia()` - Inicia medios y configura conexiones
  - `cleanup()` - Limpia todos los recursos

## Flujo de Conexión

### Usuario A crea la sala:

1. Usuario A se conecta al servidor WebRTC
2. Emite `join_room` con roomId
3. Recibe `join_room_success`
4. Inicializa WebRTCManager
5. Inicia local media (audio/video)
6. Espera a que otros usuarios se unan

### Usuario B se une a la sala:

1. Usuario B se conecta al servidor WebRTC
2. Emite `join_room` con roomId
3. Recibe `join_room_success`
4. Recibe `usersOnline` con lista [Usuario A]
5. Inicializa WebRTCManager
6. Inicia local media
7. **CRUCIAL**: Usuario B envía OFFER a Usuario A

### Usuario A recibe notificación:

1. Usuario A recibe evento `user_joined` con datos de Usuario B
2. **PROBLEMA IDENTIFICADO**: La UI no se actualiza porque:
   - El evento se recibe correctamente
   - Se llama `refreshParticipants()` 
   - Se envía offer a Usuario B
   - PERO: El estado de React no se actualiza visualmente

## Problema Principal Identificado

**Síntoma**: Cuando un nuevo usuario se une, el creador de la llamada no ve actualizada su UI.

**Causa Raíz**: 
- El evento `user_joined` se recibe correctamente
- `refreshParticipants()` se llama y actualiza el estado
- PERO: El problema es que el evento `user_joined` puede llegar ANTES de que el backend haya actualizado la lista de participantes
- Cuando `refreshParticipants()` consulta al backend, el nuevo usuario aún no está en la respuesta

**Solución**:
1. Optimistic UI update: Agregar usuario inmediatamente al estado local
2. Reconciliar con backend después (refreshParticipants como confirmación)
3. Agregar delay mínimo antes de refreshParticipants para dar tiempo al backend

## Logs a Buscar

### Logs Normales (Todo OK):
```
[ParticipantManager] 👤 User joined: <userId>
[ParticipantManager] 🔗 Sending offer to new user <userId>
[SignalingManager] 📤 Initiating offer to <userId>
[ConnectionManager] 🔗 Creating peer connection to <userId>
[SignalingManager] ✅ Offer sent to <userId>
```

### Logs de Problema:
```
[MEETING] 👤 User joined WebRTC: <userData>
[MEETING] Sending WebRTC offer to new user <userId>
// Pero la UI no se actualiza - buscar si refreshParticipants retorna datos
```

## Mejoras Implementadas

1. **Modularización**: Código organizado en responsabilidades claras
2. **Logs Detallados**: Cada módulo tiene su prefijo para debugging
3. **Callbacks Centralizados**: Los eventos se manejan en un solo lugar
4. **Estado Consistente**: El ConnectionManager mantiene track de todas las conexiones

## Próximos Pasos

1. ✅ Crear arquitectura modular
2. ⏳ Actualizar Meeting.tsx para optimistic updates
3. ⏳ Mejorar sincronización backend-frontend
4. ⏳ Agregar manejo de race conditions
