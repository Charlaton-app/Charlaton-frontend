# Deployment Guide for Charlaton WebRTC Integration

This guide provides step-by-step instructions for deploying the Charlaton application with WebRTC audio/video functionality.

## Prerequisites

Before deploying, ensure you have:

- [ ] Firebase project with Firestore enabled
- [ ] Firebase service account JSON key
- [ ] JWT secret keys (must be the same across all services)
- [ ] HTTPS-enabled hosting (required for WebRTC)

## Environment Variables Setup

### 1. Backend API (Port 3000)

Create `.env` file in `Charlaton-backend/`:

```bash
PORT=3000
NODE_ENV=production
DATABASE_URL=your_database_url

# CRITICAL: These must match across all services
ACCESS_SECRET=your_strong_random_secret_here
REFRESH_SECRET=your_strong_random_refresh_secret_here

# CORS Configuration
FRONTEND_URL=https://your-frontend-domain.vercel.app
ORIGIN=https://your-frontend-domain.vercel.app

# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_app_password
```

### 2. WebSocket Chat Server (Port 5000)

Create `.env` file in `charlaton-chat/`:

```bash
PORT=5000
NODE_ENV=production

# CRITICAL: Must match Backend API
ACCESS_SECRET=your_strong_random_secret_here
JWT_SECRET=your_strong_random_secret_here

# CORS Configuration
FRONTEND_URL=https://your-frontend-domain.vercel.app
ORIGIN=https://your-frontend-domain.vercel.app

# Firebase Admin SDK - Option 1: JSON String (recommended for deployment)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}

# Firebase Admin SDK - Option 2: File Path (for local development)
# FIREBASE_KEY_PATH=./serviceAccountKey.json
```

### 3. WebRTC Server (Port 5050) - Optional

Create `.env` file in `charlaton-WebRTC/`:

```bash
PORT=5050
NODE_ENV=production

# CRITICAL: Must match Backend API and Chat Server
ACCESS_SECRET=your_strong_random_secret_here
JWT_SECRET=your_strong_random_secret_here

# CORS Configuration
FRONTEND_URL=https://your-frontend-domain.vercel.app
ORIGIN=https://your-frontend-domain.vercel.app

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

### 4. Frontend (React + Vite)

Create `.env` file in `Charlaton-frontend/`:

```bash
# Firebase Public Configuration
VITE_FIREBASE_API=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-ABC123

# Backend Services (Production URLs)
VITE_API_URL=https://your-backend-api.render.com
VITE_CHAT_SERVER_URL=https://your-chat-server.render.com
VITE_WEBRTC_SERVER_URL=https://your-webrtc-server.render.com
```

## Deployment Steps

### Option 1: Deploy to Render.com (Recommended)

#### Backend Services (API, Chat, WebRTC)

1. **Create New Web Service** for each backend service
2. **Connect your GitHub repository**
3. **Configure each service**:

   ```yaml
   # Build Command
   npm install && npm run build

   # Start Command
   npm start

   # Environment Variables
   # Add all variables from .env files through Render dashboard
   ```

4. **Important Settings**:

   - Select Node.js runtime
   - Choose appropriate instance type (Starter or higher)
   - Enable "Auto-Deploy" for automatic updates
   - Set health check path to `/health`

5. **Update Frontend URLs**:
   - Copy the deployed URLs from Render
   - Update `VITE_API_URL`, `VITE_CHAT_SERVER_URL` in frontend `.env`

#### Frontend (Vercel/Netlify)

**Vercel Deployment**:

1. Connect your GitHub repository
2. Set Framework Preset to "Vite"
3. Set Root Directory to `Charlaton-frontend`
4. Add environment variables:
   ```
   VITE_FIREBASE_API=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_FIREBASE_MEASUREMENT_ID=...
   VITE_API_URL=https://your-backend-api.render.com
   VITE_CHAT_SERVER_URL=https://your-chat-server.render.com
   VITE_WEBRTC_SERVER_URL=https://your-webrtc-server.render.com
   ```
5. Deploy

**Netlify Deployment**:

1. Connect repository
2. Set Build command: `npm run build`
3. Set Publish directory: `dist`
4. Add environment variables (same as Vercel)
5. Deploy

### Option 2: Deploy to Railway.app

1. **Create new project** for each service
2. **Connect GitHub repository**
3. **Add environment variables** through Railway dashboard
4. **Configure start command**: `npm start`
5. **Enable public networking** for each service
6. **Copy URLs** and update frontend configuration

### Option 3: Self-Hosted (Docker)

See `DOCKER_DEPLOYMENT.md` for containerized deployment instructions.

## Post-Deployment Checklist

### Backend Services

- [ ] All three services are running and accessible via HTTPS
- [ ] Health check endpoints (`/health`) return 200 OK
- [ ] CORS is configured to allow frontend domain
- [ ] JWT secrets match across all services
- [ ] Firebase Admin SDK is properly initialized
- [ ] Logs show successful connections

### Frontend

- [ ] Build completes without errors
- [ ] All environment variables are set correctly
- [ ] Application loads in browser
- [ ] Can connect to backend API
- [ ] Can authenticate users
- [ ] WebSocket connects successfully

### WebRTC Integration

- [ ] Users can join meeting rooms
- [ ] WebSocket connection establishes
- [ ] Microphone permissions are requested
- [ ] Audio streams are captured
- [ ] Peer connections are established
- [ ] Remote audio is heard
- [ ] ICE candidates exchange successfully
- [ ] Connections work across different networks

## Testing in Production

### 1. Basic Connectivity Test

```bash
# Test Backend API
curl https://your-backend-api.render.com/health

