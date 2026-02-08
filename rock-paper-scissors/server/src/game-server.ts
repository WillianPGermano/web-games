/**
 * Game Server
 * 
 * Core game logic and Socket.io event handling.
 * This is the heart of the multiplayer system.
 * 
 * Responsibilities:
 * - Handle player connections and disconnections
 * - Manage game rooms and matchmaking
 * - Process player choices and determine winners
 * - Enforce round timers and timeouts
 * - Persist match results to database
 * 
 * Architecture:
 * - Event-driven using Socket.io
 * - Authoritative server: All game logic runs on server
 * - Clients only send inputs and receive state updates
 * - Timers managed server-side to prevent cheating
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import type {
  Player,
  GameChoice,
  MatchFormat,
  Difficulty,
  RoomCode,
  RoundResult,
  MatchResult,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../shared/src/types.js';
import {
  createRoom,
  getRoom,
  getRoomByCode,
  getPlayerRoom,
  addPlayerToRoom,
  removePlayerFromRoom,
  addToMatchmaking,
  removeFromAllQueues,
  deleteRoom,
} from './room-manager.js';
import {
  determineWinner,
  getRoundsToWin,
  getTimeLimit,
  isValidRoomCode,
} from './utils.js';
import {
  upsertPlayer,
  createMatch,
  updateMatchResult,
  createRound,
} from './database.js';
import { getCPUChoice, recordPlayerChoice, clearPlayerHistory, getCPUName } from './cpu-ai.js';

/**
 * Map of socket IDs to player data.
 * Allows quick lookup of player info from socket connection.
 */
const connectedPlayers = new Map<string, Player>();

/**
 * Map of room IDs to active round timers.
 * Used to track and cancel timers when needed.
 */
const roomTimers = new Map<string, NodeJS.Timeout>();

/**
 * Initialize the game server with Socket.io.
 * 
 * Sets up all event handlers for client-server communication.
 * 
 * @param io - Socket.io server instance
 */
