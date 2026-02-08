/**
 * Room Manager
 * 
 * Manages game rooms and matchmaking queues.
 * Handles both random matchmaking and private room creation.
 * 
 * Architecture:
 * - Rooms are stored in memory (Map) for fast access
 * - Matchmaking queues group players by format and difficulty
 * - Private rooms use unique 6-character codes
 * - Room codes are guaranteed to be unique
 */

import { randomUUID } from 'crypto';
import type { 
  GameRoom, 
  Player, 
  MatchFormat, 
  Difficulty, 
  RoomCode 
} from '../../shared/src/types.js';
import { generateRoomCode, getMatchmakingKey } from './utils.js';

/**
 * In-memory storage for all active game rooms.
 * Key: Room ID
 * Value: GameRoom object
 */
const rooms = new Map<string, GameRoom>();

/**
 * Matchmaking queues for random matchmaking.
 * Players waiting for opponents are grouped by format and difficulty.
 * 
 * Key: "format:difficulty" (e.g., "best_of_3:medium")
 * Value: Array of waiting players
 */
const matchmakingQueues = new Map<string, Player[]>();

/**
 * Map of room codes to room IDs for quick private room lookup.
 * Key: Room code (e.g., "ABC123")
 * Value: Room ID
 */
const roomCodeMap = new Map<RoomCode, string>();

/**
 * Map of player IDs to room IDs for quick player lookup.
 * Key: Player ID
 * Value: Room ID
 */
const playerRoomMap = new Map<string, string>();

// ============================================================================
// Room Creation and Management
// ============================================================================

/**
 * Create a new game room.
 * 
 * @param format - Match format (single, best_of_3, best_of_5)
 * @param difficulty - Difficulty level (easy, medium, hard)
 * @param isPrivate - Whether this is a private room with a code
 * @returns The created room
 */
export function createRoom(
  format: MatchFormat,
  difficulty: Difficulty,
  isPrivate: boolean
): GameRoom {
  const roomId = randomUUID();
  
  // Generate unique room code for private rooms
  let roomCode: RoomCode | null = null;
  if (isPrivate) {
    // Keep generating until we get a unique code
    do {
      roomCode = generateRoomCode();
    } while (roomCodeMap.has(roomCode));
    
    roomCodeMap.set(roomCode, roomId);
  }

  const room: GameRoom = {
    id: roomId,
    roomCode,
    format,
    difficulty,
    state: 'waiting',
    players: [] as any, // Will be populated with players
    currentRound: 0,
    scores: {},
    roundChoices: {},
    roundStartTime: null,
    matchId: null,
  };

  rooms.set(roomId, room);
  
  console.log(`✓ Room created: ${roomId} ${roomCode ? `(code: ${roomCode})` : '(random)'}`);
  
  return room;
}

/**
 * Get a room by ID.
 * 
 * @param roomId - Room identifier
 * @returns The room or undefined if not found
 */
export function getRoom(roomId: string): GameRoom | undefined {
  return rooms.get(roomId);
}

/**
 * Get a room by its code.
 * 
 * @param code - Room code
 * @returns The room or undefined if not found
 */
export function getRoomByCode(code: RoomCode): GameRoom | undefined {
  const roomId = roomCodeMap.get(code);
  return roomId ? rooms.get(roomId) : undefined;
}

/**
 * Get the room a player is currently in.
 * 
 * @param playerId - Player identifier
 * @returns The room or undefined if player is not in a room
 */
export function getPlayerRoom(playerId: string): GameRoom | undefined {
  const roomId = playerRoomMap.get(playerId);
  return roomId ? rooms.get(roomId) : undefined;
}

/**
 * Delete a room and clean up all references.
 * 
 * Called when a room is no longer needed (e.g., both players left).
 * 
 * @param roomId - Room identifier
 */
export function deleteRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  // Clean up room code mapping
  if (room.roomCode) {
    roomCodeMap.delete(room.roomCode);
  }

  // Clean up player mappings
  room.players.forEach(player => {
    if (player) {
      playerRoomMap.delete(player.id);
    }
  });

  rooms.delete(roomId);
  
  console.log(`✓ Room deleted: ${roomId}`);
}

// ============================================================================
// Player Management
// ============================================================================

