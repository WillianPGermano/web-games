/**
 * Database Module
 * 
 * Handles all database operations for the Rock-Paper-Scissors game.
 * Uses sql.js (SQLite compiled to WebAssembly) for cross-platform compatibility.
 * 
 * Why sql.js?
 * - Zero native dependencies: No compilation needed
 * - Works on all platforms without build tools
 * - Full SQLite compatibility
 * - Perfect for small to medium applications
 * - ACID compliant: Reliable data integrity
 * 
 * Schema Design:
 * - players: Stores player information
 * - matches: Stores complete match results
 * - rounds: Stores individual round results within matches
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';
import type { 
  DBPlayer, 
  DBMatch, 
  DBRound, 
  MatchFormat, 
  Difficulty, 
  GameChoice 
} from '../../shared/src/types.js';

/**
 * Database instance.
 */
let db: SqlJsDatabase;

const DB_FILE = 'game.db';

/**
 * Initialize Database Schema
 * 
 * Creates all necessary tables if they don't exist.
 * This is idempotent - safe to run multiple times.
 */
export async function initializeDatabase(): Promise<void> {
  // Initialize sql.js
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (existsSync(DB_FILE)) {
    const buffer = readFileSync(DB_FILE);
    db = new SQL.Database(buffer);
    console.log('✓ Database loaded from file');
  } else {
    db = new SQL.Database();
    console.log('✓ New database created');
  }

  // Players table: Stores basic player information
  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  // Matches table: Stores complete match information
  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      room_code TEXT,
      player1_id TEXT NOT NULL,
      player2_id TEXT NOT NULL,
      match_format TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      winner_id TEXT,
      player1_wins INTEGER NOT NULL,
      player2_wins INTEGER NOT NULL,
      started_at INTEGER NOT NULL,
      completed_at INTEGER NOT NULL,
      FOREIGN KEY (player1_id) REFERENCES players(id),
      FOREIGN KEY (player2_id) REFERENCES players(id),
      FOREIGN KEY (winner_id) REFERENCES players(id)
    )
  `);

  // Rounds table: Stores individual round results
  db.run(`
    CREATE TABLE IF NOT EXISTS rounds (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      player1_choice TEXT,
      player2_choice TEXT,
      winner_id TEXT,
      player1_timeout INTEGER NOT NULL DEFAULT 0,
      player2_timeout INTEGER NOT NULL DEFAULT 0,
      played_at INTEGER NOT NULL,
      FOREIGN KEY (match_id) REFERENCES matches(id),
      FOREIGN KEY (winner_id) REFERENCES players(id)
    )
  `);

  // Create indexes for faster queries
  db.run(`CREATE INDEX IF NOT EXISTS idx_matches_room_code ON matches(room_code)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_rounds_match_id ON rounds(match_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_matches_players ON matches(player1_id, player2_id)`);

  // Save database to disk
  saveDatabase();

  console.log('✓ Database initialized');
}

/**
 * Save database to disk.
 * Called after any write operation.
 */
function saveDatabase(): void {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_FILE, buffer);
}

// ============================================================================
// Player Operations
// ============================================================================

/**
 * Create or update a player record.
 * 
 * Uses INSERT OR REPLACE to handle both new players and name updates.
 * This is useful when a player reconnects with a different name.
 * 
 * @param id - Unique player identifier
 * @param name - Player's display name
 * @returns The player record
 */
export function upsertPlayer(id: string, name: string): DBPlayer {
  db.run(
    'INSERT OR REPLACE INTO players (id, name, created_at) VALUES (?, ?, ?)',
    [id, name, Date.now()]
  );
  
  saveDatabase();

  return { id, name, created_at: Date.now() };
}

/**
 * Retrieve a player by ID.
 * 
 * @param id - Player identifier
 * @returns Player record or undefined if not found
 */
export function getPlayer(id: string): DBPlayer | undefined {
  const result = db.exec('SELECT * FROM players WHERE id = ?', [id]);
  
  if (result.length === 0 || result[0].values.length === 0) {
    return undefined;
  }

  const row = result[0].values[0];
  return {
    id: row[0] as string,
    name: row[1] as string,
    created_at: row[2] as number,
  };
}

// ============================================================================
// Match Operations
// ============================================================================

/**
 * Create a new match record.
 * 
 * This is called when a match begins. The match is created with initial
 * scores of 0-0 and will be updated when the match completes.
 * 
 * @param params - Match configuration
 * @returns The created match ID
 */
export function createMatch(params: {
  roomCode: string | null;
  player1Id: string;
  player2Id: string;
  format: MatchFormat;
  difficulty: Difficulty;
}): string {
  const matchId = randomUUID();
  const now = Date.now();

  db.run(
    `INSERT INTO matches (
      id, room_code, player1_id, player2_id, 
      match_format, difficulty, winner_id,
      player1_wins, player2_wins, started_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, 0, 0, ?, ?)`,
    [
      matchId,
      params.roomCode,
      params.player1Id,
      params.player2Id,
      params.format,
      params.difficulty,
      now,
      now
    ]
  );

  saveDatabase();

  return matchId;
}

/**
 * Update match with final results.
 * 
 * Called when a match completes. Updates the winner and final scores.
 * 
 * @param matchId - Match identifier
 * @param winnerId - ID of winning player (or null for tie)
 * @param player1Wins - Number of rounds won by player 1
 * @param player2Wins - Number of rounds won by player 2
 */
export function updateMatchResult(
  matchId: string,
  winnerId: string | null,
  player1Wins: number,
  player2Wins: number
): void {
  db.run(
    `UPDATE matches
     SET winner_id = ?, player1_wins = ?, player2_wins = ?, completed_at = ?
     WHERE id = ?`,
    [winnerId, player1Wins, player2Wins, Date.now(), matchId]
  );

  saveDatabase();
}

/**
 * Get a match by ID.
 * 
 * @param matchId - Match identifier
 * @returns Match record or undefined if not found
 */
export function getMatch(matchId: string): DBMatch | undefined {
  const result = db.exec('SELECT * FROM matches WHERE id = ?', [matchId]);
  
  if (result.length === 0 || result[0].values.length === 0) {
    return undefined;
  }

  const row = result[0].values[0];
  return {
    id: row[0] as string,
    room_code: row[1] as string | null,
    player1_id: row[2] as string,
    player2_id: row[3] as string,
    match_format: row[4] as MatchFormat,
    difficulty: row[5] as Difficulty,
    winner_id: row[6] as string | null,
    player1_wins: row[7] as number,
    player2_wins: row[8] as number,
    started_at: row[9] as number,
    completed_at: row[10] as number,
  };
}

// ============================================================================
// Round Operations
// ============================================================================

/**
 * Create a round record.
 * 
 * Stores the result of a single round within a match.
 * 
 * @param params - Round data
 * @returns The created round ID
 */
export function createRound(params: {
  matchId: string;
  roundNumber: number;
  player1Choice: GameChoice | null;
  player2Choice: GameChoice | null;
  winnerId: string | null;
  player1Timeout: boolean;
  player2Timeout: boolean;
}): string {
  const roundId = randomUUID();

  db.run(
    `INSERT INTO rounds (
      id, match_id, round_number,
      player1_choice, player2_choice, winner_id,
      player1_timeout, player2_timeout, played_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      roundId,
      params.matchId,
      params.roundNumber,
      params.player1Choice,
      params.player2Choice,
      params.winnerId,
      params.player1Timeout ? 1 : 0,
      params.player2Timeout ? 1 : 0,
      Date.now()
    ]
  );

  saveDatabase();

  return roundId;
}

