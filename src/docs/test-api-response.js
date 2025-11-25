// Script para probar la respuesta de la API de participantes
// Ejecutar esto en la consola del navegador dentro de una reunión

async function testParticipantsAPI() {
  console.log("=== TESTING PARTICIPANTS API ===\n");
  
  // Obtener el token de autenticación
  const authStorage = localStorage.getItem('auth-storage');
  if (!authStorage) {
    console.error("❌ No se encuentra auth-storage");
    return;
  }
  
  const authData = JSON.parse(authStorage);
  console.log("1. Usuario autenticado:", {
    id: authData.state?.user?.id,
    email: authData.state?.user?.email,
    displayName: authData.state?.user?.displayName,
    nickname: authData.state?.user?.nickname,
  });
  
  // Obtener el meetingId de la URL
  const pathParts = window.location.pathname.split('/');
  const meetingId = pathParts[pathParts.length - 1];
  console.log("\n2. Meeting ID:", meetingId);
  
  // Hacer la petición a la API
  try {
    const apiUrl = import.meta.env?.VITE_API_URL || 'http://localhost:3000';
    const url = `${apiUrl}/api/connection/room/${meetingId}`;
    console.log("\n3. Llamando a:", url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Error HTTP: ${response.status}`);
      const errorText = await response.text();
      console.error("Respuesta:", errorText);
      return;
    }
    
    const data = await response.json();
    console.log("\n4. Respuesta de la API:");
    console.log(`Total de participantes: ${data.length}`);
    
    data.forEach((participant, index) => {
      console.log(`\n  Participante ${index + 1}:`);
      console.log(`    ID: ${participant.id}`);
      console.log(`    UserID: ${participant.userId}`);
      console.log(`    User data:`, participant.user);
      console.log(`    JoinedAt: ${participant.joinedAt}`);
      console.log(`    LeftAt: ${participant.leftAt}`);
      
      if (participant.user) {
        console.log(`    ✓ Tiene datos de usuario`);
        console.log(`      - Email: ${participant.user.email}`);
        console.log(`      - Nickname: ${participant.user.nickname}`);
        console.log(`      - DisplayName: ${participant.user.displayName}`);
      } else {
        console.error(`    ❌ NO tiene datos de usuario`);
      }
    });
    
    console.log("\n5. Estructura completa:");
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
  
  console.log("\n=== FIN TEST ===");
}

// Ejecutar el test
testParticipantsAPI();
