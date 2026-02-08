# Rock-Paper-Scissors Multiplayer Game

An educational real-time multiplayer Rock-Paper-Scissors game built with TypeScript, Socket.io, and modern web technologies.

## Features

- **Real-time multiplayer** using WebSockets (Socket.io)
- **Multiple match formats**: Single round, Best of 3, Best of 5
- **Difficulty levels**: Easy (10s), Medium (5s), Hard (3s) time limits
- **Two matchmaking modes**:
  - Random matchmaking with format/difficulty pairing
  - Private rooms with shareable 6-character codes
- **Timeout handling**: Automatic round loss if player doesn't choose in time
- **Rematch system**: Play again with the same opponent
- **Persistent storage**: SQLite database tracks all matches and rounds

## Project Structure

```
rock-paper-scissors/
├── shared/          # Shared TypeScript types
├── server/          # Node.js + Socket.io backend
├── client/          # Vite + TypeScript frontend
└── docs/            # Technical documentation
```

## Quick Start

### Prerequisites

- Node.js 18+ installed (if using fnm: `fnm install --lts && fnm use lts-latest`)
- npm package manager (comes with Node.js)

### Installation

```bash
# Install all dependencies (root, server, client, shared)
npm install
```

### Development

```bash
# Run both server and client in development mode
npm run dev
```

This will start:
- Server on `http://localhost:3001`
- Client on `http://localhost:3000`

### Building for Production

```bash
# Build both server and client
npm run build

# Start production server
npm start
```

## Documentation

Comprehensive technical documentation is available in the `docs/` directory:

1. **WebSockets Explained** - Understanding real-time communication
2. **Game State Synchronization** - Client-server architecture patterns
3. **TypeScript Patterns** - Type-safe development practices
4. **Database Design** - Schema and query patterns
5. **Deployment Guide** - Production hosting strategies

## Technology Stack

### Backend
- **Node.js + TypeScript**: Server runtime and language
- **Express.js**: HTTP server
- **Socket.io**: Real-time WebSocket communication
- **SQLite + better-sqlite3**: Lightweight database
- **Zod**: Runtime type validation

### Frontend
- **Vite**: Modern build tool and dev server
- **TypeScript**: Type-safe client code
- **Socket.io-client**: WebSocket client
- **Vanilla CSS**: Simple, framework-free styling

## Game Rules

### Basic Rules
- Rock beats Scissors
- Scissors beats Paper
- Paper beats Rock
- Same choice = Tie (round replayed)

### Match Formats
- **Single**: One round decides the winner
- **Best of 3**: First to win 2 rounds wins
- **Best of 5**: First to win 3 rounds wins

### Difficulty Levels
- **Easy**: 10 seconds per round
- **Medium**: 5 seconds per round
- **Hard**: 3 seconds per round

If a player doesn't make a choice before time expires, they automatically lose that round.

## Development Notes

This project follows **literate programming** principles with extensive code documentation. Every file includes:
- Purpose and responsibilities
- Function-level documentation
- Inline comments explaining "why" not just "what"
- Type annotations for clarity

## License

MIT
