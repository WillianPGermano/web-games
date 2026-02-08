/**
 * UI Controller
 * 
 * Manages all DOM manipulation and user interface updates.
 * Separates presentation logic from game logic.
 * 
 * Responsibilities:
 * - Show/hide screens
 * - Update game state displays
 * - Handle user input
 * - Manage timers and animations
 */

import type {
  Player,
  GameRoom,
  RoundResult,
  MatchResult,
  GameChoice,
} from '../../shared/src/types';

/**
 * Screen identifiers for navigation.
 */
type Screen = 'welcome' | 'lobby' | 'waiting' | 'game';

/**
 * UI Controller class.
 * Provides methods for updating the user interface.
 */
export class UIController {
  private currentScreen: Screen = 'welcome';
  private timerInterval: number | null = null;
  private currentPlayer: Player | null = null;
  private currentRoom: Omit<GameRoom, 'roundChoices'> | null = null;

  /**
   * Initialize the UI controller.
   * Sets up initial state.
   */
  constructor() {
    this.showScreen('welcome');
  }

  // ==========================================================================
  // Screen Management
  // ==========================================================================

  /**
   * Show a specific screen and hide others.
   * 
   * @param screen - Screen to display
   */
  showScreen(screen: Screen): void {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(el => {
      el.classList.remove('active');
    });

    // Show target screen
    const screenId = `${screen}-screen`;
    const screenEl = document.getElementById(screenId);
    if (screenEl) {
      screenEl.classList.add('active');
      this.currentScreen = screen;
    }
  }

  /**
   * Get the currently displayed screen.
   * 
   * @returns Current screen identifier
   */
  getCurrentScreen(): Screen {
    return this.currentScreen;
  }

  // ==========================================================================
  // Welcome Screen
  // ==========================================================================

  /**
   * Get the player name from the input field.
   * 
   * @returns Player name or empty string
   */
  getPlayerName(): string {
    const input = document.getElementById('player-name-input') as HTMLInputElement;
    return input?.value.trim() || '';
  }

  // ==========================================================================
  // Lobby Screen
  // ==========================================================================

  /**
   * Display player name in the lobby.
   * 
   * @param player - Current player
   */
  showPlayerInfo(player: Player): void {
    this.currentPlayer = player;
    const nameDisplay = document.getElementById('player-name-display');
    if (nameDisplay) {
      nameDisplay.textContent = player.name;
    }
  }

  /**
   * Get selected CPU opponent.
   * 
   * @returns CPU opponent ID or null if none selected
   */
  getSelectedCPU(): string | null {
    const selected = document.querySelector('.cpu-btn.selected');
    return selected?.getAttribute('data-cpu') || null;
  }

  /**
   * Get selected match format for CPU game.
   * 
   * @returns Match format
   */
  getCPUMatchFormat(): string {
    const select = document.getElementById('cpu-format') as HTMLSelectElement;
    return select?.value || 'best_of_3';
  }

  /**
   * Get selected difficulty for CPU game.
   * 
   * @returns Difficulty level
   */
  getCPUDifficulty(): string {
    const select = document.getElementById('cpu-difficulty') as HTMLSelectElement;
    return select?.value || 'medium';
  }

  /**
   * Get selected match format for random matchmaking.
   * 
   * @returns Match format
   */
  getRandomMatchFormat(): string {
    const select = document.getElementById('random-format') as HTMLSelectElement;
    return select?.value || 'best_of_3';
  }

  /**
   * Get selected difficulty for random matchmaking.
   * 
   * @returns Difficulty level
   */
  getRandomDifficulty(): string {
    const select = document.getElementById('random-difficulty') as HTMLSelectElement;
    return select?.value || 'medium';
  }

  /**
   * Get selected match format for private room.
   * 
   * @returns Match format
   */
  getPrivateMatchFormat(): string {
    const select = document.getElementById('private-format') as HTMLSelectElement;
    return select?.value || 'best_of_3';
  }

  /**
   * Get selected difficulty for private room.
   * 
   * @returns Difficulty level
   */
  getPrivateDifficulty(): string {
    const select = document.getElementById('private-difficulty') as HTMLSelectElement;
    return select?.value || 'medium';
  }

  /**
   * Get room code from input field.
   * 
   * @returns Room code
   */
  getRoomCode(): string {
    const input = document.getElementById('room-code-input') as HTMLInputElement;
    return input?.value.trim().toUpperCase() || '';
  }