export function initializeGameServer(
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>
): void {
  io.on('connection', (socket) => {
    console.log(`✓ Client connected: ${socket.id}`);

    // ========================================================================
    // Connection Events
    // ========================================================================

    /**
     * Player joins the game.
     * Creates a player record and registers them in the system.
     */
    socket.on('player:join', (playerName: string) => {
      const playerId = randomUUID();
      
      const player: Player = {
        id: playerId,
        name: playerName,
        socketId: socket.id,
      };

      // Store player in memory and database
      connectedPlayers.set(socket.id, player);
      upsertPlayer(playerId, playerName);

      socket.emit('player:registered', player);
      console.log(`✓ Player registered: ${playerName} (${playerId})`);
    });

    // ========================================================================
    // CPU Game Events
    // ========================================================================

    /**
     * Player starts a game against CPU.
     */
    socket.on('cpu:start', (cpuOpponent: string, format: MatchFormat, difficulty: Difficulty) => {
      const player = connectedPlayers.get(socket.id);
      if (!player) {
        socket.emit('error', 'Player not registered');
        return;
      }

      // Create CPU player
      const cpuPlayer: Player = {
        id: `cpu-${cpuOpponent}`,
        name: getCPUName(cpuOpponent as any),
        socketId: 'cpu', // Special socket ID for CPU
      };

      // Create room for CPU game
      const room = createRoom(format, difficulty, false);
      room.roomCode = null; // CPU games don't have room codes
      
      // Add both players
      addPlayerToRoom(room.id, player);
      addPlayerToRoom(room.id, cpuPlayer);

      // Store CPU opponent type in room (we'll use this later)
      (room as any).cpuOpponent = cpuOpponent;

      // Notify player
      socket.emit('room:joined', sanitizeRoom(room));

      console.log(`✓ CPU game started: ${player.name} vs ${cpuPlayer.name}`);

      // Start the game
      startGame(io, room.id);
    });

    // ========================================================================
    // Matchmaking Events
    // ========================================================================

    /**
     * Player joins random matchmaking queue.
     * Attempts to find an opponent with matching preferences.
     */
    socket.on('matchmaking:join', (format: MatchFormat, difficulty: Difficulty) => {
      const player = connectedPlayers.get(socket.id);
      if (!player) {
        socket.emit('error', 'Player not registered');
        return;
      }

      // Try to find a match
      const room = addToMatchmaking(player, format, difficulty);

      if (room) {
        // Match found! Notify both players
        const [player1, player2] = room.players;
        
        io.to(player1!.socketId).emit('room:joined', sanitizeRoom(room));
        io.to(player2!.socketId).emit('room:joined', sanitizeRoom(room));

        // Start the game
        startGame(io, room.id);
      } else {
        // Added to queue, waiting for opponent
        socket.emit('matchmaking:waiting');
      }
    });

    /**
     * Player leaves matchmaking queue.
     */
    socket.on('matchmaking:leave', () => {
      const player = connectedPlayers.get(socket.id);
      if (player) {
        removeFromAllQueues(player.id);
      }
    });

    // ========================================================================
    // Private Room Events
    // ========================================================================

    /**
     * Player creates a private room.
     * Generates a unique room code that can be shared.
     */
    socket.on('room:create', (format: MatchFormat, difficulty: Difficulty) => {
      const player = connectedPlayers.get(socket.id);
      if (!player) {
        socket.emit('error', 'Player not registered');
        return;
      }

      const room = createRoom(format, difficulty, true);
      addPlayerToRoom(room.id, player);

      socket.emit('room:created', room.roomCode!);
      socket.emit('room:joined', sanitizeRoom(room));
    });

    /**
     * Player joins a private room using a code.
     */
    socket.on('room:join', (roomCode: RoomCode) => {
      const player = connectedPlayers.get(socket.id);
      if (!player) {
        socket.emit('error', 'Player not registered');
        return;
      }

      // Validate room code format
      if (!isValidRoomCode(roomCode)) {
        socket.emit('error', 'Invalid room code format');
        return;
      }

      // Find room by code
      const room = getRoomByCode(roomCode);
      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }

      // Check if room is full
      if (room.players.length >= 2) {
        socket.emit('error', 'Room is full');
        return;
      }

      // Add player to room
      addPlayerToRoom(room.id, player);

      // Notify both players
      const [player1, player2] = room.players;
      io.to(player1!.socketId).emit('player:joined', player2!);
      io.to(player1!.socketId).emit('room:joined', sanitizeRoom(room));
      io.to(player2!.socketId).emit('room:joined', sanitizeRoom(room));

      // Start the game
      startGame(io, room.id);
    });

    /**
     * Player leaves their current room.
     */
    socket.on('room:leave', () => {
      const player = connectedPlayers.get(socket.id);
      if (!player) return;

      const room = getPlayerRoom(player.id);
      if (!room) return;

      handlePlayerLeave(io, room.id, player.id);
    });

    // ========================================================================
    // Gameplay Events
    // ========================================================================

    /**
     * Player makes a choice (rock, paper, or scissors).
     */
    socket.on('round:choice', (choice: GameChoice) => {
      const player = connectedPlayers.get(socket.id);
      if (!player) return;

      const room = getPlayerRoom(player.id);
      if (!room || room.state !== 'playing') {
        socket.emit('error', 'Not in an active game');
        return;
      }

      // Record the choice
      room.roundChoices[player.id] = choice;
      socket.emit('round:choice_received');

      console.log(`✓ ${player.name} chose ${choice} in round ${room.currentRound}`);

      const [player1, player2] = room.players;
      
      // Check if this is a CPU game
      const isCPUGame = player2?.socketId === 'cpu';
      
      if (isCPUGame) {
        // CPU game: immediately get CPU choice and end round
        const cpuOpponent = (room as any).cpuOpponent;
        const cpuChoice = getCPUChoice(cpuOpponent, player.id);
        
        // Record player choice for AI learning
        recordPlayerChoice(player.id, choice);
        
        // Record CPU choice
        room.roundChoices[player2!.id] = cpuChoice;
        
        console.log(`✓ CPU chose ${cpuChoice} in round ${room.currentRound}`);
        
        // Clear timer and end round
        clearRoomTimer(room.id);
        
        const choice1 = player1!.id === player.id ? choice : cpuChoice;
        const choice2 = player1!.id === player.id ? cpuChoice : choice;
        
        endRound(io, room.id, choice1, choice2, false, false);
      } else {
        // Human vs human: check if both players have chosen
        const choice1 = room.roundChoices[player1!.id];
        const choice2 = room.roundChoices[player2!.id];

        if (choice1 !== null && choice2 !== null) {
          // Both players chose, end the round
          clearRoomTimer(room.id);
          endRound(io, room.id, choice1, choice2, false, false);
        }
      }
    });

    /**
     * Player requests a rematch.
     */
    socket.on('match:rematch', () => {
      const player = connectedPlayers.get(socket.id);
      if (!player) return;

      const room = getPlayerRoom(player.id);
      if (!room || room.state !== 'match_end') return;

      // Get opponent
      const opponent = room.players.find(p => p?.id !== player.id);
      if (!opponent) return;

      // Notify opponent of rematch request
      io.to(opponent.socketId).emit('match:rematch_requested', player.name);
      
      console.log(`✓ ${player.name} requested rematch in room ${room.id}`);
    });

    /**
     * Player responds to rematch request.
     */
    socket.on('match:rematch_response', (accepted: boolean) => {
      const player = connectedPlayers.get(socket.id);
      if (!player) return;

      const room = getPlayerRoom(player.id);
      if (!room || room.state !== 'match_end') return;

      // Get opponent
      const opponent = room.players.find(p => p?.id !== player.id);
      if (!opponent) return;

      if (accepted) {
        // Both players agreed, start new match
        console.log(`✓ Rematch accepted in room ${room.id}`);
        
        // Notify both players
        io.to(player.socketId).emit('match:rematch_accepted');
        io.to(opponent.socketId).emit('match:rematch_accepted');
        
        // Reset room and start new game
        resetRoom(room);
        startGame(io, room.id);
      } else {
        // Player declined
        console.log(`✗ Rematch declined in room ${room.id}`);
        
        // Notify opponent
        io.to(opponent.socketId).emit('match:rematch_declined');
      }
    });

    /**
     * Player wants to start a new match (leave current room).
     */
    socket.on('match:new', () => {
      socket.emit('matchmaking:leave');
      socket.emit('room:leave');
    });

    // ========================================================================
    // Disconnection
    // ========================================================================

    socket.on('disconnect', () => {
      const player = connectedPlayers.get(socket.id);
      if (!player) return;

      console.log(`✗ Player disconnected: ${player.name}`);

      // Remove from matchmaking queues
      removeFromAllQueues(player.id);

      // Handle room cleanup
      const room = getPlayerRoom(player.id);
      if (room) {
        handlePlayerLeave(io, room.id, player.id);
      }

      connectedPlayers.delete(socket.id);
    });
  });

  console.log('✓ Game server initialized');
}

