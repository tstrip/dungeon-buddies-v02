const socket = io();
const SESSION_KEY = 'lootGoblinsV070Session';
let state = null;
let selectedTribute = new Set();
let selectedSell = new Set();
let handExpanded = false;

const $ = (id) => document.getElementById(id);
const screens = ['resumeScreen', 'entryScreen', 'lobbyScreen', 'gameScreen'];

socket.on('ready', () => setConnection('connected'));
socket.on('connect', () => {
  setConnection('connected');
  maybeShowResume();
});
socket.on('disconnect', () => setConnection('disconnected'));
socket.on('session', (session) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, lastSeenAt: Date.now() }));
});
socket.on('toast', ({ type, message }) => showToast(message, type));
socket.on('state', (next) => {
  state = next;
  render();
});

function savedSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}

function maybeShowResume() {
  const saved = savedSession();
  const roomFromUrl = new URLSearchParams(location.search).get('room');
  if (roomFromUrl && !state && $('codeInput')) $('codeInput').value = roomFromUrl.toUpperCase();
  if (saved && !state) {
    if ($('resumeCopy')) $('resumeCopy').textContent = 'Your stool is still warm.';
    if ($('resumeRoomCode')) $('resumeRoomCode').textContent = saved.roomCode || '—';
    if ($('resumePlayerName')) $('resumePlayerName').textContent = saved.playerName || '—';
    if ($('resumeState')) $('resumeState').textContent = 'Stool reserved';
    showScreen('resumeScreen');
  }
}

function showScreen(id) {
  for (const s of screens) $(s).classList.toggle('hidden', s !== id);
}

function isMobileView() {
  return window.matchMedia && window.matchMedia('(max-width: 760px)').matches;
}

let resizeRenderTimer = null;
window.addEventListener('resize', () => {
  if (!state || $('gameScreen')?.classList.contains('hidden')) return;
  clearTimeout(resizeRenderTimer);
  resizeRenderTimer = setTimeout(() => render(), 120);
});

function setConnection(text) {
  const el = $('connection');
  if (el) el.textContent = text === 'connected' ? 'Connected' : 'Disconnected';
}

function showToast(message, type = 'ok') {
  const el = $('toast');
  el.textContent = message;
  el.className = `toast ${type === 'error' ? 'error' : 'ok'}`;
  setTimeout(() => { if (el.textContent === message) el.classList.add('hidden'); }, 4500);
}

function emitAction(type, extra = {}) {
  socket.emit('action', { type, ...extra });
}

$('resumeBtn').addEventListener('click', () => {
  const saved = savedSession();
  if (!saved) return showScreen('entryScreen');
  socket.emit('resumeRoom', { roomCode: saved.roomCode, playerId: saved.playerId });
});
$('clearSessionBtn').addEventListener('click', () => {
  localStorage.removeItem(SESSION_KEY);
  showScreen('entryScreen');
});
$('createBtn').addEventListener('click', () => {
  socket.emit('createRoom', { name: $('nameInput').value || 'Host' });
});
$('joinBtn').addEventListener('click', () => {
  socket.emit('joinRoom', { name: $('nameInput').value || 'Player', code: $('codeInput').value || '' });
});
$('startGameBtn').addEventListener('click', () => emitAction('START_GAME'));
$('copyInviteBtn').addEventListener('click', async () => {
  if (!state?.code) return;
  const url = `${location.origin}/?room=${state.code}`;
  try {
    await navigator.clipboard.writeText(url);
    showToast('Invite link copied.', 'ok');
  } catch {
    showToast(url, 'ok');
  }
});
$('copyRoomCodeBtn').addEventListener('click', async () => {
  if (!state?.code) return;
  try {
    await navigator.clipboard.writeText(state.code);
    showToast('Room code copied.', 'ok');
  } catch {
    showToast(state.code, 'ok');
  }
});
$('closeInspect').addEventListener('click', closeInspect);
$('inspectOverlay').addEventListener('click', (e) => { if (e.target.id === 'inspectOverlay') closeInspect(); });

function me() { return state?.players.find((p) => p.isYou); }
function active() { return state?.players.find((p) => p.id === state.activePlayerId); }
function isMyTurn() { return me()?.id === state?.activePlayerId; }
function myHand() { return state?.you?.hand || []; }
function hasPublicRole(player, name) { return player?.role?.publicName === name || (player?.extraRoles || []).some((r) => r.publicName === name); }
function hasPublicOrigin(player, name) { return player?.origin?.publicName === name || (player?.extraOrigins || []).some((r) => r.publicName === name); }
function identityLine(p) {
  const roles = [p.role, ...(p.extraRoles || [])].filter(Boolean).map((c) => c.publicName);
  const origins = [p.origin, ...(p.extraOrigins || [])].filter(Boolean).map((c) => c.publicName);
  const roleSuffix = p.callingPermit ? (roles.length === 1 ? ' + Permit' : ' + Overqualified') : '';
  const kinSuffix = p.kinPermit ? (origins.length === 1 ? ' + Permit' : ' + Mixed') : '';
  return `${roles.join('+') || 'No Calling'}${roleSuffix} · ${origins.join('+') || 'No Kin'}${kinSuffix}`;
}

function render() {
  if (!state) return;
  if (state.status === 'LOBBY') renderLobby();
  else renderGame();
}

function renderLobby() {
  showScreen('lobbyScreen');
  const isHost = Boolean(state.players[0]?.isYou);
  const playerCount = state.players.length;
  const missing = Math.max(0, 3 - playerCount);
  const roomCode = state.code || '—';

  $('lobbyRoomCode').textContent = roomCode;
  if ($('lobbyInviteCode')) $('lobbyInviteCode').textContent = roomCode;

  let status = 'Goblins are gathering.';
  if (playerCount === 1) status = 'Gathering 2 more goblins.';
  else if (playerCount === 2) status = 'Gathering 1 more goblin.';
  else if (playerCount >= 3) status = isHost ? 'The table is full. Start when ready.' : `The table is full. Waiting for ${state.players[0]?.name || 'Host'} to start.`;
  if ($('lobbyStatusCopy')) $('lobbyStatusCopy').textContent = status;
  if ($('lobbyTableState')) $('lobbyTableState').textContent = playerCount >= 3 ? 'Full Table' : `${missing} Empty Stool${missing === 1 ? '' : 's'}`;

  const seats = $('lobbySeats');
  seats.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const p = state.players[i];
    const div = document.createElement('div');
    div.className = `lobby-seat ${p ? 'occupied' : 'empty'} ${p?.isYou ? 'you' : ''} ${i === 0 ? 'host-seat' : ''}`;
    div.innerHTML = p
      ? `<div class="seat-token">${p.isYou ? 'YOU' : (i === 0 ? 'HOST' : 'IN')}</div>
         <div class="seat-copy"><strong>${escapeHtml(p.name)}${p.isYou ? ' · you' : ''}</strong><span>${i === 0 ? 'Host' : 'At table'} · ${p.connected ? 'online' : 'offline'}</span></div>`
      : `<div class="seat-token">+</div>
         <div class="seat-copy"><strong>Empty Stool</strong><span>Invite a goblin</span></div>`;
    seats.appendChild(div);
  }

  const start = $('startGameBtn');
  start.disabled = !(isHost && playerCount === 3);
  start.textContent = playerCount === 3 ? 'Start the Table' : `Needs ${missing} More`;
  start.classList.toggle('table-ready', Boolean(isHost && playerCount === 3));
  if ($('startGameHint')) {
    $('startGameHint').textContent = isHost
      ? (playerCount === 3 ? 'Everyone has a stool. Start the table when ready.' : `Start unlocks at 3 goblins.`)
      : `Waiting for ${state.players[0]?.name || 'Host'} to start the table.`;
  }
}

function renderGame() {
  showScreen('gameScreen');
  renderDeckDock();
  renderPhaseBanner();
  renderPlayers();
  renderActiveTable();
  renderPrompt();
  renderHand();
  renderEventHistory();
}

function announcementHtml() {
  const a = state?.announcement;
  if (!a) return '';
  const icon = announcementIcon(a.kind);
  return `<section class="table-announcement ${a.importance === 'major' ? 'major' : ''} ${escapeHtml(a.kind || '')}">
    <div class="announce-icon">${icon}</div>
    <div class="announce-copy">
      <div class="announce-title">${escapeHtml(a.title || 'Table Event')}</div>
      <div class="announce-detail">${escapeHtml(a.detail || '')}</div>
    </div>
    ${a.card ? `<div class="announce-card-name">${escapeHtml(a.card.publicName)}</div>` : ''}
  </section>`;
}

function announcementIcon(kind) {
  const map = { roll: 'die', combat: 'combat', hex: 'hex', draw: 'draw', effect: 'special', card: 'card', backup: 'backup', flee: 'flee', tribute: 'loot', turn: 'turn', game: 'glory', reveal: 'chamber', gear: 'gear', prompt: 'prompt', bad: 'hex', death: 'death', glory: 'glory', 'zero-glory': 'death' };
  return assetIconHtml(map[kind] || 'special', 'event-sigil');
}


function renderDeckDock() {
  const dock = $('deckDock');
  if (!dock || !state?.decks) return;
  const move = deriveMovement();
  const piles = [
    { key: 'CHAMBER_DECK', label: 'Chamber', sub: 'deck', count: state.decks.chamber, kind: 'chamber' },
    { key: 'CHAMBER_DISCARD', label: 'Chamber', sub: 'discard', count: state.decks.chamberDiscard, kind: 'discard' },
    { key: 'LOOT_DECK', label: 'Loot', sub: 'deck', count: state.decks.loot, kind: 'loot' },
    { key: 'LOOT_DISCARD', label: 'Loot', sub: 'discard', count: state.decks.lootDiscard, kind: 'discard' }
  ];
  dock.innerHTML = piles.map((p) => pileHtml(p, move)).join('');
}

function pileHtml(pile, move) {
  const classes = ['deck-pile', pile.kind];
  if (move?.from === pile.key) classes.push('source');
  if (move?.to === pile.key) classes.push('destination');
  const empty = Number(pile.count || 0) <= 0;
  if (empty) classes.push('empty');
  return `<div class="${classes.join(' ')}" aria-label="${escapeHtml(pile.label)} ${escapeHtml(pile.sub)} ${Number(pile.count || 0)} cards">
    ${deckPileImageHtml(pile)}
    <div class="pile-copy"><strong>${escapeHtml(pile.label)}</strong><small>${escapeHtml(pile.sub)} · ${Number(pile.count || 0)}</small></div>
  </div>`;
}

function deckPileImageHtml(pile, cls = 'deck-pile-art') {
  const key = String(pile?.key || '');
  let src = '/assets/loot-goblins/deck/chamber-deck-stack.png';
  if (key === 'LOOT_DECK') src = '/assets/loot-goblins/deck/loot-deck-stack.png';
  if (key === 'CHAMBER_DISCARD') src = '/assets/loot-goblins/deck/chamber-discard-pile.png';
  if (key === 'LOOT_DISCARD') src = '/assets/loot-goblins/deck/loot-discard-pile.png';
  if (key === 'CHAMBER_DECK') src = '/assets/loot-goblins/deck/chamber-deck-stack.png';
  return `<img class="${escapeHtml(cls)}" src="${src}" alt="" aria-hidden="true" loading="lazy" decoding="async" />`;
}


function movementZoneClass(zone) {
  return String(zone || 'TABLE').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'table';
}

function movementZoneLabel(zone) {
  const map = {
    CHAMBER_DECK: 'CHAMBER',
    CHAMBER_DISCARD: 'CHAMBER',
    LOOT_DECK: 'LOOT',
    LOOT_DISCARD: 'LOOT',
    PLAYER_HAND: 'HAND',
    REVEAL_ZONE: 'REVEAL',
    COMBAT_ZONE: 'COMBAT',
    FLEE_ZONE: 'FLEE',
    TABLE: 'TABLE',
    DISCARD: 'DISCARD',
    BODY_LOOT: 'BODY',
    RESULT: 'RESULT',
    DIE: 'DIE'
  };
  return map[zone] || 'CARD';
}

function movementFace(move) {
  if (!move) return 'down';
  const from = String(move.from || '');
  const to = String(move.to || '');
  if (from.includes('DECK') || to === 'PLAYER_HAND' || to === 'BODY_LOOT') return 'down';
  if (from === 'DIE') return 'die';
  return 'up';
}

