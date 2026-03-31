# Snake & Ladder — Online Multiplayer with Chaos Snake AI

A production-grade online multiplayer Snake & Ladder game featuring a **Greedy Dynamic Chaos Snake** algorithm, physics-based animations, 3D dice, synthesized sound effects, and real-time WebSocket multiplayer.

## Features

### Gameplay
- **2-4 Player Online Multiplayer** — Room-based with shareable codes
- **Greedy Chaos Snake AI** — A dynamic snake that uses a greedy algorithm to hunt the leading player, creating Mario Kart "blue shell" rubber-banding
- **Classic Rules** — Extra turn on 6, exact roll to win, 10 static snakes + 9 ladders
- **Real-time Sync** — Socket.IO WebSocket for instant state updates

### Chaos Snake Algorithm
The Chaos Snake activates when any player passes cell 25. It repositions every turn:
1. Identifies the leading player (highest position)
2. Places its head 2-7 cells **ahead** of the leader (greedy lookahead)
3. Drops victims 18-35 cells back (significant penalty)
4. Avoids existing snakes, ladders, and occupied cells
5. Deactivates near the finish line (cell 94+) for fair final stretches

### Audio & Visual
- **Synthesized Sound Effects** — Dice shake/land, snake hiss + sad trombone, ladder chime, chaos snake alarm, win fanfare (all Web Audio API, zero external files)
- **Spring Physics** — Tokens move with realistic overshoot/settle dynamics
- **3D CSS Dice** — Full perspective cube with physics-based deceleration
- **Canvas Particle Effects** — Confetti, sparks, and explosions on game events
- **SVG Snake & Ladder Overlays** — Glowing bezier-curve paths with animated snake eyes
- **Fancy Board** — Jewel-tone gradients, gold accents, pulsing chaos snake cells

### Technical
- **Mobile Responsive** — Full viewport scaling with `min()`, safe-area-inset support, touch-optimized
- **Zero Dependencies Frontend** — Pure vanilla JS client, no build step
- **Sequenced Animation Pipeline** — Dice → pause → move → snake/ladder → chaos reposition

## Quick Start

```bash
git clone <your-repo-url>
cd snake-ladder-online
npm install
npm start
```

Open `http://localhost:3000` — share the URL with friends!

## Deployment

### Render (Recommended — Free Tier)
1. Push to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect repo → it auto-detects `render.yaml`
4. Deploy → get your URL

### Railway
```bash
# Install Railway CLI, then:
railway init
railway up
```

### Docker
```bash
docker build -t snake-ladder .
docker run -p 3000:3000 snake-ladder
```

### Fly.io
```bash
fly launch
fly deploy
```

### Any Node.js Host
Set start command to `node server.js` and ensure port `$PORT` or `3000` is exposed.

## How to Play

1. Enter your name → **Create Room**
2. Share the **5-letter code** with friends
3. Friends visit same URL → enter code → **Join**
4. Host clicks **Start Game**
5. Tap the 3D dice on your turn!
6. Watch out for the **Chaos Snake** (purple, pulsing) — it targets whoever's winning!

## Project Structure

```
snake-ladder-online/
├── server.js          # Express + Socket.IO + Chaos Snake algorithm
├── package.json       # Dependencies & scripts
├── Dockerfile         # Container deployment
├── render.yaml        # Render auto-deploy config
├── .gitignore
├── README.md
└── public/
    └── index.html     # Complete game client (single file, no build)
```

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `3000`  | Server port |

## Tech Stack

- **Server**: Node.js 20+ / Express / Socket.IO 4
- **Client**: Vanilla JS / Web Audio API / CSS 3D / Canvas
- **Physics**: Custom spring dynamics (stiffness=140, damping=15)
- **AI**: Greedy lookahead algorithm with randomized positioning

## License

MIT
