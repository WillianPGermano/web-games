# Rock-Paper-Scissors Multiplayer Game - Project Plan

## Project Overview

A real-time, 2-player Rock-Paper-Scissors web game built as a learning foundation for educational multiplayer games. This project emphasizes clear documentation and literate programming to help understand modern web game architecture.

## Learning Objectives

1. Understand real-time bidirectional communication (WebSockets)
2. Learn client-server game state synchronization
3. Grasp TypeScript full-stack development patterns
4. Explore game room/matchmaking concepts
5. Understand database design for multiplayer games
6. Learn deployment strategies for real-time applications

## Technology Stack

### Backend
- **Node.js + TypeScript**: Runtime and language
- **Express.js**: HTTP server and REST API
- **Socket.io**: WebSocket library for real-time communication
- **SQLite + better-sqlite3**: Lightweight database for player/match storage
- **Zod**: Runtime type validation for API inputs

### Frontend
- **Vite**: Modern build tool and dev server
- **TypeScript**: Type-safe client code
- **Socket.io-client**: WebSocket client library
- **Vanilla CSS**: Simple styling (no framework overhead for learning)

### Development Tools
- **tsx**: TypeScript execution for development
- **ESLint + Prettier**: Code quality and formatting
- **Concurrently**: Run frontend and backend simultaneously

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Client (Browser)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   UI Layer   │  │  Game Logic  │  │ Socket.io    │  │
│  │  (HTML/CSS)  │◄─┤  (TypeScript)│◄─┤  Client      │  │
│  └──────────────┘  └──────────────┘  └──────┬───────┘  │
└────────────────────────────────────────────────┼─────────┘
                                                 │ WebSocket
                                                 │
┌────────────────────────────────────────────────┼─────────┐
│                     Server (Node.js)           │         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────▼──────┐  │
│  │   Database   │◄─┤ Game Server  │◄─┤  Socket.io    │  │
│  │   (SQLite)   │  │  (TypeScript)│  │   Server      │  │
│  └──────────────┘  └──────┬───────┘  └───────────────┘  │
│                           │                              │
│                    ┌──────▼───────┐                      │
│                    │  REST API    │                      │
│                    │  (Express)   │                      │
│                    └──────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

## Game Flow

1. **Player Connection**
   - Player opens browser, enters name
   - Client connects to server via WebSocket
   - Server assigns unique player ID and generates shareable room code

2. **Matchmaking Options**
   - **Option A: Random Matchmaking**
     - Player selects match format (single round, best of 3, best of 5)
     - Player selects difficulty (time limit):
       - Easy: 10 seconds per round
       - Medium: 5 seconds per round
       - Hard: 3 seconds per round
     - Joins waiting pool for that format + difficulty combination
     - When 2 players with same settings available, server creates game room
   - **Option B: Private Room**
     - Player creates private room with chosen format and difficulty
     - Receives unique 6-character room code
     - Shares code with friend (copy to clipboard)
     - Friend enters code to join the same room (inherits format and difficulty)
   - Both players notified and moved to game screen

3. **Gameplay Loop**
   - Server starts round timer based on difficulty setting (10s/5s/3s)
   - Client displays countdown timer
   - Both players select rock/paper/scissors
   - Selections sent to server (hidden from opponent)
   - **Timeout Handling**: If a player doesn't choose within time limit, opponent wins that round automatically
   - When both submitted (or timeout occurs), server determines round winner
   - Round results broadcast to both players
   - **Match Continuation**:
     - Single round: Match ends, winner determined
     - Best of 3: First to 2 rounds wins
     - Best of 5: First to 3 rounds wins
   - Display running score between rounds
   - After final round, match saved to database

4. **Post-Game**
   - Display final results and match statistics
   - **Rematch Options**:
     - Play again with same opponent (keeps room code if private, same settings)
     - Return to lobby for new opponent
     - Change match format or difficulty

## Database Schema

