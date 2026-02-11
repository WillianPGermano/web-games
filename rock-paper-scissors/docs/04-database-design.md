# Database Design

This document explains the database architecture for the Rock-Paper-Scissors multiplayer game, including schema design, technology choices, and query patterns.

## Table of Contents

1. [Technology Choice: SQLite](#technology-choice-sqlite)
2. [Schema Design](#schema-design)
3. [Relationships](#relationships)
4. [Indexing Strategy](#indexing-strategy)
5. [Query Patterns](#query-patterns)
6. [Migration Strategy](#migration-strategy)

## Technology Choice: SQLite

### Why SQLite?

We chose SQLite (via sql.js) for this project because:

#### 1. Zero Configuration
```typescript
// No database server to install or configure
import initSqlJs from 'sql.js';

const SQL = await initSqlJs();
const db = new SQL.Database();
```

#### 2. File-Based Storage
- Single file (`game.db`) contains entire database
- Easy to backup, copy, or reset
- Perfect for development and small-scale deployment

#### 3. Cross-Platform Compatibility
- sql.js compiles SQLite to WebAssembly
- No native dependencies to compile
- Works on Windows, Mac, Linux without build tools
- Eliminates "works on my machine" problems

#### 4. ACID Compliance
- Atomic transactions
- Consistent data
- Isolated operations
- Durable writes

#### 5. Sufficient Performance
For this game's scale:
- Hundreds of matches per day: ✅
- Thousands of rounds per day: ✅
- Simple queries (no complex joins): ✅
- Read-heavy workload: ✅

### When to Migrate Away from SQLite

Consider PostgreSQL/MySQL when:
- **Concurrent writes** > 100/second
- **Database size** > 1GB
- **Multiple servers** need shared database
- **Complex queries** with many joins
- **Full-text search** requirements
- **Replication** needed for high availability

For this educational project, SQLite is perfect!

## Schema Design

### Overview

Three main tables with clear separation of concerns:

```
┌─────────┐
│ players │
└────┬────┘
     │
     │ (1:N)
     │
┌────▼────┐      ┌────────┐
│ matches │◄────►│ rounds │
└─────────┘ (1:N)└────────┘
```

### Players Table

Stores basic player information:

```sql
CREATE TABLE players (
  id TEXT PRIMARY KEY,           -- UUID
  name TEXT NOT NULL,            -- Display name
  created_at INTEGER NOT NULL    -- Unix timestamp
);
```

**Design Decisions:**

1. **UUID as Primary Key**
   - Globally unique across all instances
   - No auto-increment issues in distributed systems
   - Can be generated client-side if needed

2. **TEXT for ID**
   - SQLite doesn't have native UUID type
   - TEXT is efficient for UUIDs
   - Allows for readable IDs in queries

3. **No Authentication**
   - Educational project, no passwords
   - Players identified by session only
   - Could add `password_hash` column later

4. **Minimal Fields**
   - Only essential data stored
   - No email, avatar, etc. (could be added)
   - Keeps schema simple for learning

### Matches Table

Stores complete match information:

```sql
CREATE TABLE matches (
  id TEXT PRIMARY KEY,              -- UUID
  room_code TEXT,                   -- Private room code (nullable)
  player1_id TEXT NOT NULL,         -- First player
  player2_id TEXT NOT NULL,         -- Second player
  match_format TEXT NOT NULL,       -- 'single', 'best_of_3', 'best_of_5'
  difficulty TEXT NOT NULL,         -- 'easy', 'medium', 'hard'
  winner_id TEXT,                   -- Winner (nullable for ties)
  player1_wins INTEGER NOT NULL,    -- Rounds won by player 1
  player2_wins INTEGER NOT NULL,    -- Rounds won by player 2
  started_at INTEGER NOT NULL,      -- When match started
  completed_at INTEGER NOT NULL,    -- When match ended
  FOREIGN KEY (player1_id) REFERENCES players(id),
  FOREIGN KEY (player2_id) REFERENCES players(id),
  FOREIGN KEY (winner_id) REFERENCES players(id)
);
```

**Design Decisions:**

1. **Match vs Round Separation**
   - Match = complete game (1, 3, or 5 rounds)
   - Round = single rock-paper-scissors play
   - Allows querying match history without loading all rounds

2. **Denormalized Scores**
   - `player1_wins` and `player2_wins` stored in match
   - Could be calculated from rounds, but:
     - Faster queries (no aggregation needed)
     - Simpler code
     - Minimal storage cost

3. **Nullable Winner**
   - `winner_id` can be NULL for ties
   - Ties are rare but possible (both timeout)
   - Explicit NULL better than magic value

4. **Room Code Storage**
   - Stored for analytics (private vs matchmaking)
   - NULL for matchmaking games
   - Could be used for "rematch with same code"

5. **Timestamps as Integers**
   - Unix timestamps (milliseconds since epoch)
   - Easy to work with in JavaScript: `Date.now()`
   - Efficient storage and comparison

### Rounds Table

Stores individual round results:

```sql
CREATE TABLE rounds (
  id TEXT PRIMARY KEY,                  -- UUID
  match_id TEXT NOT NULL,               -- Parent match
  round_number INTEGER NOT NULL,        -- 1, 2, 3, etc.
  player1_choice TEXT,                  -- 'rock', 'paper', 'scissors', or NULL
  player2_choice TEXT,                  -- 'rock', 'paper', 'scissors', or NULL
  winner_id TEXT,                       -- Winner (nullable for ties)
  player1_timeout INTEGER NOT NULL DEFAULT 0,  -- 1 if timed out, 0 otherwise
  player2_timeout INTEGER NOT NULL DEFAULT 0,  -- 1 if timed out, 0 otherwise
  played_at INTEGER NOT NULL,           -- When round was played
  FOREIGN KEY (match_id) REFERENCES matches(id),
  FOREIGN KEY (winner_id) REFERENCES players(id)
);
```

**Design Decisions:**

1. **Nullable Choices**
   - NULL if player timed out
   - Distinguishes "no choice" from "rock"
   - Allows analyzing timeout patterns

2. **Timeout Flags**
   - Explicit boolean flags (0/1)
   - Could be inferred from NULL choices, but:
     - More explicit and readable
     - Allows for future "forfeit" vs "timeout"
     - Better for analytics

3. **Round Number**
   - 1-indexed (1, 2, 3, ...)
   - Matches user-facing display
   - Easy to query "first round" or "final round"

4. **Winner Storage**
   - Denormalized (could be calculated from choices)
   - Faster queries
   - Handles edge cases (both timeout = tie)

## Relationships

### One-to-Many: Players → Matches

A player can participate in many matches:

```sql
-- Get all matches for a player
SELECT * FROM matches
WHERE player1_id = ? OR player2_id = ?
ORDER BY completed_at DESC;
```

### One-to-Many: Matches → Rounds

A match contains multiple rounds:

```sql
-- Get all rounds for a match
SELECT * FROM rounds
WHERE match_id = ?
ORDER BY round_number ASC;
```

### Many-to-One: Matches → Players (Winner)

A match has one winner (or none):

```sql
-- Get all matches won by a player
SELECT * FROM matches
WHERE winner_id = ?;
```

### Entity-Relationship Diagram

```
┌──────────────┐
│   players    │
│──────────────│
│ id (PK)      │
│ name         │
│ created_at   │
└──────┬───────┘
       │
       │ player1_id
       │ player2_id
       │ winner_id
       │
┌──────▼───────┐
│   matches    │
│──────────────│
│ id (PK)      │
│ room_code    │
│ player1_id   │◄───┐
│ player2_id   │    │
│ match_format │    │
│ difficulty   │    │
│ winner_id    │    │
│ player1_wins │    │
│ player2_wins │    │
│ started_at   │    │
│ completed_at │    │
└──────┬───────┘    │
       │            │
       │ match_id   │
       │            │
┌──────▼───────┐    │
│   rounds     │    │
│──────────────│    │
│ id (PK)      │    │
│ match_id     │────┘
│ round_number │
│ player1_choice│
│ player2_choice│
│ winner_id    │
│ player1_timeout│
│ player2_timeout│
│ played_at    │
└──────────────┘
```

## Indexing Strategy

### Indexes Created

```sql
-- Index on room_code for quick private room lookups
CREATE INDEX idx_matches_room_code ON matches(room_code);

-- Index on match_id for quick round lookups
CREATE INDEX idx_rounds_match_id ON rounds(match_id);

-- Composite index for player match history
CREATE INDEX idx_matches_players ON matches(player1_id, player2_id);
```

### Why These Indexes?

#### 1. Room Code Index
```sql
-- Fast lookup when joining private room
SELECT * FROM matches WHERE room_code = 'ABC123';
```
- Used frequently during matchmaking
- Room codes are unique
- B-tree index provides O(log n) lookup

#### 2. Match ID Index
```sql
-- Fast retrieval of all rounds in a match
SELECT * FROM rounds WHERE match_id = ?;
```
- Used when displaying match history
- Many rounds per match
- Avoids full table scan

#### 3. Player Composite Index
```sql
-- Fast lookup of player's matches
SELECT * FROM matches 
WHERE player1_id = ? OR player2_id = ?;
```
- Used for player statistics
- Covers both player positions
- Enables efficient OR queries

### Index Trade-offs

**Benefits:**
- Faster queries (O(log n) vs O(n))
- Better user experience (instant results)
- Scales better with data growth

**Costs:**
- Extra storage (minimal for this scale)
- Slower writes (index must be updated)
- More complex schema

For this game, the trade-off is worth it because:
- Reads >> Writes (view history more than play)
- Storage is cheap
- Write performance is still excellent

## Query Patterns

### Common Queries

#### 1. Create Player

```typescript
export function upsertPlayer(id: string, name: string): DBPlayer {
  db.run(
    'INSERT OR REPLACE INTO players (id, name, created_at) VALUES (?, ?, ?)',
    [id, name, Date.now()]
  );
  
  return { id, name, created_at: Date.now() };
}
```

**Pattern:** INSERT OR REPLACE
- Handles both new players and name updates
- Idempotent (safe to call multiple times)
- No need to check if player exists first

#### 2. Create Match

```typescript
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

  return matchId;
}
```

**Pattern:** Insert with defaults
- Initialize scores to 0
- Set winner to NULL (updated later)
- Both timestamps set to now (updated on completion)

#### 3. Get Player Statistics

```typescript
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

  const row = result[0].values[0];
  return {
    total_matches: row[0] as number,
    wins: row[1] as number,
    losses: row[2] as number,
    ties: row[3] as number,
  };
}
```

**Pattern:** Aggregation with CASE
- Single query for all statistics
- Handles NULL winner (ties)
- Efficient (no subqueries needed)

#### 4. Get Match with Rounds

```typescript
export function getMatchWithRounds(matchId: string) {
  const match = getMatch(matchId);
  const rounds = getMatchRounds(matchId);
  
  return {
    ...match,
    rounds,
  };
}
```

**Pattern:** Separate queries
- Could use JOIN, but:
  - Simpler code
  - More flexible (can get match without rounds)
  - Better for TypeScript typing
- Two queries are fast enough for this scale

### Query Optimization Tips

#### 1. Use Prepared Statements

```typescript
// ✅ GOOD: Parameterized query
db.run('SELECT * FROM players WHERE id = ?', [playerId]);

// ❌ BAD: String concatenation (SQL injection risk!)
db.run(`SELECT * FROM players WHERE id = '${playerId}'`);
```

#### 2. Limit Result Sets

```typescript
// Get recent matches (not all matches)
export function getRecentMatches(playerId: string, limit: number = 10): DBMatch[] {
  const result = db.exec(
    `SELECT * FROM matches
     WHERE player1_id = ? OR player2_id = ?
     ORDER BY completed_at DESC
     LIMIT ?`,
    [playerId, playerId, limit]
  );
  // ...
}
```

#### 3. Use Indexes

```typescript
// Fast: Uses idx_matches_room_code
SELECT * FROM matches WHERE room_code = 'ABC123';

// Slow: Full table scan
SELECT * FROM matches WHERE match_format = 'best_of_3';
// Consider adding index if this query is common
```

#### 4. Avoid SELECT *

```typescript
// ✅ GOOD: Select only needed columns
SELECT id, name FROM players WHERE id = ?;

// ❌ BAD: Select everything (wastes bandwidth)
SELECT * FROM players WHERE id = ?;
```

## Migration Strategy

### Current Approach: Schema in Code

```typescript
export async function initializeDatabase(): Promise<void> {
  const SQL = await initSqlJs();
  
  if (existsSync(DB_FILE)) {
    const buffer = readFileSync(DB_FILE);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables if they don't exist
  db.run(`CREATE TABLE IF NOT EXISTS players (...)`);
  db.run(`CREATE TABLE IF NOT EXISTS matches (...)`);
  db.run(`CREATE TABLE IF NOT EXISTS rounds (...)`);
  
  // Create indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_matches_room_code ...`);
}
```

**Benefits:**
- Simple for initial development
- No migration files to manage
- Works for new databases

**Limitations:**
- Can't modify existing tables
- No version tracking
- Difficult to rollback changes

### Future: Migration System

For production, implement migrations:

```typescript
// migrations/001_initial_schema.ts
export const up = (db: Database) => {
  db.run(`CREATE TABLE players (...)`);
  db.run(`CREATE TABLE matches (...)`);
  db.run(`CREATE TABLE rounds (...)`);
};

export const down = (db: Database) => {
  db.run(`DROP TABLE rounds`);
  db.run(`DROP TABLE matches`);
  db.run(`DROP TABLE players`);
};

// migrations/002_add_player_email.ts
export const up = (db: Database) => {
  db.run(`ALTER TABLE players ADD COLUMN email TEXT`);
};

export const down = (db: Database) => {
  // SQLite doesn't support DROP COLUMN easily
  // Would need to recreate table
};

// Migration runner
const migrations = [
  require('./001_initial_schema'),
  require('./002_add_player_email'),
];

function runMigrations(db: Database) {
  // Create migrations table
  db.run(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    )
  `);
  
  // Get applied migrations
  const applied = db.exec('SELECT name FROM migrations');
  const appliedNames = new Set(applied[0]?.values.map(r => r[0]) || []);
  
  // Run pending migrations
  for (const migration of migrations) {
    if (!appliedNames.has(migration.name)) {
      migration.up(db);
      db.run(
        'INSERT INTO migrations (name, applied_at) VALUES (?, ?)',
        [migration.name, Date.now()]
      );
      console.log(`✓ Applied migration: ${migration.name}`);
    }
  }
}
```

### Schema Versioning

Track schema version:

```typescript
// Add version table
db.run(`
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )
`);

// Check current version
const result = db.exec('SELECT MAX(version) FROM schema_version');
const currentVersion = result[0]?.values[0]?.[0] || 0;

// Apply migrations up to target version
if (currentVersion < TARGET_VERSION) {
  applyMigrations(currentVersion, TARGET_VERSION);
}
```

## Summary

Database design principles for this game:

1. **SQLite is perfect** for small-scale multiplayer games
2. **Three tables** with clear separation: players, matches, rounds
3. **Denormalization** for performance (scores in matches)
4. **Indexes** on frequently queried columns
5. **Nullable fields** for optional data (winner, choices)
6. **Timestamps** as integers for simplicity
7. **UUIDs** for globally unique IDs
8. **Migrations** for production schema changes

The schema is:
- **Simple** - Easy to understand and query
- **Efficient** - Indexed for common queries
- **Flexible** - Easy to extend with new features
- **Reliable** - ACID compliant with foreign keys

This design supports the game's needs while remaining educational and maintainable!
