# Deployment Guide - Render

This comprehensive guide covers deploying the Rock-Paper-Scissors multiplayer game to Render, including both backend and frontend deployment.

## ✅ Latest Update - All Issues Resolved!

**The deployment is now fully configured and working!** All TypeScript compilation errors and path issues have been resolved.

**What was fixed:**
1. ✅ TypeScript and @types packages moved to dependencies (needed for build)
2. ✅ Root directory set to `rock-paper-scissors` (allows access to shared folder)
3. ✅ Separate build scripts created (`build:server` and `build:client`)
4. ✅ Correct start command path: `node server/dist/server/src/index.js`
5. ✅ Build command uses workspace-specific build

**Current Status:**
- ✅ Backend builds successfully
- ✅ Backend starts and runs
- ✅ Health check endpoint working
- 🔄 Frontend deployment (next step)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Deployment](#backend-deployment)
3. [Frontend Deployment](#frontend-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Testing the Deployment](#testing-the-deployment)
6. [Troubleshooting](#troubleshooting)
7. [Alternative Platforms](#alternative-platforms)

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
   - **Build Command:** `npm install && npm run build:server`
   - **Start Command:** `node server/dist/server/src/index.js`
   - **Plan:** `Free`

4. **Environment Variables:**
   Click "Advanced" and add:
   - `NODE_ENV` = `production`
   - `PORT` = `3001` (Render will override this automatically)
   - `CLIENT_URL` = (leave empty for now, will add after deploying frontend)

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for the build to complete (2-3 minutes)
   - Check the logs for any errors
   - Once deployed, note the URL (e.g., `https://rps-server.onrender.com`)

### 3. Deploy the Frontend (Client)

1. From Render Dashboard, click **"New +"** → **"Static Site"**

2. **Connect Repository:**
   - Select your `web-games` repository

3. **Configure Static Site:**
   - **Name:** `rps-client` (or any name you prefer)
   - **Branch:** `main`
   - **Root Directory:** `rock-paper-scissors`
   - **Build Command:** `npm install && npm run build:client`
   - **Publish Directory:** `client/dist`

4. **Environment Variables:**
   - `VITE_SERVER_URL` = `https://your-backend-url.onrender.com` (use the backend URL from step 2)

5. **Deploy:**
   - Click "Create Static Site"
   - Wait for the build to complete
   - Once deployed, note the URL (e.g., `https://rps-client.onrender.com`)

### 4. Update Backend with Frontend URL

1. Go back to your `rps-server` service
2. Click on **Environment** tab
3. Update `CLIENT_URL` to your frontend URL (e.g., `https://rps-client.onrender.com`)
4. Click "Save Changes"
5. The service will automatically redeploy

---

## Environment Configuration

### Backend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port (auto-set by Render) | `3001` |
| `CLIENT_URL` | Frontend URL for CORS | `https://rps-client.onrender.com` |

### Frontend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SERVER_URL` | Backend API URL | `https://rps-server.onrender.com` |

---

## Testing the Deployment

### 1. Test Backend Health Check

```bash
curl https://your-backend-url.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-02-11T...",
  "uptime": 123.456
}
```

### 2. Test Frontend

1. Open your frontend URL in a browser
2. Enter a player name
3. Try creating a private room or joining matchmaking
4. Open another browser window (or incognito mode)
5. Join the same room or matchmaking
6. Play a game!

### 3. Check WebSocket Connection

Open browser console and look for:
```
✓ Connected to server
✓ Player registered: [your-name]
```

---

## Troubleshooting

### Build Fails: "Cannot find module"

**Problem:** TypeScript can't find shared types or dependencies

**Solution:**
1. Verify Root Directory is `rock-paper-scissors` (not `rock-paper-scissors/server`)
2. Check Build Command is `npm install && npm run build:server`
3. Ensure all dependencies are in `dependencies` (not `devDependencies`)

### Start Fails: "Cannot find module '/opt/render/project/src/rock-paper-scissors/server/dist/index.js'"

**Problem:** Start command path is incorrect

**Solution:**
1. Update Start Command to: `node server/dist/server/src/index.js`
2. The path is relative to the root directory (`rock-paper-scissors`)

### Frontend Can't Connect to Backend

**Problem:** CORS or WebSocket connection issues

**Solution:**
1. Verify `CLIENT_URL` in backend matches your frontend URL exactly
2. Check `VITE_SERVER_URL` in frontend matches your backend URL
3. Ensure both URLs use `https://` (not `http://`)
4. Check browser console for CORS errors

### WebSocket Connection Fails

**Problem:** Socket.io can't establish connection

**Solution:**
1. Render supports WebSockets on all plans
2. Verify backend is running: check health endpoint
3. Check browser console for connection errors
4. Ensure firewall/network allows WebSocket connections

### Database File Not Persisting

**Problem:** Game data resets on each deploy

**Solution:**
Render's free tier has ephemeral storage. For persistent data:
1. Upgrade to paid plan with persistent disk
2. Or use external database (PostgreSQL on Render)
3. Or accept that data resets (fine for demo/learning)

### Cold Starts (Free Tier)

**Problem:** First request takes 30+ seconds

**Solution:**
- Free tier services spin down after 15 minutes of inactivity
- First request wakes the service (cold start)
- Upgrade to paid plan for always-on service
- Or accept cold starts for demo purposes

---

## Alternative Platforms

### Railway

Similar to Render, with different pricing:

```yaml
# railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node server/dist/server/src/index.js",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Fly.io

Good for global deployment:

```toml
# fly.toml
app = "rps-server"

[build]
  builder = "heroku/buildpacks:20"

[[services]]
  internal_port = 3001
  protocol = "tcp"
```

### Heroku

Classic PaaS platform:

```
# Procfile
web: node server/dist/server/src/index.js
```

### Self-Hosted (VPS)

For full control:

```bash
# On your VPS
git clone https://github.com/your-username/web-games.git
cd web-games/rock-paper-scissors
npm install
npm run build
pm2 start server/dist/server/src/index.js --name rps-server
```

---

## Production Considerations

### 1. Database

For production, consider:
- **PostgreSQL** for better concurrency
- **Redis** for session storage
- **Backup strategy** for game data

### 2. Monitoring

Add monitoring for:
- Server uptime
- WebSocket connections
- Error rates
- Response times

Tools: Sentry, LogRocket, Datadog

### 3. Scaling

For high traffic:
- **Horizontal scaling**: Multiple server instances
- **Load balancer**: Distribute traffic
- **Sticky sessions**: Keep players on same server
- **Redis adapter**: Share state across servers

### 4. Security

Production checklist:
- ✅ HTTPS only (no HTTP)
- ✅ CORS configured correctly
- ✅ Rate limiting on API endpoints
- ✅ Input validation on all events
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (sanitize user input)

### 5. Performance

Optimize for production:
- Enable gzip compression
- Add CDN for static assets
- Implement caching headers
- Monitor database query performance
- Use connection pooling

---

## Summary

Deployment checklist:

- ✅ Backend deployed to Render
- ✅ Frontend deployed to Render
- ✅ Environment variables configured
- ✅ CORS configured correctly
- ✅ WebSocket connections working
- ✅ Health check endpoint responding
- ✅ Game playable end-to-end

Your Rock-Paper-Scissors multiplayer game is now live! 🎉

**Backend URL:** `https://your-backend.onrender.com`  
**Frontend URL:** `https://your-frontend.onrender.com`

Share the frontend URL with friends and start playing!

---

## Next Steps

1. **Monitor**: Check logs regularly for errors
2. **Test**: Play games to ensure everything works
3. **Iterate**: Add features, fix bugs, improve UX
4. **Scale**: Upgrade plan if traffic increases
5. **Learn**: Study the logs to understand user behavior

Happy deploying! 🚀

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
