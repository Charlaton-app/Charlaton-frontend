# Troubleshooting - Errores Reportados y Soluciones

## Fecha: 23 de Noviembre, 2025

## Ramas Creadas:

- Backend: `feature/fixing-documentation`
- Frontend: `feature/api-patch-method`

---

## ✅ Cambios Implementados

### Backend (`feature/fixing-documentation`)

1. **Simplificación del Esquema de Usuario**

   - ✅ Actualizado `UserCreateInput` y `UserResponse` en `src/types/index.ts`
   - ✅ Removidos campos obsoletos: `nombres`, `apellidos`, `edad`, `birth_date`, `name`, `last_name`
   - ✅ Esquema simplificado: `email`, `nickname`, `password`, `rolId`
   - ✅ Actualizado `auth.controller.ts` signup para usar el nuevo esquema
   - ✅ Actualizado `user.controller.ts` createUser y updateUser

2. **Corrección de Imports**

   - ✅ Corregido import en `index.ts`: `message.controllers` → `message.controller`

3. **Documentación**

   - ✅ Agregado JSDoc completo a `message.controller.ts`
   - ✅ Documentadas todas las funciones: getAllMessagesByRoom, getAllMessageOfUserInRoom, sendMessageTo, createMessage, updateContentMessage, deleteMessage

4. **Rutas Verificadas**
   - ✅ Todas las rutas usan prefijo `/api`:
     - `/api/auth/signup` ✓
     - `/api/auth/login` ✓
     - `/api/user/:id` (GET, PUT, DELETE) ✓
     - `/api/room` (GET, POST, PUT, DELETE) ✓
     - `/api/message` ✓

### Frontend (`feature/api-patch-method`)

1. **Corrección de API Service**

   - ✅ Agregado método `api.patch()` en `src/services/api.ts`
   - ✅ Requerido por `room.service.ts` y `message.service.ts`

2. **Compilación**
   - ✅ Frontend compila exitosamente sin errores
   - ⚠️ Warnings de Sass (deprecaciones no críticas)

---

## 🔍 Errores Reportados por el Usuario

### 1. ❌ Error: No permite actualizar información en perfil

```
[AUTH-SERVICE] Updating profile for user Yrv3eZNPRjTfNcZ3he750AqH8GN2
Route not found
```

**Causa Probable**:

- La ruta `/api/user/:id` existe en el backend
- Puede ser un problema de autenticación (token expirado)
- O el usuario no existe en Firestore

**Verificar**:

```bash
# En el backend, verificar que el endpoint PUT /user/:id esté registrado
# En src/routes/user.routes.ts:
router.put("/:id", verifyToken, updateUser);
```

**Solución**:

- Verificar que el backend esté corriendo en el puerto correcto
- Verificar que las cookies (AccessToken, RefreshToken) se estén enviando
- Revisar los logs del backend para ver el error exacto

---

### 2. ❌ Error: Al presionar "Iniciar reunión" sale Route not found

```
[DASHBOARD] Creating new meeting
[ROOM-SERVICE] Creating room: Reunión de ADOLFO ANDREY QUICENO CABRERA
[ROOM-SERVICE] Error creating room: Route not found
```

**Causa Probable**:

- El endpoint POST `/api/room` debe existir pero puede estar protegido por `verifyToken`
- El usuario puede no tener un token válido

**Verificar**:

```bash
# Backend - src/routes/room.routes.ts
router.post("/", verifyToken, createRoom);

# Frontend - src/services/room.service.ts
export const createRoom = async (roomData: CreateRoomData) => {
  const response = await api.post("/room", roomData);
  // ...
}
```

**Solución**:

- Verificar que el usuario esté autenticado correctamente
- Revisar que las cookies se estén enviando con `credentials: "include"`
- Verificar logs del backend

---

### 3. ❌ Error: Al intentar eliminar un perfil sale Route not found

```
[AUTH-SERVICE] Backend deletion failed: Route not found
```

**Causa Probable**:

- El endpoint DELETE `/api/user/:id` existe en el backend
- Puede ser problema de autenticación o permisos

**Verificar**:

```bash
# Backend - src/routes/user.routes.ts
router.delete("/:id", verifyToken, deleteUser);

# Frontend - src/services/auth.service.ts
export const deleteAccount = async (userId: string) => {
  const response = await api.delete(`/user/${userId}`);
  // ...
}
```

---

### 4. ❌ Error: Al intentar crear cuenta sale Route not found

```
[AUTH-SERVICE] Backend creation failed: Route not found
VM6672:1 [AUTH-SERVICE] Firebase user deleted due to backend error
```

**Causa Probable**:

- El endpoint POST `/api/auth/signup` existe en el backend
- Puede haber un error en el cuerpo de la petición

**Verificar**:

```bash
# Backend - src/routes/auth.routes.ts
router.post("/signup", signupValidation, validate, signup);

# Cuerpo esperado:
{
  "email": "user@example.com",
  "password": "password123",
  "nickname": "Username" // opcional
  "rolId": 2 // opcional, default 2
}
```