  /**
   * Show matchmaking status message.
   * 
   * @param message - Status message to display
   */
  showMatchmakingStatus(message: string): void {
    const status = document.getElementById('matchmaking-status');
    if (status) {
      status.textContent = message;
    }

    // Show cancel button
    const findBtn = document.getElementById('random-match-btn');
    const cancelBtn = document.getElementById('cancel-matchmaking-btn');
    if (findBtn && cancelBtn) {
      findBtn.style.display = 'none';
      cancelBtn.style.display = 'block';
    }
  }

  /**
   * Hide matchmaking status and reset buttons.
   */
  hideMatchmakingStatus(): void {
    const status = document.getElementById('matchmaking-status');
    if (status) {
      status.textContent = '';
    }

    const findBtn = document.getElementById('random-match-btn');
    const cancelBtn = document.getElementById('cancel-matchmaking-btn');
    if (findBtn && cancelBtn) {
      findBtn.style.display = 'block';
      cancelBtn.style.display = 'none';
    }
  }

  // ==========================================================================
  // Waiting Screen
  // ==========================================================================

  /**
   * Display room code on waiting screen.
   * 
   * @param roomCode - 6-character room code
   */
  showRoomCode(roomCode: string): void {
    const display = document.getElementById('room-code-display');
    const copyBtn = document.getElementById('copy-code-btn');
    
    if (display) {
      display.textContent = roomCode;
    }
    
    if (copyBtn) {
      copyBtn.style.display = 'block';
      copyBtn.onclick = () => this.copyRoomCode(roomCode);
    }
  }

  /**
   * Copy room code to clipboard.
   * 
   * @param roomCode - Room code to copy
   */
  private copyRoomCode(roomCode: string): void {
    navigator.clipboard.writeText(roomCode).then(() => {
      this.showToast('Room code copied to clipboard!', 'success');
    }).catch(() => {
      this.showToast('Failed to copy room code', 'error');
    });
  }

  // ==========================================================================
  // Game Screen
  // ==========================================================================

  /**
   * Set up game screen with player names.
   * 
   * @param room - Current game room
   */
  setupGameScreen(room: Omit<GameRoom, 'roundChoices'>): void {
    this.currentRoom = room;
    const [player1, player2] = room.players;

    // Determine which player is which
    const isPlayer1 = this.currentPlayer?.id === player1?.id;
    const myPlayer = isPlayer1 ? player1 : player2;
    const opponentPlayer = isPlayer1 ? player2 : player1;

    // Set player names
    const player1Name = document.getElementById('player1-name');
    const player2Name = document.getElementById('player2-name');
    
    if (player1Name && myPlayer) {
      player1Name.textContent = myPlayer.name + ' (You)';
    }
    if (player2Name && opponentPlayer) {
      player2Name.textContent = opponentPlayer.name;
    }

    // Reset scores
    this.updateScores(room.scores);

    // Reset round result display
    this.resetRoundResult();

    // Hide match result
    this.hideMatchResult();
  }

  /**
   * Start a new round.
   * 
   * @param roundNumber - Current round number
   * @param timeLimit - Time limit in seconds
   */
  startRound(roundNumber: number, timeLimit: number): void {
    // Update round number
    const roundDisplay = document.getElementById('current-round');
    if (roundDisplay) {
      roundDisplay.textContent = roundNumber.toString();
    }

    // Enable choice buttons
    this.enableChoiceButtons();

    // Reset round result display
    this.resetRoundResult();

    // Start timer
    this.startTimer(timeLimit);
  }

  /**
   * Start countdown timer.
   * 
   * @param seconds - Initial time in seconds
   */
  private startTimer(seconds: number): void {
    this.stopTimer();

    let remaining = seconds;
    this.updateTimerDisplay(remaining);

    this.timerInterval = window.setInterval(() => {
      remaining--;
      this.updateTimerDisplay(remaining);

      if (remaining <= 0) {
        this.stopTimer();
      }
    }, 1000);
  }

  /**
   * Update timer display with visual warnings.
   * 
   * @param seconds - Remaining seconds
   */
  private updateTimerDisplay(seconds: number): void {
    const timer = document.getElementById('timer');
    if (!timer) return;

    timer.textContent = seconds.toString();

    // Remove previous classes
    timer.classList.remove('warning', 'danger');

    // Add warning classes based on time remaining
    if (seconds <= 2) {
      timer.classList.add('danger');
    } else if (seconds <= 4) {
      timer.classList.add('warning');
    }
  }

  /**
   * Stop the countdown timer.
   */
  private stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * Enable choice buttons for player input.
   */
  private enableChoiceButtons(): void {
    const buttons = document.querySelectorAll('.choice-btn');
    buttons.forEach(btn => {
      btn.classList.remove('selected');
      (btn as HTMLButtonElement).disabled = false;
    });
  }

