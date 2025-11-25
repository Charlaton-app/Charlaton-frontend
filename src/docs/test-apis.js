// Test script for API endpoints
const fetch = require("node-fetch");

const API_BASE = "http://localhost:3000/api";

async function testAPI() {
  console.log("🧪 Testing API Endpoints...\n");

  // Test 1: Health check
  try {
    const res = await fetch("http://localhost:3000/");
    const data = await res.json();
    console.log("✅ Health Check:", data);
  } catch (error) {
    console.error("❌ Health Check failed:", error.message);
  }

  // Test 2: Room endpoint (should require auth)
  try {
    const res = await fetch(`${API_BASE}/room`);
    const data = await res.json();
    console.log("\n📍 GET /api/room:", res.status, data);
  } catch (error) {
    console.error("\n❌ Room endpoint failed:", error.message);
  }

  // Test 3: User endpoint (public - should work)
  try {
    const res = await fetch(`${API_BASE}/user`);
    const data = await res.json();
    console.log(
      "\n📍 GET /api/user:",
      res.status,
      typeof data === "object" ? "Success" : data
    );
  } catch (error) {
    console.error("\n❌ User endpoint failed:", error.message);
  }

  // Test 4: Auth login endpoint (should accept POST)
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "test123" }),
    });
    const data = await res.json();
    console.log("\n📍 POST /api/auth/login:", res.status, data);
  } catch (error) {
    console.error("\n❌ Login endpoint failed:", error.message);
  }

  console.log("\n✅ API tests completed!\n");
}

testAPI().catch(console.error);
