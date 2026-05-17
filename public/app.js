const socket = io();
let state = null;
let selectedCardId = null;
let selectedTribute = new Set();
let tab = 'log';

const $ = (id) => document.getElementById(id);
const lobby = $('lobby');
const game = $('game');

socket.on('ready', () => setConnection('connected'));
socket.on('connect', () => setConnection('connected'));
socket.on('disconnect', () => setConnection('disconnected'));
socket.on('toast', ({ type, message }) => showToast(message, type));
socket.on('state', (next) => {
  state = next;
  render();
});

function setConnection(text) {
  $('connection').textContent = text;
}

function showToast(message, type = 'ok') {
  const el = $('lobbyToast');
  el.textContent = message;
  el.style.color = type === 'error' ? 'var(--bad)' : 'var(--accent)';
  setTimeout(() => { if (el.textContent === message) el.textContent = ''; }, 4500);
}

$('createBtn').addEventListener('click', () => {
  const name = $('nameInput').value || 'Host';
  socket.emit('createRoom', { name });
});

$('joinBtn').addEventListener('click', () => {
  const name = $('nameInput').value || 'Player';
  const code = $('codeInput').value || '';
  socket.emit('joinRoom', { name, code });
});

$('chatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('chatInput');
  socket.emit('chat', { message: input.value });
  input.value = '';
});

document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    tab = btn.dataset.tab;
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    $('logBox').classList.toggle('hidden', tab !== 'log');
    $('chatBox').classList.toggle('hidden', tab !== 'chat');
  });
});

function me() {
  return state?.players.find((p) => p.isYou);
}

function activePlayer() {
  return state?.players.find((p) => p.id === state.activePlayerId);
}

function isMyTurn() {
  return me()?.id === state?.activePlayerId;
}

function action(type, extra = {}) {
  socket.emit('action', { type, ...extra });
}

function render() {
  if (!state) return;
  lobby.classList.add('hidden');
  game.classList.remove('hidden');

  $('roomCode').textContent = state.code;
  $('phaseText').textContent = prettyPhase(state.phase);
  $('activeText').textContent = state.activePlayerName || '—';
  $('deckText').textContent = `C ${state.decks.chamber} / L ${state.decks.loot}`;

  renderPlayers();
  renderMain();
  renderHand();
  renderLog();
}

function prettyPhase(phase) {
  const map = {
    LOBBY: 'Lobby', START_TURN: 'Start Turn', NO_THREAT_CHOICE: 'Choice', COMBAT: 'Combat', TRIBUTE: 'Tribute', END_TURN: 'End Turn', GAME_OVER: 'Game Over'
  };
  return map[phase] || phase;
}

function renderPlayers() {
  const root = $('players');
  root.innerHTML = '';
  for (const p of state.players) {
    const div = document.createElement('div');
    div.className = `player-card ${p.id === state.activePlayerId ? 'active' : ''} ${p.isYou ? 'you' : ''}`;
    const leader = p.renown >= 9 ? '<div class="warning">ONE VICTORY AWAY</div>' : p.renown >= 8 ? '<div class="warning">dangerously famous</div>' : '';
    div.innerHTML = `
      <div class="player-top">
        <div class="player-name">${escapeHtml(p.name)} ${p.isYou ? '(you)' : ''}</div>
        <div class="renown">${p.renown}/10</div>
      </div>
      ${leader}
      <div class="mini">${p.connected ? 'online' : 'away'} · hand ${p.handCount}/${p.handLimit}</div>
      <div class="mini">Role: ${p.role ? escapeHtml(p.role.publicName) : 'none'} · Origin: ${p.origin ? escapeHtml(p.origin.publicName) : 'none'}</div>
      <div class="gear-list">${p.gear.length ? p.gear.map(g => `<span class="gear-chip">${escapeHtml(g.publicName)} +${g.combatBonus || 0}</span>`).join('') : '<span class="gear-chip">no Gear</span>'}</div>
    `;
    root.appendChild(div);
  }
}

