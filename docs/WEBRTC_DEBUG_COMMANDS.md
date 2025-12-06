# Comandos Útiles para Debugging WebRTC

## Filtrar Logs en Consola del Navegador

### Ver todos los logs de WebRTC
```javascript
// En la consola del navegador
localStorage.setItem('debug', 'webrtc:*');
```

### Ver logs por módulo

#### MediaManager
```javascript
// Filtrar solo logs de MediaManager
console.log = (function(oldLog) {
  return function() {
    if (arguments[0] && arguments[0].includes('[MediaManager]')) {
      oldLog.apply(console, arguments);
    }
  };
})(console.log);
```

#### ConnectionManager
```javascript
// Filtrar solo logs de ConnectionManager
console.log = (function(oldLog) {
  return function() {
    if (arguments[0] && arguments[0].includes('[ConnectionManager]')) {
      oldLog.apply(console, arguments);
    }
  };
})(console.log);
```

#### SignalingManager
```javascript
// Filtrar solo logs de SignalingManager
console.log = (function(oldLog) {
  return function() {
    if (arguments[0] && arguments[0].includes('[SignalingManager]')) {
      oldLog.apply(console, arguments);
    }
  };
})(console.log);
```

#### ParticipantManager
```javascript
// Filtrar solo logs de ParticipantManager
console.log = (function(oldLog) {
  return function() {
    if (arguments[0] && arguments[0].includes('[ParticipantManager]')) {
      oldLog.apply(console, arguments);
    }
  };
})(console.log);
```

### Ver logs de Meeting.tsx
```javascript
// Filtrar solo logs de Meeting
console.log = (function(oldLog) {
  return function() {
    if (arguments[0] && arguments[0].includes('[MEETING]')) {
      oldLog.apply(console, arguments);
    }
  };
})(console.log);
```

## Inspeccionar Estado en Consola

### Ver conexiones activas
```javascript
// Acceder al manager global (si está expuesto en window)
webrtcManager.getActivePeers();
```

### Ver stream local
```javascript
webrtcManager.getLocalStream();
```

### Ver todas las conexiones peer
```javascript
// Desde ConnectionManager
connectionManager.getAllPeerConnections();
```

## Comandos de DevTools

### Ver estadísticas de WebRTC
```javascript
// Para cada peer connection
pc.getStats().then(stats => {
  stats.forEach(report => {
    console.log(report.type, report);
  });
});
```

### Ver tracks de un stream
```javascript
stream.getTracks().forEach(track => {
  console.log({
    kind: track.kind,
    id: track.id,
    label: track.label,
    enabled: track.enabled,
    muted: track.muted,
    readyState: track.readyState
  });
});
```

## Debugging de Problemas Comunes

### Usuario no aparece en la lista
```javascript
// En consola, buscar estos logs:
// 1. [MEETING] 👤 User joined WebRTC: {...}
// 2. [MEETING] 🚀 Optimistic UI update - adding participant
// 3. [MEETING] ✅ Added participant optimistically: {...}
// 4. [MEETING] 🔄 Reconciling participants with backend

// Si no ves el paso 2-3, el optimistic update falló
// Si no ves el paso 4, la reconciliación no se ejecutó
```

### Conexión WebRTC falla
```javascript
// Buscar estos logs en orden:
// 1. [SignalingManager] 📤 Sending OFFER to {userId}
// 2. [ConnectionManager] 🔗 Creating peer connection to {userId}
// 3. [SignalingManager] 📥 Received ANSWER from {userId}
// 4. [ConnectionManager] ✅ Successfully connected to {userId}

// Si falta algún paso, identifica dónde se interrumpe
```

### Audio/Video no funciona
```javascript
// Verificar permisos
navigator.permissions.query({ name: 'microphone' }).then(result => {
  console.log('Microphone permission:', result.state);
});

navigator.permissions.query({ name: 'camera' }).then(result => {
  console.log('Camera permission:', result.state);
});

// Verificar tracks
const stream = webrtcManager.getLocalStream();
console.log('Audio tracks:', stream.getAudioTracks());
console.log('Video tracks:', stream.getVideoTracks());

stream.getTracks().forEach(track => {
  console.log(`${track.kind}: enabled=${track.enabled}, muted=${track.muted}`);
});
```

## Emojis en Logs para Identificación Rápida

- 🚀 Inicialización
- 🔧 Configuración
- 🎬 Inicio de medios
- 🎤 Audio
- 📹 Video
- 🔗 Conexión peer
- 📤 Enviando datos
- 📥 Recibiendo datos
- 👥 Múltiples usuarios
- 👤 Usuario individual
- 📋 Detalles/Data
- ✅ Éxito
- ❌ Error
- ⚠️ Advertencia
- ℹ️ Información
- 🔄 Actualización/Refresh
- 🧹 Limpieza
- 🛑 Deteniendo
- 🔌 Desconexión
- 👋 Usuario sale
- 📞 Callback/Evento

## Entorno de Desarrollo

### Levantar servidores
```bash
# Terminal 1 - Backend
cd Charlaton-backend
npm run dev

# Terminal 2 - Chat Server
cd charlaton-chat
npm run dev

# Terminal 3 - WebRTC Server
cd charlaton-WebRTC
npm run dev

# Terminal 4 - Frontend
cd Charlaton-frontend
npm run dev
```

### Ver logs de servidores
```bash
# Filtrar logs de WebRTC en backend
tail -f backend.log | grep -i webrtc

# Ver solo errores
tail -f backend.log | grep -i error
```

## Testing Local

### Probar con múltiples usuarios
1. Abrir ventana normal en navegador
2. Abrir ventana incógnito
3. Iniciar sesión con diferentes usuarios
4. Crear reunión en una ventana
5. Unirse en la otra
6. Monitorear logs en ambas ventanas

### Verificar que todo funciona
- [ ] Usuario A crea sala ✅
- [ ] Usuario A ve su propio video/audio ✅
- [ ] Usuario B se une ✅
- [ ] Usuario A ve a Usuario B en la lista ✅ (OPTIMISTIC UPDATE)
- [ ] Usuario A recibe audio/video de B ✅
- [ ] Usuario B recibe audio/video de A ✅
- [ ] Mic toggle funciona ✅
- [ ] Camera toggle funciona ✅
- [ ] Usuario sale correctamente ✅
