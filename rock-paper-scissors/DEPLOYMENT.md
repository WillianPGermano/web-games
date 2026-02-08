# Deployment Guide - Render

This guide will help you deploy the Rock-Paper-Scissors game to Render.

## ✅ Latest Update - TypeScript Errors Fixed

**All TypeScript compilation errors have been resolved!** The following issues were fixed:

1. **Removed `rootDir` from server tsconfig** - Allows imports from shared types folder
2. **Added explicit type annotations** - Fixed implicit `any` type errors
3. **Fixed GameRoom type handling** - Proper handling of `[Player, Player?]` tuple type
4. **Fixed player array operations** - Correct type handling in room-manager.ts
5. **Fixed client type errors** - Type assertions for import.meta.env and CPU types
6. **Updated ESLint config** - Removed project reference to avoid path issues

**Build Status:**
- ✅ `npm run typecheck` - Pass
- ✅ `npm run lint` - Pass (warnings only)
- ✅ `npm run build` - Pass

**The code is now ready for Render deployment!** Simply trigger a new deploy and it should build successfully.

---

## Prerequisites

- GitHub account with the repository pushed
- Render account (sign up at [render.com](https://render.com))

## Deployment Steps

### 1. Sign Up / Log In to Render

1. Go to [render.com](https://render.com)
2. Click "Get Started" or "Sign In"
3. Sign up with your GitHub account

### 2. Deploy the Backend (Server)

1. From Render Dashboard, click **"New +"** → **"Web Service"**

2. **Connect Repository:**
   - Click "Connect account" if needed
   - Select your `web-games` repository
   - Click "Connect"

3. **Configure Service:**
   - **Name:** `rps-server` (or any name you prefer)
   - **Region:** Choose closest to you
   - **Branch:** `main`
   - **Root Directory:** `rock-paper-scissors` ⚠️ **IMPORTANT: Must be `rock-paper-scissors`, NOT `rock-paper-scissors/server`**
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build --workspace=server`
   - **Start Command:** `node server/dist/server/src/index.js`
   - **Plan:** `Free`

4. **Environment Variables:**
   Click "Advanced" and add:
   - `NODE_ENV` = `production`
   - `PORT` = `3001` (Render will override this automatically)
   - `CLIENT_URL` = (your frontend URL, will add after deploying client)
   - `CLIENT_URL` = (leave empty for now, we'll add it after deploying the client)

5. Click **"Create Web Service"**

6. Wait for deployment (5-10 minutes)

7. **Copy the server URL** (e.g., `https://rps-server.onrender.com`)

### 3. Deploy the Frontend (Client)

1. From Render Dashboard, click **"New +"** → **"Static Site"**

2. **Connect Repository:**
   - Select your `web-games` repository

3. **Configure Site:**
   - **Name:** `rps-client` (or any name you prefer)
   - **Branch:** `main`
   - **Root Directory:** `rock-paper-scissors/client`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

4. **Environment Variables:**
   Click "Advanced" and add:
   - `VITE_SERVER_URL` = `https://rps-server.onrender.com` (use your actual server URL from step 2)

5. Click **"Create Static Site"**

6. Wait for deployment (3-5 minutes)

7. **Copy the client URL** (e.g., `https://rps-client.onrender.com`)

### 4. Update Server Environment Variable

1. Go back to your **rps-server** service in Render
2. Click "Environment" in the left sidebar
3. Update `CLIENT_URL` to your client URL (e.g., `https://rps-client.onrender.com`)
4. Click "Save Changes"
5. The server will automatically redeploy

### 5. Test Your Deployment

1. Visit your client URL (e.g., `https://rps-client.onrender.com`)
2. Enter your name and start playing!
3. Share the URL with friends to play together

## Important Notes

### Free Tier Limitations

- **Server spins down after 15 minutes of inactivity**
  - First request after inactivity takes 30-60 seconds to wake up
  - Subsequent requests are fast
  
- **750 hours/month free** (enough for one service running 24/7)

### Database Persistence

- SQLite database is stored in memory on Render's free tier
- **Data will be lost when the server restarts**
- For persistent data, upgrade to a paid plan or use an external database

### WebSocket Support

- Render fully supports WebSockets on free tier ✅
- No additional configuration needed

## Troubleshooting

### Server won't start

- Check logs in Render dashboard
- Verify `NODE_ENV` is set to `production`
- Ensure build command completed successfully

### Client can't connect to server

- Verify `VITE_SERVER_URL` in client environment variables
- Verify `CLIENT_URL` in server environment variables
- Check CORS settings in server code

### Database errors

- SQLite works fine on Render
- Data is ephemeral on free tier (resets on restart)

## Alternative: One-Click Deploy

You can also use the `render.yaml` file in the repository:

1. Go to Render Dashboard
2. Click "New +" → "Blueprint"
3. Connect your repository
4. Render will automatically detect `render.yaml` and deploy both services

## Updating Your Deployment

Render automatically redeploys when you push to GitHub:

```bash
git add .
git commit -m "Update game"
git push origin main
```

Both services will automatically rebuild and redeploy.

## Custom Domain (Optional)

1. Go to your service in Render
2. Click "Settings"
3. Scroll to "Custom Domain"
4. Add your domain and follow DNS instructions

## Monitoring

- View logs in real-time from Render dashboard
- Check service health at: `https://your-server.onrender.com/health`
- Monitor uptime and performance in Render dashboard

## Cost Optimization

**Free tier is sufficient for:**
- Personal projects
- Testing and demos
- Low-traffic games

**Consider upgrading if:**
- You need 24/7 uptime without cold starts
- You need persistent database storage
- You have high traffic (>100 concurrent users)

## Support

- Render Documentation: [render.com/docs](https://render.com/docs)
- Render Community: [community.render.com](https://community.render.com)