/**
 * Add a player to a room.
 * 
 * @param roomId - Room identifier
 * @param player - Player to add
 * @returns true if successful, false if room is full
 */
export function addPlayerToRoom(roomId: string, player: Player): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;

  // Check if room is full
  if (room.players.length >= 2) {
    return false;
  }

  // Add player to room
  room.players.push(player);
  playerRoomMap.set(player.id, roomId);

  // Initialize player's score
  room.scores[player.id] = 0;
  room.roundChoices[player.id] = null;

  // Update room state if now full
  if (room.players.length === 2) {
    room.state = 'ready';
  }

  console.log(`✓ Player ${player.name} joined room ${roomId}`);
  
  return true;
}

/**
 * Remove a player from a room.
 * 
 * @param roomId - Room identifier
 * @param playerId - Player identifier
 */
export function removePlayerFromRoom(roomId: string, playerId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  // Remove player from room
  const index = room.players.findIndex(p => p?.id === playerId);
  if (index !== -1) {
    room.players.splice(index, 1);
  }

  // Clean up player mapping
  playerRoomMap.delete(playerId);

  // Delete room if empty
  if (room.players.length === 0) {
    deleteRoom(roomId);
  } else {
    // Reset room state if player left during game
    room.state = 'waiting';
  }

  console.log(`✓ Player ${playerId} left room ${roomId}`);
}

// ============================================================================
// Matchmaking
// ============================================================================

/**
 * Add a player to the matchmaking queue.
 * 
 * If another player is waiting with the same preferences, create a room
 * and match them together.
 * 
 * @param player - Player looking for a match
 * @param format - Desired match format
 * @param difficulty - Desired difficulty
 * @returns The room if matched, undefined if added to queue
 */
export function addToMatchmaking(
  player: Player,
  format: MatchFormat,
  difficulty: Difficulty
): GameRoom | undefined {
  const key = getMatchmakingKey(format, difficulty);
  
  // Get or create queue for this format/difficulty combination
  let queue = matchmakingQueues.get(key);
  if (!queue) {
    queue = [];
    matchmakingQueues.set(key, queue);
  }

  // Check if someone is already waiting
  if (queue.length > 0) {
    // Match found! Create room and add both players
    const opponent = queue.shift()!;
    const room = createRoom(format, difficulty, false);
    
    addPlayerToRoom(room.id, opponent);
    addPlayerToRoom(room.id, player);
    
    console.log(`✓ Match found: ${opponent.name} vs ${player.name}`);
    
    return room;
  }

  // No match yet, add to queue
  queue.push(player);
  console.log(`✓ Player ${player.name} added to matchmaking queue (${key})`);
  
  return undefined;
}

/**
 * Remove a player from the matchmaking queue.
 * 
 * @param playerId - Player identifier
 * @param format - Match format they were queued for
 * @param difficulty - Difficulty they were queued for
 */
export function removeFromMatchmaking(
  playerId: string,
  format: MatchFormat,
  difficulty: Difficulty
): void {
  const key = getMatchmakingKey(format, difficulty);
  const queue = matchmakingQueues.get(key);
  
  if (queue) {
    const index = queue.findIndex(p => p.id === playerId);
    if (index !== -1) {
      queue.splice(index, 1);
      console.log(`✓ Player ${playerId} removed from matchmaking queue`);
    }
  }
}

/**
 * Remove a player from all matchmaking queues.
 * 
 * Useful when a player disconnects.
 * 
 * @param playerId - Player identifier
 */
export function removeFromAllQueues(playerId: string): void {
  matchmakingQueues.forEach((queue, key) => {
    const index = queue.findIndex(p => p.id === playerId);
    if (index !== -1) {
      queue.splice(index, 1);
      console.log(`✓ Player ${playerId} removed from queue ${key}`);
    }
  });
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get current matchmaking statistics.
 * 
 * Useful for monitoring and debugging.
 * 
 * @returns Object with queue counts
 */
export function getMatchmakingStats() {
  const stats: Record<string, number> = {};
  
  matchmakingQueues.forEach((queue, key) => {
    stats[key] = queue.length;
  });
  
  return {
    totalRooms: rooms.size,
    queues: stats,
  };
}