function movementCardTheme(move) {
  const card = move?.card;
  if (card?.type) return `type-${card.type}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  if (String(move?.from || '').includes('LOOT') || String(move?.to || '').includes('LOOT')) return 'type-loot';
  if (String(move?.from || '').includes('CHAMBER') || String(move?.to || '').includes('CHAMBER')) return 'type-chamber';
  if (String(move?.from || '') === 'DIE') return 'type-die';
  return 'type-card';
}

function movementCardHtml(move) {
  if (!move || (!move.from && !move.to)) return '';
  const fromClass = `from-${movementZoneClass(move.from)}`;
  const toClass = `to-${movementZoneClass(move.to)}`;
  const fromLabel = movementZoneLabel(move.from);
  const toLabel = movementZoneLabel(move.to);
  const cardName = move.card?.publicName || (movementFace(move) === 'die' ? 'Die' : 'Card');
  const face = movementFace(move);
  const theme = movementCardTheme(move);
  return `<div class="movement-card ${fromClass} ${toClass} face-${face} ${theme}" aria-label="${escapeHtml(fromLabel)} to ${escapeHtml(toLabel)}: ${escapeHtml(cardName)}" data-from="${escapeHtml(fromLabel)}" data-to="${escapeHtml(toLabel)}">
    <div class="motion-trail"></div>
    <div class="moving-card-object">
      <div class="moving-card-face moving-card-back"><span>${escapeHtml(fromLabel)}</span></div>
      <div class="moving-card-face moving-card-front">
        <strong>${escapeHtml(cardName)}</strong>
        <small>${escapeHtml(toLabel)}</small>
      </div>
      <div class="moving-die-face">D6</div>
    </div>
    <div class="movement-path-label">${escapeHtml(fromLabel)} → ${escapeHtml(toLabel)}</div>
  </div>`;
}

function motionLayerHtml(move) {
  if (!move || (!move.from && !move.to)) return '';
  const source = movementZoneLabel(move.from);
  const dest = movementZoneLabel(move.to);
  return `<div class="v073-motion-layer active" aria-hidden="true">
    <div class="motion-source-ping ${`from-${movementZoneClass(move.from)}`}"></div>
    <div class="motion-destination-ping ${`to-${movementZoneClass(move.to)}`}"></div>
    ${movementCardHtml(move)}
    <div class="motion-caption">${escapeHtml(source)} → ${escapeHtml(dest)}</div>
  </div>`;
}

function deriveMovement() {
  if (state?.movement) return state.movement;
  const msg = latestEvent();
  if (!msg) return null;
  if (/opened a Chamber/i.test(msg)) return { from: 'CHAMBER_DECK', to: 'REVEAL_ZONE', label: 'Chamber Deck → Reveal Zone', detail: msg };
  if (/looted the room/i.test(msg)) return { from: 'CHAMBER_DECK', to: 'PLAYER_HAND', label: 'Chamber Deck → Hand', detail: msg };
  if (/drew \d+ Loot/i.test(msg) || /drew .* Loot/i.test(msg)) return { from: 'LOOT_DECK', to: 'PLAYER_HAND', label: 'Loot Deck → Hand', detail: msg };
  if (/drew \d+ Chamber/i.test(msg) || /drew .* Chamber/i.test(msg)) return { from: 'CHAMBER_DECK', to: 'PLAYER_HAND', label: 'Chamber Deck → Hand', detail: msg };
  if (/went to .* hand/i.test(msg)) return { from: 'REVEAL_ZONE', to: 'PLAYER_HAND', label: 'Reveal Zone → Hand', detail: msg };
  if (/faces/i.test(msg)) return { from: 'REVEAL_ZONE', to: 'COMBAT_ZONE', label: 'Reveal Zone → Combat Zone', detail: msg };
  if (/played/i.test(msg) && /combat|Foe|side|modifier|Prepared|Puddle|Health|Confidence|Stair/i.test(msg)) return { from: 'PLAYER_HAND', to: 'COMBAT_ZONE', label: 'Hand → Combat Zone', detail: msg };
  if (/looted .* from/i.test(msg)) return { from: 'BODY_LOOT', to: 'PLAYER_HAND', label: 'Body Loot → Hand', detail: msg };
  if (/discarded|discard/i.test(msg)) return { from: 'TABLE', to: 'DISCARD', label: 'Card → Discard', detail: msg };
  if (/rolled .*to see who goes first/i.test(msg)) return { from: 'DIE', to: 'TABLE', label: 'Die Roll → Opening Roll', detail: msg };
  if (/rolled Flee/i.test(msg)) return { from: 'DIE', to: 'FLEE_ZONE', label: 'Die Roll → Flee Zone', detail: msg };
  if (/escaped|failed to escape/i.test(msg)) return { from: 'FLEE_ZONE', to: 'RESULT', label: 'Flee Zone → Result', detail: msg };
  return { from: null, to: null, label: 'Latest table event', detail: msg };
}

function tableBoardHtml(options = {}) {
  const activeCard = options.activeCard || state.tableNotice?.card || state.revealCard;
  const centerHtml = defaultCenterStageHtml({ ...options, activeCard });
  return tableFrameHtml(centerHtml, { mode: options.mode || centerZoneClass() });
}

function tableFrameHtml(centerHtml, options = {}) {
  const move = deriveMovement();
  return `${announcementHtml()}<div class="felt-table v070-table v073-table v076-table ${escapeHtml(options.mode || '')}">
    <div class="table-seats v070-seats">${tableSeatsHtml()}</div>
    ${mobileDeckStripHtml(move)}
    <div class="v070-surface">
      <div class="v070-deck-column chamber-column">
        ${boardPile('CHAMBER_DECK', 'Chamber', 'Deck', state.decks?.chamber || 0, move)}
        ${boardPile('CHAMBER_DISCARD', 'Chamber', 'Discard', state.decks?.chamberDiscard || 0, move)}
      </div>
      <div class="v070-center-stage ${escapeHtml(options.stageClass || '')}">
        ${centerHtml}
      </div>
      <div class="v070-deck-column loot-column">
        ${boardPile('LOOT_DECK', 'Loot', 'Deck', state.decks?.loot || 0, move)}
        ${boardPile('LOOT_DISCARD', 'Loot', 'Discard', state.decks?.lootDiscard || 0, move)}
      </div>
    </div>
    ${motionLayerHtml(move)}
  </div>`;
}


function mobileDeckStripHtml(move) {
  const piles = [
    { key: 'CHAMBER_DECK', label: 'Chamber', sub: 'Deck', count: state.decks?.chamber || 0 },
    { key: 'CHAMBER_DISCARD', label: 'Ch. Discard', sub: 'Discard', count: state.decks?.chamberDiscard || 0 },
    { key: 'LOOT_DECK', label: 'Loot', sub: 'Deck', count: state.decks?.loot || 0 },
    { key: 'LOOT_DISCARD', label: 'Loot Discard', sub: 'Discard', count: state.decks?.lootDiscard || 0 }
  ];
  return `<div class="mobile-deck-strip" aria-label="Deck and discard counts">${piles.map((p) => {
    const classes = ['mobile-deck-chip'];
    if (move?.from === p.key) classes.push('source');
    if (move?.to === p.key) classes.push('destination');
    if (Number(p.count || 0) <= 0) classes.push('empty');
    return `<div class="${classes.join(' ')}">
      ${deckPileImageHtml({ key: p.key }, 'mobile-deck-art')}
      <span><strong>${escapeHtml(p.label)}</strong><small>${Number(p.count || 0)} card${Number(p.count || 0) === 1 ? '' : 's'}</small></span>
    </div>`;
  }).join('')}</div>`;
}

function defaultCenterStageHtml(options = {}) {
  const move = deriveMovement();
  const notice = state.tableNotice;
  const centerLabel = options.centerLabel || centerZoneLabel();
  const centerSub = options.centerSub || centerZoneSub();
  const centerClass = options.centerClass || centerZoneClass();
  const activeCard = options.activeCard || state.revealCard || notice?.card;
  return `<div class="table-core-center v070-default-center">
    <div class="movement-banner ${state?.announcement ? 'is-duplicate-event' : ''} ${notice || move?.from || move?.to ? 'active' : ''}">
      <div class="movement-label">${escapeHtml(notice?.title || move?.label || 'Table ready')}</div>
      <div class="movement-detail">${escapeHtml(notice?.detail || move?.detail || 'Cards and dice will resolve in the middle of the table.')}</div>
    </div>
    <div class="center-zone ${centerClass}">
      <strong>${escapeHtml(centerLabel)}</strong>
      <span>${escapeHtml(centerSub)}</span>
      ${activeCard ? `<div class="center-card-slot">${cardHtml(activeCard, { tableSmall: true })}</div>` : ''}
    </div>
  </div>`;
}

function tableSeatsHtml() {
  const positions = ['seat-left', 'seat-top', 'seat-right'];
  return state.players.map((p, i) => `<button class="table-seat ${positions[i] || ''} ${p.id === state.activePlayerId ? 'active' : ''} ${p.isYou ? 'you' : ''} ${p.connected ? '' : 'offline'}" data-player-seat="${p.id}">
    <span class="seat-name">${escapeHtml(p.name)}${p.isYou ? ' · you' : ''}</span>
    <span class="seat-hud-row"><span class="seat-glory">${p.renown}/10 Glory</span><span class="seat-power">PWR ${playerPower(p)}</span></span>
    <span class="seat-identity">${escapeHtml(identityLine(p))}</span>
    <span class="seat-sub">Hand ${p.handCount} · Gear +${p.combatBonus} · Flee +${p.escapeBonus}</span>
    ${statusMiniHtml(p)}
  </button>`).join('');
}


function statusMiniHtml(p) {
  const effects = (p.statusEffects || []).filter((e) => e.visible !== false);
  if (!effects.length) return '';
  return `<div class="status-mini">${effects.slice(0,3).map((e) => `<span class="status-chip" title="${escapeHtml(e.description || '')}">${escapeHtml(e.publicName || 'Effect')}</span>`).join('')}</div>`;
}

function attachTableSeatHandlers(root) {
  root.querySelectorAll('[data-player-seat]').forEach((btn) => btn.addEventListener('click', () => {
    const p = state.players.find((x) => x.id === btn.dataset.playerSeat);
    if (p) inspectPlayer(p);
  }));
}

function boardPile(key, label, sub, count, move) {
  const classes = ['board-pile'];
  if (/CHAMBER/.test(key)) classes.push('pile-chamber');
  if (/LOOT/.test(key)) classes.push('pile-loot');
  if (/DISCARD/.test(key)) classes.push('pile-discard');
  if (move?.from === key) classes.push('source');
  if (move?.to === key) classes.push('destination');
  if (Number(count || 0) <= 0) classes.push('empty');
  return `<div class="${classes.join(' ')}">
    ${deckPileImageHtml({ key }, 'deck-pile-art table-deck-art')}
    <div><strong>${deckPileIconHtml(key)}${escapeHtml(label)}</strong><small>${escapeHtml(sub)} · ${Number(count || 0)}</small></div>
  </div>`;
}

function centerZoneLabel() {
  if (state.phase === 'ROLL_FOR_FIRST') return 'Opening Roll';
  if (state.phase === 'COMBAT') return 'Combat Zone';
  if (state.phase === 'ESCAPE') return 'Flee Zone';
  if (state.revealCard) return 'Reveal Zone';
  if (state.bodyLoot) return 'Goblin Down';
  if (state.pendingPrompt) return 'Prompt Zone';
  return 'Table Center';
}

function centerZoneSub() {
  if (state.phase === 'ROLL_FOR_FIRST') return 'Every goblin rolls a d6. Highest starts. Ties reroll.';
  if (state.phase === 'COMBAT') return 'Foes, modifiers, and played Tricks live here.';
  if (state.phase === 'ESCAPE') return 'Dice rolls and Bad News resolve here.';
  if (state.revealCard) return `${state.revealCard.publicName} is being resolved.`;
  if (state.bodyLoot) return state.bodyLoot.requiresYou ? 'Choose one card from the fallen goblin.' : `Body looting: waiting for ${state.bodyLoot.currentLooterName || 'a player'}.`;
  if (state.pendingPrompt) return state.pendingPrompt.message || 'Waiting for a player choice.';
  return 'Revealed cards will appear here.';
}

function centerZoneClass() {
  if (state.phase === 'ROLL_FOR_FIRST') return 'roll-center';
  if (state.phase === 'COMBAT') return 'combat-center';
  if (state.phase === 'ESCAPE') return 'flee-center';
  if (state.revealCard) return 'reveal-center';
  if (state.bodyLoot) return 'body-loot-center';
  return '';
}

function renderPhaseBanner() {
  const root = $('phaseBanner');
  const you = me();
  let title = '';
  let copy = '';
  let buttons = [];

  if (state.reaction) {
    const r = state.reaction;
    title = r.title || 'Reaction Window';
    copy = r.message || 'A player may respond before the game continues.';
    buttons = reactionButtons(r);
  } else if (state.phase === 'GAME_OVER') {
    const winner = state.players.find((p) => p.id === state.winnerId);
    title = `VICTORY — ${winner?.name || 'Someone'} reached 10 Glory`;
    copy = 'History will exaggerate this.';
  } else if (state.pendingPrompt) {
    title = state.pendingPrompt.requiresYou ? 'Your decision required' : 'Table prompt pending';
    copy = state.pendingPrompt.message;
  } else if (state.phase === 'ROLL_FOR_FIRST') {
    const first = state.firstRoll || {};
    const rolled = first.rolls?.[me()?.id];
    const eligibleNames = (first.eligible || []).map(playerName).join(', ');
    title = first.requiresYou ? 'Roll to See Who Goes First' : 'Opening Roll';
    copy = first.requiresYou ? 'Tap the die. Highest roll opens the first Chamber. Ties reroll.' : `Waiting for opening rolls from ${eligibleNames || 'the table'}.`;
    if (first.requiresYou) buttons.push(buttonHtml('Roll d6', 'ROLL_FIRST', 'primary'));
  } else if (state.phase === 'START_TURN') {
    title = isMyTurn() ? 'Your Turn — Open Chamber' : `${active()?.name}'s Turn`;
    copy = isMyTurn() ? 'Open a Chamber, or play setup cards first.' : `Waiting for ${active()?.name}.`;
    if (isMyTurn()) { buttons.push(buttonHtml('Open Chamber', 'OPEN_CHAMBER', 'primary')); buttons.push(buttonHtml('Sell Gear', 'SELL_GEAR')); }
  } else if (state.phase === 'NO_THREAT_CHOICE') {
    title = isMyTurn() ? 'Your Turn · Choose Move' : `${active()?.name} chooses`;
    copy = isMyTurn() ? 'Use the center panel or a glowing Foe in hand.' : `Waiting for ${active()?.name}.`;
    if (isMyTurn()) {
      buttons.push(buttonHtml('Loot the Room', 'SEARCH_ROOM', 'primary'));
      buttons.push(buttonHtml('Sell Gear', 'SELL_GEAR'));
    }
  } else if (state.phase === 'COMBAT') {
    const totals = state.combat?.totals;
    const outcome = combatOutcome(totals);
    title = `Combat — ${active()?.name} vs ${state.combat?.threats?.[0]?.publicName || 'Foe'}`;
    const done = Boolean(state.combat?.passes?.[you?.id]);
    copy = done ? `${outcome.shortLabel}. You are locked in unless someone plays a new card.` : `${outcome.shortLabel}. Play a card, ask for Backup, or tap Done.`;
    buttons = combatButtons();
  } else if (state.phase === 'ESCAPE') {
    const runner = state.players.find((p) => p.id === state.escape?.currentPlayerId);
    const foeName = state.escape?.threat?.publicName || 'the Foe';
    const bonus = state.escape?.fleeBonus || 0;
    title = runner?.isYou ? `Your Flee Roll — ${foeName}` : `${runner?.name || 'Someone'} must Flee`;
    copy = runner?.isYou
      ? `Roll 1d6. Target: 5+. Your current Flee bonus: ${signed(bonus)}.`
      : `Waiting for ${runner?.name || 'the runner'} to roll 1d6 against ${foeName}. Target: 5+.`;
    if (runner?.isYou) {
      if (!state.escape?.awaitingContinue && hasLittleHelper(me())) buttons.push(buttonHtml('Sacrifice Little Helper', 'SACRIFICE_HIRELING_FLEE'));
      buttons.push(buttonHtml(state.escape?.awaitingContinue ? 'Continue' : (state.escape?.autoFlee ? 'Use Automatic Flee' : 'Roll to Flee'), state.escape?.awaitingContinue ? 'CONTINUE_FLEE' : 'ROLL_ESCAPE', 'primary'));
    }
  } else if (state.phase === 'POST_COMBAT') {
    title = isMyTurn() ? 'Use Loot Before Tribute' : `${active()?.name} is using Loot`;
    copy = isMyTurn() ? 'You may play, equip, carry, or sell legal cards you just gained. Continue when you are done.' : `Waiting for ${active()?.name} to finish using Loot.`;
    if (isMyTurn()) { buttons.push(buttonHtml('Sell Gear', 'SELL_GEAR')); buttons.push(buttonHtml('Done with Loot → Tribute', 'DONE_POST_COMBAT', 'primary')); }
  } else if (state.phase === 'TRIBUTE') {
    title = isMyTurn() ? 'Tribute Required' : `${active()?.name} must resolve Tribute`;
    copy = isMyTurn() ? `Your hand is ${you.handCount}/${you.handLimit}. Choose excess cards below.` : `Waiting for ${active()?.name} to give or discard excess cards.`;
  } else if (state.phase === 'END_TURN') {
    title = isMyTurn() ? 'Turn Ending' : `${active()?.name}'s turn is wrapping up`;
    copy = isMyTurn() ? 'Tap End Turn, or sell Gear first.' : `Waiting for ${active()?.name}.`;
    if (isMyTurn()) { buttons.push(buttonHtml('End Turn', 'END_TURN', 'primary')); buttons.push(buttonHtml('Sell Gear', 'SELL_GEAR')); }
  } else {
    title = `${prettyPhase(state.phase)}`;
    copy = 'Follow the table prompt.';
  }

  buttons = ensureCriticalActionButtons(buttons);
  const compactStatusStrip = window.innerWidth <= 760 && ['NO_THREAT_CHOICE'].includes(state.phase);
  root.className = `phase-banner panel phase-${String(state.phase || 'state').toLowerCase().replace(/[^a-z0-9]+/g, '-')} ${compactStatusStrip ? 'mobile-status-strip' : ''}`;
  root.innerHTML = `<div class="eyebrow">Room ${state.code} · Turn ${state.turnNumber || 0}</div><h2>${escapeHtml(title)}</h2>${copy ? `<p>${escapeHtml(copy)}</p>` : ''}<div class="primary-action">${buttons.join('')}</div>`;
  root.querySelectorAll('[data-action]').forEach((btn) => btn.addEventListener('click', () => emitAction(btn.dataset.action)));
  root.querySelectorAll('[data-combat-action]').forEach((btn) => btn.addEventListener('click', () => handleCombatButton(btn.dataset.combatAction, btn.dataset.target, btn.dataset.lootCount, btn.dataset.allLoot)));
  root.querySelectorAll('[data-reaction-action]').forEach((btn) => btn.addEventListener('click', () => handleReactionButton(btn.dataset.reactionAction, btn.dataset.value)));
}



function ensureCriticalActionButtons(buttons) {
  const legal = state?.legalActions || [];
  const hasAction = (action) => buttons.some((html) => String(html).includes(`data-action="${action}"`));
  if (legal.includes('END_TURN') && !hasAction('END_TURN')) {
    buttons.unshift(buttonHtml('End Turn', 'END_TURN', 'primary'));
  }
  if (legal.includes('DONE_POST_COMBAT') && !hasAction('DONE_POST_COMBAT')) {
    buttons.unshift(buttonHtml('Done with Loot → Tribute', 'DONE_POST_COMBAT', 'primary'));
  }
  if (legal.includes('OPEN_CHAMBER') && !hasAction('OPEN_CHAMBER')) {
    buttons.unshift(buttonHtml('Open Chamber', 'OPEN_CHAMBER', 'primary'));
  }
  return buttons;
}