```sql
-- Players table
CREATE TABLE players (
  id TEXT PRIMARY KEY,           -- UUID
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL    -- Unix timestamp
);

-- Matches table (represents a complete match/game)
CREATE TABLE matches (
  id TEXT PRIMARY KEY,           -- UUID
  room_code TEXT,                -- 6-char code for private rooms, NULL for random
  player1_id TEXT NOT NULL,
  player2_id TEXT NOT NULL,
  match_format TEXT NOT NULL,    -- 'single' | 'best_of_3' | 'best_of_5'
  difficulty TEXT NOT NULL,      -- 'easy' | 'medium' | 'hard' (10s/5s/3s)
  winner_id TEXT,                -- NULL for tie (shouldn't happen with odd rounds)
  player1_wins INTEGER NOT NULL, -- Number of rounds won by player 1
  player2_wins INTEGER NOT NULL, -- Number of rounds won by player 2
  started_at INTEGER NOT NULL,   -- Unix timestamp
  completed_at INTEGER NOT NULL, -- Unix timestamp
  FOREIGN KEY (player1_id) REFERENCES players(id),
  FOREIGN KEY (player2_id) REFERENCES players(id),
  FOREIGN KEY (winner_id) REFERENCES players(id)
);

-- Rounds table (individual rock-paper-scissors rounds within a match)
CREATE TABLE rounds (
  id TEXT PRIMARY KEY,           -- UUID
  match_id TEXT NOT NULL,
  round_number INTEGER NOT NULL, -- 1, 2, 3, etc.
  player1_choice TEXT,           -- 'rock' | 'paper' | 'scissors' | NULL (timeout)
  player2_choice TEXT,           -- 'rock' | 'paper' | 'scissors' | NULL (timeout)
  winner_id TEXT,                -- NULL for tie round
  player1_timeout BOOLEAN NOT NULL DEFAULT 0,
  player2_timeout BOOLEAN NOT NULL DEFAULT 0,
  played_at INTEGER NOT NULL,    -- Unix timestamp
  FOREIGN KEY (match_id) REFERENCES matches(id),
  FOREIGN KEY (winner_id) REFERENCES players(id)
);

-- Index for faster queries
CREATE INDEX idx_matches_room_code ON matches(room_code);
CREATE INDEX idx_rounds_match_id ON rounds(match_id);
```

## Project Structure

```
rock-paper-scissors/
├── docs/                          # Technical documentation
│   ├── 01-websockets-explained.md
│   ├── 02-game-state-sync.md
│   ├── 03-typescript-patterns.md
│   ├── 04-database-design.md
│   └── 05-deployment-guide.md
├── server/
│   ├── src/
│   │   ├── index.ts              # Server entry point
│   │   ├── database.ts           # Database setup and queries
│   │   ├── game-server.ts        # Socket.io game logic
│   │   ├── matchmaking.ts        # Player queue and room creation
│   │   ├── room-manager.ts       # Private room code generation and management
│   │   ├── round-timer.ts        # Timeout handling for rounds
│   │   ├── types.ts              # Shared type definitions
│   │   └── utils.ts              # Helper functions
│   ├── package.json
│   └── tsconfig.json
├── client/
│   ├── src/
│   │   ├── main.ts               # Client entry point
│   │   ├── game-client.ts        # Socket.io client logic
│   │   ├── ui.ts                 # DOM manipulation
│   │   ├── types.ts              # Client type definitions
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   └── tsconfig.json
├── shared/                        # Code shared between client/server
│   └── types.ts                  # Common interfaces and types
├── package.json                   # Root package for scripts
└── README.md
```

## Documentation to be Written

### 1. WebSockets Explained (`docs/01-websockets-explained.md`)
- What are WebSockets and why use them?
- Comparison: HTTP polling vs WebSockets vs Server-Sent Events
- Socket.io features: rooms, namespaces, acknowledgments
- Connection lifecycle and error handling
- Security considerations

### 2. Game State Synchronization (`docs/02-game-state-sync.md`)
- Client-server architecture patterns
- Authoritative server vs peer-to-peer
- State management strategies
- Handling latency and disconnections
- Message protocol design
- Timer synchronization between client and server
- Timeout handling and edge cases

### 3. TypeScript Patterns (`docs/03-typescript-patterns.md`)
- Type-safe event emitters with Socket.io
- Discriminated unions for game states
- Zod for runtime validation
- Sharing types between client and server
- Generic patterns for game logic

### 4. Database Design (`docs/04-database-design.md`)
- Why SQLite for this project?
- Schema design for multiplayer games
- Match vs Round data modeling
- Storing game settings (format, difficulty)
- Indexing strategies
- Query patterns for statistics and leaderboards
- Migration strategies

### 5. Deployment Guide (`docs/05-deployment-guide.md`)
- Local development setup
- Environment configuration
- Production build process
- Hosting options (Render, Railway, Fly.io)
- WebSocket considerations in production

## Code Documentation Standards

All code will follow literate programming principles:

1. **File-level documentation**: Purpose, responsibilities, dependencies
2. **Function documentation**: What it does, why it exists, parameters, return values
3. **Inline comments**: Explain "why" not "what" for complex logic
4. **Type annotations**: Explicit types even when inferable
5. **Example usage**: In comments for non-obvious functions

Example:
```typescript
/**
 * Determines the winner of a Rock-Paper-Scissors match.
 * 
 * This uses the classic game rules where:
 * - Rock beats Scissors
 * - Scissors beats Paper  
 * - Paper beats Rock
 * 
 * @param choice1 - First player's choice
 * @param choice2 - Second player's choice
 * @returns 'player1' | 'player2' | 'tie'
 * 
 * @example
 * determineWinner('rock', 'scissors') // returns 'player1'
 * determineWinner('paper', 'paper')   // returns 'tie'
 */
function determineWinner(
  choice1: GameChoice,
  choice2: GameChoice
): 'player1' | 'player2' | 'tie' {
  // Implementation...
}
```

