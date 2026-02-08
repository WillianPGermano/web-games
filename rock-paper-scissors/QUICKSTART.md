# Quick Start Guide

Get up and running in 3 minutes!

## Prerequisites

Node.js 18+ and npm are required. If you're using **fnm** (Fast Node Manager), you're all set!

**Verify your setup:**
```bash
node --version
# Should show v18.x.x or higher

npm --version
# Should show 9.x.x or higher
```

**If you need to install/switch Node.js version with fnm:**
```bash
# Install LTS version
fnm install --lts

# Use it
fnm use lts-latest

# Set as default
fnm default lts-latest
```

## Installation & Run

```bash
# 1. Install all dependencies
npm install

# 2. Start the game (both server and client)
npm run dev
```

That's it! The game will open at `http://localhost:3000`

## Play Your First Game

### Option 1: Play with a Friend (Private Room)

1. **Player 1:**
   - Enter your name and click "Join Game"
   - Click "Create Room"
   - Copy the 6-character room code
   - Share it with your friend

2. **Player 2:**
   - Enter your name and click "Join Game"
   - Paste the room code
   - Click "Join Room"

3. **Both players:**
   - Choose rock, paper, or scissors before time runs out!
   - First to win 2 rounds (best of 3) wins the match

### Option 2: Random Matchmaking

1. Open two browser windows (or use two devices on same network)
2. In both windows:
   - Enter a name
   - Select same format and difficulty
   - Click "Find Match"
3. You'll be matched automatically!

## Game Rules

### Choices
- **Rock** (✊) beats Scissors
- **Scissors** (✌️) beats Paper
- **Paper** (✋) beats Rock

### Match Formats
- **Single Round**: One round decides winner
- **Best of 3**: First to win 2 rounds
- **Best of 5**: First to win 3 rounds

### Difficulty (Time Limits)
- **Easy**: 10 seconds per round
- **Medium**: 5 seconds per round
- **Hard**: 3 seconds per round

⚠️ **If you don't choose in time, you automatically lose that round!**

## Troubleshooting

### "Cannot connect to server"

Make sure the server is running:
```bash
npm run dev:server
```

### "Port already in use"

Kill the process using the port:

**Windows:**
```bash
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
lsof -ti:3001 | xargs kill
```

### Game not loading

1. Clear browser cache
2. Check browser console for errors (F12)
3. Restart both server and client

## What's Next?

- Read `README.md` for full documentation
- Explore `docs/` for technical deep-dives
- Check `PROJECT_PLAN.md` for architecture details
- Modify the code and experiment!

## Tips

- Use **hard mode** for intense, fast-paced games
- **Private rooms** are great for playing with specific friends
- **Random matchmaking** finds opponents with same preferences
- Click **Rematch** to play again with the same opponent

Enjoy the game! 🎮✊✋✌️