// ============================================================================
// Game Flow Functions
// ============================================================================

/**
 * Start a game when both players are ready.
 * 
 * @param io - Socket.io server
 * @param roomId - Room identifier
 */
function startGame(
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
  roomId: string
): void {
  const room = getRoom(roomId);
  if (!room || room.players.length !== 2) return;

  // Create match record in database
  const [player1, player2] = room.players;
  room.matchId = createMatch({
    roomCode: room.roomCode,
    player1Id: player1!.id,
    player2Id: player2!.id,
    format: room.format,
    difficulty: room.difficulty,
  });

  // Notify players (skip CPU)
  io.to(player1!.socketId).emit('game:start');
  if (player2!.socketId !== 'cpu') {
    io.to(player2!.socketId).emit('game:start');
  }

  console.log(`✓ Game started in room ${roomId}`);

  // Start first round
  startRound(io, roomId);
}

/**
 * Start a new round.
 * 
 * @param io - Socket.io server
 * @param roomId - Room identifier
 */
function startRound(
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
  roomId: string
): void {
  const room = getRoom(roomId);
  if (!room) return;

  // Check if we still have 2 players
  if (room.players.length !== 2 || !room.players[0] || !room.players[1]) {
    console.log(`⚠ Cannot start round - not enough players in room ${roomId}`);
    return;
  }

  room.currentRound++;
  room.state = 'playing';
  room.roundStartTime = Date.now();

  // Reset choices
  room.players.forEach(player => {
    if (player) {
      room.roundChoices[player.id] = null;
    }
  });

  const timeLimit = getTimeLimit(room.difficulty);
  const [player1, player2] = room.players;

  // Notify players (skip CPU)
  if (player1.socketId !== 'cpu') {
    io.to(player1.socketId).emit('round:start', room.currentRound, timeLimit);
  }
  if (player2.socketId !== 'cpu') {
    io.to(player2.socketId).emit('round:start', room.currentRound, timeLimit);
  }

  console.log(`✓ Round ${room.currentRound} started in room ${roomId}`);

  // Set timeout timer
  const timer = setTimeout(() => {
    handleRoundTimeout(io, roomId);
  }, timeLimit * 1000);

  roomTimers.set(roomId, timer);
}

