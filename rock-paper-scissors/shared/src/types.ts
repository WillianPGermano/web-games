/**
 * Shared Type Definitions
 * 
 * This file contains all type definitions shared between the client and server.
 * By centralizing types, we ensure type safety across the entire application
 * and prevent drift between frontend and backend expectations.
 */

// ============================================================================
// Game Core Types
// ============================================================================

/**
 * The three possible choices in Rock-Paper-Scissors.
 * These are the fundamental game actions.
 */
export type GameChoice = 'rock' | 'paper' | 'scissors';

/**
 * Match format determines how many rounds are needed to win.
 * - single: One round decides the winner
 * - best_of_3: First to win 2 rounds wins the match
 * - best_of_5: First to win 3 rounds wins the match
 */
export type MatchFormat = 'single' | 'best_of_3' | 'best_of_5';

/**
 * Difficulty level controls the time limit per round.
 * This creates different cognitive pressure levels:
 * - easy: 10 seconds (thoughtful decision-making)
 * - medium: 5 seconds (quick thinking required)
 * - hard: 3 seconds (pure instinct and reaction)
 */
export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * Maps difficulty levels to their corresponding time limits in seconds.
 * Used by both client (for timer display) and server (for timeout enforcement).
 */
export const DIFFICULTY_TIME_LIMITS: Record<Difficulty, number> = {
  easy: 10,
  medium: 5,
  hard: 3,
};

// ============================================================================
// Player and Room Types
// ============================================================================

/**
 * Represents a connected player in the game.
 * Players are identified by a unique ID and have a display name.
 */
export interface Player {
  id: string;           // Unique identifier (UUID)
  name: string;         // Display name chosen by player
  socketId: string;     // Socket.io connection ID for real-time communication
}

/**
 * Room code format: 6 uppercase alphanumeric characters.
 * Example: "ABC123", "XYZ789"
 * Used for private room matchmaking.
 */
export type RoomCode = string;

// ============================================================================
// Game State Types
// ============================================================================

/**
 * Represents the current state of a game room.
 * The game progresses through these states in order.
 */
export type GameState = 
  | 'waiting'      // Waiting for second player to join
  | 'ready'        // Both players connected, about to start
  | 'playing'      // Round in progress, players making choices
  | 'round_end'    // Round completed, showing results
  | 'match_end';   // All rounds completed, match finished

/**
 * Complete game room data structure.
 * Tracks all information needed to manage a multiplayer match.
 */
export interface GameRoom {
  id: string;                    // Unique room identifier
  roomCode: RoomCode | null;     // Private room code, or null for random matchmaking
  format: MatchFormat;           // How many rounds to play
  difficulty: Difficulty;        // Time limit per round
  state: GameState;              // Current game state
  players: [Player, Player?];    // Array of 1-2 players
  currentRound: number;          // Current round number (1-indexed)
  scores: {                      // Running score
    [playerId: string]: number;  // Maps player ID to rounds won
  };
  roundChoices: {                // Choices for current round
    [playerId: string]: GameChoice | null;
  };
  roundStartTime: number | null; // Timestamp when current round started
  matchId: string | null;        // Database match ID once persisted
}

/**
 * Result of a single round.
 * Contains all information about what happened in the round.
 */
export interface RoundResult {
  roundNumber: number;
  player1Choice: GameChoice | null;  // null if timeout
  player2Choice: GameChoice | null;  // null if timeout
  winnerId: string | null;           // null if tie
  player1Timeout: boolean;
  player2Timeout: boolean;
  reason: 'normal' | 'timeout' | 'tie';
}

/**
 * Final match result after all rounds completed.
 */
export interface MatchResult {
  matchId: string;
  winnerId: string | null;
  finalScores: {
    [playerId: string]: number;
  };
  rounds: RoundResult[];
}

// ============================================================================
// Socket.io Event Types
// ============================================================================

/**
 * Events sent FROM client TO server.
 * These represent player actions and requests.
 */
export interface ClientToServerEvents {
  // Connection and matchmaking
  'player:join': (playerName: string) => void;
  'matchmaking:join': (format: MatchFormat, difficulty: Difficulty) => void;
  'matchmaking:leave': () => void;
  'room:create': (format: MatchFormat, difficulty: Difficulty) => void;
  'room:join': (roomCode: RoomCode) => void;
  'room:leave': () => void;
  
