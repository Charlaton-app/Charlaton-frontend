// Script de depuración para verificar datos de participantes y estados de medios
// Ejecutar en la consola del navegador cuando estés en una reunión

console.log("=== DEBUGGING MEETING DATA ===");

// 1. Verificar usuario autenticado
console.log("\n1. Usuario Autenticado:");
const authStorage = localStorage.getItem('auth-storage');
if (authStorage) {
  const parsed = JSON.parse(authStorage);
  console.log("Auth Store:", {
    id: parsed.state?.user?.id,
    email: parsed.state?.user?.email,
    displayName: parsed.state?.user?.displayName,
    nickname: parsed.state?.user?.nickname,
  });
} else {
  console.error("❌ No se encuentra auth-storage en localStorage");
}

// 2. Verificar elementos del DOM
console.log("\n2. Elementos del DOM:");
const videoTiles = document.querySelectorAll('.video-tile');
console.log(`Video tiles encontrados: ${videoTiles.length}`);

videoTiles.forEach((tile, index) => {
  const nameElement = tile.querySelector('.participant-name');
  const micIcon = tile.querySelector('.media-icon[title="Micrófono"]');
  const cameraIcon = tile.querySelector('.media-icon[title="Cámara"]');
  
  console.log(`\nVideo Tile ${index + 1}:`);
  console.log(`  Nombre: ${nameElement?.textContent}`);
  console.log(`  Mic clase: ${micIcon?.className}`);
  console.log(`  Cámara clase: ${cameraIcon?.className}`);
  console.log(`  Mic SVG paths: ${micIcon?.querySelectorAll('path, line').length}`);
  console.log(`  Cámara SVG paths: ${cameraIcon?.querySelectorAll('path, line').length}`);
});

// 3. Verificar lista de participantes
console.log("\n3. Lista de Participantes:");
const participantItems = document.querySelectorAll('.participant-item');
console.log(`Participantes en lista: ${participantItems.length}`);

participantItems.forEach((item, index) => {
  const nameElement = item.querySelector('.participant-name-small');
  const micStatus = item.querySelector('.status-icon[title="Micrófono"]');
  const cameraStatus = item.querySelector('.status-icon[title="Cámara"]');
  
  console.log(`\nParticipante ${index + 1}:`);
  console.log(`  Nombre: ${nameElement?.textContent}`);
  console.log(`  Mic clase: ${micStatus?.className}`);
  console.log(`  Cámara clase: ${cameraStatus?.className}`);
});

// 4. Verificar botones de control
console.log("\n4. Botones de Control:");
const micButton = document.querySelector('.control-btn[aria-label*="micrófono"]');
const cameraButton = document.querySelector('.control-btn[aria-label*="cámara"]');

console.log(`Botón Mic:`, {
  clase: micButton?.className,
  label: micButton?.getAttribute('aria-label'),
  hasIcon: micButton?.querySelector('svg') !== null
});

console.log(`Botón Cámara:`, {
  clase: cameraButton?.className,
  label: cameraButton?.getAttribute('aria-label'),
  hasIcon: cameraButton?.querySelector('svg') !== null
});

// 5. Verificar conexión Socket
console.log("\n5. Socket.IO:");
if (window.socket) {
  console.log(`Socket conectado: ${window.socket.connected}`);
  console.log(`Socket ID: ${window.socket.id}`);
} else {
  console.warn("⚠️ Socket no está disponible en window.socket");
}

console.log("\n=== FIN DEBUG ===");
console.log("\nPara probar cambios de estado:");
console.log("1. Haz clic en el botón de micrófono");
console.log("2. Verifica si cambian las clases de los iconos");
console.log("3. Revisa la consola para logs de [MEETING]");
