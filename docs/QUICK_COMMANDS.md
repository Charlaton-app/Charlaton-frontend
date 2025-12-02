# 🎮 Comandos Rápidos - Charlaton WebRTC

## 🚀 Iniciar Todos los Servicios (Ya corriendo)

Los servicios ya están corriendo en background. Para verificar:

```powershell
# Ver procesos Node.js activos
Get-Process node

# Ver puertos en uso
netstat -an | findstr "3000"
netstat -an | findstr "5000"
netstat-an | findstr "5050"
netstat -an | findstr "5173"
```

## 🛑 Detener Todos los Servicios

Si necesitas detener y reiniciar:

```powershell
# Detener todos los procesos Node.js (CUIDADO: mata todos)
Stop-Process -Name node -Force

# O detener uno por uno desde las terminales donde corren
# Ctrl + C en cada terminal
```

## 🔄 Reiniciar Servicios Individualmente

### Backend (puerto 3000)
```powershell
cd "C:\Users\lu\Downloads\Proyectos\Proyecto integrador\3S -Charlaton\Charlaton-backend"
npm run dev
```

### Chat Server (puerto 5000)
```powershell
cd "C:\Users\lu\Downloads\Proyectos\Proyecto integrador\3S -Charlaton\charlaton-chat"
npm run dev
```

### WebRTC Server (puerto 5050)
```powershell
cd "C:\Users\lu\Downloads\Proyectos\Proyecto integrador\3S -Charlaton\charlaton-WebRTC"
npm run dev
```

### Frontend (puerto 5173)
```powershell
cd "C:\Users\lu\Downloads\Proyectos\Proyecto integrador\3S -Charlaton\Charlaton-frontend"
npm run dev
```

## 🔍 Debugging

### Ver logs en tiempo real

Los logs ya se muestran en las terminales donde iniciaste cada servicio.

### Limpiar cache y reinstalar (si hay problemas)

```powershell
# Backend
cd "C:\Users\lu\Downloads\Proyectos\Proyecto integrador\3S -Charlaton\Charlaton-backend"
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force dist
npm install
npm run build
npm run dev

# Chat
cd "C:\Users\lu\Downloads\Proyectos\Proyecto integrador\3S -Charlaton\charlaton-chat"
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force dist
npm install
npm run build
npm run dev

# WebRTC
cd "C:\Users\lu\Downloads\Proyectos\Proyecto integrador\3S -Charlaton\charlaton-WebRTC"
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force dist
npm install
npm run build
npm run dev

# Frontend
cd "C:\Users\lu\Downloads\Proyectos\Proyecto integrador\3S -Charlaton\Charlaton-frontend"
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force dist
npm install
npm run dev
```

### Limpiar cache de Vite (Frontend)

```powershell
cd "C:\Users\lu\Downloads\Proyectos\Proyecto integrador\3S -Charlaton\Charlaton-frontend"
Remove-Item -Recurse -Force .vite
Remove-Item -Recurse -Force node_modules/.vite
npm run dev
```

## 🧪 Pruebas Rápidas

### Probar endpoints health

```powershell
# Backend
Invoke-WebRequest -Uri "http://localhost:3000/health" | Select-Object -ExpandProperty Content

# Chat
Invoke-WebRequest -Uri "http://localhost:5000/health" | Select-Object -ExpandProperty Content

# WebRTC
Invoke-WebRequest -Uri "http://localhost:5050/health" | Select-Object -ExpandProperty Content
```

Todos deben responder con JSON similar a:
```json
{"status":"ok","timestamp":1234567890,"uptime":123.45}
```

### Abrir navegadores para pruebas

```powershell
# Abrir Chrome en modo normal
Start-Process "chrome.exe" "http://localhost:5173"

# Abrir Chrome en modo incógnito (para segunda cuenta)
Start-Process "chrome.exe" "--incognito http://localhost:5173"

# O usar Edge
Start-Process "msedge.exe" "http://localhost:5173"
Start-Process "msedge.exe" "--inprivate http://localhost:5173"
```

## 📊 Verificar Estado de la Red

### Ver IP local (para pruebas en otros dispositivos)

```powershell
ipconfig | findstr "IPv4"
```

Busca algo como: `192.168.1.x` o `10.0.0.x`

### Probar conectividad a TURN server

