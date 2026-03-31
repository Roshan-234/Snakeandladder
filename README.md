# 🎲 Snake & Ladder — Online Multiplayer

A beautiful online multiplayer Snake & Ladder game with physics-based animations, 3D dice, particle effects, and real-time multiplayer via WebSockets.

## Features

- **2-4 Player Online Multiplayer** — Create a room, share the code, play with friends
- **Spring Physics Tokens** — Pieces move with realistic spring dynamics (overshoot + settle)
- **3D CSS Dice** — Full 3D cube with physics-based rolling animation
- **Particle Effects** — Confetti on wins, sparks on ladders, venom on snakes
- **SVG Snakes & Ladders** — Glowing bezier-curve snakes and ladder rungs drawn on the board
- **Real-time Sync** — Socket.IO powers instant state updates
- **Responsive** — Works on desktop and mobile
- **Game Rules** — Extra turn on 6, exact roll to win, snake/ladder animations

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Then open `http://localhost:3000` in your browser.

## How to Play

1. Enter your name and click **Create Room**
2. Share the **5-letter room code** with friends
3. Friends open the same URL and click **Join** with the code
4. Host clicks **Start Game** when everyone's in
5. Take turns clicking the dice to roll!

## Deployment

### Deploy to Railway / Render / Fly.io

1. Push this folder to a GitHub repo
2. Connect the repo to your hosting platform
3. Set the start command to `npm start`
4. Deploy — that's it!

### Deploy to Heroku

```bash
heroku create my-snake-ladder
git push heroku main
```

### Deploy with Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `3000`  | Server port |

## Tech Stack

- **Backend**: Node.js + Express + Socket.IO
- **Frontend**: Vanilla JS (no build step needed)
- **Physics**: Custom spring dynamics engine
- **Graphics**: CSS 3D transforms, SVG, Canvas particles

## Project Structure

```
snake-ladder-online/
├── server.js          # Express + Socket.IO server
├── package.json       # Dependencies
├── README.md          # This file
└── public/
    └── index.html     # Full game client (single file)
```

## License

MIT — use it however you want!