function reactionButtons(r) {
  if (!r?.requiresYou) return [`<span class="micro">Waiting on ${escapeHtml((r.eligiblePlayerIds || []).map(playerName).join(', ') || 'the table')}.</span>`];
  const buttons = [];
  if (r.type === 'HEX_CANCEL_REACTION') {
    if (hasHandCardId('SPECIAL_WISHING_RING_A')) buttons.push(`<button class="primary" data-reaction-action="USE_WISH_RING">Use Wish Ring</button>`);
    buttons.push(`<button data-reaction-action="PASS_REACTION">Let Hex Resolve</button>`);
  } else if (r.type === 'DIE_ROLL_REACTION') {
    if (hasHandCardId('SPECIAL_LOADED_DIE')) {
      buttons.push(`<span class="micro">Loaded Die: choose the new die face.</span>`);
      for (let i = 1; i <= 6; i++) buttons.push(`<button class="die-choice" data-reaction-action="USE_LOADED_DIE" data-value="${i}">${i}</button>`);
    }
    buttons.push(`<button data-reaction-action="PASS_REACTION">Keep Roll</button>`);
  } else if (r.type === 'FLEE_FAILURE_REACTION') {
    if (hasHandCardId('TRICK_INVISIBILITY')) buttons.push(`<button class="primary" data-reaction-action="USE_INVISIBILITY_ESCAPE">Use Invisibility Potion</button>`);
    buttons.push(`<button data-reaction-action="PASS_REACTION">Take Bad News</button>`);
  } else if (r.type === 'FLEE_SUCCESS_REACTION') {
    if (hasHandCardId('TRICK_FLASK_GLUE')) buttons.push(`<button class="primary" data-reaction-action="USE_FLASK_GLUE">Use Flask of Glue</button>`);
    buttons.push(`<button data-reaction-action="PASS_REACTION">No Reaction</button>`);
  }
  return buttons;
}
function hasHandCardId(id) { return Boolean((state?.you?.hand || []).some((c) => c.id === id)); }
function handleReactionButton(action, value) {
  if (action === 'PASS_REACTION') emitAction('PASS_REACTION');
  if (action === 'USE_WISH_RING') emitAction('USE_WISH_RING');
  if (action === 'USE_LOADED_DIE') emitAction('USE_LOADED_DIE', { value: Number(value) });
  if (action === 'USE_INVISIBILITY_ESCAPE') emitAction('USE_INVISIBILITY_ESCAPE');
  if (action === 'USE_FLASK_GLUE') emitAction('USE_FLASK_GLUE');
}

function buttonHtml(label, action, cls = '') { return `<button class="${cls}" data-action="${action}">${escapeHtml(label)}</button>`; }

function combatButtons() {
  const buttons = [];
  const you = me();
  const combat = state.combat;
  if (!combat) return buttons;
  const req = combat.backupRequest;
  const totalLoot = combat.threats?.reduce((sum, t) => sum + Number(t.finalLoot || t.lootReward || 0), 0) || 0;
  if (req) {
    if (req.fromPlayerId === you.id) {
      buttons.push(`<span class="micro action-note">Offer Loot to ${escapeHtml(playerName(req.toPlayerId))}. Glory is not negotiable by default.</span>`);
      const counts = Array.from(new Set([0, 1, 2, totalLoot].filter((n) => n >= 0 && n <= totalLoot)));
      for (const n of counts) buttons.push(`<button ${n === Number(req.deal?.lootCount || -1) ? 'class="primary"' : ''} data-combat-action="SET_BACKUP_DEAL" data-loot-count="${n}">${n === 0 ? 'Offer Free Help' : `Offer ${n} Loot`}</button>`);
      if (totalLoot > 0) buttons.push(`<button data-combat-action="SET_BACKUP_DEAL" data-all-loot="1">Offer All Loot</button>`);
      return buttons;
    }
    if (req.toPlayerId === you.id) {
      if (req.deal) {
        buttons.push(`<span class="micro action-note">Deal offered: you get ${Number(req.deal.lootCount || 0)} of ${totalLoot} Loot if the Foe is defeated.</span>`);
        buttons.push(`<button class="primary" data-combat-action="ACCEPT_BACKUP">Accept Deal & Help</button>`);
      } else {
        buttons.push(`<span class="micro action-note">${escapeHtml(playerName(req.fromPlayerId))} is choosing your Backup deal.</span>`);
      }
      buttons.push(`<button data-combat-action="DECLINE_BACKUP">Decline Backup</button>`);
      return buttons;
    }
    buttons.push(`<span class="micro action-note">Backup negotiation: ${escapeHtml(playerName(req.fromPlayerId))} ↔ ${escapeHtml(playerName(req.toPlayerId))}</span>`);
    return buttons;
  }
  if (combat.activePlayerId === you.id && !combat.helperPlayerId) {
    for (const p of state.players.filter((p) => p.id !== you.id)) {
      buttons.push(`<button data-combat-action="REQUEST_BACKUP" data-target="${p.id}">Ask ${escapeHtml(p.name)} for Backup</button>`);
    }
  }
  const youAreDone = Boolean(combat.passes?.[you.id]);
  if (!youAreDone) {
    if (hasPublicRole(you, 'Bruiser')) buttons.push(`<button data-combat-action="BRUISER_BERSERK">Bruiser: discard for +3</button>`);
    if (hasPublicRole(you, 'Cutpurse') && combat.activePlayerId !== you.id) buttons.push(`<button data-combat-action="CUTPURSE_BACKSTAB">Cutpurse: backstab -2</button>`);
    if (hasPublicRole(you, 'Hexhand') && combat.activePlayerId === you.id) buttons.push(`<button data-combat-action="HEXHAND_CHARM">Hexhand: charm Foe</button>`);
  }
  if (youAreDone) buttons.push(`<button class="selected-action" disabled>✓ Done — Waiting on Others</button>`);
  else buttons.push(`<button data-combat-action="PASS_COMBAT">Done — No More Plays</button>`);
  return buttons;
}

function handleCombatButton(action, target, lootCount, allLoot) {
  if (action === 'REQUEST_BACKUP') emitAction('REQUEST_BACKUP', { targetPlayerId: target });
  else if (action === 'SET_BACKUP_DEAL') emitAction('SET_BACKUP_DEAL', { lootCount: Number(lootCount || 0), allLoot: Boolean(allLoot) });
  else if (action === 'BRUISER_BERSERK') emitAction('BRUISER_BERSERK');
  else if (action === 'CUTPURSE_BACKSTAB') emitAction('CUTPURSE_BACKSTAB');
  else if (action === 'HEXHAND_CHARM') emitAction('HEXHAND_CHARM');
  else emitAction(action);
}

function renderPlayers() {
  const root = $('playerStrip');
  root.innerHTML = '';
  for (const p of state.players) {
    const div = document.createElement('div');
    div.className = `player-mini ${p.id === state.activePlayerId ? 'active' : ''} ${p.isYou ? 'you' : ''} ${p.connected ? '' : 'offline'}`;
    const leader = p.renown >= 9 ? '<div class="warning">one combat win away</div>' : p.renown >= 8 ? '<div class="warning">getting dangerous</div>' : '';
    div.innerHTML = `
      <div class="player-head"><div class="player-name">${escapeHtml(p.name)}${p.isYou ? ' (you)' : ''}</div><div class="renown">${p.renown}/10</div></div>
      ${leader}
      <div class="player-stats">Power ${playerPower(p)} · Hand ${p.handCount}/${p.handLimit} · Gear +${p.combatBonus} · Flee +${p.escapeBonus} · ${p.connected ? 'online' : 'offline'}</div>
      <div class="player-stats">${escapeHtml(identityLine(p))}</div>
      <div class="slot-line">${slotChips(p)}</div>
      ${statusMiniHtml(p)}
    `;
    div.addEventListener('click', () => inspectPlayer(p));
    root.appendChild(div);
  }
}

function slotChips(p) {
  const gear = p.equippedGear || [];
  const bySlot = (slot) => gear.filter((g) => g.slot === slot).map((g) => `${g.publicName} +${g.combatBonus || 0}`).join(', ') || 'empty';
  return ['HEAD','BODY','FEET','HAND','NO_SLOT'].map((slot) => `<span class="chip">${slot}: ${escapeHtml(bySlot(slot))}</span>`).join('');
}

function renderActiveTable() {
  const root = $('activeTable');
  if (isMobileView()) return renderMobilePlayShell(root);
  if (state.phase === 'ROLL_FOR_FIRST') return renderFirstRoll(root);
  if (state.phase === 'COMBAT' && state.combat) return renderCombat(root);
  if (state.phase === 'ESCAPE' && state.escape) return renderEscape(root);
  root.innerHTML = tableBoardHtml({ activeCard: state.revealCard || state.tableNotice?.card });
  attachTableSeatHandlers(root);
}

