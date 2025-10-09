# Compton Line Legacy - Tetris Game

A JavaScript Tetris game with custom theme, background music, and classic Tetris mechanics.

## Features

- 🎮 Classic Tetris gameplay with 7 tetrimino shapes
- 👻 Ghost piece preview showing landing position
- 🎵 Background music with toggle control
- 📊 Score tracking with level progression
- ⏸️ Pause functionality
- 🎨 Modern dark theme UI

## Controls

- **← / →** : Move piece horizontally
- **↑** : Rotate piece
- **↓** : Soft drop
- **Space** : Hard drop (instant)
- **P** : Pause/unpause
- **R** : Restart game
- **Enter** : Start game

## Local Development

Simply open `index.html` in a modern web browser, or use a local server:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js (if you have http-server installed)
npx http-server
```

Then visit `http://localhost:8000`

## Deployment on Render

This project includes a `render.yaml` blueprint for easy deployment:

1. Push your code to a GitHub repository
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New" → "Blueprint"
4. Connect your GitHub repository
5. Render will automatically detect the `render.yaml` and deploy your app

The app will be deployed as a static site with proper caching headers for assets.

## Project Structure

```
├── index.html          # Main HTML file
├── style.css           # Styling with custom font
├── tetris.js           # Complete game logic (570 lines)
├── assets/
│   └── MISTRAL.TTF     # Custom font
├── boys-n-the-hood.mp3 # Background music
├── hero-img.webp       # Hero image
└── render.yaml         # Render deployment blueprint
```

## Game Mechanics

- **Scoring**: Line clears award 40/100/300/1200 points (1-4 lines)
- **Levels**: 10 difficulty levels with increasing speed
- **Level up**: Every 10 lines cleared
- **Bag randomizer**: Fair piece distribution using 7-bag system
- **Wall kicks**: Pieces can rotate near walls

## Credits

- Original work by Jake Gordon ([jakesgordon/javascript-tetris](https://github.com/jakesgordon/javascript-tetris))
- Refactor & styling by Anni Metsäniitty
- License: MIT

## Browser Compatibility

Requires a modern browser with:
- Canvas API support
- ES6+ JavaScript
- Web Audio API (for music)
