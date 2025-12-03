# ExpressTurn TURN/STUN Server Configuration

## 🎯 Objetivo

Configurar servidores TURN/STUN de ExpressTurn para mejorar la conectividad WebRTC en entornos con NAT/Firewall restrictivos.

---

## ✅ Configuración Actual

### Servidores Configurados

| Tipo | URL | Credenciales |
|------|-----|--------------|
| STUN | `stun:relay1.expressturn.com:3478` | No requiere |
| TURN | `turn:relay1.expressturn.com:3480` | Username + Credential |

### Credenciales TURN

```typescript
username: "000000002080065511"
credential: "wt8JcNe7xofmCsmfdkwmXvG1QvA="
```

---

## 📂 Ubicación en el Código

### Frontend

Archivo: `src/lib/webrtc.config.ts`

```typescript
const ICE_SERVERS: RTCIceServer[] = [
  { 
    urls: "stun:relay1.expressturn.com:3478"
  },
  { 
    urls: "turn:relay1.expressturn.com:3480",
    username: "000000002080065511",
    credential: "wt8JcNe7xofmCsmfdkwmXvG1QvA="
  },
];
```

---

## 🔍 Verificación

### Chrome DevTools

1. Abrir `chrome://webrtc-internals/`
2. Iniciar una reunión
3. Buscar en "ICE candidate grid"
4. Verificar candidatos tipo:
   - ✅ `srflx` (STUN)
   - ✅ `relay` (TURN)

### Estado de Conexión

Si la conexión usa TURN correctamente, verás:
- Connection state: `connected`
- ICE connection state: `connected`
- Candidatos relay presentes

---

## 🚨 Troubleshooting

### No se generan candidatos TURN

**Causas:**
- Credenciales incorrectas
- Puerto 3480 bloqueado por firewall
- Credenciales expiradas

**Solución:**
1. Verificar en ExpressTurn Dashboard que las credenciales están activas
2. Probar conectividad: `telnet relay1.expressturn.com 3480`
3. Rotar credenciales si es necesario

### Conexión falla en redes restrictivas

**Solución:**
- Agregar puerto TCP además de UDP:
```typescript
{
  urls: [
    "turn:relay1.expressturn.com:3480?transport=udp",
    "turn:relay1.expressturn.com:3480?transport=tcp"
  ],
  username: "000000002080065511",
  credential: "wt8JcNe7xofmCsmfdkwmXvG1QvA="
}
```

---

## 📊 Monitoreo

### ExpressTurn Dashboard

Revisar periódicamente:
- Uso de ancho de banda
- Número de conexiones activas
- Fecha de expiración de credenciales

### Logs del Navegador

Buscar en console:
```
[WEBRTC] ICE candidate type: relay
[WEBRTC] Connection state: connected
```

---

## 🔄 Actualización de Credenciales

Si las credenciales expiran o necesitan rotarse:

1. Obtener nuevas credenciales de ExpressTurn
2. Actualizar `src/lib/webrtc.config.ts`
3. Commit y push cambios
4. Desplegar nueva versión

---

## 📝 Notas Importantes

- ⚠️ Las credenciales TURN están hardcodeadas en el código
- ⚠️ Para producción, considerar endpoint backend que genere credenciales temporales
- ✅ STUN no requiere autenticación
- ✅ TURN es necesario en ~10-15% de conexiones (según estadísticas)

---

**Última actualización**: 2 de diciembre de 2025  
**Estado**: ✅ Configurado y funcionando  
**Proveedor**: ExpressTurn
