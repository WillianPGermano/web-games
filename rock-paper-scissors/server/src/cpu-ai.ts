/**
 * CPU AI Module
 * 
 * Implements different AI personalities for CPU opponents.
 * Each CPU has different strategies and skill levels.
 * 
 * AI Strategies:
 * - Rookie: Random choices
 * - Thinker: Slight bias based on what beats player's last choice
 * - Champion: Pattern recognition - counters player's most common choice
 * - Psychic: Advanced prediction - analyzes sequences and adapts
 */

import type { GameChoice, CPUOpponent } from '../../shared/src/types.js';

/**
 * History of player choices for pattern recognition.
 */
interface PlayerHistory {
  choices: GameChoice[];
  lastChoice: GameChoice | null;
}

/**
 * CPU AI state for a game.
 */
const playerHistories = new Map<string, PlayerHistory>();

/**
 * Get what beats a given choice.
 * 
 * @param choice - The choice to counter
 * @returns The winning choice
 */
function getCounterChoice(choice: GameChoice): GameChoice {
  switch (choice) {
    case 'rock':
      return 'paper';
    case 'paper':
      return 'scissors';
    case 'scissors':
      return 'rock';
  }
}

/**
 * Get a random choice.
 * 
 * @returns Random game choice
 */
function getRandomChoice(): GameChoice {
  const choices: GameChoice[] = ['rock', 'paper', 'scissors'];
  return choices[Math.floor(Math.random() * choices.length)];
}

/**
 * Get the most common choice from history.
 * 
 * @param history - Player's choice history
 * @returns Most common choice or random if no history
 */
function getMostCommonChoice(history: GameChoice[]): GameChoice {
  if (history.length === 0) return getRandomChoice();

  const counts = {
    rock: 0,
    paper: 0,
    scissors: 0,
  };

  history.forEach(choice => {
    counts[choice]++;
  });

  const max = Math.max(counts.rock, counts.paper, counts.scissors);
  
  if (counts.rock === max) return 'rock';
  if (counts.paper === max) return 'paper';
  return 'scissors';
}

/**
 * Rookie AI: Completely random choices.
 * Win rate: ~33% (pure chance)
 * 
 * @returns Random choice
 */
function rookieAI(): GameChoice {
  return getRandomChoice();
}

/**
 * Thinker AI: Slight bias toward countering player's last choice.
 * Win rate: ~40-50%
 * 
 * @param playerId - Player identifier
 * @returns AI choice
 */
function thinkerAI(playerId: string): GameChoice {
  const history = playerHistories.get(playerId);
  
  // 60% chance to counter last choice, 40% random
  if (history?.lastChoice && Math.random() < 0.6) {
    return getCounterChoice(history.lastChoice);
  }
  
  return getRandomChoice();
}

/**
 * Champion AI: Counters player's most common choice.
 * Win rate: ~60-70%
 * 
 * @param playerId - Player identifier
 * @returns AI choice
 */
function championAI(playerId: string): GameChoice {
  const history = playerHistories.get(playerId);
  
  if (!history || history.choices.length < 2) {
    // Not enough data, use thinker strategy
    return thinkerAI(playerId);
  }

  // 75% chance to counter most common choice, 25% random
  if (Math.random() < 0.75) {
    const mostCommon = getMostCommonChoice(history.choices);
    return getCounterChoice(mostCommon);
  }
  
  return getRandomChoice();
}

/**
 * Psychic AI: Advanced pattern recognition and prediction.
 * Win rate: ~80-85%
 * 
 * Analyzes sequences and adapts to player's strategy.
 * 
 * @param playerId - Player identifier
 * @returns AI choice
 */
function psychicAI(playerId: string): GameChoice {
  const history = playerHistories.get(playerId);
  
  if (!history || history.choices.length < 3) {
    // Not enough data, use champion strategy
    return championAI(playerId);
  }

  // Look for patterns in last 3 choices
  const recent = history.choices.slice(-3);
  
  // Check if player is alternating
  if (recent.length === 3) {
    const isAlternating = recent[0] !== recent[1] && recent[1] !== recent[2];
    
    if (isAlternating) {
      // Predict next in alternation pattern
      const notUsed = (['rock', 'paper', 'scissors'] as GameChoice[])
        .filter(c => !recent.slice(-2).includes(c));
      
      if (notUsed.length === 1) {
        // 85% chance to counter predicted choice
        if (Math.random() < 0.85) {
          return getCounterChoice(notUsed[0]);
        }
      }
    }
  }

  // Check if player is repeating
  if (recent.length >= 2 && recent[recent.length - 1] === recent[recent.length - 2]) {
    // Player might repeat again, counter it
    if (Math.random() < 0.8) {
      return getCounterChoice(recent[recent.length - 1]);
    }
  }

  // Default to champion strategy
  return championAI(playerId);
}

/**
 * Get CPU choice based on opponent type.
 * 
 * @param cpuOpponent - CPU opponent type
 * @param playerId - Player identifier for history tracking
 * @returns CPU's choice
 */
export function getCPUChoice(cpuOpponent: CPUOpponent, playerId: string): GameChoice {
  switch (cpuOpponent) {
    case 'rookie':
      return rookieAI();
    case 'thinker':
      return thinkerAI(playerId);
    case 'champion':
      return championAI(playerId);
    case 'psychic':
      return psychicAI(playerId);
  }
}

/**
 * Record player's choice for pattern recognition.
 * 
 * @param playerId - Player identifier
 * @param choice - Player's choice
 */
export function recordPlayerChoice(playerId: string, choice: GameChoice): void {
  let history = playerHistories.get(playerId);
  
  if (!history) {
    history = {
      choices: [],
      lastChoice: null,
    };
    playerHistories.set(playerId, history);
  }

  history.choices.push(choice);
  history.lastChoice = choice;

  // Keep only last 10 choices to prevent memory bloat
  if (history.choices.length > 10) {
    history.choices.shift();
  }
}

/**
 * Clear player history (called when game ends).
 * 
 * @param playerId - Player identifier
 */
export function clearPlayerHistory(playerId: string): void {
  playerHistories.delete(playerId);
}

/**
 * Get CPU opponent display name.
 * 
 * @param cpuOpponent - CPU opponent type
 * @returns Display name with emoji
 */
export function getCPUName(cpuOpponent: CPUOpponent): string {
  switch (cpuOpponent) {
    case 'rookie':
      return '😊 Rookie Randy';
    case 'thinker':
      return '🤔 Thinker Tom';
    case 'champion':
      return '😎 Champion Charlie';
    case 'psychic':
      return '🔮 Psychic Penny';
  }
}