```powershell
Test-NetConnection -ComputerName relay1.expressturn.com -Port 3480
```

Debe mostrar: `TcpTestSucceeded : True`

### Ver conexiones WebSocket activas

```powershell
# Ver conexiones en puerto 5000 (Chat)
netstat -an | findstr "5000" | findstr "ESTABLISHED"

# Ver conexiones en puerto 5050 (WebRTC)
netstat -an | findstr "5050" | findstr "ESTABLISHED"
```

## 🔧 Configuración Rápida

### Ver variables de entorno actuales

```powershell
# Frontend
cd "C:\Users\lu\Downloads\Proyectos\Proyecto integrador\3S -Charlaton\Charlaton-frontend"
Get-Content .env

# Backend
cd "C:\Users\lu\Downloads\Proyectos\Proyecto integrador\3S -Charlaton\Charlaton-backend"
Get-Content .env
```

### Editar variables de entorno

```powershell
# Abrir en editor de texto
notepad "C:\Users\lu\Downloads\Proyectos\Proyecto integrador\3S -Charlaton\Charlaton-frontend\.env"
```

## 🐛 Troubleshooting Común

### Puerto ya en uso

```powershell
# Ver qué proceso usa el puerto 3000
netstat -ano | findstr "3000"
# Anotar el PID (último número)

# Matar ese proceso
Stop-Process -Id [PID] -Force
```

### Permisos de firewall

```powershell
# Verificar estado del firewall
netsh advfirewall show allprofiles state

# Permitir Node.js (ejecutar como Administrador)
New-NetFirewallRule -DisplayName "Node.js" -Direction Inbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow
```

### Cache corrupto

```powershell
# Limpiar cache npm global
npm cache clean --force

# Limpiar cache de navegador
# Chrome: Ctrl+Shift+Del → Borrar todo
```

## 📁 Archivos Importantes

### Logs de los servicios

Los logs se muestran en las terminales activas. Si cerraste las terminales, reinicia los servicios para ver logs nuevos.

### Archivos de configuración

```
Frontend:   .env (variables de entorno)
Backend:    .env (secrets y config)
Chat:       .env (JWT y CORS)
WebRTC:     .env (JWT y CORS)
```

### Archivos modificados hoy

```
✅ Charlaton-frontend/src/lib/webrtc.config.ts
✅ Charlaton-frontend/src/pages/meeting/Meeting.tsx
✅ Charlaton-frontend/.env
```

## 🎯 Comandos para Producción (Futuro)

### Build para producción

```powershell
# Backend
cd Charlaton-backend
npm run build
# Genera dist/

# Chat
cd charlaton-chat
npm run build
# Genera dist/

# WebRTC
cd charlaton-WebRTC
npm run build
# Genera dist/

# Frontend
cd Charlaton-frontend
npm run build
# Genera dist/
```

### Preview de producción (Frontend)

```powershell
cd Charlaton-frontend
npm run build
npm run preview
# Abre en http://localhost:4173
```

## 📚 Documentación Creada

```
📄 EXECUTIVE_SUMMARY.md          - Resumen ejecutivo completo
📄 WEBRTC_FIXES_APPLIED.md       - Detalles técnicos de correcciones
📄 TESTING_GUIDE_WEBRTC.md       - Guía de pruebas paso a paso
📄 DEPLOYMENT_READINESS.md       - Preparación para despliegue
📄 QUICK_COMMANDS.md             - Este archivo
```

## 🚀 Próximo Paso INMEDIATO

**Abre tu navegador y prueba:**

```powershell
# Abrir Chrome
Start-Process "chrome.exe" "http://localhost:5173"

# Abrir incógnito para segunda cuenta
Start-Process "chrome.exe" "--incognito http://localhost:5173"
```

**Luego:**
1. Inicia sesión en ambas pestañas
2. Crea reunión en una, únete desde la otra
3. Activa micrófonos
4. Abre DevTools (F12) → Console
5. Busca logs con "✅" verdes

**¿Escuchas audio?** → 🎉 ¡ÉXITO!  
**¿No escuchas?** → Revisa `TESTING_GUIDE_WEBRTC.md`

---

**Última actualización:** Diciembre 2, 2025  
**Estado:** ✅ Servicios corriendo, listo para pruebas
