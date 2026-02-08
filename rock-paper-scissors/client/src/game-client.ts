/**
 * Game Client
 * 
 * Handles all Socket.io communication with the server.
 * Manages connection state and emits/receives game events.
 * 
 * Architecture:
 * - Event-driven communication
 * - Callbacks for UI updates
 * - Automatic reconnection handling
 * - Type-safe event emitters
 */

import { io, Socket } from 'socket.io-client';
import type {
  Player,
  GameChoice,
  MatchFormat,
  Difficulty,
  RoomCode,
  GameRoom,
  RoundResult,
  MatchResult,
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../shared/src/types';

/**
 * Callback functions for game events.
 * UI layer registers these to respond to server events.
 */
export interface GameClientCallbacks {
  onPlayerRegistered: (player: Player) => void;
  onError: (message: string) => void;
  onMatchmakingWaiting: () => void;
  onRoomCreated: (roomCode: RoomCode) => void;
  onRoomJoined: (room: Omit<GameRoom, 'roundChoices'>) => void;
  onGameStart: () => void;
  onRoundStart: (roundNumber: number, timeLimit: number) => void;
  onRoundChoiceReceived: () => void;
  onRoundEnd: (result: RoundResult, scores: { [playerId: string]: number }) => void;
  onMatchEnd: (result: MatchResult) => void;
  onPlayerJoined: (player: Player) => void;
  onPlayerLeft: (playerId: string) => void;
  onPlayerDisconnected: (playerId: string) => void;
  onRematchRequested: (playerName: string) => void;
  onRematchAccepted: () => void;
  onRematchDeclined: () => void;
}

/**
 * Game Client class.
 * Manages Socket.io connection and provides methods for game actions.
 */
export class GameClient {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  private callbacks: GameClientCallbacks;
  private currentPlayer: Player | null = null;

  /**
   * Create a new game client.
   * 
   * @param serverUrl - URL of the game server
   * @param callbacks - Callback functions for game events
   */
  constructor(serverUrl: string, callbacks: GameClientCallbacks) {
    this.callbacks = callbacks;

    // Initialize Socket.io connection
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.setupEventListeners();
  }

  /**
   * Set up all Socket.io event listeners.
   * Connects server events to callback functions.
   */
  private setupEventListeners(): void {
    // Connection events
    this.socket.on('connect', () => {
      console.log('✓ Connected to server');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('✗ Disconnected from server:', reason);
      this.callbacks.onError('Disconnected from server');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.callbacks.onError('Failed to connect to server');
    });

    // Game events
    this.socket.on('player:registered', (player) => {
      this.currentPlayer = player;
      this.callbacks.onPlayerRegistered(player);
    });

    this.socket.on('error', (message) => {
      this.callbacks.onError(message);
    });

    this.socket.on('matchmaking:waiting', () => {
      this.callbacks.onMatchmakingWaiting();
    });

    this.socket.on('room:created', (roomCode) => {
      this.callbacks.onRoomCreated(roomCode);
    });

    this.socket.on('room:joined', (room) => {
      this.callbacks.onRoomJoined(room);
    });

    this.socket.on('game:start', () => {
      this.callbacks.onGameStart();
    });

    this.socket.on('round:start', (roundNumber, timeLimit) => {
      this.callbacks.onRoundStart(roundNumber, timeLimit);
    });

    this.socket.on('round:choice_received', () => {
      this.callbacks.onRoundChoiceReceived();
    });

    this.socket.on('round:end', (result, scores) => {
      this.callbacks.onRoundEnd(result, scores);
    });

    this.socket.on('match:end', (result) => {
      this.callbacks.onMatchEnd(result);
    });

    this.socket.on('player:joined', (player) => {
      this.callbacks.onPlayerJoined(player);
    });

    this.socket.on('player:left', (playerId) => {
      this.callbacks.onPlayerLeft(playerId);
    });

    this.socket.on('player:disconnected', (playerId) => {
      this.callbacks.onPlayerDisconnected(playerId);
    });

    // Rematch events
    this.socket.on('match:rematch_requested', (playerName) => {
      this.callbacks.onRematchRequested(playerName);
    });

    this.socket.on('match:rematch_accepted', () => {
      this.callbacks.onRematchAccepted();
    });

    this.socket.on('match:rematch_declined', () => {
      this.callbacks.onRematchDeclined();
    });
  }

  // ==========================================================================
  // Public API Methods
  // ==========================================================================

  /**
   * Join the game with a player name.
   * 
   * @param playerName - Display name for the player
   */
  joinGame(playerName: string): void {
    this.socket.emit('player:join', playerName);
  }

  /**
   * Start a game against CPU opponent.
   * 
   * @param cpuOpponent - CPU opponent type
   * @param format - Match format
   * @param difficulty - Difficulty level
   */
  startCPUGame(cpuOpponent: string, format: MatchFormat, difficulty: Difficulty): void {
    this.socket.emit('cpu:start', cpuOpponent, format, difficulty);
  }

  /**
   * Join random matchmaking queue.
   * 
   * @param format - Desired match format
   * @param difficulty - Desired difficulty level
   */
  joinMatchmaking(format: MatchFormat, difficulty: Difficulty): void {
    this.socket.emit('matchmaking:join', format, difficulty);
  }

  /**
   * Leave matchmaking queue.
   */
  leaveMatchmaking(): void {
    this.socket.emit('matchmaking:leave');
  }

  /**
   * Create a private room.
   * 
   * @param format - Match format
   * @param difficulty - Difficulty level
   */
  createRoom(format: MatchFormat, difficulty: Difficulty): void {
    this.socket.emit('room:create', format, difficulty);
  }

  /**
   * Join a private room using a code.
   * 
   * @param roomCode - 6-character room code
   */
  joinRoom(roomCode: RoomCode): void {
    this.socket.emit('room:join', roomCode.toUpperCase());
  }

  /**
   * Leave current room.
   */
  leaveRoom(): void {
    this.socket.emit('room:leave');
  }

  /**
   * Make a choice in the current round.
   * 
   * @param choice - Rock, paper, or scissors
   */
  makeChoice(choice: GameChoice): void {
    this.socket.emit('round:choice', choice);
  }

  /**
   * Request a rematch with the same opponent.
   */
  requestRematch(): void {
    this.socket.emit('match:rematch');
  }

  /**
   * Respond to a rematch request.
   * 
   * @param accepted - Whether the rematch was accepted
   */
  respondToRematch(accepted: boolean): void {
    this.socket.emit('match:rematch_response', accepted);
  }

  /**
   * Start a new match (leave current room).
   */
  startNewMatch(): void {
    this.socket.emit('match:new');
  }

  /**
   * Get the current player.
   * 
   * @returns Current player or null if not registered
   */
  getCurrentPlayer(): Player | null {
    return this.currentPlayer;
  }

  /**
   * Check if connected to server.
   * 
   * @returns true if connected
   */
  isConnected(): boolean {
    return this.socket.connected;
  }

  /**
   * Disconnect from server.
   */
  disconnect(): void {
    this.socket.disconnect();
  }
}
