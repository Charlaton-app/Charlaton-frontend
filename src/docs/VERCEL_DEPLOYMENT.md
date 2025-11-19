# Deploying eisc-meet to Vercel

This guide explains how to deploy the **eisc-meet** frontend application to Vercel.

## Prerequisites

- A Vercel account ([sign up here](https://vercel.com))
- The project pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Steps

### 1. Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your Git repository containing the `eisc-meet` project
4. Select the `eisc-meet` directory as the root directory

### 2. Configure Build Settings

Vercel should auto-detect the Vite framework. Verify the following settings:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. Set Environment Variables

Add the following environment variables in Vercel:

**Firebase Configuration:**
```
VITE_FIREBASE_API_KEY=AIzaSyA3UXMfWqZMgrSic3Z66_IgRip6bBvBh5Q
VITE_FIREBASE_AUTH_DOMAIN=eisc-chat.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=eisc-chat
VITE_FIREBASE_STORAGE_BUCKET=eisc-chat.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=335888387071
VITE_FIREBASE_APP_ID=1:335888387071:web:cbc498faa970926551f5ca
VITE_FIREBASE_MEASUREMENT_ID=G-MH0CV4R2TH
```

**Backend WebSocket URL:**
```
VITE_SOCKET_URL=https://eisc-chat.onrender.com
```

### 4. Deploy

1. Click **"Deploy"**
2. Wait for the build to complete
3. Once deployed, Vercel will provide a live URL (e.g., `https://eisc-meet.vercel.app`)

### 5. Verify Deployment

1. Open the deployed URL
2. Test the authentication flow with Firebase
3. Verify WebSocket connection to the backend at `https://eisc-chat.onrender.com`

## Notes

- Environment variables are automatically injected during build time
- The backend URL is configured to point to the Render deployment
- For custom domains, configure them in the Vercel project settings

## Troubleshooting

- **Build fails**: Check that all dependencies are in `package.json`
- **Environment variables not working**: Ensure they start with `VITE_` prefix
- **WebSocket connection fails**: Verify the backend URL and CORS settings
