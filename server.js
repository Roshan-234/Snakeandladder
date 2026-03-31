const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));

/* ═══════ GAME CONFIG ═══════ */
const STATIC_SNAKES = { 16:6,47:26,49:11,56:53,62:19,64:60,87:24,93:73,95:75,98:78 };
const LADDERS = { 1:38,4:14,9:31,21:42,28:84,36:44,51:67,71:91,80:100 };
const TOTAL = 100;

/* ═══════ GREEDY CHAOS SNAKE ALGORITHM ═══════ */
function computeChaosSnake(players) {
  const active = players.filter(p => p.pos > 0).sort((a, b) => b.pos - a.pos);
  if (active.length === 0 || active[0].pos < 25 || active[0].pos >= 94) return null;
  const leader = active[0];
  const occupied = new Set([
    ...Object.keys(STATIC_SNAKES).map(Number), ...Object.values(STATIC_SNAKES),
    ...Object.keys(LADDERS).map(Number), ...Object.values(LADDERS),
    1, 100, ...players.map(p => p.pos),
  ]);
  const heads = [];
  for (let off = 2; off <= 7; off++) {
    const cell = leader.pos + off;
    if (cell > 0 && cell <= 95 && !occupied.has(cell)) heads.push(cell);
  }
  if (!heads.length) return null;
  const head = heads[Math.floor(Math.random() * heads.length)];
  const tails = [];
  for (let drop = 18; drop <= 35; drop++) {
    const cell = head - drop;
    if (cell >= 1 && !occupied.has(cell)) tails.push(cell);
  }
  if (!tails.length) return null;
  return { head, tail: tails[Math.floor(Math.random() * tails.length)], target: leader.name };
}

function getAllSnakes(room) {
  const snakes = { ...STATIC_SNAKES };
  if (room.chaos) snakes[room.chaos.head] = room.chaos.tail;
  return snakes;
}

/* ═══════ ROOM MANAGEMENT ═══════ */
const rooms = new Map();

function genCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do { code = Array.from({ length: 5 }, () => c[Math.floor(Math.random() * c.length)]).join(""); } while (rooms.has(code));
  return code;
}

/* ═══════ SOCKET HANDLERS ═══════ */
io.on("connection", (socket) => {
  console.log(`[+] ${socket.id}`);

  socket.on("create-room", ({ name }, cb) => {
    const code = genCode();
    const room = { code, host: socket.id, players: [{ id: socket.id, name, pos: 0 }], turn: 0, dice: null, phase: "lobby", winner: null, log: [], chaos: null, chaosEnabled: true };
    rooms.set(code, room);
    socket.join(code);
    cb({ ok: true, code, state: room });
  });

  socket.on("join-room", ({ code, name }, cb) => {
    const room = rooms.get(code);
    if (!room) return cb({ ok: false, error: "Room not found" });
    if (room.phase !== "lobby") return cb({ ok: false, error: "Game already started" });
    if (room.players.length >= 4) return cb({ ok: false, error: "Room full" });
    if (!room.players.find(p => p.id === socket.id)) {
      room.players.push({ id: socket.id, name, pos: 0 });
    }
    socket.join(code);
    io.to(code).emit("state", room);
    cb({ ok: true, code, state: room });
  });

  socket.on("start-game", ({ code }, cb) => {
    const room = rooms.get(code);
    if (!room || room.host !== socket.id) return cb({ ok: false });
    if (room.players.length < 2) return cb({ ok: false, error: "Need 2+ players" });
    room.phase = "playing"; room.turn = 0;
    io.to(code).emit("state", room);
    cb({ ok: true });
  });

  socket.on("roll-dice", ({ code }, cb) => {
    const room = rooms.get(code);
    if (!room || room.phase !== "playing") return cb({ ok: false });
    if (room.players[room.turn]?.id !== socket.id) return cb({ ok: false, error: "Not your turn" });

    const roll = Math.floor(Math.random() * 6) + 1;
    room.dice = roll;
    const cp = room.turn, pl = room.players[cp], oldPos = pl.pos;
    const snakes = getAllSnakes(room);
    let newPos = oldPos + roll, evt = "move", finalPos = newPos;

    if (newPos > TOTAL) {
      room.log.push({ p: cp, roll, from: oldPos, to: oldPos, event: "overshoot" });
      room.turn = (cp + 1) % room.players.length;
      io.to(code).emit("state", room);
      io.to(code).emit("roll-result", { roll, player: cp, event: "overshoot", from: oldPos, to: oldPos, finalTo: oldPos });
      return cb({ ok: true, roll });
    }

    if (snakes[newPos]) { finalPos = snakes[newPos]; evt = newPos === room.chaos?.head ? "chaos" : "snake"; }
    else if (LADDERS[newPos]) { finalPos = LADDERS[newPos]; evt = "ladder"; }

    room.log.push({ p: cp, roll, from: oldPos, to: finalPos, event: evt });

    // Step 1: Move to landed cell
    pl.pos = newPos;
    io.to(code).emit("state", room);
    io.to(code).emit("roll-result", { roll, player: cp, event: evt, from: oldPos, to: newPos, finalTo: finalPos });

    // Step 2: Resolve snake/ladder after delay
    const resolve = () => {
      if (evt !== "move") pl.pos = finalPos;

      if (finalPos === TOTAL) {
        room.phase = "finished"; room.winner = cp;
      } else if (roll === 6) {
        // extra turn, don't change turn
      } else {
        room.turn = (cp + 1) % room.players.length;
      }

      // Chaos snake reposition
      if (room.chaosEnabled && room.phase === "playing") {
        const newChaos = computeChaosSnake(room.players);
        if (newChaos && (!room.chaos || newChaos.head !== room.chaos.head)) {
          const oldChaos = room.chaos;
          room.chaos = newChaos;
          io.to(code).emit("chaos-move", { oldChaos, newChaos });
        }
      }

      io.to(code).emit("state", room);
    };

    if (evt !== "move") setTimeout(resolve, 1200);
    else resolve();

    cb({ ok: true, roll });
  });

  socket.on("play-again", ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.host !== socket.id) return;
    room.players.forEach(p => (p.pos = 0));
    room.turn = 0; room.dice = null; room.phase = "playing";
    room.winner = null; room.log = []; room.chaos = null;
    io.to(code).emit("state", room);
  });

  socket.on("disconnect", () => {
    console.log(`[-] ${socket.id}`);
    for (const [code, room] of rooms) {
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx === -1) continue;
      const name = room.players[idx]?.name || "Player";
      if (room.phase === "lobby") {
        room.players.splice(idx, 1);
        if (!room.players.length) { rooms.delete(code); continue; }
        if (room.host === socket.id && room.players.length) room.host = room.players[0].id;
      }
      io.to(code).emit("state", room);
      io.to(code).emit("player-left", { name });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🎲 Snake & Ladder running → http://localhost:${PORT}`));
