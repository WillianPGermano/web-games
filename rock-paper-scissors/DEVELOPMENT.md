# Development Guide

## Setup

```bash
cd rock-paper-scissors
npm install
```

## Development Commands

### Run the game locally
```bash
npm run dev
```
This starts both server (port 3001) and client (port 3000) in watch mode.

### Type checking
```bash
npm run typecheck
```
Checks TypeScript types without building. **Run this before committing!**

### Linting
```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

### Build for production
```bash
npm run build
```
Compiles TypeScript and builds the client.

## Pre-Commit Checklist

Before committing or deploying, always run:

```bash
# 1. Type check
npm run typecheck

# 2. Lint
npm run lint

# 3. Build (to catch any build errors)
npm run build
```

If any of these fail, fix the errors before committing!

## Common Issues

### TypeScript Errors

**Problem:** `error TS6059: File is not under 'rootDir'`
- **Solution:** Make sure `tsconfig.json` has `rootDir: "."` not `rootDir: "./src"`

**Problem:** `Cannot find module` or `implicitly has 'any' type`
- **Solution:** Install type definitions: `npm install --save-dev @types/package-name`

### ESLint Errors

**Problem:** `no-explicit-any` warnings
- **Solution:** Add proper types instead of `any`
- **Quick fix:** Use `as any` only when absolutely necessary

**Problem:** `no-unused-vars` warnings
- **Solution:** Remove unused imports/variables or prefix with `_` if intentionally unused

### Build Errors

**Problem:** Build works locally but fails on Render
- **Solution:** Run `npm run build` locally first to catch errors
- **Check:** Ensure all dependencies are in `package.json`, not just devDependencies

## Code Style

We use Prettier for consistent formatting:

```bash
# Format all files
npx prettier --write .

# Check formatting
npx prettier --check .
```

## Project Structure

```
rock-paper-scissors/
├── client/              # Frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── main.ts     # Entry point
│   │   ├── game-client.ts  # Socket.io client
│   │   ├── ui.ts       # UI controller
│   │   └── styles.css
│   └── index.html
├── server/              # Backend (Node.js + Socket.io)
│   └── src/
│       ├── index.ts    # Server entry
│       ├── game-server.ts  # Game logic
│       ├── cpu-ai.ts   # CPU opponents
│       ├── database.ts # SQLite operations
│       ├── room-manager.ts # Matchmaking
│       └── utils.ts
├── shared/              # Shared types
│   └── src/
│       └── types.ts    # TypeScript interfaces
└── docs/                # Documentation
```

## Adding New Features

1. **Update types** in `shared/src/types.ts` if needed
2. **Implement server logic** in appropriate `server/src/*.ts` file
3. **Update client** in `client/src/*.ts` files
4. **Run checks:**
   ```bash
   npm run typecheck
   npm run lint
   npm run build
   ```
5. **Test locally** with `npm run dev`
6. **Commit and push**

## Debugging

### Server Logs
```bash
# In development
npm run dev:server
# Logs appear in terminal
```

### Client Logs
- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab for WebSocket connections

### Database
SQLite database is in `game.db` file. To inspect:
```bash
# Install sqlite3 CLI
# Then:
sqlite3 game.db
.tables
SELECT * FROM matches LIMIT 10;
```

## Testing

Currently no automated tests. Manual testing checklist:

- [ ] CPU game works (all 4 opponents)
- [ ] Random matchmaking works
- [ ] Private rooms work (create and join)
- [ ] All match formats work (single, best of 3, best of 5)
- [ ] All difficulties work (easy, medium, hard)
- [ ] Timeout handling works
- [ ] Rematch works (accept and decline)
- [ ] Reconnection works

## Performance

### Local Development
- Hot reload is enabled (changes reflect immediately)
- No need to restart server for most changes

### Production
- Server uses compiled JavaScript (faster)
- Client is bundled and minified
- Database is in-memory on Render free tier

## Troubleshooting

### Port already in use
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or just change port in .env
```

### TypeScript not finding types
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build cache issues
```bash
# Clear all build artifacts
rm -rf client/dist server/dist client/.vite
npm run build
```

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Socket.io Documentation](https://socket.io/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [ESLint Rules](https://eslint.org/docs/rules/)