**Acción Requerida**:

- Verificar que el frontend esté enviando los campos correctos
- Ver logs del backend para identificar el error exacto

---

### 5. ⚠️ Error: Inicio de sesión con Facebook no disponible

```
Función no disponible
En este momento, el inicio de sesión con Facebook no está disponible debido a que estamos actualizando otros detalles de la aplicación.
```

**Causa**:

- Esto es esperado según el código en `loginWithFacebook()`
- El provider de Facebook está deshabilitado temporalmente

**Solución**:

- Esto es intencional, no es un error

---

### 6. ❌ Error: Al intentar iniciar sesión con una cuenta existente

```
Credenciales inválidas. Verifica tu email y contraseña.
[AUTH-SERVICE] Error in login: FirebaseError: Firebase: Error (auth/invalid-credential).
```

**Causa Probable**:

- La contraseña en Firebase Authentication no coincide con la contraseña en Firestore
- El usuario fue creado en Firestore pero no en Firebase Authentication
- O viceversa

**Verificar**:

1. ¿El usuario existe en Firebase Authentication?
2. ¿El usuario existe en Firestore collection `users`?
3. ¿La contraseña está hasheada correctamente en Firestore?

**Solución**:

- Al crear un usuario, asegurarse de que se cree tanto en Firebase Auth como en Firestore
- Verificar el flujo de signup en `auth.service.ts` línea 125-165

---

## 🛠️ Pasos para Verificar Errores

### 1. Verificar que el Backend esté corriendo

```bash
cd Charlaton-backend
npm run dev
```

**Esperado**:

```
Server running on http://localhost:3000
```

### 2. Verificar Variables de Entorno

**Backend (.env)**:

```env
PORT=3000
NODE_ENV=development
FIREBASE_SERVICE_ACCOUNT=path_to_service_account.json
DATABASE_URL=postgresql://...
ACCESS_SECRET=your_access_secret
REFRESH_SECRET=your_refresh_secret
SALT_ROUNDS=10
FRONTEND_URL=http://localhost:5173
```

**Frontend (.env)**:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
```

### 3. Verificar Logs del Backend

Cuando se ejecute una acción que falle, revisar la consola del backend para ver:

- ¿Se recibe la petición?
- ¿Hay error de autenticación?
- ¿Hay error en la validación?
- ¿Cuál es el error exacto?

### 4. Verificar Autenticación

En el navegador, abrir DevTools → Application → Cookies:

- ¿Existen las cookies `AccessToken` y `RefreshToken`?
- ¿Tienen valores?
- ¿Están configuradas para el dominio correcto?

### 5. Probar Endpoints Manualmente

Usar Postman o Thunder Client:

**POST /api/auth/signup**

```json
{
  "email": "test@example.com",
  "password": "password123",
  "nickname": "Test User"
}
```

**POST /api/auth/login**

```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

**POST /api/room** (requiere cookies)

```json
{
  "name": "Test Room",
  "creatorId": "user_id_here",
  "private": false
}
```

---

## 📋 Checklist de Verificación

- [ ] Backend corriendo en puerto 3000
- [ ] Frontend corriendo en puerto 5173
- [ ] Variables de entorno configuradas correctamente
- [ ] Firebase Admin SDK configurado con service account
- [ ] Firebase Client SDK configurado con API keys
- [ ] Cookies habilitadas en el navegador
- [ ] CORS configurado correctamente en el backend
- [ ] Verificar que `credentials: "include"` esté en todas las peticiones del frontend

---

## 🔧 Próximos Pasos

1. **Ejecutar el Backend localmente** y capturar logs detallados
2. **Reproducir cada error** uno por uno
3. **Capturar las respuestas HTTP** completas (status code, headers, body)
4. **Verificar estado de Firebase**:
   - ¿Los usuarios se crean correctamente en Authentication?
   - ¿Los usuarios se crean correctamente en Firestore?
5. **Agregar más logging** en puntos críticos si es necesario

---

## 📝 Notas Adicionales

- El backend tiene warnings de tipos de TypeScript (cors, cookie-parser, socket.io) pero **no son críticos**
- El frontend compila correctamente sin errores
- Todas las rutas están correctamente configuradas con prefijo `/api`
- El esquema de usuario ha sido simplificado a solo `nickname` (sin nombres/apellidos/edad)

---

## 🚀 Comandos Útiles

```bash
# Backend
cd Charlaton-backend
npm run dev                    # Ejecutar servidor en desarrollo
npm run build                  # Compilar TypeScript
git checkout feature/fixing-documentation  # Cambiar a rama de correcciones

# Frontend
cd Charlaton-frontend
npm run dev                    # Ejecutar app en desarrollo
npm run build                  # Compilar para producción
git checkout feature/api-patch-method     # Cambiar a rama de correcciones
```

---

**Estado Actual**: ✅ Código corregido y pusheado, pendiente verificación en ejecución
**Requiere**: Ejecutar backend y frontend localmente para reproducir y corregir errores restantes
