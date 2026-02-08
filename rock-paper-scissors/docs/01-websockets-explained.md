# WebSockets Explained

## What Are WebSockets?

WebSockets provide **full-duplex communication** between a client (browser) and server over a single, long-lived connection. Unlike traditional HTTP requests, WebSockets allow both the client and server to send messages to each other at any time without the overhead of establishing new connections.

## Why WebSockets for Multiplayer Games?

### The Problem with HTTP

Traditional HTTP follows a request-response pattern:

1. Client sends request
2. Server processes and responds
3. Connection closes

For real-time games, this creates problems:

- **High latency**: Each action requires a new connection
- **Server can't push updates**: Client must constantly poll for changes
- **Overhead**: HTTP headers add significant bandwidth cost
- **Inefficient**: Opening/closing connections wastes resources

### The WebSocket Solution

WebSockets solve these issues:

```
Client                    Server
  |                         |
  |--- Handshake (HTTP) --->|
  |<-- Upgrade to WS -------|
  |                         |
  |<==== Persistent =======>|
  |      Connection         |
  |                         |
  |--- Player choice ------>|
  |<-- Round result --------|
  |<-- Score update --------|
  |                         |
```

**Benefits:**

- **Low latency**: Messages sent instantly over existing connection
- **Bidirectional**: Server can push updates without client request
- **Efficient**: Minimal overhead per message
- **Real-time**: Perfect for games, chat, live updates

## WebSocket vs Alternatives

### HTTP Polling

```javascript
// Client repeatedly asks for updates
setInterval(() => {
  fetch('/api/game-state')
    .then(res => res.json())
    .then(data => updateUI(data));
}, 1000); // Check every second
```

**Problems:**
- Wastes bandwidth (most requests return "no change")
- High latency (up to 1 second delay)
- Server load (constant requests)

### Long Polling

```javascript
// Client waits for server response
function poll() {
  fetch('/api/wait-for-update')
    .then(res => res.json())
    .then(data => {
      updateUI(data);
      poll(); // Start next poll
    });
}
```

**Problems:**
- Still uses HTTP overhead
- Complex server implementation
- Connection management issues

### Server-Sent Events (SSE)

```javascript
// Server pushes updates to client
const eventSource = new EventSource('/api/events');
eventSource.onmessage = (event) => {
  updateUI(JSON.parse(event.data));
};
```

**Problems:**
- **One-way only**: Server → Client
- Client still needs HTTP for sending data
- Limited browser support

### WebSockets (Our Choice)

```javascript
// Bidirectional real-time communication
const socket = io('http://localhost:3001');

// Send to server
socket.emit('round:choice', 'rock');

// Receive from server
socket.on('round:end', (result) => {
  updateUI(result);
});
```

**Advantages:**
- Bidirectional communication
- Low latency
- Efficient
- Perfect for games

## Socket.io: WebSockets Made Easy

We use **Socket.io** instead of raw WebSockets because it provides:

### 1. Automatic Reconnection

```typescript
const socket = io(serverUrl, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});
```

If connection drops, Socket.io automatically tries to reconnect.

### 2. Fallback Transports

Socket.io tries WebSockets first, but falls back to HTTP long-polling if WebSockets are blocked (corporate firewalls, old browsers).

### 3. Rooms and Namespaces

```typescript
// Server: Put players in a room
socket.join(roomId);

// Send message to everyone in room
io.to(roomId).emit('game:start');
```

Perfect for multiplayer games where players need isolated game rooms.

### 4. Event-Based API

```typescript
// Type-safe events
socket.on('round:start', (roundNumber, timeLimit) => {
  startRound(roundNumber, timeLimit);
});
```

Much cleaner than parsing raw WebSocket messages.

### 5. Acknowledgments

```typescript
// Client
socket.emit('round:choice', 'rock', (response) => {
  console.log('Server received:', response);
});

// Server
socket.on('round:choice', (choice, callback) => {
  processChoice(choice);
  callback({ status: 'ok' });
});
```

Confirm message delivery without manual tracking.

## How Our Game Uses WebSockets

### Connection Flow

1. **Client connects**
   ```typescript
   const socket = io('http://localhost:3001');
   ```

2. **Player registers**
   ```typescript
   socket.emit('player:join', 'Alice');
   socket.on('player:registered', (player) => {
     console.log('Registered as:', player);
   });
   ```

3. **Join matchmaking**
   ```typescript
   socket.emit('matchmaking:join', 'best_of_3', 'medium');
   ```