/**
 * Handle round timeout when time expires.
 * 
 * @param io - Socket.io server
 * @param roomId - Room identifier
 */
function handleRoundTimeout(
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
  roomId: string
): void {
  const room = getRoom(roomId);
  if (!room || room.state !== 'playing') return;

  const [player1, player2] = room.players;
  const choice1 = room.roundChoices[player1!.id];
  const choice2 = room.roundChoices[player2!.id];

  const player1Timeout = choice1 === null;
  const player2Timeout = choice2 === null;

  console.log(`⏱ Round timeout in room ${roomId} - P1: ${player1Timeout}, P2: ${player2Timeout}`);

  endRound(io, roomId, choice1, choice2, player1Timeout, player2Timeout);
}

/**
 * End the current round and determine winner.
 * 
 * @param io - Socket.io server
 * @param roomId - Room identifier
 * @param choice1 - Player 1's choice (or null if timeout)
 * @param choice2 - Player 2's choice (or null if timeout)
 * @param player1Timeout - Whether player 1 timed out
 * @param player2Timeout - Whether player 2 timed out
 */
function endRound(
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
  roomId: string,
  choice1: GameChoice | null,
  choice2: GameChoice | null,
  player1Timeout: boolean,
  player2Timeout: boolean
): void {
  const room = getRoom(roomId);
  if (!room) return;

  // Check if we still have 2 players
  if (room.players.length !== 2 || !room.players[0] || !room.players[1]) {
    console.log(`⚠ Cannot end round - not enough players in room ${roomId}`);
    return;
  }

  room.state = 'round_end';

  const [player1, player2] = room.players;
  let winnerId: string | null = null;
  let reason: 'normal' | 'timeout' | 'tie' = 'normal';

  // Determine winner based on choices and timeouts
  if (player1Timeout && player2Timeout) {
    // Both timed out - it's a tie, replay round
    reason = 'tie';
  } else if (player1Timeout) {
    // Player 1 timed out, player 2 wins
    winnerId = player2!.id;
    reason = 'timeout';
    room.scores[player2!.id]++;
  } else if (player2Timeout) {
    // Player 2 timed out, player 1 wins
    winnerId = player1!.id;
    reason = 'timeout';
    room.scores[player1!.id]++;
  } else if (choice1 && choice2) {
    // Both chose, determine winner normally
    const result = determineWinner(choice1, choice2);
    
    if (result === 'tie') {
      reason = 'tie';
    } else if (result === 'player1') {
      winnerId = player1!.id;
      room.scores[player1!.id]++;
    } else {
      winnerId = player2!.id;
      room.scores[player2!.id]++;
    }
  }

  // Create round result
  const roundResult: RoundResult = {
    roundNumber: room.currentRound,
    player1Choice: choice1,
    player2Choice: choice2,
    winnerId,
    player1Timeout,
    player2Timeout,
    reason,
  };

  // Save round to database
  if (room.matchId) {
    createRound({
      matchId: room.matchId,
      roundNumber: room.currentRound,
      player1Choice: choice1,
      player2Choice: choice2,
      winnerId,
      player1Timeout,
      player2Timeout,
    });
  }

  // Notify players of round result (skip CPU)
  if (player1!.socketId !== 'cpu') {
    io.to(player1!.socketId).emit('round:end', roundResult, room.scores);
  }
  if (player2!.socketId !== 'cpu') {
    io.to(player2!.socketId).emit('round:end', roundResult, room.scores);
  }

  console.log(`✓ Round ${room.currentRound} ended - Winner: ${winnerId || 'tie'}`);

  // Check if match is over
  const roundsToWin = getRoundsToWin(room.format);
  const matchWinner = 
    room.scores[player1!.id] >= roundsToWin ? player1!.id :
    room.scores[player2!.id] >= roundsToWin ? player2!.id :
    null;

  if (matchWinner) {
    endMatch(io, roomId, matchWinner);
  } else {
    // Continue to next round after a delay
    setTimeout(() => {
      startRound(io, roomId);
    }, 3000); // 3 second delay between rounds
  }
}