/**
 * Get all rounds for a match.
 * 
 * Returns rounds in chronological order (by round_number).
 * 
 * @param matchId - Match identifier
 * @returns Array of round records
 */
export function getMatchRounds(matchId: string): DBRound[] {
  const result = db.exec(
    'SELECT * FROM rounds WHERE match_id = ? ORDER BY round_number ASC',
    [matchId]
  );

  if (result.length === 0) {
    return [];
  }

  return result[0].values.map(row => ({
    id: row[0] as string,
    match_id: row[1] as string,
    round_number: row[2] as number,
    player1_choice: row[3] as GameChoice | null,
    player2_choice: row[4] as GameChoice | null,
    winner_id: row[5] as string | null,
    player1_timeout: Boolean(row[6]),
    player2_timeout: Boolean(row[7]),
    played_at: row[8] as number,
  }));
}

// ============================================================================
// Statistics and Queries
// ============================================================================

/**
 * Get player statistics.
 * 
 * Calculates win/loss record and other stats for a player.
 * Useful for leaderboards and player profiles.
 * 
 * @param playerId - Player identifier
 * @returns Statistics object
 */
export function getPlayerStats(playerId: string) {
  const result = db.exec(
    `SELECT 
      COUNT(*) as total_matches,
      SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN winner_id IS NOT NULL AND winner_id != ? THEN 1 ELSE 0 END) as losses,
      SUM(CASE WHEN winner_id IS NULL THEN 1 ELSE 0 END) as ties
    FROM matches
    WHERE player1_id = ? OR player2_id = ?`,
    [playerId, playerId, playerId, playerId]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    return { total_matches: 0, wins: 0, losses: 0, ties: 0 };
  }

  const row = result[0].values[0];
  return {
    total_matches: row[0] as number,
    wins: row[1] as number,
    losses: row[2] as number,
    ties: row[3] as number,
  };
}

/**
 * Get recent matches for a player.
 * 
 * Returns the most recent matches, useful for match history display.
 * 
 * @param playerId - Player identifier
 * @param limit - Maximum number of matches to return
 * @returns Array of match records
 */
export function getRecentMatches(playerId: string, limit: number = 10): DBMatch[] {
  const result = db.exec(
    `SELECT * FROM matches
     WHERE player1_id = ? OR player2_id = ?
     ORDER BY completed_at DESC
     LIMIT ?`,
    [playerId, playerId, limit]
  );

  if (result.length === 0) {
    return [];
  }

  return result[0].values.map(row => ({
    id: row[0] as string,
    room_code: row[1] as string | null,
    player1_id: row[2] as string,
    player2_id: row[3] as string,
    match_format: row[4] as MatchFormat,
    difficulty: row[5] as Difficulty,
    winner_id: row[6] as string | null,
    player1_wins: row[7] as number,
    player2_wins: row[8] as number,
    started_at: row[9] as number,
    completed_at: row[10] as number,
  }));
}

/**
 * Close the database connection.
 * 
 * Should be called when the server shuts down gracefully.
 */
export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    console.log('✓ Database connection closed');
  }
}
