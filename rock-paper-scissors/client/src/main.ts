/**
 * Main Entry Point
 * 
 * Initializes the application and connects UI to game client.
 * Sets up all event handlers and manages application state.
 * 
 * Architecture:
 * - UIController handles all DOM manipulation
 * - GameClient handles all server communication
 * - This file coordinates between them
 */

import { GameClient } from './game-client';
import { UIController } from './ui';
import type { GameChoice, MatchFormat, Difficulty } from '../../shared/src/types';

// ============================================================================
// Configuration
// ============================================================================

const SERVER_URL = (import.meta as any).env?.VITE_SERVER_URL || 'http://localhost:3001';

// ============================================================================
// Initialize Application
// ============================================================================

const ui = new UIController();
let gameClient: GameClient | null = null;

/**
 * Initialize the game client with callbacks.
 * Creates a new GameClient instance and connects to server.
 */
function initializeGameClient(): void {
  gameClient = new GameClient(SERVER_URL, {
    // Player registered successfully
    onPlayerRegistered: (player) => {
      console.log('Player registered:', player);
      ui.showPlayerInfo(player);
      ui.showScreen('lobby');
    },

    // Error occurred
    onError: (message) => {
      console.error('Error:', message);
      ui.showToast(message, 'error');
    },

    // Waiting for matchmaking
    onMatchmakingWaiting: () => {
      ui.showMatchmakingStatus('Searching for opponent...');
    },

    // Private room created
    onRoomCreated: (roomCode) => {
      console.log('Room created:', roomCode);
      ui.showRoomCode(roomCode);
      ui.showScreen('waiting');
    },

    // Joined a room
    onRoomJoined: (room) => {
      console.log('Room joined:', room);
      ui.hideMatchmakingStatus();
      
      // If room is full, go to game screen
      if (room.players.length === 2) {
        ui.setupGameScreen(room);
        ui.showScreen('game');
      } else {
        // Still waiting for opponent
        ui.showScreen('waiting');
      }
    },

    // Game starting
    onGameStart: () => {
      console.log('Game starting!');
      // Screen already set in onRoomJoined
    },

    // Round starting
    onRoundStart: (roundNumber, timeLimit) => {
      console.log(`Round ${roundNumber} starting with ${timeLimit}s limit`);
      ui.startRound(roundNumber, timeLimit);
    },

    // Choice received by server
    onRoundChoiceReceived: () => {
      console.log('Choice received, waiting for opponent...');
      ui.disableChoiceButtons();
    },

    // Round ended
    onRoundEnd: (result, scores) => {
      console.log('Round ended:', result);
      ui.updateScores(scores);
      ui.showRoundResult(result);
    },

    // Match ended
    onMatchEnd: (result) => {
      console.log('Match ended:', result);
      ui.showMatchResult(result);
    },

    // Player joined room
    onPlayerJoined: (player) => {
      console.log('Player joined:', player);
      ui.showToast(`${player.name} joined the room`, 'success');
    },

    // Player left room
    onPlayerLeft: (playerId) => {
      console.log('Player left:', playerId);
      ui.showToast('Opponent left the game', 'error');
      
      // Return to lobby after a delay
      setTimeout(() => {
        ui.showScreen('lobby');
      }, 2000);
    },

    // Player disconnected
    onPlayerDisconnected: (playerId) => {
      console.log('Player disconnected:', playerId);
      ui.showToast('Opponent disconnected', 'error');
      
      // Return to lobby after a delay
      setTimeout(() => {
        ui.showScreen('lobby');
      }, 2000);
    },

    // Rematch requested
    onRematchRequested: (playerName) => {
      console.log('Rematch requested by:', playerName);
      ui.showRematchRequest(playerName);
    },

    // Rematch accepted
    onRematchAccepted: () => {
      console.log('Rematch accepted!');
      ui.hideRematchModal();
      ui.resetRematchButton();
      // Game will restart automatically via game:start event
    },

    // Rematch declined
    onRematchDeclined: () => {
      console.log('Rematch declined');
      ui.showRematchDeclined();
    },
  });
}

// ============================================================================
// Welcome Screen Event Handlers
// ============================================================================

/**
 * Handle join game button click.
 * Validates player name and joins the game.
 */
function handleJoinGame(): void {
  const playerName = ui.getPlayerName();
  
  if (!playerName) {
    ui.showToast('Please enter your name', 'error');
    return;
  }

  if (playerName.length < 2) {
    ui.showToast('Name must be at least 2 characters', 'error');
    return;
  }

  // Initialize game client and join
  initializeGameClient();
  gameClient?.joinGame(playerName);
}

// Set up welcome screen button
const joinBtn = document.getElementById('join-btn');
if (joinBtn) {
  joinBtn.addEventListener('click', handleJoinGame);
}

// Allow Enter key to join
const nameInput = document.getElementById('player-name-input');
if (nameInput) {
  nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleJoinGame();
    }
  });
}

// ============================================================================
// Lobby Screen Event Handlers
// ============================================================================

/**
 * Handle CPU opponent selection.
 */
