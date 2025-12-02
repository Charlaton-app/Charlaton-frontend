# 🧪 Guía de Pruebas WebRTC - Audio y Video Remoto

## ✅ Estado Actual de Servicios

Todos los servicios están corriendo en puertos locales:

- ✅ **Backend API REST**: `http://localhost:3000`
- ✅ **Chat Server (Socket.IO)**: `http://localhost:5000`
- ✅ **WebRTC Signaling**: `http://localhost:5050`
- ✅ **Frontend**: `http://localhost:5173`

---

## 🎯 Pruebas a Realizar

### 📍 Prueba 1: Local - Mismo Navegador (2 Pestañas)

**Objetivo:** Verificar que la señalización básica funciona

**Pasos:**
1. Abre dos pestañas/ventanas de `http://localhost:5173`
2. Inicia sesión con dos cuentas diferentes (o usa modo incógnito)
3. En pestaña 1: Crea una reunión
4. En pestaña 2: Únete a la reunión usando el ID o link
5. En ambas pestañas: Activa el micrófono (botón de mic)
6. **Verificar:** Deberías ver logs en consola del navegador

**Logs esperados (Consola del navegador):**
```
[MEETING] ✅ Connected to WEBRTC server
[WEBRTC] 🔧 Configured TURN servers: ["turn:relay1.expressturn.com:3480"]
[WEBRTC] ➕ Adding audio track (enabled: true)
[WEBRTC] 📤 Creating and sending offer to [userId]
[WEBRTC] 📥 Received remote track from [userId]
[WEBRTC] 🧊 ICE connection state: connected
[MEETING] 🔊 Creating new audio element for user [userId]
```

**Resultado esperado:**
- ❌ Es posible que NO escuches audio (mismo navegador, misma salida de audio)
- ✅ PERO debes ver en logs que streams se reciben
- ✅ Los estados de mic/cámara deben sincronizarse entre pestañas

---

### 📍 Prueba 2: Local - Diferentes Dispositivos (Misma Red WiFi)

**Objetivo:** Verificar conexión P2P en red local

**Preparación:**
1. En tu PC principal, encuentra tu IP local:
   ```powershell
   ipconfig
   # Busca "Adaptador de LAN inalámbrica" o "Ethernet adapter"
   # IPv4: 192.168.x.x (o 10.x.x.x)
   ```
2. Asegúrate de que el firewall permite conexiones en los puertos

**Pasos:**
1. En PC principal: Abre `http://localhost:5173` y crea reunión
2. En otro dispositivo (celular/tablet/laptop): 
   - Conéctate a la misma red WiFi
   - Abre `http://[IP-de-tu-PC]:5173`
   - Únete a la reunión
3. Activa micrófonos en ambos dispositivos
4. **Verificar:** Deberías escuchar audio entre dispositivos

**Resultado esperado:**
- ✅ Audio bidireccional funciona
- ✅ Video funciona (si activas cámara)
- ✅ Estados se sincronizan en tiempo real

**Comandos útiles para debugging:**
```powershell
# Ver conexiones activas
netstat -an | findstr "5173"
netstat -an | findstr "5050"

# Verificar firewall (Windows)
netsh advfirewall show allprofiles state
```

---

### 📍 Prueba 3: Remoto - Diferentes Redes (Internet Real)

**Objetivo:** Verificar que TURN funciona para NAT traversal

**Escenarios:**
1. **WiFi Casa vs Datos Móviles**: Dos dispositivos en redes completamente diferentes
2. **Red Corporativa vs Red Doméstica**: Con firewalls estrictos
3. **Red 4G vs Red 5G**: Diferentes operadores

**Pasos:**
1. Usuario A en WiFi de casa: Crea reunión
2. Usuario B en datos móviles: Únete a reunión
3. Activa micrófonos en ambos
4. **Verificar:** Audio debe funcionar a través de TURN relay

**Logs importantes (Consola del navegador):**
```
[WEBRTC] 🧊 ICE candidate type: relay (significa que usa TURN)
[WEBRTC] 🧊 ICE connection state: connected
```