# Test Chat Server
curl https://your-chat-server.render.com/health

# Test WebRTC Server (if deployed separately)
curl https://your-webrtc-server.render.com/health
```

### 2. WebSocket Connection Test

Open browser console and run:

```javascript
const socket = io("https://your-chat-server.render.com", {
  auth: { token: "your-jwt-token" },
});

socket.on("connect", () => console.log("✅ Connected"));
socket.on("connect_error", (err) => console.error("❌ Error:", err));
```

### 3. End-to-End Meeting Test

1. Open application in two different browsers/devices
2. Login with different accounts
3. Create a meeting room
4. Join from second device
5. Enable microphone on both
6. Verify audio is transmitted

## Troubleshooting Production Issues

### Issue: WebSocket Connection Fails

**Symptoms**: "Failed to connect to chat server" error

**Solutions**:

1. Verify chat server is running: `curl https://your-chat-server/health`
2. Check CORS settings in chat server `.env`
3. Ensure JWT tokens are valid
4. Check browser console for specific error messages
5. Verify WebSocket URL in frontend `.env`

### Issue: No Audio in Production

**Symptoms**: Users join but can't hear each other

**Solutions**:

1. Verify HTTPS is enabled (required for getUserMedia)
2. Check browser permissions for microphone
3. Test with different browsers/devices
4. Verify STUN server is accessible
5. Consider adding TURN server for strict NAT environments

### Issue: Peer Connection Fails

**Symptoms**: ICE candidates not exchanging or connection state stuck at "connecting"

**Solutions**:

1. Check firewall/NAT settings
2. Verify STUN/TURN server configuration
3. Test with different network environments
4. Check WebRTC connection state logs
5. Ensure signaling server is responding

### Issue: High Latency or Dropped Connections

**Symptoms**: Audio cuts out or significant delay

**Solutions**:

1. Verify server resources (CPU, memory, bandwidth)
2. Check network quality between users
3. Consider using TURN server for relay
4. Reduce number of simultaneous connections per room
5. Optimize audio codec settings

## Monitoring and Logs

### Backend Services

**View Logs on Render**:

1. Go to your service dashboard
2. Click "Logs" tab
3. Monitor for errors or warnings

**Important Log Patterns**:

```
[AUTH] ✅ JWT verified for user
[ROOM] 👤 User attempting to join room
[WEBRTC] 📤 Sending offer to
[WEBRTC] 📥 Received ICE candidate from
```

### Frontend Monitoring

Use browser DevTools Console to monitor:

```
[MEETING] Setting up Socket.io listeners
[MEETING] ✅ Successfully joined room
[MEETING] Initializing WebRTC...
[WEBRTC] ✅ Local media stream acquired
[WEBRTC] 📤 Creating and sending offer to
[WEBRTC] ✅ Offer sent to
[WEBRTC] 📥 Received remote track from
```

## Performance Optimization

### 1. Enable Gzip Compression

Add to backend servers:

```typescript
import compression from "compression";
app.use(compression());
```

### 2. CDN Configuration

Use Cloudflare or similar CDN for:

- Static assets
- Frontend hosting
- DDoS protection
- SSL/TLS termination

### 3. Database Optimization

- Index frequently queried fields
- Use connection pooling
- Implement caching layer (Redis)
- Monitor query performance

### 4. WebRTC Optimization

- Set appropriate codec preferences
- Limit video resolution/framerate
- Implement adaptive bitrate
- Use TURN server only when necessary

## Security Considerations

### 1. JWT Token Security

- Use strong random secrets (32+ characters)
- Set appropriate expiration times
- Implement token refresh mechanism
- Validate tokens on every request

### 2. CORS Configuration

- Explicitly list allowed origins
- Don't use wildcard (\*) in production
- Include credentials: true only when needed

### 3. Rate Limiting

Implement rate limiting on all endpoints:

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use("/api/", limiter);
```

### 4. Input Validation

- Validate all user inputs
- Sanitize data before storage
- Use prepared statements for SQL
- Validate file uploads

## Scaling Considerations

### Horizontal Scaling

For high traffic, consider:

- Load balancing across multiple instances
- Session affinity for WebSocket connections
- Distributed state management (Redis)
- Database read replicas

### Vertical Scaling

- Upgrade server resources as needed
- Monitor CPU, memory, network usage
- Set up auto-scaling rules

## Backup and Recovery

### 1. Database Backups

- Enable automated Firestore backups
- Test restore procedures regularly
- Store backups in different region

### 2. Configuration Backups

- Store environment variables securely
- Document all configuration changes
- Use version control for infrastructure code

### 3. Disaster Recovery Plan

- Document recovery procedures
- Maintain up-to-date contact list
- Regular disaster recovery drills

## Support and Maintenance

### Regular Maintenance Tasks

- [ ] Monitor server logs weekly
- [ ] Review security updates monthly
- [ ] Test backup restoration quarterly
- [ ] Update dependencies regularly
- [ ] Review and optimize database queries
- [ ] Monitor WebRTC connection success rates

### Getting Help

If you encounter issues:

1. Check application logs
2. Review browser console errors
3. Test individual components
4. Verify environment configuration
5. Consult the WEBRTC_INTEGRATION.md guide
6. Check known issues in repository

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [WebRTC for Production](https://webrtc.org/getting-started/overview)
- [STUN/TURN Servers](https://www.metered.ca/tools/openrelay/)
