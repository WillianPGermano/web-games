# Setup Guide

## Prerequisites

Node.js 18+ and npm are required.

**If using fnm (Fast Node Manager):**

```bash
# Verify your Node.js version
node --version
# Should be v18.x.x or higher

# If you need to install/update Node.js
fnm install --lts
fnm use lts-latest
fnm default lts-latest
```

**If not using fnm, install Node.js:**

- **Direct download:** [nodejs.org](https://nodejs.org/) (LTS version)
- **Chocolatey:** `choco install nodejs-lts`
- **Scoop:** `scoop install nodejs-lts`
- **nvm-windows:** `nvm install lts && nvm use lts`

**Verify installation:**
```bash
node --version
npm --version
```

## Installation

1. **Install dependencies**

```bash
npm install
```

This will install dependencies for the root project, server, client, and shared packages.

2. **Environment Configuration (Optional)**

Copy `.env.example` to `.env` if you want to customize ports:

```bash
cp .env.example .env
```

Default configuration:
- Server runs on port 3001
- Client runs on port 3000

## Development

**Start both server and client in development mode:**

```bash
npm run dev
```

This runs:
- Server with hot reload on `http://localhost:3001`
- Client with hot reload on `http://localhost:3000`

**Or run them separately:**

```bash
# Terminal 1 - Server
npm run dev:server

# Terminal 2 - Client
npm run dev:client
```

## Building for Production

```bash
npm run build
```

This compiles:
- Server TypeScript to JavaScript in `server/dist/`
- Client to optimized bundle in `client/dist/`

## Running in Production

```bash
npm start
```

This starts the compiled server. You'll need to serve the client build separately (e.g., with nginx or a static hosting service).

## Project Structure

```
rock-paper-scissors/
├── shared/          # Shared TypeScript types
│   └── src/
│       └── types.ts
├── server/          # Node.js + Socket.io backend
│   └── src/
│       ├── index.ts        # Server entry point
│       ├── database.ts     # SQLite database layer
│       ├── game-server.ts  # Socket.io game logic
│       ├── room-manager.ts # Room and matchmaking
│       └── utils.ts        # Helper functions
├── client/          # Vite + TypeScript frontend
│   └── src/
│       ├── main.ts         # Client entry point
│       ├── game-client.ts  # Socket.io client
│       ├── ui.ts           # UI controller
│       └── styles.css      # Styles
└── docs/            # Technical documentation
```

## Troubleshooting

### Port Already in Use

If you get an error about ports being in use:

1. Change ports in `.env` file
2. Or kill the process using the port:

**Windows:**
```bash
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
lsof -ti:3001 | xargs kill
```

### Database Locked

If you get a "database is locked" error:

1. Close all server instances
2. Delete `game.db` file
3. Restart the server

### Connection Issues

If client can't connect to server:

1. Check that server is running
2. Check firewall settings
3. Verify `VITE_SERVER_URL` in client matches server URL
4. Check browser console for errors

## Next Steps

- Read the technical documentation in `docs/`
- Explore the codebase starting with `server/src/index.ts` and `client/src/main.ts`
- Try playing a game!