function renderMain() {
  const main = $('mainArea');
  const actions = $('actions');
  main.innerHTML = '';
  actions.innerHTML = '';

  if (state.status === 'lobby') {
    $('mainTitle').textContent = 'Lobby';
    const needed = 3 - state.players.length;
    main.innerHTML = `<p>Share room code <strong>${state.code}</strong>. Waiting for ${needed} more player${needed === 1 ? '' : 's'}.</p>`;
    if (me()?.id && state.players[0]?.id === me().id) {
      addButton(actions, 'Start Game', () => action('START_GAME'), state.players.length !== 3);
    }
    return;
  }

  if (state.phase === 'GAME_OVER') {
    const winner = state.players.find((p) => p.id === state.winnerId);
    $('mainTitle').textContent = `${winner?.name || 'Someone'} wins!`;
    main.innerHTML = `<p>The final Renown came from defeating a Threat. This is the way.</p>`;
    return;
  }

  if (state.phase === 'START_TURN') {
    $('mainTitle').textContent = `${state.activePlayerName} is entering the chamber`;
    main.innerHTML = `<p>Active player opens a Chamber face-up. Threats start combat. Hexes resolve immediately. Other cards go to hand.</p>`;
    addButton(actions, 'Open Chamber', () => action('OPEN_CHAMBER'), !isMyTurn());
    renderPlayableHandActions(actions);
    return;
  }

  if (state.phase === 'NO_THREAT_CHOICE') {
    $('mainTitle').textContent = `${state.activePlayerName}: Start Trouble or Search?`;
    const threats = me()?.hand?.filter((c) => c.type === 'THREAT') || [];
    main.innerHTML = `<p>No Threat is active. The active player may play a Threat from hand or draw a hidden Chamber card.</p>`;
    addButton(actions, 'Search Room', () => action('SEARCH_ROOM'), !isMyTurn());
    if (isMyTurn()) {
      const selected = selectedCard();
      addButton(actions, selected?.type === 'THREAT' ? `Start Trouble: ${selected.publicName}` : 'Select a Threat to Start Trouble', () => action('START_TROUBLE', { cardId: selectedCardId }), !selected || selected.type !== 'THREAT');
    }
    renderPlayableHandActions(actions);
    return;
  }

  if (state.phase === 'COMBAT') {
    renderCombat(main, actions);
    return;
  }

  if (state.phase === 'TRIBUTE') {
    $('mainTitle').textContent = `${state.activePlayerName} owes Tribute`;
    const self = me();
    const excess = self ? Math.max(0, self.handCount - self.handLimit) : 0;
    main.innerHTML = isMyTurn()
      ? `<p>Select exactly <strong>${excess}</strong> card${excess === 1 ? '' : 's'} from your hand to give away or discard.</p>`
      : `<p>Waiting for ${state.activePlayerName} to give Tribute.</p>`;
    if (isMyTurn()) {
      const lowest = Math.min(...state.players.map((p) => p.renown));
      const possible = state.players.filter((p) => !p.isYou && p.renown === lowest);
      if (possible.length) {
        for (const p of possible) addButton(actions, `Give to ${p.name}`, () => action('GIVE_TRIBUTE', { cardIds: [...selectedTribute], recipientId: p.id }), selectedTribute.size !== excess);
      } else {
        addButton(actions, 'Discard Tribute', () => action('GIVE_TRIBUTE', { cardIds: [...selectedTribute] }), selectedTribute.size !== excess);
      }
    }
    return;
  }

  if (state.phase === 'END_TURN') {
    $('mainTitle').textContent = `${state.activePlayerName}'s turn is wrapping up`;
    main.innerHTML = `<p>End the turn when ready.</p>`;
    addButton(actions, 'End Turn', () => { selectedCardId = null; selectedTribute.clear(); action('END_TURN'); }, !isMyTurn());
    renderPlayableHandActions(actions);
  }
}

function renderCombat(main, actions) {
  const c = state.combat;
  const totals = c.totals;
  const active = activePlayer();
  const helper = c.helperId ? state.players.find((p) => p.id === c.helperId) : null;
  $('mainTitle').textContent = `Combat: ${state.activePlayerName} vs ${c.threats.map(t => t.publicName).join(' + ')}`;
  main.innerHTML = `
    <div class="combat-box">
      <div class="total-box">
        <div class="label">Player Side ${helper ? `(${escapeHtml(active.name)} + ${escapeHtml(helper.name)})` : ''}</div>
        <div class="big-total ${totals.wins ? 'win' : 'lose'}">${totals.playerTotal}</div>
        <div class="mini">Tie ${totals.tieWin ? 'goes to player side' : 'goes to Threat'}</div>
      </div>
      <div class="total-box">
        <div class="label">Threat Side</div>
        <div class="big-total ${totals.wins ? 'lose' : 'win'}">${totals.threatTotal}</div>
        <div class="mini">Modifiers: ${c.threatDelta >= 0 ? '+' : ''}${c.threatDelta} · Loot delta ${c.lootDelta >= 0 ? '+' : ''}${c.lootDelta}</div>
      </div>
    </div>
    <h3>Threats</h3>
    <div class="card-row">${c.threats.map(cardHtml).join('')}</div>
    <h3>Combat modifiers</h3>
    <div>${c.modifiers.length ? c.modifiers.map(m => `<span class="badge">${escapeHtml(m.publicName)}</span>`).join('') : '<span class="badge">none yet</span>'}</div>
    <p class="mini">Combat resolves when all players pass. Playing a combat card resets passes.</p>
  `;

  if (isMyTurn()) addButton(actions, 'Call for Backup', () => {
    const offer = prompt('Offer a deal for Backup (example: first Loot pick, 1 Loot, eternal friendship):') || '';
    action('REQUEST_BACKUP', { offer });
  }, c.helperId);
  if (!isMyTurn() && c.helpRequested && !c.helperId) {
    addButton(actions, 'Accept Backup', () => action('ACCEPT_BACKUP'));
    addButton(actions, 'Decline Backup', () => action('DECLINE_BACKUP'));
  }
  const selected = selectedCard();
  const canPlayCombat = selected && (selected.type === 'TRICK' || selected.type === 'THREAT_MODIFIER');
  addButton(actions, canPlayCombat ? `Play ${selected.publicName}` : 'Select combat card to play', () => action('PLAY_CARD', { cardId: selectedCardId }), !canPlayCombat);
  addButton(actions, 'Pass', () => action('PASS_REACTION'));
}