**Si NO funciona, revisar:**
- ¿El servidor TURN está accesible? (relay1.expressturn.com:3480)
- ¿Las credenciales son correctas?
- ¿El firewall bloquea UDP?

---

## 🔍 Cómo Interpretar los Logs

### ✅ Logs de Éxito

```javascript
// 1. Conexión al servidor WebRTC
[WEBRTC-SOCKET] ✅ Connected to WebRTC server

// 2. Inicialización correcta
[WEBRTC] 🎬 Initializing for room [roomId], user [userId]
[WEBRTC] ✅ Initialization complete

// 3. Stream local adquirido
[WEBRTC] ✅ Local media stream acquired
[WEBRTC] 🎤 Audio tracks: 1
[WEBRTC] 📹 Video tracks: 1

// 4. Peer connection creada
[WEBRTC] 🔗 Creating peer connection to [userId]
[WEBRTC] ➕ Adding audio track to [userId]
[WEBRTC] ✅ Peer connection created

// 5. Oferta enviada/recibida
[WEBRTC] 📤 Offer sent to [userId]
[WEBRTC] 📥 Received offer from [userId]

// 6. ICE candidates intercambiados
[WEBRTC] 🧊 Sending ICE candidate to [userId]
[WEBRTC] 🧊 ICE candidate added for [userId]

// 7. Conexión establecida
[WEBRTC] 🧊 ICE connection state: connected
[WEBRTC] 🔌 Connection state: connected

// 8. Stream remoto recibido
[WEBRTC] 📥 Received remote track from [userId]
[MEETING] 📥 Received remote stream from user [userId]
[MEETING] 🔊 Creating new audio element for user [userId]
```

### ❌ Errores Comunes y Soluciones

#### Error 1: No se reciben tracks remotos
```
[WEBRTC] ⚠️ No tracks in remote stream
```
**Causa:** Tracks no fueron agregados antes de la oferta  
**Solución:** Ya corregido en el código, verifica que `localStream` existe

#### Error 2: ICE connection failed
```
[WEBRTC] 🧊 ICE connection state: failed
[WEBRTC] ❌ ICE connection failed, attempting restart
```
**Causa:** No hay ruta P2P disponible y TURN no está funcionando  
**Solución:**
- Verificar credenciales TURN en `.env`
- Probar acceso al servidor: `telnet relay1.expressturn.com 3480`
- Revisar firewall

#### Error 3: Local stream not ready
```
[MEETING] ⚠️ Local stream not ready, delaying peer connection
```
**Causa:** Intentando crear peer antes de tener media local  
**Solución:** Ya corregido, pero verifica permisos de cámara/micrófono

#### Error 4: Authentication error
```
[WEBRTC-SOCKET] ❌ Connection error: Authentication token required
```
**Causa:** Token JWT no válido o expirado  
**Solución:** Cierra sesión y vuelve a iniciar sesión

---

## 🛠️ Herramientas de Debugging

### 1. Chrome DevTools - WebRTC Internals

**Acceso:** `chrome://webrtc-internals`

**Qué revisar:**
- **ICE candidates**: Deberías ver candidatos tipo `relay` (TURN) si NAT requiere relay
- **Connection state**: Debe llegar a `connected`
- **Stats**: Bytes enviados/recibidos, packets lost, bitrate

**Cómo usar:**
1. Abre una pestaña con `chrome://webrtc-internals`
2. Abre otra pestaña con tu app
3. Únete a una reunión
4. En webrtc-internals, verás estadísticas en tiempo real

### 2. Firefox - about:webrtc

**Acceso:** `about:webrtc`

Similar a Chrome, muestra estadísticas de conexiones WebRTC activas.

### 3. Logs del Servidor

**Backend (puerto 3000):**
```powershell
# Ver logs en tiempo real
cd "C:\Users\lu\Downloads\Proyectos\Proyecto integrador\3S -Charlaton\Charlaton-backend"
# Los logs se muestran en la terminal donde corre npm run dev
```

