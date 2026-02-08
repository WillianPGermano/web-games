/**
 * Server Entry Point
 * 
 * Initializes and starts the Express + Socket.io server.
 * 
 * Architecture:
 * - Express handles HTTP requests (health checks, static files in production)
 * - Socket.io handles WebSocket connections for real-time gameplay
 * - Database is initialized on startup
 * - Graceful shutdown handling for cleanup
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/src/types.js';
import { initializeDatabase, closeDatabase } from './database.js';
import { initializeGameServer } from './game-server.js';

// ============================================================================
// Configuration
// ============================================================================

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ============================================================================
// Express Setup
// ============================================================================

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API endpoint for server info
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Rock-Paper-Scissors Multiplayer Server',
    version: '1.0.0',
    features: {
      matchFormats: ['single', 'best_of_3', 'best_of_5'],
      difficulties: ['easy', 'medium', 'hard'],
      timeLimits: {
        easy: 10,
        medium: 5,
        hard: 3,
      },
    },
  });
});

// ============================================================================
// Socket.io Setup
// ============================================================================

const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
  // Connection settings
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ============================================================================
// Initialize Services
// ============================================================================

console.log('🎮 Starting Rock-Paper-Scissors Server...\n');

// Initialize database (async)
await initializeDatabase();

// Initialize game server
initializeGameServer(io);

// ============================================================================
// Start Server
// ============================================================================

httpServer.listen(PORT, () => {
  console.log(`\n✓ Server running on port ${PORT}`);
  console.log(`✓ Client URL: ${CLIENT_URL}`);
  console.log(`\n🎮 Ready for players!\n`);
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

/**
 * Handle graceful shutdown on SIGINT (Ctrl+C) or SIGTERM.
 * Ensures database connections are closed properly.
 */
function gracefulShutdown(signal: string): void {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  
  // Close Socket.io connections
  io.close(() => {
    console.log('✓ Socket.io connections closed');
  });

  // Close HTTP server
  httpServer.close(() => {
    console.log('✓ HTTP server closed');
    
    // Close database
    closeDatabase();
    
    console.log('✓ Shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('⚠ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});