  /**
   * Disable choice buttons after selection.
   */
  disableChoiceButtons(): void {
    const buttons = document.querySelectorAll('.choice-btn');
    buttons.forEach(btn => {
      (btn as HTMLButtonElement).disabled = true;
    });
  }

  /**
   * Mark a choice button as selected.
   * 
   * @param choice - Selected choice
   */
  markChoiceSelected(choice: GameChoice): void {
    const button = document.querySelector(`[data-choice="${choice}"]`);
    if (button) {
      button.classList.add('selected');
    }
  }

  /**
   * Update score displays.
   * 
   * @param scores - Score object mapping player IDs to scores
   */
  updateScores(scores: { [playerId: string]: number }): void {
    if (!this.currentRoom) return;

    const [player1, player2] = this.currentRoom.players;
    const isPlayer1 = this.currentPlayer?.id === player1?.id;
    
    const myScore = isPlayer1 ? scores[player1!.id] : scores[player2!.id];
    const opponentScore = isPlayer1 ? scores[player2!.id] : scores[player1!.id];

    const player1ScoreEl = document.getElementById('player1-score');
    const player2ScoreEl = document.getElementById('player2-score');

    if (player1ScoreEl) player1ScoreEl.textContent = myScore.toString();
    if (player2ScoreEl) player2ScoreEl.textContent = opponentScore.toString();
  }

  /**
   * Show round result.
   * 
   * @param result - Round result data
   */
  showRoundResult(result: RoundResult): void {
    this.stopTimer();
    this.disableChoiceButtons();

    const resultText = document.getElementById('round-result-text');
    
    if (!resultText || !this.currentRoom) return;

    const [player1, player2] = this.currentRoom.players;
    const isPlayer1 = this.currentPlayer?.id === player1?.id;

    // Determine result text
    let text = '';
    if (result.reason === 'tie') {
      text = 'Tie! Playing again...';
    } else if (result.winnerId === this.currentPlayer?.id) {
      text = '🎉 You Won This Round!';
    } else {
      text = '😔 You Lost This Round';
    }

    resultText.textContent = text;

    // Show choices
    this.displayChoices(
      isPlayer1 ? result.player1Choice : result.player2Choice,
      isPlayer1 ? result.player2Choice : result.player1Choice
    );
  }

  /**
   * Display player choices.
   * 
   * @param myChoice - Current player's choice
   * @param opponentChoice - Opponent's choice
   */
  private displayChoices(myChoice: GameChoice | null, opponentChoice: GameChoice | null): void {
    const choiceIcons: Record<GameChoice, string> = {
      rock: '✊',
      paper: '✋',
      scissors: '✌️',
    };

    const choiceLabels: Record<GameChoice, string> = {
      rock: 'Rock',
      paper: 'Paper',
      scissors: 'Scissors',
    };

    // Player 1 (current player)
    const p1Icon = document.getElementById('player1-choice-icon');
    const p1Label = document.getElementById('player1-choice-label');
    
    if (p1Icon && p1Label) {
      if (myChoice) {
        p1Icon.textContent = choiceIcons[myChoice];
        p1Label.textContent = choiceLabels[myChoice];
      } else {
        p1Icon.textContent = '⏱️';
        p1Label.textContent = 'Timeout';
      }
    }

    // Player 2 (opponent)
    const p2Icon = document.getElementById('player2-choice-icon');
    const p2Label = document.getElementById('player2-choice-label');
    
    if (p2Icon && p2Label) {
      if (opponentChoice) {
        p2Icon.textContent = choiceIcons[opponentChoice];
        p2Label.textContent = choiceLabels[opponentChoice];
      } else {
        p2Icon.textContent = '⏱️';
        p2Label.textContent = 'Timeout';
      }
    }
  }

  /**
   * Reset round result display to initial state.
   */
  private resetRoundResult(): void {
    const resultText = document.getElementById('round-result-text');
    const p1Icon = document.getElementById('player1-choice-icon');
    const p1Label = document.getElementById('player1-choice-label');
    const p2Icon = document.getElementById('player2-choice-icon');
    const p2Label = document.getElementById('player2-choice-label');

    if (resultText) resultText.textContent = 'Make your choice!';
    if (p1Icon) p1Icon.textContent = '?';
    if (p1Label) p1Label.textContent = 'Your choice';
    if (p2Icon) p2Icon.textContent = '?';
    if (p2Label) p2Label.textContent = 'Opponent';
  }

