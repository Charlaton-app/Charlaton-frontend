# Instrucciones de Depuración - Meeting Page

## Problema Reportado
1. Los nombres de usuarios aparecen como "Usuario" en vez del nickname
2. Los iconos de micrófono y cámara siempre se muestran como inactivos

## Pasos para Depurar

### 1. Verificar Backend está Corriendo
```powershell
cd Charlaton-backend
npm run dev
```
**Debe mostrar**: `Server listening on port 3000` o similar

### 2. Verificar Frontend está Corriendo
```powershell
cd Charlaton-frontend
npm run dev
```
**Debe mostrar**: `Local: http://localhost:5173/`

### 3. Abrir el Navegador con Consola
1. Ir a: `http://localhost:5173/`
2. Iniciar sesión
3. Abrir DevTools (F12)
4. Ir a la pestaña "Console"

### 4. Crear o Unirse a una Reunión
- Crear nueva reunión o usar ID: `bub-vvz`
- **IMPORTANTE**: Mantén la consola abierta para ver los logs

### 5. Revisar Logs en la Consola

Debes ver estos logs en orden:

#### a) Al Cargar la Página
```
[MEETING] User authenticated: { id, email, displayName, nickname }
[MEETING] Initializing meeting bub-vvz
```

#### b) Al Cargar Participantes
```
[MEETING] Participants loaded: [...]
[MEETING] Total participants: 1
[MEETING] Participant 1 (userId: xxx):
  - Full participant object: {...}
  - Has user object? true/false
  - user.nickname: "tu_nickname"
  - user.displayName: "tu_displayName"
```

**SI VES `❌ NO USER DATA`**: El backend NO está devolviendo datos de usuario

#### c) Al Renderizar Video Tiles
```
[MEETING] Current user name: "tu_nickname" (from: nickname)
[MEETING] Video tile xxx: mic=false, camera=false
```

#### d) Al Toggle Micrófono/Cámara
```
[MEETING] Toggle mic: { userId: xxx, oldState: false, newState: true }
[MEETING] Updated micStates: { "xxx": true }
```

### 6. Ejecutar Scripts de Depuración

#### Test 1: Verificar Respuesta de API
```javascript
// Copiar y pegar en la consola del navegador
// (contenido de test-api-response.js)
```

#### Test 2: Verificar DOM y Estados
```javascript
// Copiar y pegar en la consola del navegador
// (contenido de test-meeting-data.js)
```

## Problemas Comunes y Soluciones

### Problema 1: "Usuario" en vez de Nickname

**Causa Posible A**: Backend no está devolviendo datos de usuario
- **Verificar**: Logs muestran `❌ NO USER DATA`
- **Solución**: 
  1. Verificar que el backend tenga los cambios en `userConnection.controller.ts`
  2. Reiniciar backend: `Ctrl+C` y luego `npm run dev`
  3. Verificar logs del backend para ver si hay errores

**Causa Posible B**: Usuario no tiene nickname en Firestore
- **Verificar**: Ir a Firebase Console > Firestore > users > [tu_uid]
- **Solución**: 
  1. Verificar que el documento tenga campo `nickname`
  2. Si no existe, agregarlo manualmente o actualizar desde la página de perfil

**Causa Posible C**: userId no coincide
- **Verificar**: Comparar `user.id` del auth store con `participant.userId`
- **Solución**: Asegurar que ambos sean strings con `String()`

### Problema 2: Iconos Siempre Inactivos

**Causa Posible A**: Estados no se están inicializando
- **Verificar**: Log muestra `Initialized states: { micStates: {}, cameraStates: {} }`
- **Solución**: El diccionario debe tener al menos una entrada para tu userId

**Causa Posible B**: Toggle no actualiza estados
- **Verificar**: Al hacer clic en botón, no aparece log `[MEETING] Toggle mic`
- **Solución**: Verificar que `user?.id` existe y no es undefined

**Causa Posible C**: Socket no está conectado
- **Verificar**: En consola ejecutar: `window.socket?.connected`
- **Debe retornar**: `true`
- **Si retorna false**: Revisar configuración de socket en `socket.config.ts`

**Causa Posible D**: Backend no tiene handlers de socket
- **Verificar**: Logs del backend deben mostrar al toggle: `[SOCKET] Mic toggle: User xxx, isOn: true`
- **Solución**: Verificar que `index.ts` del backend tenga los handlers:
  ```typescript
  socket.on("toggleMic", ({ roomId, userId, isOn }) => {
    socket.to(roomId).emit("micStateChanged", { userId, isOn });
  });
  ```

### Problema 3: Estados de Otros Usuarios No Se Actualizan

**Causa**: Socket no está broadcasting correctamente
- **Verificar**: 
  1. Abrir reunión en 2 ventanas de navegador (modo incógnito para 2do usuario)
  2. Toggle mic en ventana 1
  3. Verificar si aparece en ventana 2
- **Solución**: Backend debe usar `socket.to(roomId).emit()` no `socket.emit()`

## Logs Esperados (Flujo Completo)

### Inicio de Sesión
```
[AUTH] Login successful
[AUTH] User: { id: "firebase_uid", nickname: "mi_nickname" }
```

### Entrar a Reunión
```
[MEETING] User authenticated: { id: "firebase_uid", nickname: "mi_nickname" }
[MEETING] Initializing meeting bub-vvz
[MEETING] Participants loaded: [Array(1)]
[MEETING] Participant 1: { userId: "firebase_uid", user: { nickname: "mi_nickname" } }
[MEETING] Initialized states: { micStates: { "firebase_uid": false } }
```

### Toggle Micrófono
```
[MEETING] Toggle mic: { userId: "firebase_uid", oldState: false, newState: true }
[MEETING] Updated micStates: { "firebase_uid": true }
[SOCKET] Mic toggle (backend log)
```

### Renderizado
```
[MEETING] Current user name: "mi_nickname" (from: nickname)
[MEETING] Video tile firebase_uid: mic=true, camera=false
```

## Archivos Modificados

### Backend
- `Charlaton-backend/src/controllers/userConnection.controller.ts`
  - Agregado: Fetch de datos de usuario desde Firestore
  - Agregado: Logs detallados

- `Charlaton-backend/src/index.ts`
  - Agregado: Socket handlers para `toggleMic` y `toggleCamera`
  - Agregado: Broadcast de `micStateChanged` y `cameraStateChanged`

### Frontend
- `Charlaton-frontend/src/pages/meeting/Meeting.tsx`
  - Agregado: Logs detallados de participantes
  - Mejorado: Lógica de displayName (nickname primero)
  - Agregado: Conversión consistente a String para userIds
  - Agregado: Logs en socket listeners

## Comandos Útiles

### Reiniciar Todo
```powershell
# Terminal 1 - Backend
cd Charlaton-backend
Ctrl+C
npm run dev

# Terminal 2 - Frontend  
cd Charlaton-frontend
Ctrl+C
npm run dev
```

### Ver Logs del Backend
```powershell
cd Charlaton-backend
npm run dev
# Buscar líneas que contengan [CONNECTIONS] o [SOCKET]
```

### Limpiar Cache del Navegador
1. DevTools > Application > Storage
2. Click "Clear site data"
3. Recargar página (F5)

## Contacto y Siguiente Paso

Si después de seguir estos pasos:
- Los logs muestran `❌ NO USER DATA`: El problema está en el backend
- Los logs muestran datos correctos pero UI muestra "Usuario": El problema está en el renderizado
- Los logs muestran cambios de estado pero iconos no cambian: El problema está en CSS o React render

Proporciona los logs completos de la consola para diagnóstico adicional.
