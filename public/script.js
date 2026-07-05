const socket = io();

const logEl = document.getElementById('log');
const inputEl = document.getElementById('msg-input');
const sendBtn = document.getElementById('send-btn');
const onlineCountEl = document.getElementById('online-count');
const mentionListEl = document.getElementById('mention-list');

let myCallsign = null;
let onlineUsers = [];
let typingTimeout = null;

let mentionActive = false;
let mentionStart = -1;
let mentionMatches = [];
let mentionHighlight = 0;

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function scrollToBottom() {
  logEl.scrollTop = logEl.scrollHeight;
}

function appendSystem(text) {
  const el = document.createElement('div');
  el.className = 'sys-msg';
  el.textContent = text;
  logEl.appendChild(el);
  scrollToBottom();
}

function renderMessageBody(container, text) {
  const mentionRegex = /(^|\s)(@[A-Za-z0-9_-]+)/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const [full, lead, tag] = match;
    const start = match.index + lead.length;

    if (start > lastIndex) {
      container.appendChild(document.createTextNode(text.slice(lastIndex, start)));
    }

    const span = document.createElement('span');
    span.className = 'mention-tag';
    span.textContent = tag;
    container.appendChild(span);

    lastIndex = start + tag.length;
  }

  if (lastIndex < text.length) {
    container.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

function appendMessage({ callsign, text, ts }) {
  const wrap = document.createElement('div');
  wrap.className = 'texttt' + (callsign === myCallsign ? ' own' : '');

  if (myCallsign && text.includes('@' + myCallsign)) {
    wrap.classList.add('mentioned');
  }

  const dateRow = document.createElement('div');
  const dateSpan = document.createElement('span');
  dateSpan.className = 'date';
  dateSpan.textContent = formatTime(ts);
  dateRow.appendChild(dateSpan);

  const nameRow = document.createElement('div');
  const nameSpan = document.createElement('span');
  nameSpan.className = 'username';
  const nameB = document.createElement('b');
  nameB.textContent = callsign + ':';
  nameSpan.appendChild(nameB);
  nameRow.appendChild(nameSpan);

  const bodyRow = document.createElement('div');
  const bodySpan = document.createElement('span');
  bodySpan.className = 'text-all';
  renderMessageBody(bodySpan, text);
  bodyRow.appendChild(bodySpan);

  wrap.appendChild(dateRow);
  wrap.appendChild(nameRow);
  wrap.appendChild(bodyRow);
  logEl.appendChild(wrap);
  scrollToBottom();
}

socket.on('welcome', ({ callsign }) => {
  myCallsign = callsign;
  inputEl.placeholder = `send a message as ${callsign}`
  appendSystem(`Connected to the channel as ${callsign}.`);
});

socket.on('presence', ({ onlineCount }) => {
  onlineCountEl.textContent = `${onlineCount} online`;
});

socket.on('userlist', ({ users }) => {
  onlineUsers = users;
});

socket.on('system', ({ text }) => {
  appendSystem(text);
});

socket.on('chat message', (payload) => {
  appendMessage(payload);
});

function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;
  socket.emit('chat message', { text });
  inputEl.value = '';
  socket.emit('typing', false);
  closeMentionList();
}

sendBtn.addEventListener('click', sendMessage);


function closeMentionList() {
  mentionActive = false;
  mentionListEl.classList.remove('open');
  mentionListEl.innerHTML = '';
}

function openMentionList(query) {
  const others = onlineUsers.filter((u) => u !== myCallsign);
  mentionMatches = others.filter((u) =>
    u.toLowerCase().startsWith(query.toLowerCase())
  );

  if (mentionMatches.length === 0) {
    closeMentionList();
    return;
  }

  mentionActive = true;
  mentionHighlight = 0;
  renderMentionList();
}

function renderMentionList() {
  mentionListEl.innerHTML = '';
  mentionMatches.forEach((user, i) => {
    const item = document.createElement('div');
    item.className = 'mention-item' + (i === mentionHighlight ? ' active' : '');
    item.textContent = user;
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      selectMention(user);
    });
    mentionListEl.appendChild(item);
  });
  mentionListEl.classList.add('open');
}

function selectMention(user) {
  const before = inputEl.value.slice(0, mentionStart);
  const after = inputEl.value.slice(inputEl.selectionStart);
  inputEl.value = `${before}@${user} ${after}`;
  const caret = `${before}@${user} `.length;
  inputEl.focus();
  inputEl.setSelectionRange(caret, caret);
  closeMentionList();
}

function checkMentionTrigger() {
  const caret = inputEl.selectionStart;
  const value = inputEl.value.slice(0, caret);
  const atIndex = value.lastIndexOf('@');

  if (atIndex === -1) {
    closeMentionList();
    return;
  }

  const between = value.slice(atIndex + 1);
  if (/\s/.test(between)) {
    closeMentionList();
    return;
  }

  mentionStart = atIndex;
  openMentionList(between);
}

inputEl.addEventListener('input', () => {
  checkMentionTrigger();
  socket.emit('typing', true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit('typing', false), 1500);
});

inputEl.addEventListener('keydown', (e) => {
  if (mentionActive) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      mentionHighlight = (mentionHighlight + 1) % mentionMatches.length;
      renderMentionList();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      mentionHighlight = (mentionHighlight - 1 + mentionMatches.length) % mentionMatches.length;
      renderMentionList();
      return;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      selectMention(mentionMatches[mentionHighlight]);
      return;
    }
    if (e.key === 'Escape') {
      closeMentionList();
      return;
    }
  }

  if (e.key === 'Enter') {
    sendMessage();
  }
});

inputEl.addEventListener('blur', () => {
  setTimeout(closeMentionList, 100);
});

inputEl.focus();
