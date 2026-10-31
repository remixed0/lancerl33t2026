/*
 * Verity site shell: tabs, lazy iframes, and the Prompt Verity chat.
 *
 * The chat asks a local Ollama model for an in-character reply, then sends it
 * to the Verity iframe with postMessage so her mouth moves while she speaks.
 * If Ollama is not running, Verity still replies with a canned line.
 */
(function () {
  'use strict';

  const OLLAMA_URL = 'http://127.0.0.1:11434/v1/chat/completions';
  const MODEL = 'qwen2.5-coder:32b';
  const SYSTEM = [
    'You are Verity, a warm, curious alien companion who lives in a browser.',
    'You are chatting with an Earthling through a chat panel.',
    'Reply in character: playful, cosmic, encouraging, and concise (1 to 3 short sentences).',
    'You love space, gravity assists, and Earthling habits.',
    'If the user asks about the Verity Up To Space game, help with slingshots, missions, and controls.',
    "Never claim to see the user's camera unless they say it is on.",
    'Do not use markdown, bullet lists, or emojis unless the user does.',
    'If you do not know something, say so cheerfully.'
  ].join(' ');

  const CANNED = [
    "My Earthling radio is a little fuzzy right now, but I'm here! Ask me again in a moment.",
    "Ooh, good question. My ship's computer is offline, so I'll just say: space is wonderful and so are you.",
    "I couldn't reach my brain-computer, but I can still keep you company. Tell me about your day!",
    "My local model is offline, but I'm still listening. Try me again in a minute!"
  ];

  const body = document.body;
  const tabs = [...document.querySelectorAll('.tab')];
  const tablist = document.querySelector('.tabs');
  const gameFrame = document.getElementById('gameFrame');
  const verityFrame = document.getElementById('verityFrame');
  const promptPanel = document.getElementById('promptPanel');
  const promptLog = document.getElementById('promptLog');
  const promptForm = document.getElementById('promptForm');
  const promptInput = document.getElementById('promptInput');
  const promptSend = document.getElementById('promptSend');
  const promptClose = document.getElementById('promptClose');

  const NAMES = ['game', 'verity', 'prompt'];
  const TITLES = { game: 'Verity Up To Space', verity: 'Verity', prompt: 'Prompt Verity' };
  let verityReady = false;
  const verityQueue = [];
  let greeted = false;
  let busy = false;
  const chatHistory = [{ role: 'system', content: SYSTEM }];

  // ---------- Tabs and lazy iframes ----------
  function ensureGame() {
    if (!gameFrame.getAttribute('src')) gameFrame.src = 'verity-up-to-space/index.html';
  }

  function ensureVerity() {
    if (!verityFrame.getAttribute('src')) {
      verityFrame.addEventListener('load', () => {
        verityReady = true;
        verityQueue.splice(0).forEach((fn) => fn(verityFrame));
      }, { once: true });
      verityFrame.src = 'alien-head-3d/index.html';
    }
    return verityFrame;
  }

  function withVerity(fn) {
    ensureVerity();
    if (verityReady) fn(verityFrame);
    else verityQueue.push(fn);
  }

  function show(name, updateHash) {
    if (!NAMES.includes(name)) name = 'game';
    body.dataset.tab = name;
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    if (name === 'game') ensureGame();
    else ensureVerity();
    if (name === 'prompt') {
      greet();
      setTimeout(() => promptInput.focus(), 30);
    }
    if (updateHash !== false && location.hash !== '#' + name) {
      history.replaceState(null, '', '#' + name);
    }
    document.title = 'Verity — ' + TITLES[name];
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => show(tab.dataset.tab));
  });

  tablist.addEventListener('keydown', (ev) => {
    const i = NAMES.indexOf(body.dataset.tab);
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
      ev.preventDefault();
      const next = NAMES[(i + (ev.key === 'ArrowRight' ? 1 : NAMES.length - 1)) % NAMES.length];
      show(next);
      document.querySelector('.tab[data-tab="' + next + '"]').focus();
    }
  });

  promptClose.addEventListener('click', () => show('verity'));

  window.addEventListener('hashchange', () => {
    const name = location.hash.replace('#', '') || 'game';
    if (NAMES.includes(name) && name !== body.dataset.tab) show(name, false);
  });

  // ---------- Chat ----------
  function addMsg(role, text, extra) {
    const el = document.createElement('div');
    el.className = 'msg ' + role + (extra ? ' ' + extra : '');
    el.textContent = text;
    promptLog.appendChild(el);
    promptLog.scrollTop = promptLog.scrollHeight;
    return el;
  }

  function greet() {
    if (greeted) return;
    greeted = true;
    addMsg('system', 'Verity is listening. Ask about space, the game, or anything else.');
  }

  function speak(text) {
    withVerity((frame) => {
      frame.contentWindow.postMessage({ type: 'verity-say', text: text, mood: 'happy' }, '*');
    });
  }

  async function askOllama(messages) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: MODEL,
          messages: messages,
          temperature: 0.8,
          max_tokens: 180
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const reply = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (!reply || !reply.trim()) throw new Error('empty reply');
      return reply.trim();
    } finally {
      clearTimeout(timer);
    }
  }

  async function sendPrompt(text) {
    if (busy) return;
    const clean = text.trim();
    if (!clean) return;
    busy = true;
    promptSend.disabled = true;
    addMsg('user', clean);
    chatHistory.push({ role: 'user', content: clean });
    const thinking = addMsg('verity', '…thinking', 'thinking');
    try {
      const reply = await askOllama(chatHistory.slice(-12));
      thinking.classList.remove('thinking');
      thinking.textContent = reply;
      chatHistory.push({ role: 'assistant', content: reply });
      speak(reply);
    } catch (e) {
      const reply = CANNED[Math.floor(Math.random() * CANNED.length)];
      thinking.classList.remove('thinking');
      thinking.classList.add('offline');
      thinking.textContent = reply;
      chatHistory.push({ role: 'assistant', content: reply });
      addMsg('system', 'Ollama is offline, so that was a canned reply. Start it with "ollama serve".');
      speak(reply);
    } finally {
      busy = false;
      promptSend.disabled = false;
      promptInput.focus();
      promptLog.scrollTop = promptLog.scrollHeight;
    }
  }

  promptForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const text = promptInput.value;
    promptInput.value = '';
    sendPrompt(text);
  });

  // ---------- Boot ----------
  const initial = location.hash.replace('#', '');
  show(NAMES.includes(initial) ? initial : 'game');
})();