  /**
   * Hide round result display.
   */
  private hideRoundResult(): void {
    // No longer needed - round result is always visible
  }

  /**
   * Show match result.
   * 
   * @param result - Match result data
   */
  showMatchResult(result: MatchResult): void {
    this.stopTimer();

    const resultDiv = document.getElementById('match-result');
    const resultText = document.getElementById('match-result-text');
    const roundResultDiv = document.getElementById('round-result');
    
    if (!resultDiv || !resultText || !this.currentRoom) return;

    // Hide round result, show match result
    if (roundResultDiv) roundResultDiv.style.display = 'none';

    // Determine result text
    let text = '';
    if (result.winnerId === this.currentPlayer?.id) {
      text = '🎉 You Won!';
    } else {
      text = '😔 You Lost';
    }

    resultText.textContent = text;

    // Show final scores
    const [player1, player2] = this.currentRoom.players;
    const isPlayer1 = this.currentPlayer?.id === player1?.id;

    const finalP1Name = document.getElementById('final-player1-name');
    const finalP2Name = document.getElementById('final-player2-name');
    const finalP1Score = document.getElementById('final-player1-score');
    const finalP2Score = document.getElementById('final-player2-score');

    if (finalP1Name && finalP2Name && finalP1Score && finalP2Score) {
      const myPlayer = isPlayer1 ? player1 : player2;
      const opponentPlayer = isPlayer1 ? player2 : player1;

      finalP1Name.textContent = myPlayer!.name;
      finalP2Name.textContent = opponentPlayer!.name;
      finalP1Score.textContent = result.finalScores[myPlayer!.id].toString();
      finalP2Score.textContent = result.finalScores[opponentPlayer!.id].toString();
    }

    resultDiv.style.display = 'block';
  }

  /**
   * Hide match result display.
   */
  private hideMatchResult(): void {
    const resultDiv = document.getElementById('match-result');
    const roundResultDiv = document.getElementById('round-result');
    
    if (resultDiv) {
      resultDiv.style.display = 'none';
    }
    if (roundResultDiv) {
      roundResultDiv.style.display = 'block';
    }
  }

  // ==========================================================================
  // Toast Notifications
  // ==========================================================================

  /**
   * Show a toast notification.
   * 
   * @param message - Message to display
   * @param type - Toast type (success or error)
   */
  showToast(message: string, type: 'success' | 'error' = 'error'): void {
    const toast = document.getElementById('error-toast');
    if (!toast) return;

    toast.textContent = message;
    toast.style.background = type === 'success' ? 'var(--success)' : 'var(--danger)';
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  // ==========================================================================
  // Modal
  // ==========================================================================

  /**
   * Show rematch request modal.
   * 
   * @param playerName - Name of player requesting rematch
   */
  showRematchRequest(playerName: string): void {
    const modal = document.getElementById('rematch-modal');
    const message = document.getElementById('rematch-message');
    
    if (modal && message) {
      message.textContent = `${playerName} wants a rematch!`;
      modal.classList.add('show');
    }
  }

  /**
   * Hide rematch request modal.
   */
  hideRematchModal(): void {
    const modal = document.getElementById('rematch-modal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  /**
   * Show rematch declined message.
   */
  showRematchDeclined(): void {
    const modal = document.getElementById('rematch-modal');
    const message = document.getElementById('rematch-message');
    const acceptBtn = document.getElementById('accept-rematch-btn');
    const declineBtn = document.getElementById('decline-rematch-btn');
    
    if (modal && message && acceptBtn && declineBtn) {
      message.textContent = 'Your opponent declined the rematch';
      acceptBtn.style.display = 'none';
      declineBtn.textContent = 'Leave Room';
      declineBtn.onclick = () => {
        this.hideRematchModal();
        // Will be handled by main.ts to return to lobby
      };
      modal.classList.add('show');
    }
  }

  /**
   * Disable rematch button and show waiting state.
   */
  showRematchWaiting(): void {
    const rematchBtn = document.getElementById('rematch-btn');
    if (rematchBtn) {
      rematchBtn.textContent = 'Waiting for opponent...';
      (rematchBtn as HTMLButtonElement).disabled = true;
    }
  }

  /**
   * Reset rematch button to initial state.
   */
  resetRematchButton(): void {
    const rematchBtn = document.getElementById('rematch-btn');
    if (rematchBtn) {
      rematchBtn.textContent = 'Rematch';
      (rematchBtn as HTMLButtonElement).disabled = false;
    }
  }
}
