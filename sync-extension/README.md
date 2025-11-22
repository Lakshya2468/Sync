# Sync Extension

A browser extension that synchronizes video playback across multiple clients, specifically designed for Netflix.

## Features

- Real-time video synchronization across multiple browsers
- Supports play, pause, seek, and playback rate changes
- WebSocket-based communication for low latency
- Works with Netflix video player

## Project Structure

```
sync-extension/
├── extension/          # Browser extension files
│   ├── manifest.json   # Extension manifest (Manifest V3)
│   ├── content.js      # Content script (runs in page context)
│   ├── background.js   # Background service worker
│   ├── inject.js       # Injected script for Netflix player access
│   └── icons/          # Extension icons
├── server/             # WebSocket server
│   ├── index.js        # Server implementation
│   └── package.json    # Server dependencies
└── README.md           # This file
```

## Setup

### 1. Install Server Dependencies

```bash
cd server
npm install
```

### 2. Start the Server

```bash
npm start
```

The server will run on `ws://localhost:3000`

### 3. Load the Extension

1. Open Chrome/Edge and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `extension` folder

### 4. Add Extension Icons

Create icon files in `extension/icons/`:

- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

You can use any image editor to create these icons.

## How It Works

1. **Content Script** (`content.js`): Injects the script into Netflix pages
2. **Inject Script** (`inject.js`): Accesses the video player and monitors state changes
3. **Background Script** (`background.js`): Maintains WebSocket connection to the server
4. **Server** (`server/index.js`): Broadcasts video state changes to all connected clients

## Usage

1. Start the server
2. Load the extension in multiple browser windows/tabs
3. Open Netflix in each window and start playing a video
4. Actions (play, pause, seek) in one window will sync to all others

## Development

### Server Development Mode

```bash
cd server
npm run dev
```

This uses nodemon to auto-restart the server on file changes.

### Debugging

- Check browser console for extension logs
- Check background service worker console in `chrome://extensions/`
- Check server terminal for WebSocket messages

## Notes

- The extension currently supports Netflix only
- Add more video platforms by updating content script matches in `manifest.json`
- Adjust sync threshold in `inject.js` (currently 1 second difference)
- Time updates are throttled to every 5 seconds to reduce network traffic

## License

MIT
