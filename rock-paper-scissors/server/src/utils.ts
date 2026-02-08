/**
 * Utility Functions
 * 
 * Helper functions used throughout the server application.
 * These are pure functions with no side effects.
 */

import type { GameChoice, MatchFormat, Difficulty } from '../../shared/src/types.js';

/**
 * Determine the winner of a Rock-Paper-Scissors round.
 * 
 * Implements the classic game rules:
 * - Rock beats Scissors
 * - Scissors beats Paper
 * - Paper beats Rock
 * - Same choice = Tie
 * 
 * @param choice1 - First player's choice
 * @param choice2 - Second player's choice
 * @returns 'player1' if first player wins, 'player2' if second player wins, 'tie' if same choice
 * 
 * @example
 * determineWinner('rock', 'scissors') // returns 'player1'
 * determineWinner('paper', 'rock')    // returns 'player1'
 * determineWinner('rock', 'rock')     // returns 'tie'
 */
export function determineWinner(
  choice1: GameChoice,
  choice2: GameChoice
): 'player1' | 'player2' | 'tie' {
  // Same choice is always a tie
  if (choice1 === choice2) {
    return 'tie';
  }

  // Check all winning combinations for player 1
  const player1Wins = 
    (choice1 === 'rock' && choice2 === 'scissors') ||
    (choice1 === 'scissors' && choice2 === 'paper') ||
    (choice1 === 'paper' && choice2 === 'rock');

  return player1Wins ? 'player1' : 'player2';
}

/**
 * Generate a random room code.
 * 
 * Creates a 6-character alphanumeric code for private rooms.
 * Uses uppercase letters and numbers for easy reading and sharing.
 * 
 * Format: XXXXXX (e.g., "A3B7K9", "XYZ123")
 * 
 * Character set excludes ambiguous characters (0/O, 1/I/L) for clarity.
 * 
 * @returns A 6-character room code
 * 
 * @example
 * generateRoomCode() // returns "A3B7K9"
 * generateRoomCode() // returns "XYZ123"
 */
export function generateRoomCode(): string {
  // Exclude ambiguous characters: 0, O, 1, I, L
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }
  
  return code;
}

/**
 * Calculate how many rounds are needed to win a match.
 * 
 * For best-of-N formats, you need to win more than half the rounds.
 * 
 * @param format - The match format
 * @returns Number of rounds needed to win
 * 
 * @example
 * getRoundsToWin('single')     // returns 1
 * getRoundsToWin('best_of_3')  // returns 2
 * getRoundsToWin('best_of_5')  // returns 3
 */
export function getRoundsToWin(format: MatchFormat): number {
  switch (format) {
    case 'single':
      return 1;
    case 'best_of_3':
      return 2;
    case 'best_of_5':
      return 3;
  }
}

/**
 * Get the time limit in seconds for a difficulty level.
 * 
 * @param difficulty - The difficulty level
 * @returns Time limit in seconds
 * 
 * @example
 * getTimeLimit('easy')   // returns 10
 * getTimeLimit('medium') // returns 5
 * getTimeLimit('hard')   // returns 3
 */
export function getTimeLimit(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy':
      return 10;
    case 'medium':
      return 5;
    case 'hard':
      return 3;
  }
}

/**
 * Validate a room code format.
 * 
 * Checks if a room code matches the expected format:
 * - Exactly 6 characters
 * - Only uppercase letters and numbers
 * 
 * @param code - The room code to validate
 * @returns true if valid, false otherwise
 * 
 * @example
 * isValidRoomCode('ABC123') // returns true
 * isValidRoomCode('abc123') // returns false (lowercase)
 * isValidRoomCode('AB12')   // returns false (too short)
 */
export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}

/**
 * Create a matchmaking key for pairing players.
 * 
 * Players are matched based on their desired format and difficulty.
 * This creates a unique key for each combination.
 * 
 * @param format - Match format
 * @param difficulty - Difficulty level
 * @returns A unique key string
 * 
 * @example
 * getMatchmakingKey('best_of_3', 'medium') // returns "best_of_3:medium"
 */
export function getMatchmakingKey(format: MatchFormat, difficulty: Difficulty): string {
  return `${format}:${difficulty}`;
}

/**
 * Format a timestamp as a human-readable string.
 * 
 * Useful for logging and debugging.
 * 
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string
 * 
 * @example
 * formatTimestamp(1704067200000) // returns "2024-01-01 00:00:00"
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString().replace('T', ' ').substring(0, 19);
}
