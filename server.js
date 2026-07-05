const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const MAX_MESSAGE_LENGTH = 500;

// ---- Anonim "callsign" üretici -------------------------------------------
// Kayıt yok, profil yok. Her bağlantıya sadece bağlantı süresince geçerli
// rastgele bir radyo çağrı işareti benzeri takma ad atanır. Hiçbir yerde
// (veritabanı, dosya, log) kalıcı olarak saklanmaz.
const CALLSIGN_WORDS = [
  'ANON',
];

function generateCallsign() {
  const word = CALLSIGN_WORDS[Math.floor(Math.random() * CALLSIGN_WORDS.length)];
  const number = Math.floor(Math.random() * 90) + 10; // 10-99
  return `${word}-${number}`;
}

app.use(express.static(path.join(__dirname, 'public')));

// ---- Oda durumu (yalnızca bellekte, kalıcı değil) -------------------------
// ÖNEMLİ: Mesaj geçmişi hiçbir yerde tutulmaz. Yeni bağlanan (ya da sayfayı
// yenileyen) bir istemciye geçmiş asla gönderilmez; bu sayede F5 atan kişi
// için sohbet görsel olarak sıfırlanmış olur, diğer bağlı kullanıcılar
// kendi ekranlarında konuşmaya kaldığı yerden devam eder.
//
// Not: Mesaj metni burada HTML olarak kaçışlanmıyor çünkü istemci tarafı
// mesajları innerHTML ile değil, DOM text node'ları (textContent) ile
// oluşturuyor — bu XSS'e karşı zaten güvenli ve çift kaçış (ör. "&lt;"
// olarak görünme) sorununu da önlüyor.
const onlineUsers = new Map(); // socket.id -> callsign

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
  socket.broadcast.emit('system', { text: `${callsign} kanala katıldı.` });

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
    io.emit('system', { text: `${callsign} kanaldan ayrıldı.` });
  });
});

server.listen(PORT, () => {
  console.log(`anon-chat sunucusu http://localhost:${PORT} adresinde çalışıyor`);
});