function handleCPUSelection(button: HTMLElement): void {
  // Remove selected class from all CPU buttons
  document.querySelectorAll('.cpu-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  // Add selected class to clicked button
  button.classList.add('selected');
  
  // Auto-start game with selected CPU
  const cpuId = button.getAttribute('data-cpu');
  if (!cpuId) return;
  
  const format = ui.getCPUMatchFormat() as MatchFormat;
  const difficulty = ui.getCPUDifficulty() as Difficulty;
  
  gameClient?.startCPUGame(cpuId, format, difficulty);
}

// Set up CPU opponent buttons
const cpuButtons = document.querySelectorAll('.cpu-btn');
cpuButtons.forEach(button => {
  button.addEventListener('click', () => {
    handleCPUSelection(button as HTMLElement);
  });
});

/**
 * Handle random matchmaking button click.
 */
function handleRandomMatch(): void {
  const format = ui.getRandomMatchFormat() as MatchFormat;
  const difficulty = ui.getRandomDifficulty() as Difficulty;
  
  gameClient?.joinMatchmaking(format, difficulty);
}

/**
 * Handle cancel matchmaking button click.
 */
function handleCancelMatchmaking(): void {
  gameClient?.leaveMatchmaking();
  ui.hideMatchmakingStatus();
}

/**
 * Handle create private room button click.
 */
function handleCreateRoom(): void {
  const format = ui.getPrivateMatchFormat() as MatchFormat;
  const difficulty = ui.getPrivateDifficulty() as Difficulty;
  
  gameClient?.createRoom(format, difficulty);
}

/**
 * Handle join private room button click.
 */
function handleJoinRoom(): void {
  const roomCode = ui.getRoomCode();
  
  if (!roomCode) {
    ui.showToast('Please enter a room code', 'error');
    return;
  }

  if (roomCode.length !== 6) {
    ui.showToast('Room code must be 6 characters', 'error');
    return;
  }

  gameClient?.joinRoom(roomCode);
}

// Set up lobby screen buttons
const randomMatchBtn = document.getElementById('random-match-btn');
if (randomMatchBtn) {
  randomMatchBtn.addEventListener('click', handleRandomMatch);
}

const cancelMatchmakingBtn = document.getElementById('cancel-matchmaking-btn');
if (cancelMatchmakingBtn) {
  cancelMatchmakingBtn.addEventListener('click', handleCancelMatchmaking);
}

const createRoomBtn = document.getElementById('create-room-btn');
if (createRoomBtn) {
  createRoomBtn.addEventListener('click', handleCreateRoom);
}

const joinRoomBtn = document.getElementById('join-room-btn');
if (joinRoomBtn) {
  joinRoomBtn.addEventListener('click', handleJoinRoom);
}

// Allow Enter key to join room
const roomCodeInput = document.getElementById('room-code-input');
if (roomCodeInput) {
  roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleJoinRoom();
    }
  });
  
  // Auto-uppercase room code input
  roomCodeInput.addEventListener('input', (e) => {
    const input = e.target as HTMLInputElement;
    input.value = input.value.toUpperCase();
  });
}

// ============================================================================
// Waiting Screen Event Handlers
// ============================================================================

/**
 * Handle leave room button click.
 */
function handleLeaveRoom(): void {
  gameClient?.leaveRoom();
  ui.showScreen('lobby');
}

const leaveRoomBtn = document.getElementById('leave-room-btn');
if (leaveRoomBtn) {
  leaveRoomBtn.addEventListener('click', handleLeaveRoom);
}

// ============================================================================
// Game Screen Event Handlers
// ============================================================================

/**
 * Handle choice button click.
 * 
 * @param choice - Selected choice (rock, paper, or scissors)
 */
function handleChoice(choice: GameChoice): void {
  gameClient?.makeChoice(choice);
  ui.markChoiceSelected(choice);
  ui.disableChoiceButtons();
}

// Set up choice buttons
const choiceButtons = document.querySelectorAll('.choice-btn');
choiceButtons.forEach(button => {
  button.addEventListener('click', () => {
    const choice = button.getAttribute('data-choice') as GameChoice;
    if (choice) {
      handleChoice(choice);
    }
  });
});

/**
 * Handle rematch button click.
 */
function handleRematch(): void {
  gameClient?.requestRematch();
  ui.showRematchWaiting();
}

/**
 * Handle leave match button click.
 */
function handleLeaveMatch(): void {
  gameClient?.startNewMatch();
  ui.showScreen('lobby');
}

/**
 * Handle accept rematch button click.
 */
function handleAcceptRematch(): void {
  gameClient?.respondToRematch(true);
  ui.hideRematchModal();
}

/**
 * Handle decline rematch button click.
 */
function handleDeclineRematch(): void {
  gameClient?.respondToRematch(false);
  ui.hideRematchModal();
  ui.showScreen('lobby');
}

const rematchBtn = document.getElementById('rematch-btn');
if (rematchBtn) {
  rematchBtn.addEventListener('click', handleRematch);
}

const leaveMatchBtn = document.getElementById('leave-match-btn');
if (leaveMatchBtn) {
  leaveMatchBtn.addEventListener('click', handleLeaveMatch);
}

const acceptRematchBtn = document.getElementById('accept-rematch-btn');
if (acceptRematchBtn) {
  acceptRematchBtn.addEventListener('click', handleAcceptRematch);
}

const declineRematchBtn = document.getElementById('decline-rematch-btn');
if (declineRematchBtn) {
  declineRematchBtn.addEventListener('click', handleDeclineRematch);
}

// ============================================================================
// Application Lifecycle
// ============================================================================

/**
 * Clean up on page unload.
 */
window.addEventListener('beforeunload', () => {
  gameClient?.disconnect();
});

console.log('🎮 Rock-Paper-Scissors client initialized');
console.log(`📡 Server URL: ${SERVER_URL}`);
