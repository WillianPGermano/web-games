# TypeScript Patterns for Multiplayer Games

This document covers TypeScript patterns and best practices used in the Rock-Paper-Scissors multiplayer game, with a focus on type-safe Socket.io communication and shared types.

## Table of Contents

1. [Type-Safe Socket.io Events](#type-safe-socketio-events)
2. [Discriminated Unions](#discriminated-unions)
3. [Runtime Validation with Zod](#runtime-validation-with-zod)
4. [Sharing Types Between Client and Server](#sharing-types-between-client-and-server)
5. [Generic Patterns](#generic-patterns)
6. [Best Practices](#best-practices)

## Type-Safe Socket.io Events

### The Problem

Without types, Socket.io events are error-prone:

```typescript
// ❌ No type safety
socket.emit('round:start', 1, 10); // What are these numbers?
socket.on('round:end', (data) => {
  // What properties does data have?
  console.log(data.winner); // Might not exist!
});
```

### The Solution

Define event interfaces for compile-time type checking:

```typescript
// shared/src/types.ts
export interface ServerToClientEvents {
  'player:registered': (player: Player) => void;
  'room:joined': (room: Omit<GameRoom, 'roundChoices'>) => void;
  'game:start': () => void;
  'round:start': (roundNumber: number, timeLimit: number) => void;
  'round:choice_received': () => void;
  'round:end': (result: RoundResult, scores: Record<string, number>) => void;
  'match:end': (result: MatchResult) => void;
  'match:rematch_requested': (playerName: string) => void;
  'match:rematch_accepted': () => void;
  'match:rematch_declined': () => void;
  'player:joined': (player: Player) => void;
  'player:left': (playerId: string) => void;
  'matchmaking:waiting': () => void;
  'room:created': (roomCode: RoomCode) => void;
  'error': (message: string) => void;
}

export interface ClientToServerEvents {
  'player:join': (name: string) => void;
  'cpu:start': (cpuOpponent: CPUOpponent, format: MatchFormat, difficulty: Difficulty) => void;
  'matchmaking:join': (format: MatchFormat, difficulty: Difficulty) => void;
  'matchmaking:leave': () => void;
  'room:create': (format: MatchFormat, difficulty: Difficulty) => void;
  'room:join': (roomCode: RoomCode) => void;
  'room:leave': () => void;
  'round:choice': (choice: GameChoice) => void;
  'match:rematch': () => void;
  'match:rematch_response': (accepted: boolean) => void;
  'match:new': () => void;
}
```

### Server Usage

```typescript
// server/src/index.ts
import { Server as SocketIOServer } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/src/types.js';

const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
});

// Now all events are type-checked!
io.on('connection', (socket) => {
  // ✅ TypeScript knows the parameter is a string
  socket.on('player:join', (playerName: string) => {
    // playerName is typed as string
    const player: Player = {
      id: randomUUID(),
      name: playerName,
      socketId: socket.id,
    };
    
    // ✅ TypeScript checks that we're passing a Player
    socket.emit('player:registered', player);
  });
  
  // ✅ TypeScript knows the parameters
  socket.on('matchmaking:join', (format: MatchFormat, difficulty: Difficulty) => {
    // format and difficulty are properly typed
  });
  
  // ❌ TypeScript error: wrong parameter type
  socket.emit('round:start', 'one', 'ten'); // Error!
  
  // ✅ Correct types
  socket.emit('round:start', 1, 10);
});
```

### Client Usage

```typescript
// client/src/game-client.ts
import { io, Socket } from 'socket.io-client';
import type { 
  ServerToClientEvents, 
  ClientToServerEvents 
} from '../../shared/src/types.js';

export class GameClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  
  constructor(serverUrl: string) {
    this.socket = io(serverUrl);
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    // ✅ TypeScript knows the callback signature
    this.socket.on('round:start', (roundNumber: number, timeLimit: number) => {
      // roundNumber and timeLimit are typed
      console.log(`Round ${roundNumber} started with ${timeLimit}s`);
    });
    
    // ✅ TypeScript checks the parameter
    this.socket.on('round:end', (result: RoundResult, scores: Record<string, number>) => {
      // result and scores are properly typed
      console.log(`Winner: ${result.winnerId}`);
    });
  }
  
  // ✅ Method parameters are type-checked
  makeChoice(choice: GameChoice): void {
    this.socket.emit('round:choice', choice);
  }
  
  // ❌ TypeScript error: wrong parameter
  makeChoice('dynamite'); // Error: not a valid GameChoice!
}
```

## Discriminated Unions

### Game State as Discriminated Union

Use discriminated unions for mutually exclusive states:

```typescript
// Instead of optional fields
interface GameRoom {
  state: string;
  roundStartTime?: number; // Only valid when playing
  matchId?: string; // Only valid after match starts
}

// ✅ Use discriminated union
type GameRoomState = 
  | { state: 'waiting'; players: [Player] }
  | { state: 'ready'; players: [Player, Player] }
  | { state: 'playing'; players: [Player, Player]; roundStartTime: number; matchId: string }
  | { state: 'round_end'; players: [Player, Player]; matchId: string }
  | { state: 'match_end'; players: [Player, Player]; matchId: string; winnerId: string };
```

### Round Result with Reason

```typescript
export interface RoundResult {
  roundNumber: number;
  player1Choice: GameChoice | null;
  player2Choice: GameChoice | null;
  winnerId: string | null;
  player1Timeout: boolean;
  player2Timeout: boolean;
  reason: 'normal' | 'timeout' | 'tie';
}

// Usage with type narrowing
function displayRoundResult(result: RoundResult) {
  if (result.reason === 'timeout') {
    // TypeScript knows at least one timeout is true
    if (result.player1Timeout && result.player2Timeout) {
      console.log('Both players timed out!');
    } else if (result.player1Timeout) {
      console.log('Player 1 timed out');
    } else {
      console.log('Player 2 timed out');
    }
  } else if (result.reason === 'tie') {
    console.log('Tie!');
  } else {
    console.log(`Winner: ${result.winnerId}`);
  }
}
```

### Literal Types for Choices

```typescript
// ✅ Use literal types instead of enums
export type GameChoice = 'rock' | 'paper' | 'scissors';
export type MatchFormat = 'single' | 'best_of_3' | 'best_of_5';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameState = 'waiting' | 'ready' | 'playing' | 'round_end' | 'match_end';

// Benefits:
// 1. No runtime code generated (unlike enums)
// 2. Can be used in template literals
// 3. JSON-serializable
// 4. More flexible

// Type-safe helper functions
function isValidChoice(value: string): value is GameChoice {
  return ['rock', 'paper', 'scissors'].includes(value);
}

// Usage
const userInput = getUserInput();
if (isValidChoice(userInput)) {
  // TypeScript knows userInput is GameChoice here
  socket.emit('round:choice', userInput);
}
```

## Runtime Validation with Zod

### Why Runtime Validation?

TypeScript types are erased at runtime. User input needs validation:

```typescript
// TypeScript can't prevent this at runtime
const userInput = JSON.parse(request.body); // Could be anything!
socket.emit('round:choice', userInput); // Might not be a valid GameChoice
```

### Zod Schemas

```typescript
import { z } from 'zod';

// Define schemas that match your types
export const GameChoiceSchema = z.enum(['rock', 'paper', 'scissors']);
export const MatchFormatSchema = z.enum(['single', 'best_of_3', 'best_of_5']);
export const DifficultySchema = z.enum(['easy', 'medium', 'hard']);
export const RoomCodeSchema = z.string().length(6).regex(/^[A-Z0-9]{6}$/);

export const PlayerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(20),
  socketId: z.string(),
});

// Infer TypeScript types from schemas
export type GameChoice = z.infer<typeof GameChoiceSchema>;
export type MatchFormat = z.infer<typeof MatchFormatSchema>;
export type Difficulty = z.infer<typeof DifficultySchema>;
export type RoomCode = z.infer<typeof RoomCodeSchema>;
export type Player = z.infer<typeof PlayerSchema>;
```

### Validation in Event Handlers

```typescript
socket.on('round:choice', (choice: unknown) => {
  // Validate at runtime
  const result = GameChoiceSchema.safeParse(choice);
  
  if (!result.success) {
    socket.emit('error', 'Invalid choice');
    return;
  }
  
  // Now we know choice is valid
  const validChoice: GameChoice = result.data;
  processChoice(player.id, validChoice);
});

// Or use parse() to throw on invalid input
socket.on('player:join', (name: unknown) => {
  try {
    const validName = z.string().min(1).max(20).parse(name);
    registerPlayer(validName);
  } catch (error) {
    socket.emit('error', 'Invalid player name');
  }
});
```

### Complex Object Validation

```typescript
export const CreateRoomRequestSchema = z.object({
  format: MatchFormatSchema,
  difficulty: DifficultySchema,
  isPrivate: z.boolean(),
});

export type CreateRoomRequest = z.infer<typeof CreateRoomRequestSchema>;

// Validate complex requests
socket.on('room:create', (request: unknown) => {
  const result = CreateRoomRequestSchema.safeParse(request);
  
  if (!result.success) {
    socket.emit('error', `Invalid request: ${result.error.message}`);
    return;
  }
  
  const { format, difficulty, isPrivate } = result.data;
  createRoom(format, difficulty, isPrivate);
});
```

## Sharing Types Between Client and Server

### Monorepo Structure

```
rock-paper-scissors/
├── shared/           # Shared types package
│   ├── src/
│   │   └── types.ts  # All shared types
│   ├── package.json
│   └── tsconfig.json
├── server/           # Server package
│   ├── src/
│   │   └── index.ts  # Imports from ../../shared/src/types.js
│   ├── package.json
│   └── tsconfig.json
└── client/           # Client package
    ├── src/
    │   └── main.ts   # Imports from ../../shared/src/types.js
    ├── package.json
    └── tsconfig.json
```

### Workspace Configuration

```json
// root package.json
{
  "workspaces": [
    "server",
    "client",
    "shared"
  ]
}
```

### Importing Shared Types

```typescript
// server/src/game-server.ts
import type { 
  Player, 
  GameRoom, 
  GameChoice,
  MatchFormat,
  Difficulty 
} from '../../shared/src/types.js';

// client/src/game-client.ts
import type { 
  Player, 
  RoundResult,
  MatchResult 
} from '../../shared/src/types.js';
```

### Benefits

1. **Single Source of Truth**: Types defined once, used everywhere
2. **Refactoring Safety**: Change a type, all usages update
3. **Consistency**: Client and server always agree on data structures
4. **Documentation**: Types serve as API documentation

## Generic Patterns

### Generic Event Emitter Wrapper

```typescript
// Type-safe event emitter wrapper
class TypedEventEmitter<Events extends Record<string, any>> {
  private emitter = new EventEmitter();
  
  on<K extends keyof Events>(
    event: K,
    listener: Events[K]
  ): void {
    this.emitter.on(event as string, listener);
  }
  
  emit<K extends keyof Events>(
    event: K,
    ...args: Parameters<Events[K]>
  ): void {
    this.emitter.emit(event as string, ...args);
  }
}

// Usage
interface GameEvents {
  'player:joined': (player: Player) => void;
  'game:started': (roomId: string) => void;
  'round:ended': (result: RoundResult) => void;
}

const events = new TypedEventEmitter<GameEvents>();

// ✅ Type-checked
events.on('player:joined', (player) => {
  console.log(player.name); // player is typed as Player
});

// ❌ TypeScript error
events.emit('player:joined', 'not a player'); // Error!
```

### Generic Room Manager

```typescript
interface Room<TPlayer, TState> {
  id: string;
  players: TPlayer[];
  state: TState;
}

class RoomManager<TPlayer, TState> {
  private rooms = new Map<string, Room<TPlayer, TState>>();
  
  createRoom(id: string, initialState: TState): Room<TPlayer, TState> {
    const room: Room<TPlayer, TState> = {
      id,
      players: [],
      state: initialState,
    };
    this.rooms.set(id, room);
    return room;
  }
  
  getRoom(id: string): Room<TPlayer, TState> | undefined {
    return this.rooms.get(id);
  }
  
  addPlayer(roomId: string, player: TPlayer): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    room.players.push(player);
    return true;
  }
}

// Usage
type GameRoomState = 'waiting' | 'playing' | 'ended';
const manager = new RoomManager<Player, GameRoomState>();

const room = manager.createRoom('room-1', 'waiting');
manager.addPlayer('room-1', { id: '1', name: 'Alice', socketId: 'socket-1' });
```

### Utility Types

```typescript
// Extract player IDs from room
type PlayerIds<T extends { players: Player[] }> = T['players'][number]['id'];

// Make all properties of a type optional recursively
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Omit sensitive data from room before sending to client
type ClientSafeRoom = Omit<GameRoom, 'roundChoices'>;

// Extract event names
type EventNames<T> = keyof T;
type ServerEventNames = EventNames<ServerToClientEvents>;
// 'player:registered' | 'room:joined' | 'game:start' | ...

// Extract event payload
type EventPayload<
  T extends Record<string, (...args: any[]) => void>,
  K extends keyof T
> = Parameters<T[K]>;

type RoundStartPayload = EventPayload<ServerToClientEvents, 'round:start'>;
// [number, number]
```

## Best Practices

### 1. Use `type` for Unions and Aliases

```typescript
// ✅ Use type for unions
export type GameChoice = 'rock' | 'paper' | 'scissors';
export type MatchFormat = 'single' | 'best_of_3' | 'best_of_5';

// ✅ Use interface for objects
export interface Player {
  id: string;
  name: string;
  socketId: string;
}
```

### 2. Prefer `unknown` Over `any`

```typescript
// ❌ Avoid any
socket.on('round:choice', (choice: any) => {
  processChoice(choice); // No type checking!
});

// ✅ Use unknown and validate
socket.on('round:choice', (choice: unknown) => {
  if (typeof choice === 'string' && isValidChoice(choice)) {
    processChoice(choice); // Type-safe!
  }
});
```

### 3. Use Type Guards

```typescript
function isPlayer(value: unknown): value is Player {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'socketId' in value &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.socketId === 'string'
  );
}

// Usage
if (isPlayer(data)) {
  // TypeScript knows data is Player
  console.log(data.name);
}
```

### 4. Use `readonly` for Immutable Data

```typescript
export interface RoundResult {
  readonly roundNumber: number;
  readonly player1Choice: GameChoice | null;
  readonly player2Choice: GameChoice | null;
  readonly winnerId: string | null;
  readonly player1Timeout: boolean;
  readonly player2Timeout: boolean;
  readonly reason: 'normal' | 'timeout' | 'tie';
}

// Prevents accidental mutation
const result: RoundResult = getRoundResult();
result.winnerId = 'someone-else'; // Error: Cannot assign to 'winnerId'
```

### 5. Use Const Assertions

```typescript
// ✅ Use const assertion for literal types
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
type Difficulty = typeof DIFFICULTIES[number]; // 'easy' | 'medium' | 'hard'

const TIME_LIMITS = {
  easy: 10,
  medium: 5,
  hard: 3,
} as const;

type TimeLimit = typeof TIME_LIMITS[keyof typeof TIME_LIMITS]; // 10 | 5 | 3
```

### 6. Document Complex Types

```typescript
/**
 * Represents a game room where players compete.
 * 
 * @property id - Unique room identifier (UUID)
 * @property roomCode - 6-character code for private rooms, null for matchmaking
 * @property format - Number of rounds to play
 * @property difficulty - Time limit per round
 * @property state - Current game state
 * @property players - Array of 1-2 players (tuple type)
 * @property currentRound - Current round number (1-indexed)
 * @property scores - Map of player ID to rounds won
 * @property roundChoices - Map of player ID to current round choice
 * @property roundStartTime - Timestamp when current round started (null if not playing)
 * @property matchId - Database match ID (null before match starts)
 */
export interface GameRoom {
  id: string;
  roomCode: RoomCode | null;
  format: MatchFormat;
  difficulty: Difficulty;
  state: GameState;
  players: [Player, Player?];
  currentRound: number;
  scores: Record<string, number>;
  roundChoices: Record<string, GameChoice | null>;
  roundStartTime: number | null;
  matchId: string | null;
}
```

### 7. Use Branded Types for IDs

```typescript
// Prevent mixing up different ID types
type PlayerId = string & { readonly __brand: 'PlayerId' };
type RoomId = string & { readonly __brand: 'RoomId' };
type MatchId = string & { readonly __brand: 'MatchId' };

function createPlayerId(id: string): PlayerId {
  return id as PlayerId;
}

function getPlayer(id: PlayerId): Player {
  // ...
}

const playerId = createPlayerId('123');
const roomId = 'room-456' as RoomId;

getPlayer(playerId); // ✅ OK
getPlayer(roomId); // ❌ Error: RoomId is not assignable to PlayerId
```

## Summary

TypeScript patterns for multiplayer games:

1. **Type-safe events** - Define event interfaces for Socket.io
2. **Discriminated unions** - Model mutually exclusive states
3. **Runtime validation** - Use Zod for user input
4. **Shared types** - Single source of truth in monorepo
5. **Generic patterns** - Reusable type-safe abstractions
6. **Best practices** - `unknown` over `any`, type guards, `readonly`, const assertions

These patterns provide:
- **Compile-time safety** - Catch errors before runtime
- **Better IDE support** - Autocomplete and inline documentation
- **Refactoring confidence** - Change types, find all usages
- **Self-documenting code** - Types serve as documentation
- **Runtime safety** - Validate external input with Zod

TypeScript makes multiplayer game development safer and more maintainable!