4. **Server creates room when match found**
   ```typescript
   // Server
   io.to(player1.socketId).emit('room:joined', room);
   io.to(player2.socketId).emit('room:joined', room);
   ```

5. **Game starts**
   ```typescript
   socket.on('game:start', () => {
     showGameScreen();
   });
   ```

### Gameplay Messages

```typescript
// Round starts
socket.on('round:start', (roundNumber, timeLimit) => {
  startTimer(timeLimit);
});

// Player makes choice
socket.emit('round:choice', 'rock');

// Server confirms
socket.on('round:choice_received', () => {
  disableButtons();
});

// Round ends
socket.on('round:end', (result, scores) => {
  showResult(result);
  updateScores(scores);
});
```

### Why This Works Well

1. **Low latency**: Choices sent instantly
2. **Server authority**: Server determines winners (no cheating)
3. **Synchronized state**: Both players see same results
4. **Real-time feedback**: Instant confirmation of actions

## Security Considerations

### 1. Server Authority

**Never trust the client.** All game logic runs on the server:

```typescript
// ❌ BAD: Client determines winner
socket.emit('round:won', { winner: myId });

// ✅ GOOD: Server determines winner
socket.emit('round:choice', 'rock');
// Server calculates winner and broadcasts result
```

### 2. Input Validation

```typescript
// Server validates all inputs
socket.on('round:choice', (choice) => {
  if (!['rock', 'paper', 'scissors'].includes(choice)) {
    socket.emit('error', 'Invalid choice');
    return;
  }
  // Process valid choice
});
```

### 3. Rate Limiting

Prevent spam by limiting message frequency:

```typescript
const lastAction = new Map<string, number>();

socket.on('round:choice', (choice) => {
  const now = Date.now();
  const last = lastAction.get(socket.id) || 0;
  
  if (now - last < 100) { // 100ms minimum between actions
    return; // Ignore spam
  }
  
  lastAction.set(socket.id, now);
  // Process choice
});
```

### 4. Authentication

For production, add authentication:

```typescript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (isValidToken(token)) {
    next();
  } else {
    next(new Error('Authentication failed'));
  }
});
```

## Performance Tips

### 1. Minimize Message Size

```typescript
// ❌ BAD: Send entire game state
socket.emit('update', entireGameState);

// ✅ GOOD: Send only changes
socket.emit('score:update', { playerId, newScore });
```

### 2. Batch Updates

```typescript
// Collect updates and send together
const updates = [];
updates.push({ type: 'score', data: scores });
updates.push({ type: 'round', data: roundNumber });
socket.emit('batch:update', updates);
```

### 3. Use Binary Data for Large Payloads

```typescript
// For large data (images, audio), use binary
socket.emit('data', new Uint8Array(largeData));
```

### 4. Compress Messages

Socket.io supports compression:

```typescript
const io = new Server(httpServer, {
  perMessageDeflate: true, // Enable compression
});
```

## Debugging WebSockets

### Browser DevTools

1. Open DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Click connection to see messages
4. View sent/received data in real-time

### Server Logging

```typescript
socket.on('round:choice', (choice) => {
  console.log(`[${socket.id}] Choice: ${choice}`);
  // Process choice
});
```

### Socket.io Debug Mode

```typescript
// Client
const socket = io(serverUrl, {
  debug: true,
});

// Server
const io = new Server(httpServer, {
  cors: { origin: '*' },
  // Enable debug logging
});
```

## Common Issues and Solutions

### Connection Refused

**Problem:** Client can't connect to server

**Solutions:**
- Check server is running
- Verify URL and port
- Check firewall settings
- Ensure CORS is configured

### Disconnections

**Problem:** Connection drops frequently

**Solutions:**
- Increase ping timeout
- Check network stability
- Implement reconnection logic
- Handle disconnect events gracefully

### Message Not Received

**Problem:** Events not triggering

**Solutions:**
- Check event names match exactly
- Verify both sides are listening
- Check for typos in event names
- Use acknowledgments to confirm delivery

## Further Reading

- [Socket.io Documentation](https://socket.io/docs/)
- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [RFC 6455: The WebSocket Protocol](https://tools.ietf.org/html/rfc6455)

## Summary

WebSockets provide the foundation for real-time multiplayer games by enabling:

- **Instant bidirectional communication**
- **Low latency** for responsive gameplay
- **Efficient** use of bandwidth and resources
- **Server authority** for secure game logic

Socket.io makes WebSockets easier with automatic reconnection, fallbacks, rooms, and a clean event-based API. Our Rock-Paper-Scissors game leverages these features to create a smooth, real-time multiplayer experience.
