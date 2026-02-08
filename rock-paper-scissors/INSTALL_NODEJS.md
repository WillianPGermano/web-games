# Installing Node.js and npm on Windows

## What is Node.js and npm?

- **Node.js**: JavaScript runtime that lets you run JavaScript on your computer (not just in browsers)
- **npm**: Node Package Manager - comes with Node.js, used to install project dependencies

## Already Using fnm?

If you're using **fnm (Fast Node Manager)**, you can skip most of this guide! Just ensure you have Node.js 18+:

```bash
# Check current version
node --version

# Install LTS if needed
fnm install --lts

# Use it
fnm use lts-latest

# Set as default
fnm default lts-latest

# Verify
node --version  # Should be v18.x.x or higher
npm --version   # Should be v9.x.x or higher
```

Then jump to the "After Installation" section below.

## Step-by-Step Installation

### Method 1: Official Installer (Recommended)

1. **Download Node.js**
   - Visit [https://nodejs.org/](https://nodejs.org/)
   - You'll see two versions:
     - **LTS (Long Term Support)** - Recommended for most users
     - **Current** - Latest features
   - Click the **LTS** button to download (e.g., "20.11.0 LTS")

2. **Run the Installer**
   - Locate the downloaded file (usually in Downloads folder)
   - File name: `node-v20.x.x-x64.msi`
   - Double-click to run

3. **Installation Wizard**
   - Click "Next" on welcome screen
   - Accept the license agreement
   - Choose installation location (default is fine: `C:\Program Files\nodejs\`)
   - **Important:** On "Custom Setup" screen, ensure these are checked:
     - ✅ Node.js runtime
     - ✅ npm package manager
     - ✅ Add to PATH
   - Click "Next" and then "Install"
   - Click "Finish" when done

4. **Verify Installation**
   - Open **Command Prompt** or **PowerShell**:
     - Press `Win + R`
     - Type `cmd` and press Enter
   
   - Check Node.js version:
     ```bash
     node --version
     ```
     Should show: `v20.11.0` (or similar)
   
   - Check npm version:
     ```bash
     npm --version
     ```
     Should show: `10.2.4` (or similar)

   - If you see version numbers, installation was successful! 🎉

### Method 2: Using Chocolatey (Package Manager)

If you have Chocolatey installed:

```bash
choco install nodejs-lts
```

### Method 3: Using Scoop (Package Manager)

If you have Scoop installed:

```bash
scoop install nodejs-lts
```

## Troubleshooting

### "node is not recognized as an internal or external command"

**Solution:** Node.js is not in your PATH. Try these steps:

1. **Restart your terminal/computer**
   - Close all Command Prompt/PowerShell windows
   - Open a new one
   - Try `node --version` again

2. **Manually add to PATH:**
   - Press `Win + X` and select "System"
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "System variables", find "Path"
   - Click "Edit"
   - Click "New"
   - Add: `C:\Program Files\nodejs\`
   - Click OK on all dialogs
   - Restart terminal

### npm is slow or not working

**Solution:** Clear npm cache:
```bash
npm cache clean --force
```

### Permission errors

**Solution:** Run Command Prompt as Administrator:
- Press `Win + X`
- Select "Command Prompt (Admin)" or "PowerShell (Admin)"

## After Installation

Once Node.js and npm are installed, you can run the game:

```bash
# Navigate to the project folder
cd path\to\rock-paper-scissors

# Install project dependencies
npm install

# Run the game
npm run dev
```

## Updating Node.js

To update to a newer version:
1. Download the latest installer from [nodejs.org](https://nodejs.org/)
2. Run it - it will replace the old version
3. Verify: `node --version`

## Uninstalling Node.js

If you need to uninstall:
1. Press `Win + X` and select "Apps and Features"
2. Search for "Node.js"
3. Click and select "Uninstall"

## Alternative: Node Version Managers

For advanced users who need multiple Node.js versions:

### fnm (Fast Node Manager) - Recommended

Fast, simple, and cross-platform:

```bash
# Install fnm (if not already installed)
# Windows: Use Chocolatey or Scoop
choco install fnm
# or
scoop install fnm

# Install Node.js LTS
fnm install --lts

# Use it
fnm use lts-latest

# Set as default
fnm default lts-latest
```

### nvm-windows

Alternative for Windows:

1. Install nvm-windows: [https://github.com/coreybutler/nvm-windows](https://github.com/coreybutler/nvm-windows)
2. Use nvm to install Node.js:
   ```bash
   nvm install lts
   nvm use lts
   ```

## Next Steps

After installing Node.js and npm:
1. Read `QUICKSTART.md` to run the game
2. Read `SETUP.md` for detailed project setup
3. Start playing! 🎮