  // CPU game
  'cpu:start': (cpuOpponent: CPUOpponent, format: MatchFormat, difficulty: Difficulty) => void;
  
  // Gameplay
  'round:choice': (choice: GameChoice) => void;
  'match:rematch': () => void;
  'match:rematch_response': (accepted: boolean) => void;
  'match:new': () => void;
}

/**
 * Events sent FROM server TO client.
 * These represent game state updates and notifications.
 */
export interface ServerToClientEvents {
  // Connection responses
  'player:registered': (player: Player) => void;
  'error': (message: string) => void;
  
  // Matchmaking updates
  'matchmaking:waiting': () => void;
  'room:created': (roomCode: RoomCode) => void;
  'room:joined': (room: Omit<GameRoom, 'roundChoices'>) => void;
  
  // Game state updates
  'game:start': () => void;
  'round:start': (roundNumber: number, timeLimit: number) => void;
  'round:choice_received': () => void;  // Confirmation that choice was recorded
  'round:end': (result: RoundResult, scores: { [playerId: string]: number }) => void;
  'match:end': (result: MatchResult) => void;
  
  // Rematch events
  'match:rematch_requested': (playerName: string) => void;
  'match:rematch_accepted': () => void;
  'match:rematch_declined': () => void;
  
  // Player events
  'player:joined': (player: Player) => void;
  'player:left': (playerId: string) => void;
  'player:disconnected': (playerId: string) => void;
}

// ============================================================================
// Database Types
// ============================================================================

/**
 * Database record for a player.
 * Stored in the 'players' table.
 */
export interface DBPlayer {
  id: string;
  name: string;
  created_at: number;  // Unix timestamp
}

/**
 * Database record for a complete match.
 * Stored in the 'matches' table.
 */
export interface DBMatch {
  id: string;
  room_code: string | null;
  player1_id: string;
  player2_id: string;
  match_format: MatchFormat;
  difficulty: Difficulty;
  winner_id: string | null;
  player1_wins: number;
  player2_wins: number;
  started_at: number;
  completed_at: number;
}

/**
 * Database record for a single round within a match.
 * Stored in the 'rounds' table.
 */
export interface DBRound {
  id: string;
  match_id: string;
  round_number: number;
  player1_choice: GameChoice | null;
  player2_choice: GameChoice | null;
  winner_id: string | null;
  player1_timeout: boolean;
  player2_timeout: boolean;
  played_at: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Configuration for creating a new game room.
 */
export interface RoomConfig {
  format: MatchFormat;
  difficulty: Difficulty;
  isPrivate: boolean;
}

/**
 * Statistics for a player (for future leaderboard features).
 */
export interface PlayerStats {
  totalMatches: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  byDifficulty: {
    [key in Difficulty]: {
      matches: number;
      wins: number;
    };
  };
}

// ============================================================================
// CPU Opponent Types
// ============================================================================

/**
 * CPU opponent personality and skill level.
 */
export type CPUOpponent = 
  | 'rookie'      // 😊 Easy - Random choices
  | 'thinker'     // 🤔 Medium - Slight pattern recognition
  | 'champion'    // 😎 Hard - Strong pattern recognition
  | 'psychic';    // 🔮 Expert - Advanced prediction

/**
 * CPU opponent configuration.
 */
export interface CPUConfig {
  id: CPUOpponent;
  name: string;
  emoji: string;
  description: string;
  winRate: number; // Target win rate (0-1)
}

/**
 * Available CPU opponents with their characteristics.
 */
export const CPU_OPPONENTS: Record<CPUOpponent, CPUConfig> = {
  rookie: {
    id: 'rookie',
    name: 'Rookie Randy',
    emoji: '😊',
    description: 'Just learning the ropes',
    winRate: 0.3,
  },
  thinker: {
    id: 'thinker',
    name: 'Thinker Tom',
    emoji: '🤔',
    description: 'Thinks before choosing',
    winRate: 0.5,
  },
  champion: {
    id: 'champion',
    name: 'Champion Charlie',
    emoji: '😎',
    description: 'Reads your patterns',
    winRate: 0.7,
  },
  psychic: {
    id: 'psychic',
    name: 'Psychic Penny',
    emoji: '🔮',
    description: 'Predicts your moves',
    winRate: 0.85,
  },
};