**Chat Server (puerto 5000):**
```
[ROOM] 👤 User [email] attempting to join room [roomId]
[ROOM] ✅ User joined successfully
```

**WebRTC Server (puerto 5050):**
```
[WEBRTC] 📡 Offer from [userId] to [targetUserId]
[WEBRTC] 🧊 ICE candidate from [userId] to [targetUserId]
```

---

## 📋 Checklist de Verificación

### Antes de las Pruebas:
- [ ] Todos los servicios corriendo (Backend, Chat, WebRTC, Frontend)
- [ ] Variables de entorno configuradas (especialmente TURN)
- [ ] Permisos de cámara/micrófono concedidos en el navegador
- [ ] Firewall no bloquea puertos necesarios

### Durante las Pruebas:
- [ ] Logs muestran conexión exitosa a servidores
- [ ] Local stream se obtiene correctamente
- [ ] Peer connections se crean
- [ ] Ofertas y respuestas se intercambian
- [ ] ICE candidates se agregan
- [ ] Estado ICE llega a "connected"
- [ ] Tracks remotos se reciben
- [ ] Audio elements se crean

### Resultado Final:
- [ ] Audio se escucha entre usuarios
- [ ] Video se ve (si está activado)
- [ ] Estados mic/cámara se sincronizan
- [ ] Funciona en red local
- [ ] Funciona en redes remotas (con TURN)

---

## 🚨 Troubleshooting Rápido

### Problema: No se escucha audio

**Verificaciones:**
1. ¿El micrófono está activado en ambos usuarios?
2. ¿La consola muestra que se reciben tracks remotos?
3. ¿El volumen del sistema no está silenciado?
4. ¿El navegador tiene permisos de micrófono?

**Comando de prueba:**
```javascript
// En consola del navegador
const audio = document.querySelector('audio');
console.log('Audio element:', audio);
console.log('Source:', audio?.srcObject);
console.log('Tracks:', audio?.srcObject?.getTracks());
```

### Problema: ICE connection failed

**Verificaciones:**
1. ¿Hay firewall bloqueando puertos UDP?
2. ¿Las credenciales TURN son correctas?
3. ¿El servidor TURN está online?

**Test manual de TURN:**
```powershell
# En Windows (PowerShell)
Test-NetConnection -ComputerName relay1.expressturn.com -Port 3480
```

### Problema: Peer no se conecta

**Verificaciones:**
1. ¿Ambos usuarios están en la misma room?
2. ¿Los sockets WebRTC están conectados?
3. ¿Se están intercambiando ofertas/respuestas?

**Debug en consola:**
```javascript
// Ver peers activos
webrtcManager.getPeerConnections().forEach((peer, userId) => {
  console.log(`Peer ${userId}:`, peer.connection.connectionState);
});
```

---

## 📊 Métricas de Éxito

### ✅ Prueba Exitosa:
- Tiempo de conexión < 3 segundos
- Latencia de audio < 200ms
- Sin packet loss > 5%
- Calidad de audio clara
- Sincronización labial correcta (si hay video)

### ⚠️ Advertencias Aceptables:
- Algunas ICE candidates fallan (normal si hay múltiples)
- Breve delay inicial al conectar (negociación)
- Reconexión automática si se pierde conexión temporalmente

### ❌ Fallo de Prueba:
- No se reciben tracks remotos
- ICE permanece en "failed" o "disconnected"
- Audio/video no se reproduce después de 10 segundos
- Reconexión infinita sin éxito

---

## 📞 Soporte

Si encuentras problemas:

1. **Revisa logs primero** (navegador y servidores)
2. **Verifica configuración** (especialmente TURN)
3. **Prueba en red local primero** (para aislar problemas de red)
4. **Usa herramientas de debugging** (chrome://webrtc-internals)

---

**Última actualización:** Diciembre 2, 2025  
**Estado:** ✅ Servicios corriendo, listo para pruebas
