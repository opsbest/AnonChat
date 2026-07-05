const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const MAX_MESSAGE_LENGTH = 500;

const CALLSIGN_WORDS = [
  'ANON',
];

function generateCallsign() {
  const word = CALLSIGN_WORDS[Math.floor(Math.random() * CALLSIGN_WORDS.length)];
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `${word}-${number}`;
}

app.use(express.static(path.join(__dirname, 'public')));

const onlineUsers = new Map();

function broadcastUserList() {
  io.emit('userlist', { users: Array.from(onlineUsers.values()) });
}

io.on('connection', (socket) => {
  const callsign = generateCallsign();
  socket.data.callsign = callsign;
  onlineUsers.set(socket.id, callsign);

  socket.emit('welcome', { callsign });
  io.emit('presence', { onlineCount: onlineUsers.size });
  broadcastUserList();
  socket.broadcast.emit('system', { text: `${callsign} joined the channel.` });

  socket.on('chat message', (payload) => {
    if (!payload || typeof payload.text !== 'string') return;

    const text = payload.text.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text) return;

    io.emit('chat message', {
      callsign: socket.data.callsign,
      text,
      ts: Date.now(),
    });
  });

  socket.on('typing', (isTyping) => {
    socket.broadcast.emit('typing', {
      callsign: socket.data.callsign,
      isTyping: !!isTyping,
    });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    io.emit('presence', { onlineCount: onlineUsers.size });
    broadcastUserList();
    io.emit('system', { text: `${callsign} left the channel.` });
  });
});

server.listen(PORT, () => {
  console.log(`anon-chat server running at http://localhost:${PORT}`);
});
