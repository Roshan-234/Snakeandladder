const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();

const SNAKES = { 16:6, 47:26, 49:11, 56:53, 62:19, 64:60, 87:24, 93:73, 95:75, 98:78 };
const LADDERS = { 1:38, 4:14, 9:31, 21:42, 28:84, 36:44, 51:67, 71:91, 80:100 };
const TOTAL = 100;

function genCode() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do { code = Array.from({ length: 5 }, () => c[Math.floor(Math.random() * c.length)]).join(""); }
  while (rooms.has(code));
  return code;
}

io.on("connection", (socket) => {
  console.log(`Connected: ${socket.id}`);

  socket.on("create-room", ({ name }, cb) => {
    const code = genCode();
    const room = {
      code,
      host: socket.id,
      players: [{ id: socket.id, name, pos: 0 }],
      turn: 0,
      dice: null,
      phase: "lobby",
      winner: null,
      log: [],
    };
    rooms.set(code, room);
    socket.join(code);
    cb({ ok: true, code, state: room });
  });

  socket.on("join-room", ({ code, name }, cb) => {
    const room = rooms.get(code);
    if (!room) return cb({ ok: false, error: "Room not found" });
    if (room.phase !== "lobby") return cb({ ok: false, error: "Game already started" });
    if (room.players.length >= 4) return cb({ ok: false, error: "Room is full" });
    if (room.players.find((p) => p.id === socket.id)) {
      socket.join(code);
      return cb({ ok: true, code, state: room });
    }
    room.players.push({ id: socket.id, name, pos: 0 });
    socket.join(code);
    io.to(code).emit("state-update", room);
    cb({ ok: true, code, state: room });
  });

  socket.on("start-game", ({ code }, cb) => {
    const room = rooms.get(code);
    if (!room) return cb({ ok: false, error: "Room not found" });
    if (room.host !== socket.id) return cb({ ok: false, error: "Only host can start" });
    if (room.players.length < 2) return cb({ ok: false, error: "Need 2+ players" });
    room.phase = "playing";
    room.turn = 0;
    io.to(code).emit("state-update", room);
    cb({ ok: true });
  });

  socket.on("roll-dice", ({ code }, cb) => {
    const room = rooms.get(code);
    if (!room || room.phase !== "playing") return cb({ ok: false });
    if (room.players[room.turn]?.id !== socket.id) return cb({ ok: false, error: "Not your turn" });

    const roll = Math.floor(Math.random() * 6) + 1;
    room.dice = roll;
    const cp = room.turn;
    const pl = room.players[cp];
    const oldPos = pl.pos;
    let newPos = oldPos + roll;
    let evt = "move";

    if (newPos > TOTAL) {
      room.log.push({ p: cp, roll, from: oldPos, to: oldPos, event: "overshoot" });
      room.turn = (cp + 1) % room.players.length;
      io.to(code).emit("state-update", room);
      io.to(code).emit("dice-rolled", { roll, player: cp, event: "overshoot" });
      return cb({ ok: true, roll });
    }

    let finalPos = newPos;
    if (SNAKES[newPos]) { finalPos = SNAKES[newPos]; evt = "snake"; }
    else if (LADDERS[newPos]) { finalPos = LADDERS[newPos]; evt = "ladder"; }

    room.log.push({ p: cp, roll, from: oldPos, to: finalPos, event: evt });

    // First move to the landed cell
    pl.pos = newPos;
    io.to(code).emit("state-update", room);
    io.to(code).emit("dice-rolled", { roll, player: cp, event: evt, intermediate: newPos, final: finalPos });

    // Then after delay, apply snake/ladder
    if (evt === "snake" || evt === "ladder") {
      setTimeout(() => {
        pl.pos = finalPos;
        if (finalPos === TOTAL) {
          room.phase = "finished";
          room.winner = cp;
        } else if (roll !== 6) {
          room.turn = (cp + 1) % room.players.length;
        }
        io.to(code).emit("state-update", room);
      }, 800);
    } else {
      if (newPos === TOTAL) {
        room.phase = "finished";
        room.winner = cp;
      } else if (roll !== 6) {
        room.turn = (cp + 1) % room.players.length;
      }
      io.to(code).emit("state-update", room);
    }

    cb({ ok: true, roll });
  });

  socket.on("play-again", ({ code }) => {
    const room = rooms.get(code);
    if (!room || room.host !== socket.id) return;
    room.players.forEach((p) => (p.pos = 0));
    room.turn = 0;
    room.dice = null;
    room.phase = "playing";
    room.winner = null;
    room.log = [];
    io.to(code).emit("state-update", room);
  });

  socket.on("disconnect", () => {
    console.log(`Disconnected: ${socket.id}`);
    // Clean up: remove from rooms, notify others
    for (const [code, room] of rooms) {
      const idx = room.players.findIndex((p) => p.id === socket.id);
      if (idx === -1) continue;

      if (room.phase === "lobby") {
        room.players.splice(idx, 1);
        if (room.players.length === 0) {
          rooms.delete(code);
        } else {
          if (room.host === socket.id) room.host = room.players[0].id;
          io.to(code).emit("state-update", room);
          io.to(code).emit("player-left", { name: room.players[idx]?.name || "Player" });
        }
      } else {
        io.to(code).emit("player-disconnected", { name: room.players[idx]?.name || "Player", index: idx });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🎲 Snake & Ladder server running on http://localhost:${PORT}`));
