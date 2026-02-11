# Game State Synchronization

This document explains how the Rock-Paper-Scissors multiplayer game maintains consistent state between clients and server, handles timing, and manages disconnections.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authoritative Server Pattern](#authoritative-server-pattern)
3. [State Synchronization](#state-synchronization)
4. [Timer Synchronization](#timer-synchronization)
5. [Handling Disconnections](#handling-disconnections)
6. [Message Protocol](#message-protocol)

## Architecture Overview

### Client-Server Model

```
┌─────────────┐         WebSocket          ┌─────────────┐
│   Client 1  │◄──────────────────────────►│             │
│  (Browser)  │    Socket.io Events        │   Server    │
└─────────────┘                            │  (Node.js)  │
                                           │             │
┌─────────────┐         WebSocket          │  - Game     │
│   Client 2  │◄──────────────────────────►│    Logic    │
│  (Browser)  │    Socket.io Events        │  - Timers   │
└─────────────┘                            │  - Database │
                                           └─────────────┘
```

### Key Principles

1. **Server Authority**: All game logic runs on the server
2. **Client Presentation**: Clients only display state and send inputs
3. **Event-Driven**: Communication via Socket.io events
4. **Optimistic Updates**: Clients show immediate feedback, server validates
5. **State Broadcasting**: Server sends state updates to all relevant clients

## Authoritative Server Pattern

### Why Server Authority?

In multiplayer games, the server must be the single source of truth to prevent:

- **Cheating**: Clients can't manipulate game state
- **Desynchronization**: All clients see the same state
- **Timing exploits**: Server controls all timers
- **Invalid moves**: Server validates all inputs

### Implementation

```typescript
// ❌ BAD: Client determines winner
socket.on('round:choice', (choice) => {
  // Client sends choice AND result
  socket.emit('round:result', { 
    myChoice: choice, 
    winner: 'me' // Client claims they won!
  });
});

// ✅ GOOD: Server determines winner
socket.on('round:choice', (choice: GameChoice) => {
  // Server receives only the choice
  room.roundChoices[player.id] = choice;
  
  // Server waits for both choices
  if (bothPlayersChose()) {
    // Server calculates winner
    const winner = determineWinner(choice1, choice2);
    
    // Server broadcasts result to both clients
    io.to(room.id).emit('round:end', {
      player1Choice: choice1,
      player2Choice: choice2,
      winnerId: winner
    });
  }
});
```

### Client Responsibilities

Clients should ONLY:
- Display UI
- Capture user input
- Send inputs to server
- Render state received from server
- Show loading/waiting states

Clients should NEVER:
- Calculate game outcomes
- Manage timers (except for display)
- Validate moves
- Determine winners
- Modify game state directly

## State Synchronization

### Game State Machine

The game progresses through distinct states:

```
waiting → ready → playing → round_end → playing → ... → match_end
```

Each state transition is controlled by the server:

```typescript
// Server-side state transitions
function startGame(roomId: string) {
  room.state = 'ready';
  io.to(roomId).emit('game:start');
  startRound(roomId);
}

function startRound(roomId: string) {
  room.state = 'playing';
  room.currentRound++;
  io.to(roomId).emit('round:start', room.currentRound, timeLimit);
}

function endRound(roomId: string) {
  room.state = 'round_end';
  const result = calculateRoundResult();
  io.to(roomId).emit('round:end', result);
  
  if (matchIsOver()) {
    endMatch(roomId);
  } else {
    setTimeout(() => startRound(roomId), 3000);
  }
}
```

### State Synchronization Strategies

#### 1. Full State Updates

When a client joins or reconnects, send complete state:

```typescript
socket.on('room:join', (roomCode) => {
  const room = getRoomByCode(roomCode);
  
  // Send complete room state
  socket.emit('room:joined', {
    id: room.id,
    roomCode: room.roomCode,
    format: room.format,
    difficulty: room.difficulty,
    state: room.state,
    players: room.players,
    currentRound: room.currentRound,
    scores: room.scores
  });
});
```

#### 2. Delta Updates

During gameplay, send only what changed:

```typescript
// Only send the round result, not entire game state
socket.emit('round:end', {
  roundNumber: room.currentRound,
  player1Choice: choice1,
  player2Choice: choice2,
  winnerId: winner
});

// Client updates its local state
client.on('round:end', (result) => {
  // Update only what changed
  gameState.currentRound = result.roundNumber;
  gameState.lastResult = result;
  if (result.winnerId) {
    gameState.scores[result.winnerId]++;
  }
});
```

#### 3. Event Sequencing

Ensure events arrive in correct order:

```typescript
// Server ensures proper sequence
async function handlePlayerChoice(playerId, choice) {
  // 1. Acknowledge receipt
  socket.emit('round:choice_received');
  
  // 2. Wait for both players
  if (bothPlayersChose()) {
    // 3. End round
    endRound();
    
    // 4. Check match status
    if (matchOver()) {
      // 5. End match
      endMatch();
    } else {
      // 6. Start next round
      setTimeout(startRound, 3000);
    }
  }
}
```

## Timer Synchronization

### The Challenge

Network latency means client and server clocks are never perfectly synchronized. A timer that shows "3 seconds" on the client might actually have 2.8 or 3.2 seconds remaining on the server.

### Solution: Server-Authoritative Timers

```typescript
// Server controls the timer
function startRound(roomId: string) {
  const room = getRoom(roomId);
  const timeLimit = getTimeLimit(room.difficulty); // 10, 5, or 3 seconds
  
  // Record when round started
  room.roundStartTime = Date.now();
  
  // Tell clients to start their display timers
  io.to(roomId).emit('round:start', room.currentRound, timeLimit);
  
  // Set server timeout
  const timer = setTimeout(() => {
    handleRoundTimeout(roomId);
  }, timeLimit * 1000);
  
  roomTimers.set(roomId, timer);
}

// Server enforces timeout
function handleRoundTimeout(roomId: string) {
  const room = getRoom(roomId);
  
  // Check which players didn't choose
  const player1Timeout = room.roundChoices[player1.id] === null;
  const player2Timeout = room.roundChoices[player2.id] === null;
  
  // Award win to player who chose (or tie if both timed out)
  endRound(roomId, choice1, choice2, player1Timeout, player2Timeout);
}
```

### Client Timer Display

Clients show a countdown for user feedback, but don't enforce it:

```typescript
// Client-side display timer (not authoritative)
client.on('round:start', (roundNumber, timeLimit) => {
  let remaining = timeLimit;
  
  const interval = setInterval(() => {
    remaining -= 0.1;
    updateTimerDisplay(remaining);
    
    // Visual warnings
    if (remaining <= 3) {
      timerElement.classList.add('warning');
    }
    if (remaining <= 1) {
      timerElement.classList.add('critical');
    }
    
    if (remaining <= 0) {
      clearInterval(interval);
      // Don't auto-submit! Server will handle timeout
    }
  }, 100);
  
  // Clear interval when round ends
  client.once('round:end', () => clearInterval(interval));
});
```

### Handling Latency

Accept that client timers are approximate:

```typescript
// Client might show 0.5s remaining when server times out
// This is acceptable because:
// 1. Server is authoritative
// 2. Difference is small (< 500ms typically)
// 3. Players understand network games have latency
// 4. Visual feedback is still useful
```

## Handling Disconnections

### Detection

Socket.io automatically detects disconnections:

```typescript
socket.on('disconnect', () => {
  const player = connectedPlayers.get(socket.id);
  if (!player) return;
  
  console.log(`Player disconnected: ${player.name}`);
  handlePlayerDisconnect(player.id);
});
```

### Cleanup Strategy

When a player disconnects:

```typescript
function handlePlayerDisconnect(playerId: string) {
  // 1. Remove from matchmaking queues
  removeFromAllQueues(playerId);
  
  // 2. Find their room
  const room = getPlayerRoom(playerId);
  if (!room) return;
  
  // 3. Notify opponent
  const opponent = room.players.find(p => p.id !== playerId);
  if (opponent) {
    io.to(opponent.socketId).emit('player:left', playerId);
  }
  
  // 4. Clear timers
  clearRoomTimer(room.id);
  
  // 5. Remove player from room
  removePlayerFromRoom(room.id, playerId);
  
  // 6. Delete room if empty
  if (room.players.length === 0) {
    deleteRoom(room.id);
  }
}
```

### Reconnection (Future Enhancement)

Currently, disconnected players can't reconnect to ongoing games. To implement reconnection:

```typescript
// Store player-to-room mapping with timeout
const disconnectedPlayers = new Map<string, {
  roomId: string,
  disconnectTime: number
}>();

socket.on('disconnect', () => {
  // Don't immediately remove from room
  disconnectedPlayers.set(player.id, {
    roomId: room.id,
    disconnectTime: Date.now()
  });
  
  // Give them 60 seconds to reconnect
  setTimeout(() => {
    if (disconnectedPlayers.has(player.id)) {
      handlePlayerDisconnect(player.id);
    }
  }, 60000);
});

socket.on('player:reconnect', (playerId) => {
  const disconnectInfo = disconnectedPlayers.get(playerId);
  if (disconnectInfo) {
    // Restore connection
    const room = getRoom(disconnectInfo.roomId);
    socket.emit('room:rejoined', room);
    disconnectedPlayers.delete(playerId);
  }
});
```

## Message Protocol

### Event Naming Convention

Events follow a `category:action` pattern:

- `player:*` - Player lifecycle events
- `matchmaking:*` - Matchmaking events
- `room:*` - Room management events
- `game:*` - Game lifecycle events
- `round:*` - Round-specific events
- `match:*` - Match-specific events

### Type-Safe Events

Using TypeScript interfaces for type safety:

```typescript
// Shared types (shared/src/types.ts)
export interface ServerToClientEvents {
  'player:registered': (player: Player) => void;
  'room:joined': (room: GameRoom) => void;
  'game:start': () => void;
  'round:start': (roundNumber: number, timeLimit: number) => void;
  'round:end': (result: RoundResult, scores: Record<string, number>) => void;
  'match:end': (result: MatchResult) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  'player:join': (name: string) => void;
  'matchmaking:join': (format: MatchFormat, difficulty: Difficulty) => void;
  'room:create': (format: MatchFormat, difficulty: Difficulty) => void;
  'room:join': (roomCode: RoomCode) => void;
  'round:choice': (choice: GameChoice) => void;
  'match:rematch': () => void;
}

// Server usage
const io = new Server<ClientToServerEvents, ServerToClientEvents>();

// Client usage
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();
```

### Message Flow Examples

#### Starting a Match

```
Client 1                    Server                    Client 2
   |                          |                          |
   |--matchmaking:join------->|                          |
   |                          |<----matchmaking:join-----|
   |                          |                          |
   |                          | [Match found!]           |
   |                          |                          |
   |<----room:joined----------|                          |
   |                          |-------room:joined------->|
   |                          |                          |
   |<----game:start-----------|                          |
   |                          |-------game:start-------->|
   |                          |                          |
   |<----round:start----------|                          |
   |                          |-------round:start------->|
```

#### Playing a Round

```
Client 1                    Server                    Client 2
   |                          |                          |
   |--round:choice(rock)----->|                          |
   |<-round:choice_received---|                          |
   |                          |                          |
   |                          |<--round:choice(paper)----|
   |                          |--round:choice_received-->|
   |                          |                          |
   |                          | [Determine winner]       |
   |                          |                          |
   |<----round:end------------|                          |
   |    (paper wins)          |-------round:end--------->|
   |                          |    (paper wins)          |
```

#### Timeout Scenario

```
Client 1                    Server                    Client 2
   |                          |                          |
   |--round:choice(rock)----->|                          |
   |<-round:choice_received---|                          |
   |                          |                          |
   |                          | [Waiting for Client 2]   |
   |                          |                          |
   |                          | [Timeout!]               |
   |                          |                          |
   |<----round:end------------|                          |
   |    (rock wins, timeout)  |-------round:end--------->|
   |                          |    (rock wins, timeout)  |
```

## Best Practices

### 1. Always Validate on Server

```typescript
// ✅ GOOD
socket.on('round:choice', (choice: GameChoice) => {
  // Validate choice
  if (!['rock', 'paper', 'scissors'].includes(choice)) {
    socket.emit('error', 'Invalid choice');
    return;
  }
  
  // Validate game state
  if (room.state !== 'playing') {
    socket.emit('error', 'Not in an active game');
    return;
  }
  
  // Validate player hasn't already chosen
  if (room.roundChoices[player.id] !== null) {
    socket.emit('error', 'Already made a choice');
    return;
  }
  
  // Process valid choice
  processChoice(player.id, choice);
});
```

### 2. Handle Race Conditions

```typescript
// Prevent double-processing
let processingRound = false;

function checkBothPlayersChose() {
  if (processingRound) return;
  
  const choice1 = room.roundChoices[player1.id];
  const choice2 = room.roundChoices[player2.id];
  
  if (choice1 !== null && choice2 !== null) {
    processingRound = true;
    clearRoomTimer(room.id);
    endRound(room.id, choice1, choice2, false, false);
    processingRound = false;
  }
}
```

### 3. Provide Feedback

```typescript
// Always acknowledge client actions
socket.on('round:choice', (choice) => {
  // Immediate acknowledgment
  socket.emit('round:choice_received');
  
  // Process choice
  processChoice(player.id, choice);
});
```

### 4. Clean Up Resources

```typescript
// Always clean up timers and listeners
function deleteRoom(roomId: string) {
  // Clear timer
  const timer = roomTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    roomTimers.delete(roomId);
  }
  
  // Remove from maps
  rooms.delete(roomId);
  
  // Clean up player mappings
  room.players.forEach(player => {
    playerRoomMap.delete(player.id);
  });
}
```

### 5. Handle Edge Cases

```typescript
// What if both players timeout?
if (player1Timeout && player2Timeout) {
  // It's a tie, replay the round
  winnerId = null;
  reason = 'tie';
}

// What if a player disconnects mid-round?
socket.on('disconnect', () => {
  clearRoomTimer(room.id);
  notifyOpponent('player:left');
  cleanupRoom();
});

// What if the same player joins twice?
socket.on('player:join', (name) => {
  const existingPlayer = connectedPlayers.get(socket.id);
  if (existingPlayer) {
    socket.emit('error', 'Already registered');
    return;
  }
  // ... register player
});
```

## Summary

The key to reliable multiplayer game state synchronization:

1. **Server is authoritative** - All game logic on server
2. **Clients are presentational** - Display state, send inputs only
3. **Events are typed** - TypeScript ensures correct messages
4. **Timers are server-controlled** - Prevent timing exploits
5. **State is broadcast** - All clients see same state
6. **Disconnections are handled** - Clean up resources properly
7. **Validation is thorough** - Check everything on server
8. **Feedback is immediate** - Acknowledge all client actions

This architecture ensures a fair, cheat-proof, synchronized multiplayer experience!