function renderPlayableHandActions(actions) {
  const selected = selectedCard();
  if (!selected || !isMyTurn()) return;
  if (['ROLE', 'ORIGIN', 'GEAR', 'TRICK', 'SPECIAL'].includes(selected.type)) {
    const playable = selected.type !== 'TRICK' || selected.effect?.type === 'DRAW_LOOT';
    addButton(actions, `Play / Equip ${selected.publicName}`, () => action('PLAY_CARD', { cardId: selectedCardId }), !playable && state.phase !== 'COMBAT');
  }
}

function renderHand() {
  const self = me();
  const root = $('hand');
  root.innerHTML = '';
  if (!self) return;
  $('handMeta').textContent = `${self.handCount} cards · limit ${self.handLimit}${state.phase === 'TRIBUTE' && isMyTurn() ? ' · tap cards for Tribute' : ''}`;
  const card = selectedCard();
  $('selectedInfo').textContent = card ? `${card.publicName}: ${card.publicText || ''}` : 'Tap a card.';
  for (const c of self.hand || []) {
    const node = makeCard(c);
    node.classList.toggle('selected', selectedCardId === c.instanceId || selectedTribute.has(c.instanceId));
    node.addEventListener('click', () => {
      if (state.phase === 'TRIBUTE' && isMyTurn()) {
        if (selectedTribute.has(c.instanceId)) selectedTribute.delete(c.instanceId);
        else selectedTribute.add(c.instanceId);
      } else {
        selectedCardId = selectedCardId === c.instanceId ? null : c.instanceId;
      }
      render();
    });
    root.appendChild(node);
  }
}

function selectedCard() {
  return me()?.hand?.find((c) => c.instanceId === selectedCardId);
}

function makeCard(c, small = false) {
  const tpl = $('cardTemplate');
  const node = tpl.content.firstElementChild.cloneNode(true);
  if (small) node.classList.add('small');
  node.querySelector('.card-type').textContent = c.type;
  node.querySelector('.card-name').textContent = c.publicName;
  node.querySelector('.card-body').textContent = c.publicText || '';
  node.querySelector('.card-meta').textContent = metaFor(c);
  return node;
}

function cardHtml(c) {
  return `<div class="card small"><div class="card-type">${escapeHtml(c.type)}</div><div class="card-name">${escapeHtml(c.publicName)}</div><div class="card-body">${escapeHtml(c.publicText || '')}</div><div class="card-meta">${escapeHtml(metaFor(c))}</div></div>`;
}

function metaFor(c) {
  if (!c) return '';
  if (c.type === 'THREAT') return `Strength ${c.strength} · ${c.renownReward} Renown · ${c.lootReward} Loot`;
  if (c.type === 'GEAR') return `${c.slot || 'NO SLOT'} · +${c.combatBonus || 0} · ${c.scrapValue || 0} Scrap${c.isHeavy ? ' · Heavy' : ''}`;
  if (c.type === 'THREAT_MODIFIER') return `${c.strengthDelta >= 0 ? '+' : ''}${c.strengthDelta} Threat · ${c.lootDelta >= 0 ? '+' : ''}${c.lootDelta} Loot`;
  if (c.type === 'ROLE' || c.type === 'ORIGIN') return c.mechanicalSlot || '';
  if (c.type === 'TRICK') return c.timing?.join(', ') || '';
  return c.deck || '';
}

function renderLog() {
  $('logBox').innerHTML = state.log.slice().reverse().map((l) => `<div class="log-line">${escapeHtml(l.message)}</div>`).join('');
  $('chatBox').innerHTML = state.chat.slice().reverse().map((c) => `<div class="chat-line"><strong>${escapeHtml(c.name)}:</strong> ${escapeHtml(c.message)}</div>`).join('');
}

function addButton(root, label, onClick, disabled = false) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.disabled = Boolean(disabled);
  btn.addEventListener('click', onClick);
  root.appendChild(btn);
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}