function renderMobilePlayShell(root) {
  const move = deriveMovement();
  const stage = mobileStageHtml();
  const phaseClass = `phase-${String(state.phase || 'state').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  root.innerHTML = `<div class="mobile-app-shell ${phaseClass}">
    ${mobilePlayerHudHtml()}
    ${mobileZeroGloryNoticeHtml()}
    ${mobileDeckStripHtml(move)}
    ${stage}
  </div>`;
  attachTableSeatHandlers(root);
  root.querySelectorAll('[data-mobile-inspect-card]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.mobileInspectCard;
      const card = findVisibleCardByInstance(id);
      if (card) inspectCard(card);
    });
  });
  root.querySelectorAll('[data-mobile-card-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cardId = btn.dataset.cardId;
      const action = btn.dataset.mobileCardAction;
      if (!cardId || !action) return;
      if (action === 'PLAY') emitAction('PLAY_CARD', { cardId });
      if (action === 'EQUIP') emitAction('PLAY_CARD', { cardId, mode: 'EQUIP' });
      if (action === 'CARRY') emitAction('PLAY_CARD', { cardId, mode: 'CARRY' });
    });
  });
  root.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => emitAction(btn.dataset.action));
  });
  root.querySelectorAll('[data-combat-action]').forEach((btn) => {
    btn.addEventListener('click', () => handleCombatButton(btn.dataset.combatAction, btn.dataset.target, btn.dataset.lootCount, btn.dataset.allLoot));
  });
  root.querySelectorAll('[data-reaction-action]').forEach((btn) => {
    btn.addEventListener('click', () => handleReactionButton(btn.dataset.reactionAction, btn.dataset.value));
  });
  root.querySelectorAll('[data-mobile-tribute-confirm]').forEach((btn) => {
    btn.addEventListener('click', () => confirmTribute());
  });
}


function mobileZeroGloryNoticeHtml() {
  const zero = (state.players || []).filter((p) => Number(p.renown || 0) <= 0 && !p.dead);
  if (!zero.length) return '';
  return `<div class="mobile-zero-glory-alert">
    ${assetIconHtml('death', 'event-sigil')}
    <span>${escapeHtml(zero.map((p) => p.isYou ? 'You' : p.name).join(', '))} ${zero.length === 1 ? 'is' : 'are'} at 0 Glory. Build back up by gaining Glory.</span>
  </div>`;
}

function mobilePlayerHudHtml() {
  return `<div class="mobile-player-hud">${state.players.map((p) => {
    const isActive = p.id === state.activePlayerId;
    const activeClass = isActive ? 'active' : '';
    const youClass = p.isYou ? 'you' : '';
    const deadClass = p.dead ? 'dead' : '';
    const statusCount = (p.statusEffects || []).filter((e) => e.visible !== false).length;
    return `<button class="mobile-player-chip ${activeClass} ${youClass} ${deadClass}" data-player-seat="${p.id}">
      ${isActive ? `<span class="mobile-turn-badge">${p.isYou ? 'YOUR TURN' : 'TURN'}</span>` : ''}
      ${p.dead ? '<span class="mobile-death-badge">DOWN</span>' : Number(p.renown || 0) <= 0 ? '<span class="mobile-zero-badge">0 GLORY</span>' : ''}
      <span class="mobile-player-name">${escapeHtml(p.name)}${p.isYou ? ' · you' : ''}</span>
      <span class="mobile-player-stats"><b>GL ${p.renown}/10</b><b>PWR ${playerPower(p)}</b></span>
      ${statusCount ? `<span class="mobile-status-dot">${statusCount}</span>` : ''}
    </button>`;
  }).join('')}</div>`;
}

function mobileStageHtml() {
  if (state.phase === 'COMBAT' && state.combat) return mobileCombatStageHtml(state.combat);
  if (state.phase === 'ESCAPE' && state.escape) return mobileFleeStageHtml(state.escape);
  if (state.phase === 'ROLL_FOR_FIRST') return mobileOpeningRollStageHtml();
  if (state.phase === 'TRIBUTE') return mobileTributeStageHtml();
  if (state.phase === 'START_TURN') return mobileStartTurnStageHtml();
  if (state.phase === 'NO_THREAT_CHOICE') return mobileNoFoeStageHtml();
  if (state.phase === 'POST_COMBAT') return mobilePostCombatStageHtml();
  if (state.phase === 'END_TURN') return mobileEndTurnStageHtml();
  if (state.bodyLoot) return mobileBodyLootStageHtml();
  if (state.pendingPrompt) return mobilePromptStageHtml(state.pendingPrompt);
  if (state.phase === 'GAME_OVER') return mobileGameOverStageHtml();
  return mobileRevealOrWaitingStageHtml();
}

function mobileStageShell(kind, kicker, title, bodyHtml, options = {}) {
  const size = options.size || 'medium';
  const icon = options.icon ? `<div class="mobile-state-icon">${assetIconHtml(options.icon, 'asset-sigil event-sigil')}</div>` : '';
  return `<section class="mobile-state-panel mobile-state-${escapeHtml(kind)} mobile-state-size-${escapeHtml(size)}">
    <div class="mobile-state-header">
      ${icon}
      <div class="mobile-state-kicker">${escapeHtml(kicker)}</div>
    </div>
    <h2>${escapeHtml(title)}</h2>
    ${options.sub ? `<p class="mobile-state-sub">${escapeHtml(options.sub)}</p>` : ''}
    ${bodyHtml}
  </section>`;
}


function mobileActionButtonsHtml(buttons, cls = '') {
  const clean = (buttons || []).filter(Boolean);
  if (!clean.length) return '';
  return `<div class="mobile-center-actions ${escapeHtml(cls)}">${clean.join('')}</div>`;
}

function mobileLegalActionButton(label, action, cls = '') {
  return buttonHtml(label, action, cls);
}

function mobileTributeConfirmButton(need, selected) {
  const disabled = selected !== need || need <= 0 ? 'disabled' : '';
  return `<button class="primary" data-mobile-tribute-confirm ${disabled}>Confirm Tribute</button>`;
}

function mobileStartTurnStageHtml() {
  const mine = isMyTurn();
  const actions = mine ? mobileActionButtonsHtml([
    mobileLegalActionButton('Sell Gear', 'SELL_GEAR')
  ], 'start-turn-actions secondary-only') : '';
  return mobileStageShell('start-turn', mine ? 'Your Turn' : 'Turn Start', mine ? 'Open a Chamber' : `${active()?.name || 'A goblin'} is up`, `
    <button class="mobile-choice-card mobile-choice-button mobile-primary-choice ${mine ? '' : 'disabled'}" ${mine ? 'data-action="OPEN_CHAMBER"' : 'disabled'}>
      ${assetIconHtml('chamber', 'asset-sigil event-sigil')}
      <div><strong>${mine ? 'Open Chamber' : 'Chamber Deck'}</strong><span>${mine ? 'Tap this card to open the door.' : `${Number(state.decks?.chamber || 0)} cards remain`}</span></div>
    </button>
    <p class="mobile-state-hint">${mine ? 'Setup cards in your hand glow if they can be played first.' : `${active()?.name || 'The active goblin'} can open a Chamber or play setup cards.`}</p>
    ${actions}
  `, { size: 'small', icon: 'chamber', sub: mine ? 'Choose when to open the door.' : 'Waiting for the active goblin.' });
}


function mobileQuickRevealButtons(card) {
  if (!card || !isMyTurn()) return '';
  const phaseOk = ['NO_THREAT_CHOICE','POST_COMBAT','END_TURN','START_TURN'].includes(state.phase);
  const buttons = [];
  if ((card.type === 'ROLE' || card.type === 'ORIGIN') && phaseOk) {
    buttons.push(`<button class="primary" data-mobile-card-action="PLAY" data-card-id="${card.instanceId}">Play ${escapeHtml(card.publicName)}</button>`);
  } else if (card.type === 'GEAR' && !isOneUseConsumableCard(card) && phaseOk) {
    buttons.push(`<button class="primary" data-mobile-card-action="EQUIP" data-card-id="${card.instanceId}">Equip</button>`);
    buttons.push(`<button data-mobile-card-action="CARRY" data-card-id="${card.instanceId}">Carry</button>`);
  } else if (card.type === 'SPECIAL') {
    const timing = card.timing || [];
    const canSpecial = timing.includes('ANY_TIME') || (timing.includes('DURING_COMBAT') && state.phase === 'COMBAT') || (isMyTurn() && phaseOk);
    const needsTarget = ['SPECIAL_STEAL_LEVEL', 'SPECIAL_TRANSFERRAL'].includes(card.id);
    if (canSpecial && !needsTarget) {
      buttons.push(`<button class="primary" data-mobile-card-action="PLAY" data-card-id="${card.instanceId}">Play Special</button>`);
    }
  }
  buttons.push(`<button data-mobile-inspect-card="${card.instanceId}">View Card</button>`);
  return `<div class="mobile-reveal-actions">${buttons.join('')}</div>`;
}

function mobileOpenedDoorResultHtml(mine, actor) {
  const card = state.revealCard || state.tableNotice?.card || null;
  if (!card || card.type === 'THREAT') return '';
  const isHex = card.type === 'HEX';
  const typeName = typeLabel(card);
  const contextLine = isHex ? 'Hex · Resolved immediately' : `${typeName} · Face-Up Chamber`;
  const statusLine = isHex
    ? `${mine ? 'You were hit' : `${actor} was hit`} by ${card.publicName}.`
    : 'Added to your hand';
  const subLine = isHex
    ? (mine ? 'No Foe appeared. Choose your next move.' : `${actor} can now choose a move.`)
    : (isCardPlayable(card) ? 'Playable now' : 'Choose whether to use it now or keep it in hand.');
  return `<div class="mobile-opened-door-card mobile-opened-door-action-first ${cardTypeClass(card)}">
    <div class="mobile-card-sigil">${cardTypeSigilHtml(card, 'asset-sigil art-sigil')}</div>
    <div class="mobile-opened-door-copy">
      <strong>${escapeHtml(card.publicName)}</strong>
      <div class="mobile-card-type">${escapeHtml(contextLine)}</div>
      <span class="mobile-opened-door-status">${escapeHtml(statusLine)}</span>
      <small>${escapeHtml(subLine)}</small>
    </div>
    ${isHex ? `<button class="mobile-mini-button" data-mobile-inspect-card="${card.instanceId}">View</button>` : ''}
    ${isHex ? '' : mobileQuickRevealButtons(card)}
  </div>`;
}

function mobileNoFoeStageHtml() {
  const mine = isMyTurn();
  const actor = active()?.name || 'The active goblin';
  const openedDoor = mobileOpenedDoorResultHtml(mine, actor);
  const actions = mine ? mobileActionButtonsHtml([
    mobileLegalActionButton('Sell Gear', 'SELL_GEAR')
  ], 'no-foe-actions secondary-only') : '';
  const heading = openedDoor ? 'Choose your move' : (mine ? 'Choose your move' : `Waiting on ${actor}`);
  const troubleHint = mine
    ? `<p class="mobile-state-hint mobile-trouble-hint">Foe cards in your hand glow when they can Start Trouble.</p>`
    : `<p class="mobile-state-hint">${escapeHtml(actor)} can Start Trouble or Loot the Room.</p>`;
  return mobileStageShell('no-foe', mine ? 'Choose Move' : `${actor} chooses`, heading, `
    ${openedDoor}
    ${troubleHint}
    <div class="mobile-choice-grid mobile-no-foe-grid ${openedDoor ? 'after-opened-door' : ''}">
      <div class="mobile-choice-card mobile-choice-linked-hand ${mine ? '' : 'is-observer'}">
        ${assetIconHtml('strength', 'asset-sigil event-sigil')}
        <div><strong>${mine ? 'Start Trouble' : `${actor} may Start Trouble`}</strong><span>${mine ? 'Tap a glowing Foe in your hand.' : 'They may play a Foe from hand.'}</span></div>
      </div>
      <button class="mobile-choice-card mobile-choice-button mobile-primary-choice ${mine ? '' : 'disabled is-observer'}" ${mine ? 'data-action="SEARCH_ROOM"' : 'disabled'}>
        ${assetIconHtml('loot', 'asset-sigil event-sigil')}
        <div><strong>${mine ? 'Loot the Room' : `${actor} may Loot the Room`}</strong><span>${mine ? 'Draw a hidden Chamber card.' : 'They may draw a hidden Chamber card.'}</span></div>
      </button>
    </div>
    ${actions}
  `, { size: 'small', icon: openedDoor ? null : (mine ? 'chamber' : 'loot'), sub: '' });
}

function mobilePostCombatStageHtml() {
  const mine = isMyTurn();
  const actions = mine ? mobileActionButtonsHtml([
    mobileLegalActionButton('Done with Loot → Tribute', 'DONE_POST_COMBAT', 'primary'),
    mobileLegalActionButton('Sell Gear', 'SELL_GEAR')
  ], 'post-combat-actions') : '';
  return mobileStageShell('post-combat', mine ? 'Use Loot' : 'Loot Phase', mine ? 'Use Loot Before Tribute' : `${active()?.name || 'A goblin'} is using Loot`, `
    <div class="mobile-choice-card">
      ${assetIconHtml('loot', 'asset-sigil event-sigil')}
      <div><strong>${mine ? 'Play, equip, carry, or sell' : 'Loot is being managed'}</strong><span>${mine ? 'When done, continue to Tribute.' : 'Waiting for the active goblin.'}</span></div>
    </div>
    ${actions}
  `, { size: 'small', icon: 'loot', sub: mine ? 'Finish using new cards.' : 'Waiting.' });
}

function mobileEndTurnStageHtml() {
  const mine = isMyTurn();
  const actions = mine ? mobileActionButtonsHtml([
    mobileLegalActionButton('End Turn', 'END_TURN', 'primary'),
    mobileLegalActionButton('Sell Gear', 'SELL_GEAR')
  ], 'end-turn-actions') : '';
  return mobileStageShell('end-turn', mine ? 'Turn Ending' : 'Turn Ending', mine ? 'End your turn when ready' : `${active()?.name || 'A goblin'} is wrapping up`, `
    <div class="mobile-choice-card">
      ${assetIconHtml('discard', 'asset-sigil event-sigil')}
      <div><strong>${mine ? 'Ready to pass the torch?' : 'Waiting for End Turn'}</strong><span>${mine ? 'End the turn from here, or sell Gear first.' : `${active()?.name || 'The active goblin'} needs to end their turn.`}</span></div>
    </div>
    ${actions}
  `, { size: 'small', icon: 'discard', sub: mine ? 'You can still sell Gear first.' : 'Waiting.' });
}

function mobileRevealOrWaitingStageHtml() {
  const card = state.revealCard || state.tableNotice?.card || null;
  if (card) {
    const summary = cardGlance(card);
    const sub = state.revealCard
      ? `${card.publicName} is being resolved.`
      : (state.tableNotice?.detail || 'A table event is resolving.');
    return mobileStageShell('reveal', 'Revealed', card.publicName, `
      <div class="mobile-card-summary ${cardTypeClass(card)}">
        <div class="mobile-card-sigil">${cardTypeSigilHtml(card, 'asset-sigil art-sigil')}</div>
        <div>
          <div class="mobile-card-type">${escapeHtml(typeLabel(card))}</div>
          <div class="mobile-card-glance">${escapeHtml(summary)}</div>
          <p>${escapeHtml((card.publicText || '').slice(0, 115))}${(card.publicText || '').length > 115 ? '…' : ''}</p>
        </div>
      </div>
      <button class="mobile-secondary-action" data-mobile-inspect-card="${card.instanceId}">View Full Card</button>
    `, { size: 'medium', icon: cardTypeKey(card), sub });
  }
  const mine = isMyTurn();
  const actor = active()?.name || state.activePlayerName || 'the active goblin';
  const title = mine ? 'Your turn' : `Waiting on ${actor}`;
  const hint = mine ? 'Use the center action or your hand.' : `${actor} is choosing the next move.`;
  return mobileStageShell('waiting', mine ? 'Ready' : 'Waiting', title, `
    <div class="mobile-wait-card">
      ${assetIconHtml(mine ? 'die' : 'chamber', 'asset-sigil event-sigil')}
      <span>${escapeHtml(hint)}</span>
    </div>
  `, { size: 'small', icon: mine ? 'die' : 'chamber' });
}

function mobileCombatStageHtml(combat) {
  const totals = combat.totals || { playerTotal: 0, threatTotal: 0, margin: 0, tieWin: false };
  const outcome = combatOutcome(totals);
  const need = combatNeedToWin(totals);
  const primaryFoe = combat.threats?.[0] || null;
  const waiting = state.players.filter((p) => !combat.passes?.[p.id]);
  const passRow = state.players.map((p) => {
    const passed = Boolean(combat.passes?.[p.id]);
    return `<span class="mobile-pass-pill ${passed ? 'passed' : 'can-play'}">${escapeHtml(p.name)} · ${passed ? 'Passed' : 'Can play'}</span>`;
  }).join('');
  const foeText = primaryFoe ? `${primaryFoe.publicName}${(combat.threats || []).length > 1 ? ` + ${(combat.threats || []).length - 1}` : ''}` : 'Foe';
  const actions = mobileActionButtonsHtml(combatButtons(), 'combat-actions');
  return mobileStageShell('combat', 'Combat', `${playerName(combat.activePlayerId)} vs ${foeText}`, `
    <div class="mobile-combat-result ${escapeHtml(outcome.resultClass)}">
      <strong>${escapeHtml(outcome.shortLabel)}</strong>
      <span>${need > 0 ? `Need +${need} to win.` : 'No extra power needed if everyone passes.'}</span>
    </div>
    <div class="mobile-combat-scores ${escapeHtml(outcome.resultClass)}">
      <div><span>Player Side</span><b>${Number(totals.playerTotal || 0)}</b><small>${escapeHtml(playerName(combat.activePlayerId))}${combat.helperPlayerId ? ` + ${escapeHtml(playerName(combat.helperPlayerId))}` : ''}</small></div>
      <div class="mobile-vs">VS</div>
      <div><span>Foe Side</span><b>${Number(totals.threatTotal || 0)}</b><small>${(combat.threats || []).length} Foe${(combat.threats || []).length === 1 ? '' : 's'}</small></div>
    </div>
    ${primaryFoe ? `<div class="mobile-foe-summary">
      <div class="mobile-card-sigil">${cardTypeSigilHtml(primaryFoe, 'asset-sigil art-sigil')}</div>
      <div><strong>${escapeHtml(primaryFoe.publicName)}</strong><span>STR ${Number(primaryFoe.finalStrength || primaryFoe.strength || 0)} · ${Number(primaryFoe.finalLoot || primaryFoe.lootReward || 0)} Loot</span></div>
      <button class="mobile-mini-button" data-mobile-inspect-card="${primaryFoe.instanceId}">View</button>
    </div>` : ''}
    ${actions}
    <div class="mobile-pass-row">${passRow}</div>
    <details class="mobile-math-details"><summary>Combat math</summary>${combatBreakdownHtml(combat, totals)}</details>
  `, { size: 'large', icon: 'strength', sub: waiting.length ? `Waiting on: ${waiting.map((p) => p.name).join(', ')}` : 'Everyone has passed.' });
}

function combatNeedToWin(totals) {
  const player = Number(totals?.playerTotal || 0);
  const foe = Number(totals?.threatTotal || 0);
  if (totals?.tieWin) return Math.max(0, foe - player);
  return Math.max(0, foe - player + 1);
}

function mobileTributeStageHtml() {
  const you = me();
  const need = Math.max(0, Number(you?.handCount || 0) - Number(you?.handLimit || 0));
  const selected = selectedTribute.size;
  const isYours = isMyTurn();
  const actions = isYours ? mobileActionButtonsHtml([mobileTributeConfirmButton(need, selected)], 'tribute-actions') : '';
  return mobileStageShell('tribute', isYours ? 'Tribute Required' : 'Tribute Pending', isYours ? `Pick ${need} card${need === 1 ? '' : 's'}` : `${active()?.name || 'A player'} must resolve Tribute`, `
    <div class="mobile-tribute-meter ${selected === need && need > 0 ? 'ready' : ''}">
      <b>${selected}/${need}</b>
      <span>${isYours ? 'Use Inspect/Pick controls in your hand below.' : 'Waiting for the active player.'}</span>
    </div>
    ${actions}
    ${isYours ? '<p class="mobile-state-sub">Selected cards glow green. Confirm here or in the hand drawer.</p>' : ''}
  `, { size: 'medium', icon: 'trade-give', sub: you ? `Hand ${you.handCount}/${you.handLimit}` : '' });
}

function mobileFleeStageHtml(esc) {
  const runner = state.players.find((p) => p.id === esc.currentPlayerId);
  const last = esc.lastRoll;
  const title = `${runner?.name || 'Runner'} vs ${esc.threat?.publicName || 'Foe'}`;
  const buttons = [];
  if (runner?.isYou) {
    if (!esc.awaitingContinue && hasLittleHelper(me())) buttons.push(mobileLegalActionButton('Sacrifice Little Helper', 'SACRIFICE_HIRELING_FLEE'));
    buttons.push(mobileLegalActionButton(esc.awaitingContinue ? 'Continue' : (esc.autoFlee ? 'Use Automatic Flee' : 'Roll to Flee'), esc.awaitingContinue ? 'CONTINUE_FLEE' : 'ROLL_ESCAPE', 'primary'));
  }
  const body = `<div class="mobile-flee-grid">
    <div class="mobile-die-wrap">${dieHtml(last?.raw ?? '—', last ? 'rolled' : 'idle')}</div>
    <div class="mobile-flee-copy">
      <strong>Target 5+</strong>
      <span>Flee bonus ${signed(esc.fleeBonus || 0)}</span>
      ${last ? `<b>${last.total >= 5 ? 'Escaped' : 'Failed'} · ${last.raw} ${signed(last.bonus || 0)} = ${last.total}</b>` : '<b>Waiting for roll</b>'}
    </div>
  </div>${mobileActionButtonsHtml(buttons, 'flee-actions')}`;
  return mobileStageShell('flee', 'Flee', title, body, { size: 'large', icon: 'flee', sub: runner?.isYou ? 'Roll to escape the Bad News.' : `Waiting for ${runner?.name || 'the runner'}.` });
}

function mobileOpeningRollStageHtml() {
  const first = state.firstRoll || { rolls: {}, eligible: [] };
  const rows = (first.eligible || []).map((id) => `<span class="mobile-pass-pill ${first.rolls?.[id] ? 'passed' : 'can-play'}">${escapeHtml(playerName(id))} · ${first.rolls?.[id] || '—'}</span>`).join('');
  const actions = first.requiresYou ? mobileActionButtonsHtml([mobileLegalActionButton('Roll d6', 'ROLL_FIRST', 'primary')], 'roll-actions') : '';
  return mobileStageShell('opening-roll', 'Opening Roll', first.requiresYou ? 'Your roll is needed' : 'Roll to see who goes first', `<div class="mobile-pass-row">${rows}</div>${actions}`, { size: 'medium', icon: 'die', sub: 'Highest roll opens the first Chamber. Ties reroll.' });
}


function mobileBodyLootStageHtml() {
  const loot = state.bodyLoot;
  const victimName = loot?.victimName || 'A goblin';
  const current = loot?.requiresYou ? 'You are looting now.' : `${loot?.currentLooterName || 'A player'} is looting now.`;
  const cards = Number(loot?.cardCount || 0);
  return mobileStageShell('death', 'GOBLIN DOWN', `Loot ${victimName}'s body`, `
    <div class="mobile-death-card">
      ${assetIconHtml('death', 'asset-sigil event-sigil')}
      <div>
        <strong>Loot the Body</strong>
        <span>${cards} card${cards === 1 ? '' : 's'} left to loot.</span>
        <small>Take one card in Glory order. Try not to make eye contact.</small>
      </div>
    </div>
    <div class="mobile-death-turn">
      <strong>${escapeHtml(current)}</strong>
      <span>Death is separate from losing Glory.</span>
    </div>
    ${loot?.requiresYou ? '<p class="mobile-state-hint">Choose one card from the prompt below.</p>' : ''}
  `, { size: 'medium', icon: 'death', sub: 'A tragic opportunity.' });
}

function mobilePromptStageHtml(prompt) {
  return mobileStageShell('prompt', prompt.requiresYou ? 'Decision Required' : 'Prompt Pending', prompt.requiresYou ? 'Your choice' : `Waiting on ${playerName(prompt.playerId)}`, `
    <div class="mobile-wait-card">
      ${assetIconHtml('special', 'asset-sigil event-sigil')}
      <span>${escapeHtml(prompt.message || 'A player decision is pending.')}</span>
    </div>
  `, { size: 'medium', icon: 'special' });
}

function mobileGameOverStageHtml() {
  const winner = state.players.find((p) => p.id === state.winnerId);
  return mobileStageShell('game-over', 'VICTORY!', `${winner?.name || 'Someone'} reached 10 Glory`, `
    <div class="mobile-victory-card">
      ${assetIconHtml('glory', 'asset-sigil event-sigil')}
      <div>
        <strong>History will exaggerate this.</strong>
        <span>The table will never recover from this level of glory.</span>
      </div>
    </div>
    <div class="mobile-final-standings">
      ${(state.players || []).slice().sort((a,b) => Number(b.renown || 0) - Number(a.renown || 0)).map((p, i) => `<div><span>#${i+1} ${escapeHtml(p.name)}${p.isYou ? ' · you' : ''}</span><strong>${p.renown}/10 Glory</strong></div>`).join('')}
    </div>
  `, { size: 'large', icon: 'glory' });
}

function findVisibleCardByInstance(id) {
  if (!id) return null;
  const all = [];
  if (state.revealCard) all.push(state.revealCard);
  if (state.tableNotice?.card) all.push(state.tableNotice.card);
  if (state.announcement?.card) all.push(state.announcement.card);
  if (state.combat?.threats) all.push(...state.combat.threats);
  if (state.escape?.threat) all.push(state.escape.threat);
  if (state.you?.hand) all.push(...state.you.hand);
  for (const p of state.players || []) {
    all.push(...(p.equippedGear || []), ...(p.carriedGear || []));
    if (p.role) all.push(p.role);
    if (p.origin) all.push(p.origin);
    all.push(...(p.extraRoles || []), ...(p.extraOrigins || []));
  }
  return all.find((c) => c?.instanceId === id) || null;
}

function renderEscape(root) {
  const esc = state.escape;
  const runner = state.players.find((p) => p.id === esc.currentPlayerId);
  const last = esc.lastRoll;
  const raw = last?.raw ?? '—';
  const total = last?.total ?? '—';
  const outcome = last ? (last.total >= 5 ? '<span class="roll-success">Success — escaped the Bad News.</span>' : '<span class="roll-fail">Failed — Bad News resolves.</span>') : 'Waiting for the roll.';
  const detail = last
    ? `Raw roll ${last.raw} ${signed(last.bonus || 0)} Flee bonus = ${last.total}`
    : `Target number is 5+. ${runner?.isYou ? 'Tap Roll to Flee above.' : `Waiting for ${escapeHtml(runner?.name || 'the runner')}.`}`;
  const centerHtml = `<div class="v070-stage flee-stage">
    <div class="v070-stage-kicker">Flee Zone</div>
    <h2>${escapeHtml(runner?.name || 'Runner')} vs ${escapeHtml(esc.threat?.publicName || 'Foe')}</h2>
    <p>Roll 1d6. Add Flee bonuses and penalties. Final result of 5 or more escapes the Bad News.</p>
    <div class="v070-flee-grid">
      <div class="dice-stage">
        ${dieHtml(raw, last ? 'rolled' : 'idle')}
        <div class="roll-result">
          <div class="dice-breakdown">
            <span>Target <strong>5+</strong></span>
            <span>Flee bonus <strong>${signed(esc.fleeBonus || 0)}</strong></span>
            <span>Runner <strong>${Number(esc.index || 0) + 1}/${esc.runners?.length || 1}</strong></span>
          </div>
          <p><strong>Final:</strong> ${escapeHtml(total)}</p>
          <p>${outcome}</p>
          <p class="micro">${escapeHtml(detail)}</p>
        </div>
      </div>
      <div class="v070-foe-card">${esc.threat ? cardHtml(esc.threat, { tableSmall: true }) : ''}</div>
    </div>
  </div>`;
  root.innerHTML = tableFrameHtml(centerHtml, { mode: 'flee-center', stageClass: 'flee-stage-wrap' });
  attachTableSeatHandlers(root);
}


function renderFirstRoll(root) {
  const first = state.firstRoll || { rolls: {}, eligible: [] };
  const latest = first.latest;
  const waiting = (first.eligible || []).filter((id) => !first.rolls?.[id]).map(playerName);
  const centerHtml = `<div class="v070-stage opening-stage">
    <div class="v070-stage-kicker">Opening Roll</div>
    <h2>${escapeHtml(first.requiresYou ? 'Your roll is needed' : waiting.length ? `Waiting for ${waiting.join(', ')}` : 'Resolving first player')}</h2>
    <p>Every goblin rolls a d6. Highest roll opens the first Chamber. Ties reroll.</p>
    <div class="opening-roll-grid focus-layout">
      ${state.players.map((p) => {
        const rolled = first.rolls?.[p.id];
        const eligible = (first.eligible || []).includes(p.id);
        return `<div class="roll-card ${eligible ? 'eligible' : ''} ${p.isYou ? 'you' : ''}">
          <strong>${escapeHtml(p.name)}${p.isYou ? ' (you)' : ''}</strong>
          ${dieHtml(rolled || '—', latest?.playerId === p.id ? 'rolled' : 'idle small')}
          <span class="micro">${rolled ? `Rolled ${rolled}` : eligible ? 'Needs roll' : 'Waiting'}</span>
        </div>`;
      }).join('')}
    </div>
    ${first.previous?.length ? `<div class="micro previous-rolls">Previous: ${first.previous.map((r) => `Round ${r.round}: ${Object.entries(r.rolls).map(([id, val]) => `${playerName(id)} ${val}`).join(', ')}`).join(' · ')}</div>` : ''}
  </div>`;
  root.innerHTML = tableFrameHtml(centerHtml, { mode: 'roll-center', stageClass: 'roll-stage' });
  attachTableSeatHandlers(root);
}

function combatStatusText(totals) {
  return combatOutcome(totals);
}

function dieHtml(value, cls = '') {
  const n = Number(value);
  const valid = Number.isInteger(n) && n >= 1 && n <= 6;
  const spots = valid ? Array.from({ length: 6 }, (_, i) => `<span class="pip p${i + 1} ${pipOn(n, i + 1) ? 'on' : ''}"></span>`).join('') : `<b>${escapeHtml(String(value ?? '—'))}</b>`;
  return `<div class="die-face ${escapeHtml(cls)}">${spots}</div>`;
}

function pipOn(n, pos) {
  const map = { 1: [5], 2: [1,9], 3: [1,5,9], 4: [1,3,7,9], 5: [1,3,5,7,9], 6: [1,3,4,6,7,9] };
  // logical positions 1,3,4,6,7,9 are mapped onto p1-p6 order below
  const order = [1,3,4,6,7,9];
  const logical = pos === 5 && n % 2 === 1 ? 5 : order[pos - 1];
  return (map[n] || []).includes(logical);
}


function backupDealPanel(combat) {
  const req = combat.backupRequest;
  const deal = combat.backupDeal;
  const totalLoot = combat.threats?.reduce((sum, t) => sum + Number(t.finalLoot || t.lootReward || 0), 0) || 0;
  if (req) {
    const fighter = playerName(req.fromPlayerId);
    const helper = playerName(req.toPlayerId);
    const detail = req.deal
      ? `${fighter} is offering ${helper} ${Number(req.deal.lootCount || 0)} of ${totalLoot} Loot if this combat is won.`
      : `${fighter} asked ${helper} for Backup. Waiting for ${fighter} to propose a Loot split.`;
    return `<div class="backup-deal-panel negotiating"><strong>Backup negotiation</strong><span>${escapeHtml(detail)}</span></div>`;
  }
  if (deal && combat.helperPlayerId) {
    const helper = playerName(combat.helperPlayerId);
    return `<div class="backup-deal-panel locked"><strong>Backup deal locked</strong><span>${escapeHtml(helper)} gets first ${Number(deal.lootCount || 0)} Loot if the Foe is defeated.</span></div>`;
  }
  return '';
}


function findPlayer(id) {
  return (state.players || []).find((p) => p.id === id) || null;
}

function combatBreakdownHtml(combat, totals) {
  if (!combat || !totals) return '';
  const active = findPlayer(combat.activePlayerId);
  const helper = combat.helperPlayerId ? findPlayer(combat.helperPlayerId) : null;
  const playerTricks = (combat.playedTricks || []).filter((c) => c.effect?.side === 'PLAYER');
  const foeTricks = (combat.playedTricks || []).filter((c) => c.effect?.side === 'THREAT');
  const playerDelta = Number(combat.playerDelta || 0);
  const threatDelta = Number(combat.threatDelta || 0);
  const playerRows = [];
  if (active) {
    playerRows.push(`<div class="math-line"><span>${escapeHtml(active.name)} Glory</span><b>+${Number(active.renown || 0)}</b></div>`);
    playerRows.push(`<div class="math-line"><span>${escapeHtml(active.name)} Gear/Calling</span><b>${signed(Number(active.combatBonus || 0))}</b></div>`);
  }
  if (helper) {
    playerRows.push(`<div class="math-line helper-line"><span>${escapeHtml(helper.name)} Glory</span><b>+${Number(helper.renown || 0)}</b></div>`);
    playerRows.push(`<div class="math-line helper-line"><span>${escapeHtml(helper.name)} Gear/Calling</span><b>${signed(Number(helper.combatBonus || 0))}</b></div>`);
  }
  if (playerDelta || playerTricks.length) {
    const label = playerTricks.length ? `Cards/abilities: ${playerTricks.map((c) => c.publicName).join(', ')}` : 'Cards/abilities';
    playerRows.push(`<div class="math-line swing-line"><span>${escapeHtml(label)}</span><b>${signed(playerDelta)}</b></div>`);
  }
  const foeRows = (combat.threats || []).map((foe) => {
    const base = Number(foe.strength || 0);
    const modTotal = (foe.modifiers || []).reduce((sum, m) => sum + Number(m.strengthDelta || 0), 0);
    const final = Number(foe.finalStrength || base + modTotal);
    const special = final - base - modTotal;
    const mods = (foe.modifiers || []).map((m) => `<div class="math-line modifier-line"><span>${escapeHtml(m.publicName)}</span><b>${signed(Number(m.strengthDelta || 0))}</b></div>`).join('');
    return `<div class="foe-math-card">
      <div class="foe-math-title"><span>${escapeHtml(foe.publicName)}</span><b>${final}</b></div>
      <div class="math-line"><span>Base strength</span><b>+${base}</b></div>
      ${mods}
      ${special ? `<div class="math-line special-line"><span>Special bonus</span><b>${signed(special)}</b></div>` : ''}
    </div>`;
  }).join('');
  const extraFoeRow = threatDelta || foeTricks.length ? `<div class="foe-math-card compact">
    <div class="foe-math-title"><span>Foe-side cards/abilities</span><b>${signed(threatDelta)}</b></div>
    ${foeTricks.length ? `<div class="math-footnote">${escapeHtml(foeTricks.map((c) => c.publicName).join(', '))}</div>` : ''}
  </div>` : '';
  const outcome = combatOutcome(totals);
  const resultClass = outcome.resultClass === 'winning' ? 'good' : 'bad';
  const resultText = outcome.shortLabel;
  return `<section class="combat-breakdown-panel">
    <div class="breakdown-header">
      <span>Combat Math</span>
      <strong class="${resultClass}">${escapeHtml(resultText)}</strong>
    </div>
    <div class="breakdown-grid">
      <div class="breakdown-column player-breakdown">
        <div class="breakdown-title">Player Side <b>${Number(totals.playerTotal || 0)}</b></div>
        ${playerRows.join('') || '<div class="math-footnote">No player-side details available.</div>'}
      </div>
      <div class="breakdown-column foe-breakdown">
        <div class="breakdown-title">Foe Side <b>${Number(totals.threatTotal || 0)}</b></div>
        ${foeRows}${extraFoeRow}
      </div>
    </div>
    <div class="math-footnote">Totals update as Gear, Backup, Foe Modifiers, Tricks, and Calling/Kin effects change.</div>
  </section>`;
}

function renderCombat(root) {
  const combat = state.combat;
  const totals = combat.totals || { playerTotal: 0, threatTotal: 0, margin: 0 };
  const waiting = state.players.filter((p) => !combat.passes?.[p.id]);
  const needsYou = waiting.some((p) => p.isYou);
  const youAreDone = Boolean(combat.passes?.[me()?.id]);
  const tableCopy = combat.backupRequest
    ? `${playerName(combat.backupRequest.toPlayerId)} has a Backup request to answer.`
    : youAreDone && waiting.length
      ? `You are locked in. Waiting for ${waiting.map((p) => p.name).join(', ')}.`
      : needsYou
        ? 'Play a card, request Backup, use an ability, or tap Done.'
        : waiting.length
          ? `Waiting for ${waiting.map((p) => p.name).join(', ')} to act or confirm.`
          : 'Everyone is done. Combat resolves now.';
  const status = combatStatusText(totals);
  const resultClass = status.resultClass;
  const marginText = status.shortLabel;
  const foeCards = (combat.threats || []).map((t, idx) => `<div class="v077-foe-hero ${idx === 0 ? 'primary-foe' : 'extra-foe'}">
      ${cardHtml(t, { feature: true })}
      <div class="v077-foe-ribbon"><span>STR ${Number(t.finalStrength || t.strength || 0)}</span><span>${Number(t.finalLoot || t.lootReward || 0)} Loot</span></div>
      ${(t.modifiers || []).length ? `<div class="modifier-list v077-foe-mods">${(t.modifiers || []).map((m) => `<span class="chip">${escapeHtml(m.publicName)} ${signed(m.strengthDelta)}</span>`).join('')}</div>` : ''}
    </div>`).join('');
  const playerTricks = (combat.playedTricks || []).filter((c) => c.effect?.side === 'PLAYER').map((c) => `<span class="chip">${escapeHtml(c.publicName)}</span>`).join('');
  const foeTricks = (combat.playedTricks || []).filter((c) => c.effect?.side === 'THREAT').map((c) => `<span class="chip">${escapeHtml(c.publicName)}</span>`).join('');
  const centerHtml = `<div class="v077-combat-stage">
    <div class="v077-combat-topper">
      <span class="v077-kicker">Combat</span>
      <strong class="${resultClass}">${escapeHtml(marginText)}</strong>
      <span>${escapeHtml(tableCopy)}</span>
    </div>
    <div class="v077-foe-showcase ${combat.threats?.length > 1 ? 'multi' : 'single'}">
      ${foeCards || '<div class="empty-zone">No Foes in combat.</div>'}
    </div>
    <div class="v077-combat-scoreboard ${resultClass}">
      <div class="score-side player-score">
        <span class="score-label">Player Side</span>
        <b>${Number(totals.playerTotal || 0)}</b>
        <small>${escapeHtml(playerName(combat.activePlayerId))}${combat.helperPlayerId ? ` + ${escapeHtml(playerName(combat.helperPlayerId))}` : ''}</small>
        <div class="modifier-list">${playerTricks}</div>
      </div>
      <div class="v077-versus">VS</div>
      <div class="score-side foe-score">
        <span class="score-label">Foe Side</span>
        <b>${Number(totals.threatTotal || 0)}</b>
        <small>${(combat.threats || []).length} Foe${(combat.threats || []).length === 1 ? '' : 's'}</small>
        <div class="modifier-list">${foeTricks}</div>
      </div>
    </div>
    <div class="v077-combat-result ${resultClass}">
      <strong>${escapeHtml(status.headline)}</strong>
      <span>${escapeHtml(status.detail)}</span>
    </div>
    ${backupDealPanel(combat)}
    <details class="v077-math-details">
      <summary>View combat math</summary>
      ${combatBreakdownHtml(combat, totals)}
    </details>
    <div class="pass-tracker v070-pass-tracker v077-pass-tracker">${state.players.map((p) => passPill(p, combat.passes?.[p.id])).join('')}</div>
  </div>`;
  root.innerHTML = tableFrameHtml(centerHtml, { mode: 'combat-center v077-combat-mode', stageClass: 'combat-stage-wrap v077-combat-wrap' });
  attachTableSeatHandlers(root);
}


function hasLittleHelper(p) {
  if (!p) return false;
  return [...(p.equippedGear || []), ...(p.carriedGear || [])].some((g) => g.id === 'GEAR_HIRELING');
}
function hasLittleHelperCapacity(p) {
  if (!p) return false;
  return [...(p.equippedGear || []), ...(p.carriedGear || [])].some((g) => g.id === 'GEAR_HIRELING' && !(g.attachedCards || []).some((a) => a.type === 'GEAR'));
}
function ownsVisibleCard(card) {
  const you = me();
  if (!you || !card) return false;
  return (state.you?.hand || []).some((c) => c.instanceId === card.instanceId) || [...(you.equippedGear || []), ...(you.carriedGear || [])].some((c) => c.instanceId === card.instanceId);
}

function passPill(p, passed) {
  return `<div class="pass-pill ${passed ? 'passed' : 'waiting'} ${p.isYou ? 'you' : ''}"><strong>${escapeHtml(p.name)}${p.isYou ? ' (you)' : ''}</strong><span class="micro">${passed ? 'Done' : 'Can play'}</span></div>`;
}

function passSummary(passes) {
  return state.players.map((p) => `${p.name}: ${passes?.[p.id] ? 'done' : 'play?' }`).join(' · ');
}

function renderPrompt() {
  const root = $('promptPanel');
  if (!state.pendingPrompt) { root.classList.add('hidden'); root.innerHTML = ''; return; }
  const p = state.pendingPrompt;
  root.classList.remove('hidden');
  if (!p.requiresYou) {
    root.innerHTML = `<h3>Prompt pending</h3><p>${escapeHtml(p.message)}</p><p class="micro">Waiting for ${escapeHtml(playerName(p.playerId))}.</p>`;
    return;
  }
  if (p.type === 'LOOT_BODY') {
    root.innerHTML = `<h3>Loot the Body</h3><p>${escapeHtml(p.message)}</p><p class="micro">Choose one card. It will go directly to your hand.</p><div class="selectable-list">${p.options.map((c) => `<button class="selectable-card body-loot-choice" data-body-loot-card="${c.instanceId}">${escapeHtml(c.publicName)} <span class="micro">${escapeHtml(typeLabel(c))}</span></button>`).join('')}</div>`;
    root.querySelectorAll('[data-body-loot-card]').forEach((btn) => btn.addEventListener('click', () => emitAction('RESOLVE_PROMPT', { cardId: btn.dataset.bodyLootCard })));
    return;
  }
  if (p.type === 'DISCARD_GEAR') {
    root.innerHTML = `<h3>Choose Gear to discard</h3><p>${escapeHtml(p.message)}</p><div class="selectable-list">${p.options.map((c) => `<button class="selectable-card" data-prompt-card="${c.instanceId}">${escapeHtml(c.publicName)}</button>`).join('')}</div>`;
    root.querySelectorAll('[data-prompt-card]').forEach((btn) => btn.addEventListener('click', () => emitAction('RESOLVE_PROMPT', { cardId: btn.dataset.promptCard })));
    return;
  }
  if (p.type === 'DISCARD_HAND_CARDS') {
    const need = p.meta?.count || 1;
    const selected = selectedTribute;
    root.innerHTML = `<h3>Choose cards to discard</h3><p>${escapeHtml(p.message)}</p><p class="micro">Selected ${selected.size}/${need}</p><div class="selectable-list">${p.options.map((c) => `<button class="selectable-card ${selected.has(c.instanceId) ? 'selected' : ''}" data-discard-hand-card="${c.instanceId}">${escapeHtml(c.publicName)}</button>`).join('')}</div><button id="confirmHandDiscard" class="primary" ${selected.size !== need ? 'disabled' : ''}>Discard Selected</button>`;
    root.querySelectorAll('[data-discard-hand-card]').forEach((btn) => btn.addEventListener('click', () => {
      if (selected.has(btn.dataset.discardHandCard)) selected.delete(btn.dataset.discardHandCard);
      else selected.add(btn.dataset.discardHandCard);
      renderPrompt();
    }));
    $('confirmHandDiscard').addEventListener('click', () => { emitAction('RESOLVE_PROMPT', { cardIds: [...selected] }); selected.clear(); });
    return;
  }
  if (p.type === 'DISCARD_GEAR_VALUE') {
    const target = p.meta?.targetValue || 1000;
    const total = p.options.filter((c) => selectedSell.has(c.instanceId)).reduce((sum, c) => sum + Number(c.junkValue || c.scrapValue || 0), 0);
    root.innerHTML = `<h3>Choose Gear to lose</h3><p>${escapeHtml(p.message)}</p><p class="micro">Selected Junk Value: ${total}/${target}. Choose Gear totaling at least ${target} Junk.</p><div class="selectable-list">${p.options.map((c) => `<button class="selectable-card ${selectedSell.has(c.instanceId) ? 'selected' : ''}" data-gear-value-card="${c.instanceId}">${escapeHtml(c.publicName)} · ${Number(c.junkValue || c.scrapValue || 0)} Junk</button>`).join('')}</div><button class="primary" id="confirmGearValue" ${total < target ? 'disabled' : ''}>Discard Selected Gear</button>`;
    root.querySelectorAll('[data-gear-value-card]').forEach((btn) => btn.addEventListener('click', () => {
      if (selectedSell.has(btn.dataset.gearValueCard)) selectedSell.delete(btn.dataset.gearValueCard);
      else selectedSell.add(btn.dataset.gearValueCard);
      renderPrompt();
    }));
    $('confirmGearValue').addEventListener('click', () => { emitAction('RESOLVE_PROMPT', { cardIds: [...selectedSell] }); selectedSell.clear(); });
    return;
  }

  if (p.type === 'SELL_GEAR') {
    const total = p.options.filter((c) => selectedSell.has(c.instanceId)).reduce((sum, c) => sum + Number(c.junkValue || c.scrapValue || 0), 0);
    root.innerHTML = `<h3>Sell Gear</h3><p>${escapeHtml(p.message)}</p><p class="micro">Selected Junk Value: ${total}. Every 1000 Junk Value = +1 Glory. Selling cannot grant final Glory.</p><div class="selectable-list">${p.options.map((c) => `<button class="selectable-card ${selectedSell.has(c.instanceId) ? 'selected' : ''}" data-sell-card="${c.instanceId}">${escapeHtml(c.publicName)} · ${Number(c.junkValue || c.scrapValue || 0)} Junk</button>`).join('')}</div><button class="primary" id="confirmSell" ${selectedSell.size ? '' : 'disabled'}>Sell Selected Gear</button>`;
    root.querySelectorAll('[data-sell-card]').forEach((btn) => btn.addEventListener('click', () => {
      if (selectedSell.has(btn.dataset.sellCard)) selectedSell.delete(btn.dataset.sellCard);
      else selectedSell.add(btn.dataset.sellCard);
      renderPrompt();
    }));
    $('confirmSell').addEventListener('click', () => { emitAction('RESOLVE_PROMPT', { cardIds: [...selectedSell] }); selectedSell.clear(); });
    return;
  }
  if (p.type === 'DISCARD_FOR_BERSERK' || p.type === 'DISCARD_FOR_BACKSTAB') {
    const title = p.type === 'DISCARD_FOR_BERSERK' ? 'Choose a card for Bruiser' : 'Choose a card for Cutpurse';
    root.innerHTML = `<h3>${title}</h3><p>${escapeHtml(p.message)}</p><div class="selectable-list">${(p.options || []).map((c) => `<button class="selectable-card" data-prompt-card="${c.instanceId}">${escapeHtml(c.publicName)} <span class="micro">${escapeHtml(typeLabel(c))}</span></button>`).join('')}</div>`;
    root.querySelectorAll('[data-prompt-card]').forEach((btn) => btn.addEventListener('click', () => emitAction('RESOLVE_PROMPT', { cardId: btn.dataset.promptCard })));
    return;
  }

  if (p.type === 'LOSE_CALLING_CHOICE' || p.type === 'LOSE_KIN_CHOICE') {
    const label = p.type === 'LOSE_CALLING_CHOICE' ? 'Calling' : 'Kin';
    root.innerHTML = `<h3>Choose ${label} to lose</h3><p>${escapeHtml(p.message)}</p><div class="selectable-list">${(p.options || []).map((c) => `<button class="selectable-card" data-identity-card="${c.instanceId}">${escapeHtml(c.publicName)} <span class="micro">${escapeHtml(typeLabel(c))}</span></button>`).join('')}</div>`;
    root.querySelectorAll('[data-identity-card]').forEach((btn) => btn.addEventListener('click', () => emitAction('RESOLVE_PROMPT', { cardId: btn.dataset.identityCard })));
    return;
  }

  if (p.type === 'DISCARD_OWNED_CARDS') {
    const need = p.meta?.count || 1;
    const selected = selectedTribute;
    root.innerHTML = `<h3>Choose cards to discard</h3><p>${escapeHtml(p.message)}</p><p class="micro">Selected ${selected.size}/${need}</p><div class="selectable-list">${(p.options || []).map((c) => `<button class="selectable-card ${selected.has(c.instanceId) ? 'selected' : ''}" data-discard-owned-card="${c.instanceId}">${escapeHtml(c.publicName)} <span class="micro">${escapeHtml(typeLabel(c))}</span></button>`).join('')}</div><button id="confirmOwnedDiscard" class="primary" ${selected.size !== need ? 'disabled' : ''}>Discard Selected</button>`;
    root.querySelectorAll('[data-discard-owned-card]').forEach((btn) => btn.addEventListener('click', () => {
      if (selected.has(btn.dataset.discardOwnedCard)) selected.delete(btn.dataset.discardOwnedCard);
      else if (selected.size < need) selected.add(btn.dataset.discardOwnedCard);
      renderPrompt(root);
    }));
    $('confirmOwnedDiscard').addEventListener('click', () => { emitAction('RESOLVE_PROMPT', { cardIds: [...selected] }); selected.clear(); });
    return;
  }

  if (p.type === 'CHOOSE_PLAYER') {
    root.innerHTML = `<h3>Choose a player</h3><p>${escapeHtml(p.message)}</p><div class="selectable-list">${(p.options || []).map((opt) => `<button class="primary" data-target-player-id="${opt.id}">${escapeHtml(opt.name)}</button>`).join('')}</div>`;
    root.querySelectorAll('[data-target-player-id]').forEach((btn) => btn.addEventListener('click', () => emitAction('RESOLVE_PROMPT', { targetPlayerId: btn.dataset.targetPlayerId })));
    return;
  }
  if (p.type === 'CHEAT_GEAR') {
    root.innerHTML = `<h3>Attach Fine Print</h3><p>${escapeHtml(p.message)}</p><div class="selectable-list">${(p.options || []).map((c) => `<button class="selectable-card" data-prompt-card="${c.instanceId}">${escapeHtml(c.publicName)} <span class="micro">${escapeHtml(cardGlanceSub(c))}</span></button>`).join('')}</div>`;
    root.querySelectorAll('[data-prompt-card]').forEach((btn) => btn.addEventListener('click', () => emitAction('RESOLVE_PROMPT', { cardId: btn.dataset.promptCard })));
    return;
  }


  if (p.type === 'ADD_FOE_FROM_HAND') {
    root.innerHTML = `<h3>Add a Foe</h3><p>${escapeHtml(p.message)}</p><div class="selectable-list">${(p.options || []).map((c) => `<button class="selectable-card" data-prompt-card="${c.instanceId}">${escapeHtml(c.publicName)} <span class="micro">STR ${c.strength} · ${c.renownReward} Glory · ${c.lootReward} Loot</span></button>`).join('')}</div>`;
    root.querySelectorAll('[data-prompt-card]').forEach((btn) => btn.addEventListener('click', () => emitAction('RESOLVE_PROMPT', { cardId: btn.dataset.promptCard })));
    return;
  }

  if (p.type === 'ILLUSION_SWAP') {
    root.innerHTML = `<h3>Choose replacement Foe</h3><p>${escapeHtml(p.message)}</p><div class="selectable-list">${(p.options || []).map((c) => `<button class="selectable-card" data-prompt-card="${c.instanceId}">${escapeHtml(c.publicName)} <span class="micro">STR ${c.strength} · ${c.renownReward} Glory · ${c.lootReward} Loot</span></button>`).join('')}</div>`;
    root.querySelectorAll('[data-prompt-card]').forEach((btn) => btn.addEventListener('click', () => emitAction('RESOLVE_PROMPT', { cardId: btn.dataset.promptCard })));
    return;
  }

  if (p.type === 'CHOOSE_DISCARD_CARD') {
    root.innerHTML = `<h3>Choose a discard</h3><p>${escapeHtml(p.message)}</p><div class="selectable-list">${(p.options || []).map((c) => `<button class="selectable-card" data-prompt-card="${c.instanceId}">${escapeHtml(c.publicName)} <span class="micro">${escapeHtml(typeLabel(c))}</span></button>`).join('')}</div>`;
    root.querySelectorAll('[data-prompt-card]').forEach((btn) => btn.addEventListener('click', () => emitAction('RESOLVE_PROMPT', { cardId: btn.dataset.promptCard })));
    return;
  }

  if (p.type === 'MANUAL') {
    root.innerHTML = `<h3>Choice Required</h3><p>${escapeHtml(p.message)}</p><button class="primary" id="confirmManual">Continue</button>`;
    $('confirmManual').addEventListener('click', () => emitAction('RESOLVE_PROMPT'));
    return;
  }
}

function renderHand() {
  const root = $('handPanel');
  const you = me();
  if (!you) { root.innerHTML = ''; return; }
  const over = you.handCount > you.handLimit;
  const forceOpen = state.phase === 'TRIBUTE' && isMyTurn();
  root.classList.toggle('hand-expanded', handExpanded || forceOpen);
  root.classList.toggle('hand-over-limit', over);
  const toggleLabel = forceOpen ? 'Tribute' : ((handExpanded || forceOpen) ? 'Collapse' : 'Expand');
  const handTitle = forceOpen ? 'Tribute Required' : 'Your Hand';
  const handEyebrow = over ? 'Over Limit' : (state.phase === 'COMBAT' ? 'Combat Toolkit' : 'Cards');
  const handStateClass = over ? 'bad' : (you.handCount === you.handLimit ? 'full' : '');
  const handStateText = over ? `${you.handCount}/${you.handLimit} Tribute` : (you.handCount === you.handLimit ? `${you.handCount}/${you.handLimit} Full` : `${you.handCount}/${you.handLimit}`);
  let html = `<div class="hand-header v076-hand-header mobile-hand-header">
    <div><span class="hand-eyebrow">${escapeHtml(handEyebrow)}</span><h3>${escapeHtml(handTitle)}</h3></div>
    <div class="hand-header-actions">
      <span class="hand-limit ${handStateClass}">${handStateText}</span>
      <button id="handToggleBtn" class="hand-toggle-btn ${forceOpen ? 'tribute-mode' : ''}" type="button" aria-expanded="${handExpanded || forceOpen}" ${forceOpen ? 'disabled' : ''}>${toggleLabel}</button>
    </div>
  </div>`;
  html += `<p class="micro hand-help">Tap cards to inspect. Expand only when you need more room.</p>`;
  if (state.phase === 'TRIBUTE' && isMyTurn()) {
    const need = you.handCount - you.handLimit;
    html += `<p class="micro tribute-instruction">Tribute: inspect cards first, then use Pick to choose exactly ${need} card${need === 1 ? '' : 's'}.</p>`;
    html += `<div class="hand-tray v076-hand-tray tribute-tray"><div class="card-row hand-row tribute-card-row">${myHand().map((c) => tributeCardHtml(c)).join('')}</div></div>`;
    html += tributeControls(need);
  } else {
    const playableCount = playableHandCount();
    if (['START_TURN','NO_THREAT_CHOICE','COMBAT','POST_COMBAT','END_TURN'].includes(state.phase) || state.reaction) {
      let phaseHint = playableCount ? `${playableCount} playable card${playableCount === 1 ? '' : 's'} now — glowing first.` : 'No playable cards right now.';
      if (state.phase === 'START_TURN' && playableCount) phaseHint = `${playableCount} setup card${playableCount === 1 ? '' : 's'} can be played before opening.`;
      if (state.phase === 'NO_THREAT_CHOICE' && playableCount) phaseHint = `Foe cards glow — tap one to Start Trouble.`;
      if (state.phase === 'NO_THREAT_CHOICE' && !playableCount) phaseHint = `No Foe ready — Loot the Room or play a setup card first.`;
      html += `<p class="micro playable-now-label">${phaseHint}</p>`;
    }
    html += `<div class="hand-tray v076-hand-tray"><div class="card-row hand-row">${displayHandCards(myHand()).map((c) => cardHtml(c, { compact: true, playable: isCardPlayable(c) })).join('')}</div></div>`;
  }
  root.innerHTML = html;
  const toggle = $('handToggleBtn');
  if (toggle && !forceOpen) toggle.addEventListener('click', () => {
    handExpanded = !handExpanded;
    renderHand();
  });
  root.querySelectorAll('[data-tribute-toggle]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleTribute(btn.dataset.tributeToggle);
    });
  });
  root.querySelectorAll('[data-tribute-inspect]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const card = myHand().find((c) => c.instanceId === btn.dataset.tributeInspect);
      if (card) inspectCard(card);
    });
  });
  root.querySelectorAll('[data-card-id]').forEach((cardEl) => {
    cardEl.addEventListener('click', () => {
      const card = myHand().find((c) => c.instanceId === cardEl.dataset.cardId);
      if (!card) return;
      inspectCard(card);
    });
  });
  const confirm = $('confirmTribute');
  if (confirm) confirm.addEventListener('click', () => confirmTribute());
}



function displayHandCards(cards) {
  const list = [...(cards || [])];
  if (state?.phase === 'COMBAT' || state?.reaction) {
    return list.sort((a, b) => Number(isCardPlayable(b)) - Number(isCardPlayable(a)));
  }
  return list;
}

function playableHandCount() {
  return (myHand() || []).filter((c) => isCardPlayable(c)).length;
}

function tributeCardHtml(card) {
  const selected = selectedTribute.has(card.instanceId);
  return `<div class="tribute-card-shell ${selected ? 'selected' : ''}" data-card-id="${card.instanceId || ''}">
    ${cardHtml(card, { compact: true })}
    <div class="tribute-card-actions">
      <button type="button" class="tribute-inspect-btn" data-tribute-inspect="${card.instanceId}">Inspect</button>
      <button type="button" class="tribute-pick-btn ${selected ? 'selected' : ''}" data-tribute-toggle="${card.instanceId}" aria-pressed="${selected ? 'true' : 'false'}">${selected ? '✓ Picked' : 'Pick'}</button>
    </div>
  </div>`;
}

function tributeControls(need) {
  const selectedCount = selectedTribute.size;
  const minGlory = Math.min(...state.players.map((p) => p.renown));
  const you = me();
  const recipients = state.players.filter((p) => p.id !== you.id && p.renown === minGlory);
  let html = `<div class="primary-action"><span class="micro">Selected ${selectedCount}/${need}</span>`;
  if (you.renown !== minGlory && recipients.length > 1) {
    html += `<select id="tributeTarget">${recipients.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}</select>`;
  }
  html += `<button id="confirmTribute" class="primary" ${selectedCount !== need ? 'disabled' : ''}>Confirm Tribute</button></div>`;
  return html;
}

function toggleTribute(cardId) {
  if (selectedTribute.has(cardId)) selectedTribute.delete(cardId);
  else selectedTribute.add(cardId);
  renderHand();
}

function confirmTribute() {
  const target = $('tributeTarget')?.value;
  emitAction('GIVE_TRIBUTE', { cardIds: [...selectedTribute], targetPlayerId: target });
  selectedTribute.clear();
}


function isReactionCardPlayable(card) {
  const r = state?.reaction;
  if (!r || !card) return false;
  if (!r.requiresYou) return false;
  if (r.type === 'HEX_CANCEL_REACTION') return card.id === 'SPECIAL_WISHING_RING_A';
  if (r.type === 'DIE_ROLL_REACTION') return card.id === 'SPECIAL_LOADED_DIE';
  if (r.type === 'FLEE_FAILURE_REACTION') return card.id === 'TRICK_INVISIBILITY';
  if (r.type === 'FLEE_SUCCESS_REACTION') return card.id === 'TRICK_FLASK_GLUE';
  return false;
}

function isCardPlayable(card) {
  if (!state || !card) return false;
  if (state.pendingPrompt) return false;
  if (state.reaction) return isReactionCardPlayable(card);
  if (card.type === 'ROLE' || card.type === 'ORIGIN') return isMyTurn() && ['START_TURN','NO_THREAT_CHOICE','POST_COMBAT','END_TURN'].includes(state.phase);
  if (card.type === 'GEAR') return !isOneUseConsumableCard(card) && isMyTurn() && ['START_TURN','NO_THREAT_CHOICE','POST_COMBAT','END_TURN'].includes(state.phase);
  if (card.type === 'SPECIAL') {
    const timing = card.timing || [];
    if (timing.includes('ANY_TIME')) return true;
    if (timing.includes('DURING_COMBAT')) return state.phase === 'COMBAT';
    return isMyTurn() && ['START_TURN','NO_THREAT_CHOICE','POST_COMBAT','END_TURN'].includes(state.phase);
  }
  if (card.type === 'THREAT') return isMyTurn() && state.phase === 'NO_THREAT_CHOICE';
  if (card.type === 'TRICK' || card.type === 'THREAT_MODIFIER') return state.phase === 'COMBAT';
  if (card.type === 'HEX') return true;
  return false;
}


function cardTypeClass(card) {
  return `card-type-${String(card?.type || 'card').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function cardTypeIcon(card) {
  const t = String(card?.type || '').toUpperCase();
  if (t === 'THREAT') return 'F';
  if (t === 'HEX') return 'X';
  if (t === 'GEAR') return 'G';
  if (t === 'TRICK') return 'T';
  if (t === 'THREAT_MODIFIER') return 'M';
  if (t === 'ROLE') return 'C';
  if (t === 'ORIGIN') return 'K';
  if (t === 'SPECIAL') return 'S';
  return '•';
}

function cardTypeKey(card) {
  const t = String(card?.type || card || '').toUpperCase();
  if (t === 'THREAT') return 'foe';
  if (t === 'HEX') return 'hex';
  if (t === 'GEAR') return 'gear';
  if (t === 'TRICK') return 'trick';
  if (t === 'THREAT_MODIFIER') return 'modifier';
  if (t === 'ROLE') return 'calling';
  if (t === 'ORIGIN') return 'kin';
  if (t === 'SPECIAL') return 'special';
  return 'card';
}

function cardTypeSigilHtml(card, cls = 'asset-sigil card-type-sigil') {
  return assetIconHtml(cardTypeKey(card), cls);
}

function deckPileIconHtml(key) {
  if (/CHAMBER/.test(key)) return assetIconHtml('chamber', 'asset-sigil pile-sigil');
  if (/LOOT/.test(key)) return assetIconHtml('loot', 'asset-sigil pile-sigil');
  if (/DISCARD/.test(key)) return assetIconHtml('discard', 'asset-sigil pile-sigil');
  return assetIconHtml('card', 'asset-sigil pile-sigil');
}

function assetIconHtml(key, cls = 'asset-sigil') {
  const k = String(key || 'special').toLowerCase().replace(/[^a-z0-9-]+/g, '');
  const core = {
    glory: '/assets/loot-goblins/core-icons/glory.png',
    junk: '/assets/loot-goblins/core-icons/junk.png',
    strength: '/assets/loot-goblins/core-icons/strength.png',
    combat: '/assets/loot-goblins/core-icons/combat.png',
    loot: '/assets/loot-goblins/core-icons/loot.png',
    flee: '/assets/loot-goblins/core-icons/flee.png',
    die: '/assets/loot-goblins/core-icons/die.png',
    roll: '/assets/loot-goblins/core-icons/roll.png',
    death: '/assets/loot-goblins/core-icons/death.png',
    backup: '/assets/loot-goblins/core-icons/backup.png',
    hex: '/assets/loot-goblins/core-icons/hex.png',
    chamber: '/assets/loot-goblins/core-icons/chamber.png',
    draw: '/assets/loot-goblins/core-icons/draw.png',
    discard: '/assets/loot-goblins/core-icons/discard.png',
    trade: '/assets/loot-goblins/core-icons/trade.png',
    give: '/assets/loot-goblins/core-icons/give.png',
    'trade-give': '/assets/loot-goblins/core-icons/trade-give.png'
  };
  const types = {
    foe: '/assets/loot-goblins/card-type-icons/foe.png',
    gear: '/assets/loot-goblins/card-type-icons/gear.png',
    trick: '/assets/loot-goblins/card-type-icons/trick.png',
    modifier: '/assets/loot-goblins/card-type-icons/modifier.png',
    calling: '/assets/loot-goblins/card-type-icons/calling.png',
    kin: '/assets/loot-goblins/card-type-icons/kin.png',
    special: '/assets/loot-goblins/card-type-icons/special.png',
    card: '/assets/loot-goblins/card-type-icons/special.png',
    prompt: '/assets/loot-goblins/core-icons/chamber.png',
    turn: '/assets/loot-goblins/core-icons/chamber.png'
  };
  // Preserve Hex parity: core contexts use the bigger Hex icon, card-type contexts use D2.
  let src = core[k] || types[k] || types.special;
  if (String(cls || '').includes('card-type') || String(cls || '').includes('corner-sigil') || String(cls || '').includes('hand-sigil') || String(cls || '').includes('tiny-sigil')) {
    src = types[k] || core[k] || types.special;
  }
  return `<img class="${escapeHtml(cls)} icon-img sigil-${escapeHtml(k)}" src="${src}" alt="" aria-hidden="true" loading="lazy" decoding="async" />`;
}

function cardHtml(card, opts = {}) {
  if (!card) return '';
  if (opts.compact) return compactCardHtml(card, opts);
  const classes = ['card', cardTypeClass(card)];
  if (opts.tableSmall) classes.push('table-small');
  if (opts.feature) classes.push('feature-card');
  if (opts.playable) classes.push('playable');
  if (opts.selectableTribute && selectedTribute.has(card.instanceId)) classes.push('playable');
  if (opts.playable === false && state?.status !== 'LOBBY') classes.push('dim');
  const bottom = cardBottom(card);
  return `<article class="${classes.join(' ')}" data-card-id="${card.instanceId || ''}" data-card-icon="${escapeHtml(cardTypeIcon(card))}">
    <div class="card-corner-sigil" aria-hidden="true">${cardTypeSigilHtml(card, 'asset-sigil corner-sigil')}</div>
    <div class="type"><span class="inline-card-sigil">${cardTypeSigilHtml(card, 'asset-sigil tiny-sigil')}</span>${escapeHtml(typeLabel(card))}</div>
    <div class="title">${escapeHtml(card.publicName)}</div>
    <div class="art"><span>${cardTypeSigilHtml(card, 'asset-sigil art-sigil')}</span></div>
    <div class="text">${escapeHtml(card.publicText || '')}</div>
    ${card.flavorText ? `<div class="flavor">${escapeHtml(card.flavorText)}</div>` : ''}
    ${card.attachmentNames?.length ? `<div class="micro attached-line">Attached: ${escapeHtml(card.attachmentNames.join(', '))}</div>` : ''}
    <div class="stats">${escapeHtml(bottom)}</div>
  </article>`;
}

function compactCardHtml(card, opts = {}) {
  const classes = ['hand-card', cardTypeClass(card)];
  const tributeSelected = opts.selectableTribute && selectedTribute.has(card.instanceId);
  if (opts.playable) classes.push('playable');
  if (tributeSelected) classes.push('tribute-selected');
  if (opts.playable === false && state?.status !== 'LOBBY') classes.push('dim');
  if (card.fresh) classes.push('new-card');
  return `<article class="${classes.join(' ')} compact-v076" data-card-id="${card.instanceId || ''}" data-card-icon="${escapeHtml(cardTypeIcon(card))}">
    ${card.fresh ? '<div class="new-badge">NEW</div>' : ''}
    ${opts.selectableTribute ? `<button class="tribute-select-btn" type="button" data-tribute-toggle="${card.instanceId}" aria-pressed="${tributeSelected ? 'true' : 'false'}">${tributeSelected ? '✓' : 'Pick'}</button>` : ''}
    <div class="hand-card-sigil" aria-hidden="true">${cardTypeSigilHtml(card, 'asset-sigil hand-sigil')}</div>
    <div class="hand-card-copy">
      <div class="hand-card-topline"><span class="mini-type">${escapeHtml(shortTypeLabel(card))}</span></div>
      <div class="hand-card-name">${escapeHtml(card.publicName)}</div>
      <div class="hand-card-main">${escapeHtml(cardGlance(card))}</div>
    </div>
    ${(card.attachmentNames || []).length ? `<div class="hand-card-attach-dot" title="Has attached cards">+</div>` : ''}
  </article>`;
}


function isOneUseConsumableCard(card) {
  if (!card) return false;
  return Boolean(card.oneUse || card.consumable || card.type === 'TRICK' || /\bOne-use\b/i.test(card.publicText || '') || /\b(Potion|Poison|Drink|Water)\b/i.test(card.publicName || ''));
}

function cardGlance(card) {
  if (card.type === 'THREAT') return `STR ${card.strength}`;
  if (card.type === 'GEAR') return `+${card.combatBonus || 0}${card.escapeBonus ? ` · Flee +${card.escapeBonus}` : ''}`;
  if (card.type === 'THREAT_MODIFIER') return `Modifier ${signed(card.strengthDelta)}`;
  if (card.type === 'TRICK') return `One-use · ${trickGlance(card)}`;
  if (card.type === 'HEX') return hexGlance(card);
  if (card.type === 'ROLE') return 'Calling';
  if (card.type === 'ORIGIN') return 'Kin';
  if (card.type === 'SPECIAL') return 'Special';
  return card.type || 'Card';
}

function cardGlanceSub(card) {
  if (card.type === 'THREAT') return `${card.renownReward} Glory · ${card.lootReward} Loot`;
  if (card.type === 'GEAR') return `${card.slot || 'Gear'}${card.handsUsed ? ` · ${card.handsUsed}H` : ''} · ${card.junkValue ?? card.scrapValue ?? 0} Junk${card.isHeavy ? ' · Heavy' : ''}`;
  if (card.type === 'THREAT_MODIFIER') return `Loot ${signed(card.lootDelta)}`;
  if (card.type === 'TRICK') return `Single-use ${((card.timing || []).map(prettyTiming).join(' / ') || 'Trick')}`;
  if (card.type === 'HEX') return (card.timing || []).map(prettyTiming).join(' / ') || 'Any time';
  if (card.type === 'ROLE' || card.type === 'ORIGIN') return 'Play on your turn';
  return (card.publicText || '').slice(0, 42);
}

function trickGlance(card) {
  const e = card.effect || {};
  if (typeof e.amount === 'number') return `${e.amount >= 0 ? '+' : ''}${e.amount} ${e.side === 'THREAT' ? 'Foe' : e.side === 'PLAYER' ? 'Player' : 'Side'}`;
  if ((card.timing || []).includes('BEFORE_ESCAPE_ROLL')) return 'Flee help';
  return 'One-use';
}

function hexGlance(card) {
  const text = card.publicText || 'Bad thing';
  return text.replace(/^Curse:?\s*/i, '').slice(0, 28);
}

function cardBottom(card) {
  if (card.type === 'THREAT') return `STR ${card.strength} · ${card.renownReward} Glory · ${card.lootReward} Loot`;
  if (card.type === 'GEAR') return `${card.slot || 'Gear'} · +${card.combatBonus || 0}${card.escapeBonus ? ` · Flee +${card.escapeBonus}` : ''} · ${card.junkValue ?? card.scrapValue ?? 0} Junk${card.isHeavy ? ' · Heavy' : ''}`;
  if (card.type === 'THREAT_MODIFIER') return `Modifier ${signed(card.strengthDelta)} · Loot ${signed(card.lootDelta)}`;
  if (card.type === 'TRICK') return `One-use Trick · ${(card.timing || []).map(prettyTiming).join(' / ') || 'Combat'} · ${card.junkValue ?? card.scrapValue ?? 0} Junk`;
  if (card.type === 'ROLE') return 'Calling';
  if (card.type === 'ORIGIN') return 'Kin';
  if (card.type === 'HEX') return card.timing?.join(', ') || 'Hex';
  return card.type || 'Card';
}

function typeLabel(card) {
  const map = { THREAT: 'Foe', HEX: 'Hex', ROLE: 'Calling', ORIGIN: 'Kin', GEAR: 'Gear', TRICK: 'Trick · One-use', SPECIAL: 'Special', THREAT_MODIFIER: 'Modifier' };
  return map[card.type] || card.type;
}


function shortTypeLabel(card) {
  const map = { THREAT: 'FOE', HEX: 'HEX', ROLE: 'CALL', ORIGIN: 'KIN', GEAR: 'GEAR', TRICK: 'TRICK', SPECIAL: 'SPEC', THREAT_MODIFIER: 'MOD' };
  return map[card?.type] || String(card?.type || 'CARD').slice(0, 5);
}

function inspectCard(card) {
  if (!card) return;
  if (card.fresh) emitAction('MARK_CARD_SEEN', { cardId: card.instanceId });
  const root = $('inspectContent');
  const actions = cardActions(card);
  const statLine = cardBottom(card);
  root.innerHTML = `<div class="inspect-layout inspect-v071">
    <div class="inspect-preview">${cardHtml(card, { feature: true })}</div>
    <div class="inspect-copy">
      <div class="inspect-kicker"><span class="inline-card-sigil">${cardTypeSigilHtml(card, 'asset-sigil tiny-sigil')}</span>${escapeHtml(typeLabel(card))}</div>
      <h2>${escapeHtml(card.publicName)}</h2>
      ${statLine ? `<div class="inspect-stat-row"><span>${escapeHtml(statLine)}</span></div>` : ''}
      <section class="inspect-section"><h3>Rules</h3><p>${escapeHtml(card.publicText || 'No rules text.')}</p></section>
      ${card.flavorText ? `<section class="inspect-section flavor-section"><h3>Flavor</h3><p class="inspect-flavor">${escapeHtml(card.flavorText)}</p></section>` : ''}
      ${(card.attachmentNames || []).length ? `<section class="inspect-section"><h3>Attached</h3><p>${escapeHtml(card.attachmentNames.join(', '))}</p></section>` : ''}
      <section class="inspect-section"><h3>Actions</h3><div class="action-list inspect-actions">${actions}</div></section>
    </div>
  </div>`;
  root.querySelectorAll('[data-inspect-action]').forEach((btn) => btn.addEventListener('click', () => {
    const a = btn.dataset.inspectAction;
    closeInspect();
    if (a === 'PLAY') emitAction('PLAY_CARD', { cardId: card.instanceId });
    if (a === 'PLAY_TARGET_FOE') emitAction('PLAY_CARD', { cardId: card.instanceId, targetFoeInstanceId: btn.dataset.targetFoeId });
    if (a === 'PLAY_PLAYER_SIDE') emitAction('PLAY_CARD', { cardId: card.instanceId, side: 'PLAYER' });
    if (a === 'PLAY_FOE_SIDE') emitAction('PLAY_CARD', { cardId: card.instanceId, side: 'THREAT' });
    if (a === 'PLAY_TARGET') emitAction('PLAY_CARD', { cardId: card.instanceId, targetPlayerId: btn.dataset.targetPlayerId });
    if (a === 'EQUIP') emitAction('PLAY_CARD', { cardId: card.instanceId, mode: 'EQUIP' });
    if (a === 'CARRY') emitAction('PLAY_CARD', { cardId: card.instanceId, mode: 'CARRY' });
    if (a === 'SELL_ONE') emitAction('SELL_GEAR', { cardIds: [card.instanceId] });
    if (a === 'GIVE_GEAR') emitAction('GIVE_GEAR', { cardId: card.instanceId, targetPlayerId: btn.dataset.targetPlayerId });
    if (a === 'ASSIGN_HIRELING_GEAR') emitAction('ASSIGN_HIRELING_GEAR', { cardId: card.instanceId });
    if (a === 'START_TROUBLE') emitAction('START_TROUBLE', { cardId: card.instanceId });
    if (a === 'USE_WISH_RING') emitAction('USE_WISH_RING');
    if (a === 'USE_LOADED_DIE') emitAction('USE_LOADED_DIE', { value: Number(btn.dataset.value) });
    if (a === 'USE_INVISIBILITY_ESCAPE') emitAction('USE_INVISIBILITY_ESCAPE');
    if (a === 'USE_FLASK_GLUE') emitAction('USE_FLASK_GLUE');
  }));
  $('inspectOverlay').classList.remove('hidden');
}


function reactionCardActions(card) {
  const r = state.reaction;
  if (!isReactionCardPlayable(card)) return `<p>No legal reaction for this card right now.</p>`;
  if (r.type === 'HEX_CANCEL_REACTION' && card.id === 'SPECIAL_WISHING_RING_A') return `<button class="primary" data-inspect-action="USE_WISH_RING">Cancel Hex</button>`;
  if (r.type === 'DIE_ROLL_REACTION' && card.id === 'SPECIAL_LOADED_DIE') return `<p>Choose the new die face:</p>${[1,2,3,4,5,6].map((n)=>`<button class="die-choice" data-inspect-action="USE_LOADED_DIE" data-value="${n}">${n}</button>`).join('')}`;
  if (r.type === 'FLEE_FAILURE_REACTION' && card.id === 'TRICK_INVISIBILITY') return `<button class="primary" data-inspect-action="USE_INVISIBILITY_ESCAPE">Escape Automatically</button>`;
  if (r.type === 'FLEE_SUCCESS_REACTION' && card.id === 'TRICK_FLASK_GLUE') return `<button class="primary" data-inspect-action="USE_FLASK_GLUE">Force Reroll</button>`;
  return `<p>No legal reaction right now.</p>`;
}

function cardActions(card) {
  const actions = [];
  if (state.pendingPrompt) return `<p>Resolve the current prompt first.</p>`;
  if (state.reaction) return reactionCardActions(card);
  if ((card.type === 'ROLE' || card.type === 'ORIGIN') && isMyTurn() && ['START_TURN','NO_THREAT_CHOICE','POST_COMBAT','END_TURN'].includes(state.phase)) actions.push(`<button class="primary" data-inspect-action="PLAY">Play ${typeLabel(card)}</button>`);
  if (card.type === 'GEAR' && isOneUseConsumableCard(card)) {
    actions.push(`<p class="consumable-note">One-use cards are not equipable Gear. Use this during its timing window; it discards after use.</p>`);
  } else if (card.type === 'GEAR' && isMyTurn() && ['START_TURN','NO_THREAT_CHOICE','POST_COMBAT','END_TURN'].includes(state.phase)) {
    actions.push(`<button class="primary" data-inspect-action="EQUIP">Equip</button>`);
    actions.push(`<button data-inspect-action="CARRY">Carry</button>`);
    actions.push(`<button data-inspect-action="SELL_ONE">Sell / cash in</button>`);
    if (card.id !== 'GEAR_HIRELING' && ownsVisibleCard(card) && hasLittleHelperCapacity(me())) actions.push(`<button data-inspect-action="ASSIGN_HIRELING_GEAR">Give to Little Helper</button>`);
    for (const p of state.players.filter((p) => !p.isYou)) actions.push(`<button data-inspect-action="GIVE_GEAR" data-target-player-id="${p.id}">Give to ${escapeHtml(p.name)}</button>`);
  }
  if (card.type === 'THREAT' && isMyTurn() && state.phase === 'NO_THREAT_CHOICE') actions.push(`<button class="primary" data-inspect-action="START_TROUBLE">Start Trouble</button>`);
  if (card.type === 'THREAT' && state.phase === 'COMBAT' && (card.tags || []).includes('RESTLESS') && (state.combat?.threats || []).some((t) => (t.tags || []).includes('RESTLESS'))) actions.push(`<button class="primary" data-inspect-action="PLAY">Join Restless Combat</button>`);
  if (card.type === 'TRICK' && state.phase === 'COMBAT' && card.effect?.type === 'MODIFY_COMBAT_TOTAL') {
    const amt = Number(card.effect.amount || 0);
    if (amt >= 0) {
      actions.push(`<button class="primary" data-inspect-action="PLAY_PLAYER_SIDE">Buff Player Side ${signed(amt)}</button>`);
      actions.push(`<button data-inspect-action="PLAY_FOE_SIDE">Buff Foe Side ${signed(amt)}</button>`);
    } else {
      actions.push(`<button class="primary" data-inspect-action="PLAY_PLAYER_SIDE">Nerf Player Side ${signed(amt)}</button>`);
      actions.push(`<button data-inspect-action="PLAY_FOE_SIDE">Nerf Foe Side ${signed(amt)}</button>`);
    }
  } else if (card.type === 'THREAT_MODIFIER' && state.phase === 'COMBAT') {
    const foes = state.combat?.threats || [];
    if (foes.length > 1) {
      for (const foe of foes) actions.push(`<button class="primary" data-inspect-action="PLAY_TARGET_FOE" data-target-foe-id="${foe.instanceId}">Attach to ${escapeHtml(foe.publicName)}</button>`);
    } else actions.push(`<button class="primary" data-inspect-action="PLAY">Attach to Foe</button>`);
  }
  else if (card.type === 'TRICK' && state.phase === 'COMBAT') actions.push(`<button class="primary" data-inspect-action="PLAY">Play Combat Trick</button>`);
  if (card.type === 'TRICK' && state.phase === 'ESCAPE' && state.escape?.currentPlayerId === me()?.id && (card.timing || []).includes('BEFORE_ESCAPE_ROLL')) actions.push(`<button class="primary" data-inspect-action="PLAY">Play before Flee roll</button>`);
  if (card.type === 'HEX') {
    for (const p of state.players) actions.push(`<button class="primary" data-inspect-action="PLAY_TARGET" data-target-player-id="${p.id}">Hex ${escapeHtml(p.name)}${p.isYou ? ' (you)' : ''}</button>`);
  }
  if (card.type === 'SPECIAL') {
    const timing = card.timing || [];
    const canSpecial = timing.includes('ANY_TIME') || (timing.includes('DURING_COMBAT') && state.phase === 'COMBAT') || (isMyTurn() && ['START_TURN','NO_THREAT_CHOICE','POST_COMBAT','END_TURN'].includes(state.phase));
    if (canSpecial && card.id === 'SPECIAL_STEAL_LEVEL') {
      for (const p of state.players.filter((p) => !p.isYou)) actions.push(`<button class="primary" data-inspect-action="PLAY_TARGET" data-target-player-id="${p.id}">Steal from ${escapeHtml(p.name)}</button>`);
    } else if (canSpecial && state.phase === 'COMBAT' && ['SPECIAL_MAGIC_LAMP','SPECIAL_POLYMORPH','SPECIAL_MATCHING_PROBLEM','SPECIAL_ILLUSION'].includes(card.id)) {
      const foes = state.combat?.threats || [];
      if (foes.length > 1) {
        const verb = card.id === 'SPECIAL_MATCHING_PROBLEM' ? 'Copy' : card.id === 'SPECIAL_ILLUSION' ? 'Replace' : 'Remove';
        for (const foe of foes) actions.push(`<button class="primary" data-inspect-action="PLAY_TARGET_FOE" data-target-foe-id="${foe.instanceId}">${verb} ${escapeHtml(foe.publicName)}</button>`);
      } else actions.push(`<button class="primary" data-inspect-action="PLAY">Play Special</button>`);
    } else if (canSpecial && state.phase === 'COMBAT' && card.id === 'SPECIAL_TRANSFERRAL') {
      for (const p of state.players.filter((p) => !p.isYou && p.id !== state.combat?.activePlayerId)) actions.push(`<button class="primary" data-inspect-action="PLAY_TARGET" data-target-player-id="${p.id}">Transfer to ${escapeHtml(p.name)}</button>`);
    } else if (canSpecial) actions.push(`<button class="primary" data-inspect-action="PLAY">Play Special</button>`);
  }
  if (!actions.length) actions.push(`<p>No legal actions right now.</p><p class="micro">${whyNotPlayable(card)}</p>`);
  return actions.join('');
}

function whyNotPlayable(card) {
  if (!isMyTurn() && ['ROLE','ORIGIN','GEAR','SPECIAL','THREAT'].includes(card.type)) return 'This can only be used on your own turn in the correct phase, unless the card says combat/any time.';
  if (card.type === 'THREAT_MODIFIER') return 'Foe Modifiers can only be played during combat.';
  if (card.type === 'TRICK') return 'This is a one-use Trick, not Gear. Use it during its timing window, then it discards.';
  if (card.type === 'THREAT') return 'Foes are played with Start Trouble after no Foe appears.';
  return 'The current phase does not allow this card.';
}

function closeInspect() { $('inspectOverlay').classList.add('hidden'); }

function inspectPlayer(p) {
  const root = $('inspectContent');
  const gearCards = [...(p.equippedGear || []), ...(p.carriedGear || [])];
  const effects = (p.statusEffects || []).filter((e) => e.visible !== false);
  root.innerHTML = `<h2>${escapeHtml(p.name)}</h2><p>Glory ${p.renown}/10 · Hand ${p.handCount}/${p.handLimit} · ${p.connected ? 'online' : 'offline'}</p>
    <p>Calling/Kin: ${escapeHtml(identityLine(p))}</p>
    ${p.callingPermit || p.kinPermit ? `<h3>Permits</h3><div class="status-list">${p.callingPermit ? `<div class="status-detail"><strong>${escapeHtml(p.callingPermit.publicName)}</strong><span>Attached to ${escapeHtml(p.callingPermit.attachedToName || 'a Calling')}. ${((p.extraRoles || []).length) ? 'Two Callings: all normal advantages and disadvantages apply.' : 'One Calling: disadvantages are ignored.'}</span></div>` : ''}${p.kinPermit ? `<div class="status-detail"><strong>${escapeHtml(p.kinPermit.publicName)}</strong><span>Attached to ${escapeHtml(p.kinPermit.attachedToName || 'a Kin')}. ${((p.extraOrigins || []).length) ? 'Two Kin: all normal advantages and disadvantages apply.' : 'One Kin: disadvantages are ignored.'}</span></div>` : ''}</div>` : ''}
    ${effects.length ? `<h3>Ongoing Effects</h3><div class="status-list">${effects.map((e) => `<div class="status-detail"><strong>${escapeHtml(e.publicName || 'Effect')}</strong><span>${escapeHtml(e.description || '')}</span></div>`).join('')}</div>` : ''}
    <h3>Equipped / Carried Gear</h3><div class="card-row">${gearCards.length ? gearCards.map((g) => cardHtml(g, { compact: true })).join('') : '<span class="micro">No public Gear.</span>'}</div>`;
  root.querySelectorAll('[data-card-id]').forEach((cardEl) => {
    cardEl.addEventListener('click', () => {
      const gear = gearCards.find((g) => g.instanceId === cardEl.dataset.cardId);
      if (gear) inspectCard(gear);
    });
  });
  $('inspectOverlay').classList.remove('hidden');
}

function renderEventHistory() {
  const logBox = $('logBox');
  if (!logBox) return;
  logBox.innerHTML = state.log.map((l) => `<div class="log-line">${escapeHtml(l.message)}</div>`).join('');
  logBox.scrollTop = logBox.scrollHeight;
}

function latestEvent() {
  return state?.log?.length ? state.log[state.log.length - 1].message : 'Waiting for the first goblin mistake.';
}

function prettyTiming(t) {
  const map = {
    DURING_COMBAT: 'Combat',
    BEFORE_ESCAPE_ROLL: 'Before Flee',
    AFTER_ESCAPE_ROLL: 'After Flee',
    ON_REVEAL: 'On reveal',
    OWN_TURN_OUTSIDE_COMBAT: 'Own turn',
    REACTION_TO_HEX: 'React Hex',
    REACTION_TO_BAD_NEWS: 'Bad News',
    REACTION_TO_DIE_ROLL: 'After Roll',
    AFTER_FAILED_ESCAPE: 'After Failed Flee'
  };
  return map[t] || String(t || '').replaceAll('_', ' ').toLowerCase();
}

function prettyPhase(phase) {
  const map = { LOBBY: 'Lobby', START_TURN: 'Open Chamber', NO_THREAT_CHOICE: 'Choice', COMBAT: 'Combat', ESCAPE: 'Flee', POST_COMBAT: 'Use Loot', TRIBUTE: 'Tribute', END_TURN: 'End Turn', GAME_OVER: 'Game Over' };
  return map[phase] || phase;
}
function playerName(id) { return state.players.find((p) => p.id === id)?.name || 'Unknown'; }
function signed(n) { return `${Number(n || 0) >= 0 ? '+' : ''}${Number(n || 0)}`; }

function playerPower(p) {
  return Number(p?.renown || 0) + Number(p?.combatBonus || 0);
}

function combatOutcome(totals) {
  if (!totals) return {
    resultClass: 'pending',
    shortLabel: 'Combat pending',
    headline: 'Combat math pending.',
    detail: 'Waiting for totals.'
  };
  const player = Number(totals.playerTotal || 0);
  const foe = Number(totals.threatTotal || 0);
  const margin = player - foe;
  if (player > foe) return {
    resultClass: 'winning',
    shortLabel: `Winning by ${Math.abs(margin)}`,
    headline: `Player side is winning: ${player} vs ${foe}.`,
    detail: 'If everyone confirms no more cards, the Foe is defeated.'
  };
  if (player === foe && totals.tieWin) return {
    resultClass: 'winning',
    shortLabel: 'Tied — player wins ties',
    headline: `Tied at ${player} — player side wins ties.`,
    detail: 'A Calling or ability lets the player side win this tied combat.'
  };
  if (player === foe) return {
    resultClass: 'losing',
    shortLabel: 'Tied — Foe wins',
    headline: `Tied at ${player} — Foe wins ties.`,
    detail: 'Player side must be higher unless a Calling or ability wins ties.'
  };
  return {
    resultClass: 'losing',
    shortLabel: `Losing by ${Math.abs(margin)}`,
    headline: `Player side is losing: ${player} vs ${foe}.`,
    detail: 'Add help, play cards, or prepare to Flee after everyone confirms.'
  };
}
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

maybeShowResume();