## Implementation Phases

### Phase 1: Project Setup
- Initialize monorepo structure
- Configure TypeScript for client and server
- Set up build tools (Vite, tsx)
- Create shared types package

### Phase 2: Backend Foundation
- Express server setup
- SQLite database initialization
- Basic REST endpoints (health check, stats)
- Database query functions

### Phase 3: Real-Time Communication
- Socket.io server setup
- Connection handling
- Room management (random and private)
- Room code generation and validation
- Event protocol definition

### Phase 4: Game Logic
- Matchmaking queue (by format and difficulty)
- Match format selection (single, best of 3, best of 5)
- Difficulty selection (easy/medium/hard → 10s/5s/3s)
- Round timer and timeout handling (difficulty-based)
- Game state machine (multi-round support)
- Round and match winner determination
- Match and round persistence

### Phase 5: Frontend
- HTML structure and CSS styling
- Socket.io client connection
- UI state management
- Match format and difficulty selection screen
- Room code creation and joining UI
- Copy-to-clipboard functionality
- Round timer display (with visual urgency for hard mode)
- Score tracking display
- Rematch functionality
- Game flow implementation

### Phase 6: Documentation
- Write all technical documentation
- Add comprehensive code comments
- Create README with setup instructions
- Document API and event protocols

### Phase 7: Polish
- Error handling and edge cases
- Reconnection logic
- Loading states and feedback
- Basic statistics display

## Success Criteria

- [ ] Two players can connect via random matchmaking or private room code
- [ ] Players can select match format (single, best of 3, best of 5)
- [ ] Players can select difficulty (easy/medium/hard with 10s/5s/3s time limits)
- [ ] Matchmaking pairs players with same format and difficulty
- [ ] Private room codes can be generated and shared
- [ ] Round timer enforces difficulty-based time limits with automatic wins on timeout
- [ ] Timer displays correctly on client with visual feedback
- [ ] Multi-round matches track score correctly
- [ ] Matches and individual rounds stored in database with correct results including difficulty
- [ ] Players can rematch after a game ends
- [ ] All code has comprehensive documentation
- [ ] All 5 technical documentation files are complete
- [ ] Project can be run locally with simple `npm install && npm start`
- [ ] Code demonstrates best practices for real-time multiplayer games
- [ ] Clear separation between client, server, and shared code

## Future Enhancements (Out of Scope)

- User authentication
- Persistent player accounts across sessions
- Global leaderboards (filterable by difficulty)
- Spectator mode
- Chat functionality
- Mobile responsive design
- Animations and sound effects
- Custom time limits per match
- Tournament brackets
- Extreme difficulty (1 second)

## Future Game Mechanics Ideas

This section captures potential gameplay enhancements for future iterations. These are not planned for the initial release but represent interesting directions for making the game more educational and engaging.

### 1. Trickster Character / Chaos Mode

**Concept**: A mischievous character that randomly intervenes during rounds to add unpredictability and test player adaptability.

**Mechanics**:
- Random chance (e.g., 20-30%) for trickster to appear during a round
- Trickster blocks one choice (rock, paper, OR scissors) for both players
- Blocked choice is revealed 2-3 seconds before timer expires
- Players who already selected the blocked item must quickly change their choice
- Visual/audio cue alerts players to the intervention
- Adds cognitive load: players must react and adapt under time pressure

**Educational Value**:
- Tests adaptability and quick decision-making
- Introduces uncertainty and risk management
- Encourages players to delay commitment (strategic waiting)
- Creates memorable "chaos moments" that increase engagement

**Implementation Considerations**:
- Could be a game mode toggle (Classic vs Chaos Mode)
- Trickster appearance rate could scale with difficulty
- Database would need to track trickster interventions per round
- Client needs animation/visual feedback for blocked choices
- Server must handle choice invalidation and force re-selection

**Variations**:
- **Forced Choice**: Instead of blocking, trickster forces both players to use a specific choice
- **Swap**: Trickster swaps the meaning of choices (rock becomes paper, etc.)
- **Double or Nothing**: Trickster makes the round worth 2 points instead of 1
- **Time Manipulation**: Trickster adds or removes time from the clock

**Future Extensions**:
- Multiple trickster types with different abilities
- Players can earn "shields" to block trickster interventions
- Trickster becomes more aggressive in later rounds of a match
- Educational mode: trickster teaches probability and decision theory

## Estimated Timeline

- Phase 1-2: 1-2 hours (setup and backend)
- Phase 3-4: 3-4 hours (real-time, room codes, timers, and game logic)
- Phase 5: 3-4 hours (frontend with format selection, room codes, timers)
- Phase 6: 3-4 hours (documentation)
- Phase 7: 1-2 hours (polish)

**Total: 11-16 hours of focused development**

## Next Steps

1. Review and approve this plan
2. Begin Phase 1: Project setup
3. Implement incrementally, testing each phase
4. Write documentation alongside code (not after)