/**
 * End the match and save final results.
 * 
 * @param io - Socket.io server
 * @param roomId - Room identifier
 * @param winnerId - ID of the winning player
 */
function endMatch(
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
  roomId: string,
  winnerId: string
): void {
  const room = getRoom(roomId);
  if (!room) return;

  room.state = 'match_end';

  // Update database with final result
  if (room.matchId) {
    const [player1, player2] = room.players;
    updateMatchResult(
      room.matchId,
      winnerId,
      room.scores[player1!.id],
      room.scores[player2!.id]
    );
  }

  // Create match result
  const matchResult: MatchResult = {
    matchId: room.matchId!,
    winnerId,
    finalScores: room.scores,
    rounds: [], // Could populate from database if needed
  };

  // Notify players (skip CPU)
  const [player1, player2] = room.players;
  if (player1!.socketId !== 'cpu') {
    io.to(player1!.socketId).emit('match:end', matchResult);
  }
  if (player2!.socketId !== 'cpu') {
    io.to(player2!.socketId).emit('match:end', matchResult);
  }

  console.log(`✓ Match ended in room ${roomId} - Winner: ${winnerId}`);
  
  // Clear CPU history if this was a CPU game
  const isCPUGame = player1!.socketId === 'cpu' || player2!.socketId === 'cpu';
  if (isCPUGame) {
    const humanPlayer = player1!.socketId === 'cpu' ? player2! : player1!;
    clearPlayerHistory(humanPlayer.id);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Handle a player leaving a room.
 * 
 * @param io - Socket.io server
 * @param roomId - Room identifier
 * @param playerId - Player identifier
 */
function handlePlayerLeave(
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
  roomId: string,
  playerId: string
): void {
  const room = getRoom(roomId);
  if (!room) return;

  // Notify other player
  const otherPlayer = room.players.find(p => p?.id !== playerId);
  if (otherPlayer) {
    io.to(otherPlayer.socketId).emit('player:left', playerId);
  }

  // Clear any active timers
  clearRoomTimer(roomId);

  // Remove player and clean up room
  removePlayerFromRoom(roomId, playerId);
}

/**
 * Clear the round timer for a room.
 * 
 * @param roomId - Room identifier
 */
function clearRoomTimer(roomId: string): void {
  const timer = roomTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    roomTimers.delete(roomId);
  }
}

/**
 * Reset a room for a rematch.
 * 
 * @param room - Game room
 */
function resetRoom(room: GameRoom): void {
  room.state = 'ready';
  room.currentRound = 0;
  room.roundStartTime = null;
  room.matchId = null;

  // Reset scores
  room.players.forEach(player => {
    if (player) {
      room.scores[player.id] = 0;
      room.roundChoices[player.id] = null;
    }
  });
}

/**
 * Remove sensitive data from room before sending to client.
 * 
 * Clients shouldn't see opponent's choices until round ends.
 * 
 * @param room - Game room
 * @returns Sanitized room data
 */
function sanitizeRoom(room: GameRoom): Omit<GameRoom, 'roundChoices'> {
  const { roundChoices, ...sanitized } = room;
  return sanitized;
}
