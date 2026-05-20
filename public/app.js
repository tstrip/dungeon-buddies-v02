const socket = io();
const SESSION_KEY = 'lootGoblinsV070Session';
let state = null;
let selectedTribute = new Set();
let selectedSell = new Set();
let selectedTrade = new Set();
let lastDecisionKey = '';
let handExpanded = false;
let rollFx = null;
let lastSeenRollKey = '';
let handDrag = null;
const acknowledgedAnnouncements = new Set();
const dismissedSoftAnnouncements = new Set();
let softAnnouncementTimer = null;
let lastSoftAnnouncementId = '';
const acknowledgedPrivateGainCards = new Set();

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
  const decisionKey = next?.pendingPrompt?.id || next?.bodyLoot?.id || `${next?.phase || 'none'}:${next?.activePlayerId || ''}`;
  if (decisionKey !== lastDecisionKey) {
    selectedSell.clear();
    selectedTrade.clear();
    if (next?.phase !== 'TRIBUTE' && !['DISCARD_HAND_CARDS','DISCARD_GEAR_VALUE'].includes(next?.pendingPrompt?.type || '')) selectedTribute.clear();
    lastDecisionKey = decisionKey;
  }
  state = next;
  updateRollFxFromState(next);
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


function rollKeyFromState(next) {
  const latest = next?.firstRoll?.latest;
  if (latest) return `opening:${next.firstRoll.round || 1}:${latest.playerId}:${latest.raw}:${latest.at || 0}`;
  const last = next?.escape?.lastRoll;
  if (last) return `flee:${next.escape.currentPlayerId || 'runner'}:${last.raw}:${last.total}:${last.at || 0}:${last.changedBy || ''}`;
  return '';
}

function updateRollFxFromState(next) {
  const key = rollKeyFromState(next);
  if (!key || key === lastSeenRollKey) return;
  lastSeenRollKey = key;
  startRollFx(key.startsWith('opening:') ? 'opening' : 'flee', key);
}

function startRollFx(kind, key) {
  rollFx = { kind, key, at: Date.now() };
  setTimeout(() => {
    if (rollFx && rollFx.key === key) {
      rollFx = null;
      render();
    }
  }, 900);
}

function isRollFx(kind) {
  return Boolean(rollFx && rollFx.kind === kind && Date.now() - rollFx.at < 950);
}

function mobileRollMoment(kind, value, label, sub = '') {
  const rolling = isRollFx(kind);
  const shown = rolling && (value === null || value === undefined || value === '—') ? '…' : value;
  return `<div class="mobile-roll-moment ${rolling ? 'rolling' : ''}">
    ${dieHtml(shown ?? '—', `${value && value !== '—' ? 'rolled' : 'idle'} ${rolling ? 'rolling' : ''}`)}
    <div><strong>${escapeHtml(label)}</strong>${sub ? `<span>${escapeHtml(sub)}</span>` : ''}</div>
  </div>`;
}

function emitAction(type, extra = {}) {
  if (type === 'ROLL_FIRST') startRollFx('opening', 'local-opening');
  if (type === 'ROLL_ESCAPE') startRollFx('flee', 'local-flee');
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
  renderGlobalModal();
  attachGlobalEventHandlers();
}

function attachGlobalEventHandlers() {
  document.querySelectorAll('[data-mobile-inspect-card]').forEach((btn) => {
    if (btn.dataset.boundInspect === '1') return;
    btn.dataset.boundInspect = '1';
    btn.addEventListener('click', () => {
      const card = findVisibleCardByInstance(btn.dataset.mobileInspectCard);
      if (card) inspectCard(card);
    });
  });
  document.querySelectorAll('[data-ack-private-gain]').forEach((btn) => {
    if (btn.dataset.boundPrivateGain === '1') return;
    btn.dataset.boundPrivateGain = '1';
    btn.addEventListener('click', () => {
      String(btn.dataset.ackPrivateGain || '').split(',').filter(Boolean).forEach((id) => acknowledgedPrivateGainCards.add(id));
      render();
    });
  });
  document.querySelectorAll('[data-ack-announcement]').forEach((btn) => {
    if (btn.dataset.boundAck === '1') return;
    btn.dataset.boundAck = '1';
    btn.addEventListener('click', () => {
      if (btn.dataset.ackAnnouncement) acknowledgedAnnouncements.add(btn.dataset.ackAnnouncement);
      render();
    });
  });
}

function renderGlobalModal() {
  const root = $('globalModalRoot');
  if (!root) return;
  const html = privateCardGainHtml() || globalAnnouncementHtml();
  root.innerHTML = html;
  root.classList.toggle('active', Boolean(html));
  scheduleSoftAnnouncementDismiss();
}

function scheduleSoftAnnouncementDismiss() {
  const a = state?.announcement;
  if (!a || announcementTier(a) !== 'soft' || dismissedSoftAnnouncements.has(a.id)) {
    if (softAnnouncementTimer) {
      clearTimeout(softAnnouncementTimer);
      softAnnouncementTimer = null;
    }
    lastSoftAnnouncementId = '';
    return;
  }
  if (lastSoftAnnouncementId === a.id && softAnnouncementTimer) return;
  if (softAnnouncementTimer) clearTimeout(softAnnouncementTimer);
  lastSoftAnnouncementId = a.id;
  softAnnouncementTimer = setTimeout(() => {
    dismissedSoftAnnouncements.add(a.id);
    if (lastSoftAnnouncementId === a.id) lastSoftAnnouncementId = '';
    softAnnouncementTimer = null;
    render();
  }, 3000);
}


function announcementTier(a) {
  if (!a) return 'log';
  if (['hard','soft','log'].includes(String(a.priority || '').toLowerCase())) return String(a.priority).toLowerCase();

  // Legacy fallback for older rooms/builds.
  const kind = String(a.kind || '').toLowerCase();
  const title = String(a.title || '');
  const detail = String(a.detail || '');
  const card = a.card;
  const type = String(card?.type || '').toUpperCase();
  const joined = `${title} ${detail}`;

  if (/use loot|sell before tribute|use\/sell|using loot|loot phase|tribute pending|window complete|done buffing|done nerfing|confirmed no more/i.test(joined)) return 'log';
  if (kind === 'backup' && !/locked|joins|accepted|deal locked/i.test(joined)) return 'log';
  if (['bad','death','game','flee','backup','trade','zero-glory'].includes(kind)) return 'hard';
  if (kind === 'roll' && /opening roll complete|goes first|winner/i.test(joined)) return 'hard';
  if (kind === 'prompt' && /hex needs|choice required/i.test(joined)) return 'hard';
  if (kind === 'combat') return 'hard';
  if (kind === 'hex' && /hex needs|choice required|hex canceled|hex blocked/i.test(joined)) return 'hard';
  if (kind === 'hex') return 'soft';
  if (kind === 'card' && ['TRICK','THREAT','THREAT_MODIFIER'].includes(type)) return 'hard';
  if (/bad news|goblin down|victory|flee result|backup|trade|added .*foe|foe added|combat card|opening roll complete|goes first/i.test(joined)) return 'hard';
  if (['gear','draw','reveal','glory','tribute','effect'].includes(kind)) return 'soft';
  if (kind === 'card' && ['ROLE','ORIGIN','GEAR','SPECIAL'].includes(type)) return 'soft';
  if (/kin played|calling played|gear equipped|gear carried|added to hand/i.test(joined)) return 'soft';

  return 'log';
}

function announcementNeedsAck(a) {
  if (!a) return false;
  if (typeof a.requiresAck === 'boolean') return a.requiresAck;
  return announcementTier(a) === 'hard';
}

function announcementCardLabel(card) {
  if (!card) return '';
  if (card.type === 'THREAT') return `Foe · STR ${Number(card.finalStrength || card.strength || 0)} · Bad News: ${card.badNewsText || 'See card'}`;
  if (card.type === 'GEAR') return `Gear · +${Number(card.combatBonus || 0)} Power${card.escapeBonus ? ` · Flee +${card.escapeBonus}` : ''}`;
  if (card.type === 'TRICK') return 'Trick · One-use';
  return typeLabel(card);
}

function hardEventTemplate(a) {
  const kind = String(a?.kind || '').toLowerCase();
  const title = String(a?.title || '');
  const card = a?.card;
  if (kind === 'bad' || /bad news/i.test(title)) return 'outcome';
  if (kind === 'death' || kind === 'game' || kind === 'roll' || kind === 'flee') return 'outcome';
  if (kind === 'combat' || kind === 'card' || kind === 'hex' || card) return 'card-played';
  return 'outcome';
}

function hardEventTypeLabel(a) {
  const kind = String(a?.kind || '').toLowerCase();
  const title = String(a?.title || '');
  if (kind === 'bad' || /bad news/i.test(title)) return 'Bad News';
  if (kind === 'death') return 'Goblin Down';
  if (kind === 'game') return 'Victory';
  if (kind === 'roll') return 'Opening Roll';
  if (kind === 'flee') return 'Flee Result';
  if (kind === 'backup') return 'Backup';
  if (kind === 'trade') return 'Trade';
  if (kind === 'hex') return 'Hex Finished';
  if (kind === 'combat') return 'Combat Change';
  if (a?.card?.type === 'TRICK') return 'Trick Played';
  if (a?.card?.type === 'THREAT') return 'Foe Added';
  return 'Table Event';
}


function privateGainCards() {
  const hand = state?.you?.hand || [];
  return hand
    .filter((c) => c.fresh && c.freshReason !== 'FACE_UP_REVEAL' && !acknowledgedPrivateGainCards.has(c.instanceId))
    .sort((a, b) => Number(a.freshAt || 0) - Number(b.freshAt || 0));
}

function privateCardGainHtml() {
  const cards = privateGainCards();
  if (!cards.length) return '';
  const chamber = cards.filter((c) => String(c.freshFrom || '').toUpperCase().includes('CHAMBER')).length;
  const loot = cards.filter((c) => String(c.freshFrom || '').toUpperCase().includes('LOOT')).length;
  const title = cards.length === 1 ? `You gained ${cards[0].publicName}` : `You gained ${cards.length} cards`;
  const source = cards.some((c) => c.freshReason === 'LOOT_ROOM') ? 'Loot the Room' : (loot && chamber ? 'New Cards' : loot ? 'Loot Gained' : 'Hidden Chamber Gained');
  const summary = [chamber ? `${chamber} Chamber` : '', loot ? `${loot} Loot` : ''].filter(Boolean).join(' · ');
  return `<section class="global-public-modal private-gain-modal" role="dialog" aria-modal="true">
    <div class="private-gain-card">
      <div class="private-gain-kicker">${escapeHtml(source)}</div>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(summary || 'Added to your hand.')}</p>
      <div class="private-gain-card-row">${cards.map((c) => `<button class="private-gain-preview" data-mobile-inspect-card="${c.instanceId}">${cardHtml(c, { compact: true })}<span>${escapeHtml(typeLabel(c))}</span></button>`).join('')}</div>
      <button class="primary private-gain-ack" data-ack-private-gain="${cards.map((c) => c.instanceId).join(',')}">Got it</button>
    </div>
  </section>`;
}


function globalAnnouncementHtml() {
  const a = state?.announcement;
  if (!a || acknowledgedAnnouncements.has(a.id)) return '';
  const tier = announcementTier(a);
  if (tier === 'soft' || (tier === 'hard' && !announcementNeedsAck(a))) {
    if (dismissedSoftAnnouncements.has(a.id)) return '';
    const icon = announcementIcon(a.kind);
    const cardLine = a.card ? announcementCardLabel(a.card) : '';
    return `<section class="global-soft-popup ${escapeHtml(a.kind || '')}" data-priority="${escapeHtml(a.priority || tier)}" data-category="${escapeHtml(a.category || a.kind || '')}" role="status" aria-live="polite">
      <div class="global-soft-card">
        <div class="soft-event-icon">${icon}</div>
        <div class="soft-event-copy">
          <strong>${escapeHtml(a.title || 'Table Event')}</strong>
          <span>${escapeHtml(a.detail || cardLine || '')}</span>
          ${cardLine && a.detail ? `<em>${escapeHtml(cardLine)}</em>` : ''}
        </div>
        ${a.card ? `<button class="soft-event-view" data-mobile-inspect-card="${a.card.instanceId}">View</button>` : ''}
        <i class="soft-event-timer" aria-hidden="true"></i>
      </div>
    </section>`;
  }
  if (tier !== 'hard' || !announcementNeedsAck(a)) return '';
  const icon = announcementIcon(a.kind);
  const template = hardEventTemplate(a);
  return `<section class="global-public-modal public-resolution-modal hard-event ${template} ${a.importance === 'major' ? 'major' : ''} ${escapeHtml(a.kind || '')}" data-priority="${escapeHtml(a.priority || tier)}" data-category="${escapeHtml(a.category || a.kind || '')}" role="dialog" aria-modal="true">
    <div class="global-public-backdrop" aria-hidden="true"></div>
    <div class="public-modal-card global-public-modal-card">
      <div class="public-event-pill">${escapeHtml(hardEventTypeLabel(a))}</div>
      <div class="public-modal-header">
        <div class="announce-icon">${icon}</div>
        <div class="public-modal-copy">
          <div class="announce-title">${escapeHtml(a.title || 'Table Event')}</div>
          <div class="announce-detail">${escapeHtml(a.detail || '')}</div>
        </div>
      </div>
      ${a.card ? `<button class="announce-card-preview public-modal-preview" data-mobile-inspect-card="${a.card.instanceId}">${cardHtml(a.card, { modalPreview: true })}<span>${escapeHtml(announcementCardLabel(a.card))}</span></button>` : ''}
      <button class="ack-button primary" data-ack-announcement="${a.id}">Acknowledge</button>
    </div>
  </section>`;
}


function announcementHtml() {
  return '';
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
  dock.querySelectorAll('[data-discard-pile]').forEach((btn) => btn.addEventListener('click', () => showDiscardViewer(btn.dataset.discardPile)));
}

function pileHtml(pile, move) {
  const classes = ['deck-pile', pile.kind];
  if (move?.from === pile.key) classes.push('source');
  if (move?.to === pile.key) classes.push('destination');
  const empty = Number(pile.count || 0) <= 0;
  if (empty) classes.push('empty');
  const isDiscard = /DISCARD/.test(pile.key);
  const tag = isDiscard ? 'button' : 'div';
  const attrs = isDiscard ? `type="button" data-discard-pile="${pile.key === 'CHAMBER_DISCARD' ? 'chamber' : 'loot'}"` : '';
  return `<${tag} class="${classes.join(' ')}" aria-label="${escapeHtml(pile.label)} ${escapeHtml(pile.sub)} ${Number(pile.count || 0)} cards" ${attrs}>
    ${deckPileImageHtml(pile)}
    <div class="pile-copy"><strong>${escapeHtml(pile.label)}</strong><small>${escapeHtml(pile.sub)} · ${Number(pile.count || 0)}</small></div>
  </${tag}>`;
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
      <div class="movement-detail">${escapeHtml(notice?.detail || move?.detail || 'Cards and dice hit the middle of the table.')}</div>
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
  if (state.phase === 'HEX_REVEAL') return 'Hex Reveal';
  if (state.phase === 'COMBAT') return 'Combat Zone';
  if (state.phase === 'ESCAPE') return 'Flee Zone';
  if (state.revealCard) return 'Reveal Zone';
  if (state.bodyLoot) return 'Goblin Down';
  if (state.pendingPrompt) return 'Prompt Zone';
  return 'Table Center';
}

function centerZoneSub() {
  if (state.phase === 'ROLL_FOR_FIRST') return 'Every goblin rolls a d6. Highest starts. Ties reroll.';
  if (state.phase === 'HEX_REVEAL') return state.pendingHex?.card ? `${state.pendingHex.card.publicName} is waiting.` : 'A Hex is waiting.';
  if (state.phase === 'COMBAT') return 'Foes, modifiers, and played Tricks live here.';
  if (state.phase === 'ESCAPE') return 'Dice rolls and Bad News happen here.';
  if (state.revealCard) return `${state.revealCard.publicName} is on the table.`;
  if (state.bodyLoot) return state.bodyLoot.requiresYou ? 'Choose one card from the fallen goblin.' : `Body looting: waiting for ${state.bodyLoot.currentLooterName || 'a player'}.`;
  if (state.pendingPrompt) return state.pendingPrompt.message || 'Waiting for a player choice.';
  return 'Revealed cards will appear here.';
}

function centerZoneClass() {
  if (state.phase === 'ROLL_FOR_FIRST') return 'roll-center';
  if (state.phase === 'HEX_REVEAL') return 'hex-center';
  if (state.phase === 'COMBAT') return 'combat-center';
  if (state.phase === 'ESCAPE') return 'flee-center';
  if (state.revealCard) return 'reveal-center';
  if (state.bodyLoot) return 'body-loot-center';
  return '';
}


function phaseGrammar() {
  const you = me();
  const act = active();
  const activeName = act?.name || 'the active goblin';
  const legal = state?.legalActions || [];
  const hasLegal = (a) => legal.includes(a);
  const out = {
    title: prettyPhase(state?.phase),
    copy: 'The table is handling the current step.',
    who: activeName,
    next: 'Wait for the current step to finish.',
    buttons: [],
    urgency: 'normal'
  };

  if (state?.reaction) {
    const r = state.reaction;
    const waiting = (r.eligiblePlayerIds || []).filter((id) => !r.passes?.[id]).map(playerName).join(', ');
    out.title = r.title || 'Reaction Window';
    out.copy = r.message || 'A player may respond before the game continues.';
    out.who = r.requiresYou ? 'You' : (waiting || 'the table');
    out.next = r.requiresYou ? 'Use a legal reaction card or pass.' : `Waiting on ${waiting || 'reaction players'}.`;
    out.buttons = reactionButtons(r);
    out.urgency = r.requiresYou ? 'urgent' : 'waiting';
    return out;
  }

  if (state?.pendingPrompt) {
    const p = state.pendingPrompt;
    out.title = p.requiresYou ? promptTitle(p) : `${playerName(p.playerId)} has a decision`;
    out.copy = p.message || 'A player choice is pending.';
    out.who = p.requiresYou ? 'You' : playerName(p.playerId);
    out.next = p.requiresYou ? promptNextText(p) : 'The table continues after this choice.';
    out.urgency = p.requiresYou ? 'urgent' : 'waiting';
    return out;
  }

  if (state?.bodyLoot) {
    const loot = state.bodyLoot;
    out.title = 'Loot the Body';
    out.copy = `${loot.victimName || 'A goblin'} is down. Looting happens in Glory order.`;
    out.who = loot.requiresYou ? 'You' : (loot.currentLooterName || 'the current looter');
    out.next = loot.requiresYou ? 'Choose one card from the body loot prompt.' : 'Wait for the current looter to take one card.';
    out.urgency = loot.requiresYou ? 'urgent' : 'waiting';
    return out;
  }

  if (state?.phase === 'GAME_OVER') {
    const winner = state.players.find((p) => p.id === state.winnerId);
    out.title = `VICTORY — ${winner?.name || 'Someone'} reached 10 Glory`;
    out.copy = 'History will exaggerate this.';
    out.who = winner?.name || 'the winner';
    out.next = 'Start a new table when everyone is done bragging.';
    out.urgency = 'final';
    return out;
  }

  if (state?.phase === 'ROLL_FOR_FIRST') {
    const first = state.firstRoll || {};
    const waitingIds = (first.eligible || []).filter((id) => !first.rolls?.[id]);
    const waitingNames = waitingIds.map(playerName).join(', ');
    out.title = first.requiresYou ? 'Roll to See Who Goes First' : 'Opening Roll';
    out.copy = first.requiresYou ? 'Tap the die. Highest roll opens the first Chamber. Ties reroll together.' : `Waiting for opening rolls from ${waitingNames || 'the table'}.`;
    out.who = first.requiresYou ? 'You' : (waitingNames || 'the table');
    out.next = 'When everyone rolls, the first goblin is announced.';
    if (first.requiresYou) out.buttons.push(buttonHtml('Roll d6', 'ROLL_FIRST', 'primary'));
    return out;
  }

  if (state?.phase === 'HEX_REVEAL') {
    const h = state.pendingHex;
    if (h) {
      out.title = h.requiresYou ? 'Take the Hex Hit' : `${h.targetPlayerName || 'A goblin'} is hit by a Hex`;
      out.copy = h.card ? `${h.card.publicName}: ${h.card.publicText || 'Take the Hex hit.'}` : 'Read the Hex, then take the hit.';
      out.who = h.requiresYou ? 'You' : (h.targetPlayerName || 'the target');
      out.next = h.requiresYou ? 'Tap Take the Hit. Any choices come next.' : 'Wait for the target.';
      if (h.requiresYou) out.buttons.push(buttonHtml('Take the Hit', 'RESOLVE_HEX', 'primary'));
    } else {
      out.title = 'Hex in progress';
      out.copy = 'The Hex is done. Waiting for the table.';
      out.who = activeName;
      out.next = 'The table should advance automatically.';
      out.urgency = 'recover';
    }
    return out;
  }

  if (state?.phase === 'START_TURN') {
    out.title = isMyTurn() ? 'Your Turn — Open Chamber' : `${activeName}'s Turn`;
    out.copy = isMyTurn() ? 'Play legal setup cards first, or open a Chamber when ready.' : `${activeName} can play setup cards or open a Chamber.`;
    out.who = isMyTurn() ? 'You' : activeName;
    out.next = 'Opening a Chamber reveals the next public card.';
    if (isMyTurn()) {
      if (hasLegal('OPEN_CHAMBER')) out.buttons.push(buttonHtml('Open Chamber', 'OPEN_CHAMBER', 'primary'));
      if (hasLegal('SELL_GEAR')) out.buttons.push(buttonHtml('Sell Gear', 'SELL_GEAR'));
    }
    return out;
  }

  if (state?.phase === 'NO_THREAT_CHOICE') {
    const playableFoes = (state?.you?.hand || []).filter((c) => c.type === 'THREAT' && serverCardActions(c).length);
    out.title = isMyTurn() ? 'No Foe — Choose Your Move' : `${activeName} chooses a move`;
    out.copy = isMyTurn()
      ? (playableFoes.length ? 'Start Trouble with a glowing Foe, Loot the Room, sell Gear, or play setup.' : 'No Foe appeared. Loot the Room, sell Gear, or play any legal setup card.')
      : `Waiting for ${activeName} to Start Trouble or Loot the Room.`;
    out.who = isMyTurn() ? 'You' : activeName;
    out.next = isMyTurn() ? 'After your move, the game checks Loot/Tribute/end turn.' : 'The turn continues after the active goblin chooses.';
    if (isMyTurn()) {
      if (hasLegal('SEARCH_ROOM')) out.buttons.push(buttonHtml('Loot the Room', 'SEARCH_ROOM', 'primary'));
      if (hasLegal('SELL_GEAR')) out.buttons.push(buttonHtml('Sell Gear', 'SELL_GEAR'));
    }
    return out;
  }

  if (state?.phase === 'COMBAT') {
    const combat = state.combat || {};
    const totals = combat.totals;
    const outcome = combatOutcome(totals);
    const waiting = (state.players || []).filter((p) => !combat.passes?.[p.id]).map((p) => p.name);
    const done = Boolean(combat.passes?.[you?.id]);
    const foeName = combat.threats?.[0]?.publicName || 'Foe';
    const need = combatNeedToWin(totals);
    out.title = `Combat — ${activeName} vs ${foeName}`;
    out.copy = done ? `${outcome.shortLabel}. You have passed unless someone changes combat.` : `${outcome.shortLabel}. ${need > 0 ? `Need +${need}. ` : ''}Play cards, negotiate Backup, or pass.`;
    out.who = waiting.length ? waiting.join(', ') : 'the table';
    out.next = waiting.length ? 'Combat ends when everyone passes after the latest change.' : 'Combat should end now.';
    out.buttons = combatButtons();
    out.urgency = done ? 'waiting' : 'urgent';
    return out;
  }

  if (state?.phase === 'ESCAPE') {
    const runner = state.players.find((p) => p.id === state.escape?.currentPlayerId);
    const foeName = state.escape?.threat?.publicName || 'the Foe';
    const bonus = state.escape?.fleeBonus || 0;
    out.title = runner?.isYou ? `Your Flee Roll — ${foeName}` : `${runner?.name || 'Someone'} must Flee`;
    out.copy = runner?.isYou ? `Roll 1d6. Target: 5+. Current Flee bonus: ${signed(bonus)}.` : `Waiting for ${runner?.name || 'the runner'} to Flee from ${foeName}.`;
    out.who = runner?.isYou ? 'You' : (runner?.name || 'the runner');
    out.next = state.escape?.awaitingContinue ? 'Continue to apply or avoid Bad News.' : 'A failed roll triggers Bad News.';
    if (runner?.isYou) {
      if (!state.escape?.awaitingContinue && hasLittleHelper(me())) out.buttons.push(buttonHtml('Sacrifice Little Helper', 'SACRIFICE_HIRELING_FLEE'));
      out.buttons.push(buttonHtml(state.escape?.awaitingContinue ? 'Continue' : (state.escape?.autoFlee ? 'Use Automatic Flee' : 'Roll to Flee'), state.escape?.awaitingContinue ? 'CONTINUE_FLEE' : 'ROLL_ESCAPE', 'primary'));
    }
    return out;
  }

  if (state?.phase === 'POST_COMBAT') {
    out.title = isMyTurn() ? 'Use Loot Before Tribute' : `${activeName} is using Loot`;
    out.copy = isMyTurn() ? 'Play, equip, carry, sell, or trade before the hand-limit check.' : `${activeName} is counting shiny things before Tribute is checked.`;
    out.who = isMyTurn() ? 'You' : activeName;
    out.next = 'After this, the game checks whether Tribute is required.';
    if (isMyTurn()) {
      if (hasLegal('SELL_GEAR')) out.buttons.push(buttonHtml('Sell Gear', 'SELL_GEAR'));
      if (hasLegal('DONE_POST_COMBAT')) out.buttons.push(buttonHtml('Done → Check Tribute', 'DONE_POST_COMBAT', 'primary'));
    }
    return out;
  }

  if (state?.phase === 'TRIBUTE') {
    const count = you ? Math.max(0, Number(you.handCount || 0) - Number(you.handLimit || 0)) : 0;
    out.title = isMyTurn() ? 'Tribute Required' : `${activeName} is handling Tribute`;
    out.copy = isMyTurn() ? `Your hand is ${you.handCount}/${you.handLimit}. Choose ${count} excess card${count === 1 ? '' : 's'} below.` : `Waiting for ${activeName} to give or discard excess cards.`;
    out.who = isMyTurn() ? 'You' : activeName;
    out.next = isMyTurn() ? 'Inspect first, Pick exact excess cards, then Confirm Tribute.' : 'The turn ends after Tribute.';
    out.urgency = isMyTurn() ? 'urgent' : 'waiting';
    return out;
  }

  if (state?.phase === 'END_TURN') {
    out.title = isMyTurn() ? 'Turn Ending' : `${activeName}'s turn is wrapping up`;
    out.copy = isMyTurn() ? 'End your turn when ready, or sell Gear first.' : `Waiting for ${activeName} to end their turn.`;
    out.who = isMyTurn() ? 'You' : activeName;
    out.next = 'The next goblin opens a Chamber.';
    if (isMyTurn()) {
      if (hasLegal('END_TURN')) out.buttons.push(buttonHtml('End Turn', 'END_TURN', 'primary'));
      if (hasLegal('SELL_GEAR')) out.buttons.push(buttonHtml('Sell Gear', 'SELL_GEAR'));
    }
    return out;
  }

  out.who = activeName;
  out.next = 'The table should continue automatically. If it does not, check for a pending prompt or refresh.';
  out.urgency = 'recover';
  return out;
}

function promptTitle(prompt) {
  if (!prompt) return 'Choice Required';
  const map = {
    ADD_FOE_FROM_HAND: 'Choose Foe to Add',
    TRADE_OFFER_SELECT: 'Build Trade Offer',
    TRADE_ACCEPT: 'Trade Offered',
    SELL_GEAR: 'Sell Gear',
    CHEAT_GEAR: 'Choose Gear',
    LOSE_CALLING_CHOICE: 'Choose Calling to Lose',
    LOSE_KIN_CHOICE: 'Choose Kin to Lose'
  };
  return map[prompt.type] || 'Choice Required';
}

function promptNextText(prompt) {
  if (!prompt) return 'Choose an option to continue.';
  const map = {
    ADD_FOE_FROM_HAND: 'Pick the Foe that joins combat.',
    TRADE_OFFER_SELECT: 'Select cards, then send or cancel the offer.',
    TRADE_ACCEPT: 'Accept to receive the cards, or decline.',
    SELL_GEAR: 'Select Gear to sell, or cancel/done.',
    CHEAT_GEAR: 'Choose the Gear this permit should legalize.'
  };
  return map[prompt.type] || 'Make this choice to continue the table.';
}

function phaseGrammarStripHtml(grammar) {
  if (!grammar) return '';
  return `<div class="phase-grammar-strip urgency-${escapeHtml(grammar.urgency || 'normal')}">
    <span><b>Who acts</b>${escapeHtml(grammar.who || 'the table')}</span>
    <span><b>Next</b>${escapeHtml(grammar.next || 'continue')}</span>
  </div>`;
}

function mobilePhaseGuidanceHtml(grammar) {
  if (!grammar) return '';
  return `<div class="mobile-phase-guidance urgency-${escapeHtml(grammar.urgency || 'normal')}">
    <div><b>Who acts</b><span>${escapeHtml(grammar.who || 'the table')}</span></div>
    <div><b>Next</b><span>${escapeHtml(grammar.next || 'continue')}</span></div>
  </div>`;
}

function compactPhaseStatus(grammar) {
  if (!state) return '';
  if (state.reaction) return grammar?.copy || 'A reaction window is open.';
  if (state.pendingPrompt) return grammar?.copy || 'A player has a choice.';
  if (state.bodyLoot) return grammar?.copy || 'Body Loot is happening.';
  if (state.phase === 'COMBAT' && state.combat) {
    const totals = state.combat.totals || {};
    const outcome = combatOutcome(totals);
    const waiting = (state.players || []).filter((p) => !state.combat.passes?.[p.id]).map((p) => p.name);
    const you = me();
    const youPassed = Boolean(state.combat.passes?.[you?.id]);
    if (youPassed) return `${outcome.shortLabel}. You passed unless combat changes.`;
    if (waiting.length) return `${outcome.shortLabel}. Waiting on ${waiting.join(', ')}.`;
    return `${outcome.shortLabel}. Everyone passed.`;
  }
  if (state.phase === 'ROLL_FOR_FIRST') {
    const first = state.firstRoll || {};
    if (first.requiresYou) return 'Tap Roll d6.';
    const waiting = (first.eligible || []).filter((id) => !first.rolls?.[id]).map(playerName).join(', ');
    return waiting ? `Waiting on ${waiting}.` : 'Opening roll is happening.';
  }
  if (state.phase === 'HEX_REVEAL' && state.pendingHex) {
    return state.pendingHex.requiresYou ? 'Read the Hex, then take the hit.' : `Waiting on ${state.pendingHex.targetPlayerName || 'the target'}.`;
  }
  if (state.phase === 'TRIBUTE') return isMyTurn() ? 'Pick excess cards in your drawer.' : `Waiting on ${active()?.name || 'the active goblin'}.`;
  return grammar?.copy || grammar?.next || '';
}

function renderPhaseBanner() {
  const root = $('phaseBanner');
  if (!root) return;
  const grammar = phaseGrammar();
  const compactTitle = grammar.title || prettyPhase(state.phase);
  root.className = `phase-banner panel phase-status-strip phase-${String(state.phase || 'state').toLowerCase().replace(/[^a-z0-9]+/g, '-')} urgency-${String(grammar.urgency || 'normal')}`;
  root.innerHTML = `<div class="phase-strip-main"><h2>${escapeHtml(compactTitle)}</h2></div>`;
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
    buttons.push(`<button data-reaction-action="PASS_REACTION">Let Hex Hit</button>`);
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
      buttons.push(`<button data-combat-action="RESCIND_BACKUP">Rescind Backup Request</button>`);
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
    const addFoeCard = addFoeEnablerCard();
    if (addFoeCard && isCardPlayable(addFoeCard) && hasFoeInHand()) buttons.push(`<button class="primary" data-combat-action="USE_ADD_FOE_CARD" data-card-id="${addFoeCard.instanceId}">Add Foe with ${escapeHtml(addFoeCard.publicName)}</button>`);
    if (hasPublicRole(you, 'Bruiser')) buttons.push(`<button data-combat-action="BRUISER_BERSERK">Bruiser: discard for +3</button>`);
    if (hasPublicRole(you, 'Cutpurse') && combat.activePlayerId !== you.id) buttons.push(`<button data-combat-action="CUTPURSE_BACKSTAB">Cutpurse: backstab -2</button>`);
    if (hasPublicRole(you, 'Hexhand') && combat.activePlayerId === you.id) buttons.push(`<button data-combat-action="HEXHAND_CHARM">Hexhand: charm Foe</button>`);
  }
  if (youAreDone) buttons.push(`<button class="selected-action" disabled>✓ Passed — Waiting</button>`);
  else buttons.push(`<button data-combat-action="PASS_COMBAT">Pass Combat</button>`);
  return buttons;
}

function handleCombatButton(action, target, lootCount, allLoot, cardId) {
  if (action === 'REQUEST_BACKUP') emitAction('REQUEST_BACKUP', { targetPlayerId: target });
  else if (action === 'USE_ADD_FOE_CARD') emitAction('PLAY_CARD', { cardId });
  else if (action === 'SET_BACKUP_DEAL') emitAction('SET_BACKUP_DEAL', { lootCount: Number(lootCount || 0), allLoot: Boolean(allLoot) });
  else if (action === 'BRUISER_BERSERK') emitAction('BRUISER_BERSERK');
  else if (action === 'CUTPURSE_BACKSTAB') emitAction('CUTPURSE_BACKSTAB');
  else if (action === 'HEXHAND_CHARM') emitAction('HEXHAND_CHARM');
  else if (action === 'ADD_FOE_FROM_HAND') emitAction('ADD_FOE_FROM_HAND');
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
    ${mobileTradeNoticeHtml()}
    ${mobileDeckStripHtml(move)}
    ${mobileAnnouncementHtml()}
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
  root.querySelectorAll('[data-server-card-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.serverCardId;
      const card = id ? findVisibleCardByInstance(id) : null;
      if (card) emitServerCardAction(card, btn.dataset.serverCardAction);
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
  root.querySelectorAll('[data-nofoe-start-trouble]').forEach((btn) => {
    btn.addEventListener('click', () => {
      handExpanded = false;
      renderHand();
      const hand = document.getElementById('handPanel');
      if (hand) hand.scrollIntoView({ behavior: 'smooth', block: 'end' });
      const firstFoe = document.querySelector('.hand-card.playable.card-type-threat, .hand-card.playable.type-threat, [data-card-type="THREAT"].playable');
      if (firstFoe) firstFoe.classList.add('attention-pulse');
      showToast('Pick a glowing Foe in your hand to Start Trouble.', 'ok');
    });
  });
  root.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.action === 'START_TROUBLE' && btn.dataset.cardId) emitAction('START_TROUBLE', { cardId: btn.dataset.cardId });
      else emitAction(btn.dataset.action);
    });
  });
  root.querySelectorAll('[data-combat-action]').forEach((btn) => {
    btn.addEventListener('click', () => handleCombatButton(btn.dataset.combatAction, btn.dataset.target, btn.dataset.lootCount, btn.dataset.allLoot, btn.dataset.cardId));
  });
  root.querySelectorAll('[data-reaction-action]').forEach((btn) => {
    btn.addEventListener('click', () => handleReactionButton(btn.dataset.reactionAction, btn.dataset.value));
  });
  root.querySelectorAll('[data-mobile-tribute-confirm]').forEach((btn) => {
    btn.addEventListener('click', () => confirmTribute());
  });
  root.querySelectorAll('[data-mobile-prompt-card]').forEach((btn) => btn.addEventListener('click', () => emitAction('RESOLVE_PROMPT', { cardId: btn.dataset.mobilePromptCard })));
  const mobileTradeSelected = new Set();
  root.querySelectorAll('[data-mobile-trade-card]').forEach((btn) => btn.addEventListener('click', () => {
    if (mobileTradeSelected.has(btn.dataset.mobileTradeCard)) { mobileTradeSelected.delete(btn.dataset.mobileTradeCard); btn.classList.remove('selected'); }
    else { mobileTradeSelected.add(btn.dataset.mobileTradeCard); btn.classList.add('selected'); }
    const confirm = root.querySelector('[data-mobile-trade-confirm]');
    if (confirm) confirm.disabled = mobileTradeSelected.size === 0;
  }));
  root.querySelectorAll('[data-mobile-trade-confirm]').forEach((btn) => btn.addEventListener('click', () => emitAction('RESOLVE_PROMPT', { cardIds: [...mobileTradeSelected] })));
  root.querySelectorAll('[data-mobile-trade-accept]').forEach((btn) => btn.addEventListener('click', () => emitAction('RESOLVE_PROMPT', { accept: true })));
  root.querySelectorAll('[data-mobile-trade-decline]').forEach((btn) => btn.addEventListener('click', () => emitAction('RESOLVE_PROMPT', { decline: true })));
  const mobileSellSelected = new Set();
  root.querySelectorAll('[data-mobile-sell-card]').forEach((btn) => btn.addEventListener('click', () => {
    if (mobileSellSelected.has(btn.dataset.mobileSellCard)) { mobileSellSelected.delete(btn.dataset.mobileSellCard); btn.classList.remove('selected'); }
    else { mobileSellSelected.add(btn.dataset.mobileSellCard); btn.classList.add('selected'); }
    const confirm = root.querySelector('[data-mobile-sell-confirm]');
    if (confirm) confirm.disabled = mobileSellSelected.size === 0;
  }));
  root.querySelectorAll('[data-mobile-sell-confirm]').forEach((btn) => btn.addEventListener('click', () => emitAction('RESOLVE_PROMPT', { cardIds: [...mobileSellSelected] })));
  root.querySelectorAll('[data-mobile-prompt-cancel]').forEach((btn) => btn.addEventListener('click', () => emitAction('RESOLVE_PROMPT', { cancel: true })));

  root.querySelectorAll('[data-ack-announcement]').forEach((btn) => btn.addEventListener('click', () => { if (btn.dataset.ackAnnouncement) acknowledgedAnnouncements.add(btn.dataset.ackAnnouncement); render(); }));
  root.querySelectorAll('[data-discard-pile]').forEach((btn) => btn.addEventListener('click', () => showDiscardViewer(btn.dataset.discardPile)));
}


function mobileAnnouncementHtml() {
  return '';
}

function mobileTradeNoticeHtml() {
  const t = state.tradeOffer;
  if (!t) return '';
  if (t.canRescind) return `<div class="mobile-trade-alert">${assetIconHtml('trade', 'event-sigil')}<span>Trade offer sent to ${escapeHtml(t.toPlayerName)}.</span><button data-action="CANCEL_TRADE">Rescind</button></div>`;
  if (t.requiresYou) return `<div class="mobile-trade-alert">${assetIconHtml('trade', 'event-sigil')}<span>${escapeHtml(t.fromPlayerName)} offered a trade. Answer the offer.</span></div>`;
  return `<div class="mobile-trade-alert">${assetIconHtml('trade', 'event-sigil')}<span>${escapeHtml(t.fromPlayerName)} offered ${escapeHtml(t.toPlayerName)} a trade.</span></div>`;
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
  if (state.reaction) return mobileReactionStageHtml(state.reaction);
  if (state.pendingPrompt) return mobilePromptStageHtml(state.pendingPrompt);
  if (state.bodyLoot) return mobileBodyLootStageHtml();
  if (state.phase === 'COMBAT' && state.combat) return mobileCombatStageHtml(state.combat);
  if (state.phase === 'ESCAPE' && state.escape) return mobileFleeStageHtml(state.escape);
  if (state.phase === 'ROLL_FOR_FIRST') return mobileOpeningRollStageHtml();
  if (state.phase === 'HEX_REVEAL' && state.pendingHex) return mobileHexRevealStageHtml();
  if (state.phase === 'TRIBUTE') return mobileTributeStageHtml();
  if (state.phase === 'START_TURN') return mobileStartTurnStageHtml();
  if (state.phase === 'NO_THREAT_CHOICE') return mobileNoFoeStageHtml();
  if (state.phase === 'POST_COMBAT') return mobilePostCombatStageHtml();
  if (state.phase === 'END_TURN') return mobileEndTurnStageHtml();
  if (state.phase === 'GAME_OVER') return mobileGameOverStageHtml();
  return mobileRevealOrWaitingStageHtml();
}

function mobileReactionStageHtml(reaction) {
  const grammar = phaseGrammar();
  return mobileStageShell('reaction', grammar.title || 'Reaction Window', grammar.copy || 'A reaction is available.', `
    <div class="mobile-wait-card">
      ${assetIconHtml('special', 'asset-sigil event-sigil')}
      <span>${escapeHtml(grammar.next || 'Use a legal reaction or pass.')}</span>
    </div>
    ${mobileActionButtonsHtml(reactionButtons(reaction), 'reaction-actions')}
  `, { size: 'medium', icon: 'special', guidance: grammar });
}

function mobileStageShell(kind, kicker, title, bodyHtml, options = {}) {
  const size = options.size || 'medium';
  const icon = options.icon ? `<div class="mobile-state-icon">${assetIconHtml(options.icon, 'asset-sigil event-sigil')}</div>` : '';
  const grammar = options.guidance || phaseGrammar();
  const guidance = options.showGuidance ? mobilePhaseGuidanceHtml(grammar) : '';
  return `<section class="mobile-state-panel mobile-state-${escapeHtml(kind)} mobile-state-size-${escapeHtml(size)} urgency-${escapeHtml(grammar?.urgency || 'normal')}">
    <div class="mobile-state-header">
      ${icon}
      <div class="mobile-state-kicker">${escapeHtml(kicker)}</div>
    </div>
    <h2>${escapeHtml(title)}</h2>
    ${options.sub ? `<p class="mobile-state-sub">${escapeHtml(options.sub)}</p>` : ''}
    ${guidance}
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

function mobileDeckCardPreviewHtml(deck = 'CHAMBER') {
  const isLoot = String(deck).toUpperCase().includes('LOOT');
  const src = isLoot ? '/assets/loot-goblins/deck/loot-card-back.png' : '/assets/loot-goblins/deck/chamber-card-back.png';
  return `<div class="mobile-card-proportion-preview ${isLoot ? 'loot-back' : 'chamber-back'}"><img src="${src}" alt="" aria-hidden="true" loading="lazy" decoding="async" /></div>`;
}


function mobileHexRevealStageHtml() {
  const h = state.pendingHex;
  const card = h?.card || state.revealCard;
  const targetName = h?.targetPlayerName || 'the target';
  const mine = Boolean(h?.requiresYou);
  return mobileStageShell('hex-reveal clean-hex', 'Hex Revealed', `${card?.publicName || 'Hex'} hits ${targetName}`, `
    ${card ? `<div class="mobile-opened-door-card mobile-opened-door-action-first card-type-hex">
      <div class="mobile-card-sigil">${cardTypeSigilHtml(card, 'asset-sigil art-sigil')}</div>
      <div class="mobile-opened-door-copy">
        <strong>${escapeHtml(card.publicName)}</strong>
        <div class="mobile-card-type">Hex · Source first</div>
        <small>${escapeHtml(card.publicText || 'Take the Hex hit.')}</small>
      </div>
      <button class="mobile-mini-button" data-mobile-inspect-card="${card.instanceId}">View</button>
    </div>` : ''}
    ${mine ? mobileActionButtonsHtml([buttonHtml('Take the Hit', 'RESOLVE_HEX', 'primary')], 'hex-reveal-actions') : `<p class="mobile-state-hint">Waiting on ${escapeHtml(targetName)}.</p>`}
  `, { size: 'medium', icon: 'hex', sub: '' });
}

function mobileStartTurnStageHtml() {
  const mine = isMyTurn();
  const actions = mine ? mobileActionButtonsHtml([
    mobileLegalActionButton('Sell Gear', 'SELL_GEAR')
  ], 'start-turn-actions chamber-secondary-actions') : '';
  return mobileStageShell('start-turn open-chamber-flow', mine ? 'Your Turn' : 'Turn Start', mine ? 'Open a Chamber' : `${active()?.name || 'A goblin'} is up`, `
    <button class="open-chamber-door-tile ${mine ? '' : 'disabled'}" ${mine ? 'data-action="OPEN_CHAMBER"' : 'disabled'} aria-label="Open Chamber">
      <div class="open-chamber-door-art">
        ${mobileDeckCardPreviewHtml('CHAMBER')}
      </div>
      <div class="open-chamber-door-copy">
        <strong>${mine ? 'Open Chamber' : 'Chamber Deck'}</strong>
        <span>${mine ? 'Reveal top Chamber' : `${Number(state.decks?.chamber || 0)} cards remain`}</span>
      </div>
    </button>
    ${mine ? `<p class="mobile-state-hint setup-glow-hint">Setup cards glow in your hand.</p>` : `<p class="mobile-state-hint">${escapeHtml(active()?.name || 'The active goblin')} can play setup or open the door.</p>`}
    ${actions}
  `, { size: 'small', icon: null, sub: '' });
}

function mobileQuickRevealButtons(card) {
  if (!card) return '';
  const source = serverCardSource(card);
  const actions = serverCardActions(source).filter((a) => !['SELL_GEAR'].includes(a.type));
  const buttons = [];
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    buttons.push(`<button class="${escapeHtml(action.style || '')}" data-server-card-action="${i}" data-server-card-id="${source.instanceId}">${escapeHtml(action.label || 'Use Card')}</button>`);
  }
  buttons.push(`<button data-mobile-inspect-card="${card.instanceId}">View Card</button>`);
  return `<div class="mobile-reveal-actions">${buttons.join('')}</div>`;
}

function mobileOpenedDoorResultHtml(mine, actor) {
  const card = state.revealCard || state.tableNotice?.card || null;
  if (!card || card.type === 'THREAT') return '';
  const isHex = card.type === 'HEX';
  const typeName = typeLabel(card);
  const contextLine = isHex ? 'Hex · Hits immediately' : `${typeName} · Face-Up Chamber`;
  const statusLine = isHex
    ? `${mine ? 'You were hit' : `${actor} was hit`} by ${card.publicName}.`
    : (mine ? 'Added to your hand' : `Added to ${actor}'s hand`);
  const subLine = isHex
    ? (mine ? 'No Foe appeared. Choose your next move.' : `${actor} can now choose a move.`)
    : (mine ? (isCardPlayable(card) ? 'Playable now' : 'Choose whether to use it now or keep it in hand.') : `${actor} may play it now or choose a move.`);
  return `<div class="mobile-opened-door-card mobile-opened-door-action-first ${cardTypeClass(card)}">
    <button class="mobile-reveal-card-preview" data-mobile-inspect-card="${card.instanceId}" aria-label="View ${escapeHtml(card.publicName)}">${cardHtml(card, { compact: true })}</button>
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
  const legalFoes = (state?.you?.hand || []).filter((c) => c.type === 'THREAT' && serverCardActions(c).some((a) => a.type === 'START_TROUBLE'));
  const startTroubleState = !mine ? 'disabled is-observer' : (legalFoes.length ? 'actionable' : 'soft-disabled');
  const startTroubleAttrs = !mine ? 'disabled' : (legalFoes.length === 1 ? `data-action="START_TROUBLE" data-card-id="${legalFoes[0].instanceId}"` : `data-nofoe-start-trouble="1"`);
  const startTroubleSub = !mine
    ? 'They may play a Foe from hand.'
    : (legalFoes.length === 1 ? `Play ${legalFoes[0].publicName}` : legalFoes.length > 1 ? 'Choose a glowing Foe from hand' : 'No playable Foe in hand');
  const actions = mine ? mobileActionButtonsHtml([
    mobileLegalActionButton('Sell Gear', 'SELL_GEAR')
  ], 'no-foe-actions tertiary-actions') : '';
  return mobileStageShell('no-foe no-foe-action-first', mine ? 'No Foe Revealed' : `${actor} chooses`, openedDoor ? 'No Foe Revealed' : (mine ? 'Choose Next Move' : `Waiting on ${actor}`), `
    ${openedDoor}
    <div class="move-choice-pair">
      <button class="move-choice-tile start-trouble ${startTroubleState}" ${startTroubleAttrs}>
        ${assetIconHtml('strength', 'asset-sigil event-sigil')}
        <div><strong>${mine ? 'Start Trouble' : `${actor} may Start Trouble`}</strong><span>${escapeHtml(startTroubleSub)}</span></div>
      </button>
      <button class="move-choice-tile loot-room ${mine ? '' : 'disabled is-observer'}" ${mine ? 'data-action="SEARCH_ROOM"' : 'disabled'}>
        ${assetIconHtml('loot', 'asset-sigil event-sigil')}
        <div><strong>${mine ? 'Loot the Room' : `${actor} may Loot the Room`}</strong><span>${mine ? 'Draw hidden Chamber' : 'They may draw hidden Chamber'}</span></div>
      </button>
    </div>
    ${actions}
  `, { size: 'small', icon: null, sub: '' });
}

function mobilePostCombatStageHtml() {
  const mine = isMyTurn();
  const actions = mine ? mobileActionButtonsHtml([
    mobileLegalActionButton('Done → Check Tribute', 'DONE_POST_COMBAT', 'primary'),
    mobileLegalActionButton('Sell Gear', 'SELL_GEAR')
  ], 'post-combat-actions') : '';
  return mobileStageShell('post-combat', mine ? 'Use Loot' : 'Loot Phase', mine ? 'Use Loot Before Tribute' : `${active()?.name || 'A goblin'} is counting shiny things`, `
    <div class="mobile-choice-card">
      ${assetIconHtml('loot', 'asset-sigil event-sigil')}
      <div><strong>${mine ? 'Play, equip, carry, or sell' : 'Loot is being managed'}</strong><span>${mine ? 'Use anything legal before the hand-limit check.' : 'Waiting for the active goblin to finish loot chores.'}</span></div>
    </div>
    ${actions}
  `, { size: 'small', icon: 'loot', sub: mine ? 'Finish legal card use, then Tribute is checked.' : 'No action needed.' });
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
      ? `${card.publicName} is on the table.`
      : (state.tableNotice?.detail || 'A table event is happening.');
    return mobileStageShell('reveal', 'Revealed', card.publicName, `
      <div class="mobile-card-summary ${cardTypeClass(card)}">
        <div class="mobile-card-sigil">${cardTypeSigilHtml(card, 'asset-sigil art-sigil')}</div>
        <div>
          <div class="mobile-card-type">${escapeHtml(typeLabel(card))}</div>
          <div class="mobile-card-glance">${escapeHtml(summary)}</div>
          <p>${escapeHtml((card.publicText || '').slice(0, 115))}${(card.publicText || '').length > 115 ? '…' : ''}</p>
        </div>
      </div>
      <button class="mobile-secondary-action" data-mobile-inspect-card="${card.instanceId}">${card.type === 'THREAT' ? 'View Foe' : card.type === 'HEX' ? 'Read Hex' : 'View Full Card'}</button>
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
  const actions = mobileActionButtonsHtml(combatButtons(), 'combat-actions combat-action-rail');
  const foeText = primaryFoe ? `${primaryFoe.publicName}${(combat.threats || []).length > 1 ? ` + ${(combat.threats || []).length - 1}` : ''}` : 'Foe';
  const actorName = playerName(combat.activePlayerId);
  const helperName = combat.helperPlayerId ? playerName(combat.helperPlayerId) : '';
  const modifiers = combatBoardModifierBadges(combat);
  const foeCards = combatBoardFoeCards(combat);
  const badNews = combatBoardBadNews(combat);
  return mobileStageShell('combat compact-combat', 'Combat', `${actorName} vs ${foeText}`, `
    <section class="combat-board-card ${escapeHtml(outcome.resultClass)}">
      <div class="combat-board-result">
        <strong>${escapeHtml(outcome.shortLabel)}</strong>
      </div>
      <div class="combat-board-scorebar">
        <div class="score-side player"><span>Player</span><b>${Number(totals.playerTotal || 0)}</b><small>${escapeHtml(actorName)}${helperName ? ` + ${escapeHtml(helperName)}` : ''}</small></div>
        <div class="score-vs">VS</div>
        <div class="score-side foe"><span>Foe</span><b>${Number(totals.threatTotal || 0)}</b><small>${(combat.threats || []).length} Foe${(combat.threats || []).length === 1 ? '' : 's'}</small></div>
      </div>
      ${foeCards}
      ${modifiers}
      ${badNews}
    </section>
    ${actions}
    <div class="mobile-pass-row combat-pass-row">${state.players.map((p)=>`<span class="mobile-pass-pill ${combat.passes?.[p.id] ? 'passed':'can-play'}">${escapeHtml(p.name)} · ${combat.passes?.[p.id] ? 'Passed':'Can play'}</span>`).join('')}</div>
    <details class="mobile-math-details compact-math-details"><summary>Full combat math</summary>${combatBreakdownHtml(combat, totals)}</details>
  `, { size: 'large', icon: null, sub: '' });
}

function combatBoardFoeCards(combat) {
  const threats = combat.threats || [];
  if (!threats.length) return '';
  return `<div class="combat-foe-card-lane ${threats.length > 1 ? 'multi' : 'single'}">${threats.map((foe) => `
    <button class="combat-foe-card-preview" data-mobile-inspect-card="${foe.instanceId}">
      ${cardHtml(foe, { compact: true })}
      <span>${escapeHtml(foe.publicName)} · STR ${Number(foe.finalStrength || foe.strength || 0)}</span>
    </button>
  `).join('')}</div>`;
}

function fullBadNewsText(card) {
  if (!card) return 'See Foe card.';
  const publicText = String(card.publicText || '');
  const match = publicText.match(/Bad News:\s*([^]+)$/i);
  if (match && match[1]) {
    return match[1].replace(/\s+/g, ' ').replace(/\.$/, '') + '.';
  }
  const text = String(card.badNewsText || '').trim();
  if (!text) return 'See Foe card.';
  const lower = text.toLowerCase();
  if (lower === 'lose head or glory') return 'Lose one Head Gear. If you have no Head Gear, lose 1 Glory.';
  if (lower === 'discard gear.') return 'Discard Gear chosen by the card effect.';
  if (lower === 'death. loot the body.') return 'You are knocked out. Other goblins may loot the body.';
  return text;
}

function combatBoardBadNews(combat) {
  const threats = combat.threats || [];
  if (!threats.length) return '';
  if (threats.length === 1) return `<div class="combat-bad-news-chip"><b>Bad News if Flee fails</b><span>${escapeHtml(fullBadNewsText(threats[0]))}</span></div>`;
  return `<div class="combat-bad-news-chip"><b>Bad News if Flee fails</b><span>${escapeHtml(threats.map((t) => `${t.publicName}: ${fullBadNewsText(t)}`).join(' · '))}</span></div>`;
}

function combatBoardModifierBadges(combat) {
  const playerMods = (combat.playedTricks || []).filter((c) => c.effect?.side !== 'THREAT');
  const foeMods = (combat.playedTricks || []).filter((c) => c.effect?.side === 'THREAT');
  const foeAttached = (combat.threats || []).flatMap((foe) => (foe.modifiers || []).map((m) => ({...m, foeName: foe.publicName})));
  const badges = [];
  playerMods.forEach((c) => badges.push(`<span class="combat-mod-badge player">Player ${signed(c.effect?.amount || 0)} · ${escapeHtml(c.publicName)}</span>`));
  foeMods.forEach((c) => badges.push(`<span class="combat-mod-badge foe">Foe ${signed(c.effect?.amount || 0)} · ${escapeHtml(c.publicName)}</span>`));
  foeAttached.forEach((m) => badges.push(`<span class="combat-mod-badge foe">${escapeHtml(m.foeName)} ${signed(m.strengthDelta || 0)} · ${escapeHtml(m.publicName)}</span>`));
  if (Number(combat.playerDelta || 0)) badges.push(`<span class="combat-mod-badge player">Player ${signed(combat.playerDelta)} · cards/abilities</span>`);
  if (Number(combat.threatDelta || 0)) badges.push(`<span class="combat-mod-badge foe">Foe ${signed(combat.threatDelta)} · cards/abilities</span>`);
  return badges.length ? `<div class="combat-mod-badges">${badges.join('')}</div>` : '';
}

function combatStatusChipHtml(combat, totals) {
  const outcome = combatOutcome(totals);
  const waiting = state.players.filter((p) => !combat?.passes?.[p.id]);
  const need = combatNeedToWin(totals);
  const you = me();
  const youDone = Boolean(combat?.passes?.[you?.id]);
  let copy = '';
  if (youDone) copy = 'You passed · waiting for the table.';
  else if (outcome.resultClass === 'winning') copy = waiting.length ? `Winning · waiting on ${waiting.map((p) => p.name).join(', ')}` : 'Winning · ending now.';
  else copy = need > 0 ? `Need +${need} · play, bargain, or pass to Flee` : 'Table needs to finish responses.';
  return `<div class="combat-status-chip ${escapeHtml(outcome.resultClass)}">${escapeHtml(copy)}</div>`;
}

function combatNeedToWin(totals) {
  const player = Number(totals?.playerTotal || 0);
  const foe = Number(totals?.threatTotal || 0);
  if (totals?.tieWin) return Math.max(0, foe - player);
  return Math.max(0, foe - player + 1);
}

function combatWhatNowHtml(combat, totals) {
  return combatStatusChipHtml(combat, totals);
}

function mobileTributeStageHtml() {
  const you = me();
  const need = Math.max(0, Number(you?.handCount || 0) - Number(you?.handLimit || 0));
  const selected = selectedTribute.size;
  const isYours = isMyTurn();
  const actions = isYours ? mobileActionButtonsHtml([mobileTributeConfirmButton(need, selected)], 'tribute-actions') : '';
  return mobileStageShell('tribute', isYours ? 'Tribute Required' : 'Tribute Pending', isYours ? `Pick ${need} excess card${need === 1 ? '' : 's'}` : `${active()?.name || 'A player'} is trimming their hand`, `
    <div class="mobile-tribute-meter ${selected === need && need > 0 ? 'ready' : ''}">
      <b>${selected}/${need}</b>
      <span>${isYours ? 'Inspect first, then Pick the cards to give/discard.' : 'Waiting for the active player.'}</span>
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
    buttons.push(mobileLegalActionButton(isRollFx('flee') ? 'Rolling...' : (esc.awaitingContinue ? 'Continue' : (esc.autoFlee ? 'Use Automatic Flee' : 'Roll to Flee')), esc.awaitingContinue ? 'CONTINUE_FLEE' : 'ROLL_ESCAPE', 'primary'));
  }
  const result = last ? `${last.raw} ${signed(last.bonus || 0)} = ${last.total}` : 'Target 5+';
  const body = `<div class="mobile-flee-grid mobile-flee-roll-grid">
    ${mobileRollMoment('flee', last?.raw ?? '—', last ? (last.total >= 5 ? 'Escaped!' : 'Failed to Flee') : (isRollFx('flee') ? 'Rolling...' : 'Ready to roll'), result)}
    <div class="mobile-flee-copy">
      <strong>Target 5+</strong>
      <span>Flee bonus ${signed(esc.fleeBonus || 0)}</span>
      ${esc.threat ? `<button class="flee-foe-preview" data-mobile-inspect-card="${esc.threat.instanceId}">${cardHtml(esc.threat, { compact: true })}<span>View Foe</span></button>` : ''}
      <div class="bad-news-preview"><b>Bad News if you fail</b><span>${escapeHtml(esc.badNewsText || esc.threat?.badNewsText || esc.threat?.publicText || 'Bad News happens if you fail.')}</span></div>
      ${last ? `<b>${last.total >= 5 ? 'Bad News avoided.' : 'Bad News happens. Tap Continue.'}</b>` : '<b>Roll before the Bad News hits.</b>'}
    </div>
  </div>${mobileActionButtonsHtml(buttons, 'flee-actions')}`;
  return mobileStageShell('flee', 'Flee', title, body, { size: 'large', icon: 'flee', sub: runner?.isYou ? 'Roll to escape the Bad News.' : `Waiting for ${runner?.name || 'the runner'}.` });
}

function mobileOpeningRollStageHtml() {
  const first = state.firstRoll || { rolls: {}, eligible: [] };
  const latest = first.latest || null;
  const rows = (first.eligible || []).map((id) => `<span class="mobile-pass-pill ${first.rolls?.[id] ? 'passed' : 'can-play'}">${escapeHtml(playerName(id))} · ${first.rolls?.[id] || '—'}</span>`).join('');
  const label = isRollFx('opening') ? 'Rolling...' : (latest ? `${latest.playerName || 'A goblin'} rolled ${latest.raw}` : (first.requiresYou ? 'Your roll is needed' : 'Waiting for rolls'));
  const actions = first.requiresYou ? mobileActionButtonsHtml([mobileLegalActionButton(isRollFx('opening') ? 'Rolling...' : 'Roll d6', 'ROLL_FIRST', 'primary')], 'roll-actions') : '';
  return mobileStageShell('opening-roll', 'Opening Roll', first.requiresYou ? 'Roll to see who goes first' : 'Opening rolls', `${mobileRollMoment('opening', latest?.raw ?? '—', label, 'Highest roll opens first. Ties reroll.')}<div class="mobile-pass-row">${rows}</div>${actions}`, { size: 'medium', icon: 'die', sub: '' });
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
  if (prompt.requiresYou && prompt.type === 'ADD_FOE_FROM_HAND') {
    return mobileStageShell('prompt', 'Add Foe', 'Choose a Foe from hand', `<p class="mobile-state-hint">Choose the Foe in your decision drawer.</p>`, { size:'small', icon:'strength' });
  }
  if (prompt.requiresYou && prompt.type === 'TRADE_OFFER_SELECT') {
    return mobileStageShell('prompt', 'Trade Offer', 'Choose cards below', `<p class="mobile-state-hint">Pick cards in your decision drawer. Gifts are allowed, but the other player must accept.</p>`, { size:'small', icon:'trade' });
  }
  if (prompt.requiresYou && prompt.type === 'TRADE_ACCEPT') {
    return mobileStageShell('prompt', 'Trade Offered', 'Accept or decline below', `<p class="mobile-state-hint">Review the cards in your decision drawer.</p>`, { size:'small', icon:'trade' });
  }
  if (prompt.requiresYou && prompt.type === 'SELL_GEAR') {
    return mobileStageShell('prompt', 'Sell Gear', 'Choose Gear below', `<p class="mobile-state-hint">Selling is optional. Pick Gear in your decision drawer or tap Done.</p>`, { size:'small', icon:'gear' });
  }
  return mobileStageShell('prompt', prompt.requiresYou ? promptTitle(prompt) : `${playerName(prompt.playerId)} has a choice`, prompt.requiresYou ? 'Choose below' : `Waiting on ${playerName(prompt.playerId)}`, `
    <div class="mobile-wait-card">
      ${assetIconHtml('special', 'asset-sigil event-sigil')}
      <span>${escapeHtml(prompt.requiresYou ? (prompt.message || 'Choose in your drawer.') : `${playerName(prompt.playerId)} is choosing.`)}</span>
    </div>
    ${prompt.requiresYou ? '<button data-mobile-prompt-cancel>Pass / Cancel if optional</button>' : ''}
  `, { size: 'small', icon: 'special' });
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
  // Prioritize your hand copy so inspector/reveal buttons receive server-authored legal actions.
  if (state.you?.hand) all.push(...state.you.hand);
  if (state.revealCard) all.push(state.revealCard);
  if (state.tableNotice?.card) all.push(state.tableNotice.card);
  if (state.announcement?.card) all.push(state.announcement.card);
  if (state.combat?.threats) all.push(...state.combat.threats);
  if (state.escape?.threat) all.push(state.escape.threat);
  if (state.discardPiles?.chamber) all.push(...state.discardPiles.chamber);
  if (state.discardPiles?.loot) all.push(...state.discardPiles.loot);
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
  const outcome = last ? (last.total >= 5 ? '<span class="roll-success">Success — escaped the Bad News.</span>' : '<span class="roll-fail">Failed — Bad News happens.</span>') : 'Waiting for the roll.';
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
  const map = { 1: [5], 2: [1,9], 3: [1,5,9], 4: [1,3,7,9], 5: [1,3,5,7,9], 6: [1,3,4,6,7,9] };
  const spots = valid ? Array.from({ length: 9 }, (_, i) => `<span class="pip p${i + 1} ${map[n].includes(i + 1) ? 'on' : ''}"></span>`).join('') : `<b>${escapeHtml(String(value ?? '—'))}</b>`;
  return `<div class="die-face standard-d6 ${escapeHtml(cls)}">${spots}</div>`;
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
      <div class="v077-bad-news-line"><strong>Bad News:</strong> ${escapeHtml(t.badNewsText || 'See card')}</div>
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
  if (!root) return;
  root.classList.add('hidden');
  root.innerHTML = '';
}

function renderHand() {
  const root = $('handPanel');
  const you = me();
  if (!you) { root.innerHTML = ''; return; }

  const mode = handDrawerMode();
  const over = you.handCount > you.handLimit;
  const forceOpen = Boolean(mode.forceOpen);
  const expanded = handExpanded || forceOpen;
  root.className = `hand-panel drawer-mode-${escapeHtml(mode.key)} ${expanded ? 'hand-expanded' : ''} ${over ? 'hand-over-limit' : ''}`;

  const toggleLabel = forceOpen ? mode.toggleLabel || 'Required' : (expanded ? 'Collapse' : 'Expand');
  const handStateClass = over ? (mode.key === 'tribute' ? 'bad' : 'warn') : (you.handCount === you.handLimit ? 'full' : '');
  const handStateText = over
    ? (mode.key === 'tribute' ? `${you.handCount}/${you.handLimit} Tribute Required` : `${you.handCount}/${you.handLimit} Tribute Later`)
    : (you.handCount === you.handLimit ? `${you.handCount}/${you.handLimit} Full` : `${you.handCount}/${you.handLimit}`);

  let html = `<div class="hand-header v075-hand-header mobile-hand-header">
    <div><span class="hand-eyebrow">${escapeHtml(mode.eyebrow)}</span><h3>${escapeHtml(mode.title)}</h3></div>
    <div class="hand-header-actions">
      <span class="hand-limit ${handStateClass}">${handStateText}</span>
      <button id="handToggleBtn" class="hand-toggle-btn ${forceOpen ? 'decision-mode' : ''}" type="button" aria-expanded="${expanded}" ${forceOpen ? 'disabled' : ''}>${escapeHtml(toggleLabel)}</button>
    </div>
  </div>`;

  html += `<p class="micro hand-help drawer-mode-help">${escapeHtml(mode.hint)}</p>`;

  if (mode.key === 'tribute') {
    const need = Math.max(0, you.handCount - you.handLimit);
    html += `<p class="micro tribute-instruction">Inspect first, then use Pick to choose exactly ${need} excess card${need === 1 ? '' : 's'}.</p>`;
    html += `<div class="hand-tray v075-hand-tray tribute-tray expanded-tray decision-tray"><div class="card-row hand-row tribute-card-row expanded-hand-row">${myHand().map((c) => tributeCardHtml(c)).join('')}</div></div>`;
    html += tributeControls(need);
  } else if (mode.decision) {
    html += drawerDecisionContent(mode);
  } else {
    const cardsHtml = displayHandCards(myHand()).map((c) => cardHtml(c, { compact: true, playable: isCardPlayable(c) })).join('');
    if (expanded) {
      html += `<div class="hand-tray v075-hand-tray expanded-tray"><div class="card-row hand-row expanded-hand-row">${cardsHtml}</div></div>`;
    } else {
      html += `<div class="hand-scroll-shell"><button class="hand-scroll-btn hand-scroll-prev" type="button" aria-label="Scroll hand left">‹</button><div class="hand-tray v075-hand-tray"><div class="card-row hand-row">${cardsHtml}</div></div><button class="hand-scroll-btn hand-scroll-next" type="button" aria-label="Scroll hand right">›</button></div>`;
    }
  }

  root.innerHTML = html;

  const toggle = $('handToggleBtn');
  if (toggle && !forceOpen) toggle.addEventListener('click', () => {
    handExpanded = !handExpanded;
    renderHand();
  });

  attachDrawerHandlers(root, mode);
  attachHandScrollControls(root);
  const confirm = $('confirmTribute');
  if (confirm) confirm.addEventListener('click', () => confirmTribute());
}


function handDrawerMode() {
  const you = me();
  const p = state?.pendingPrompt;
  if (p?.requiresYou) {
    if (p.type === 'SELL_GEAR') return { key: 'sell', decision: true, forceOpen: true, toggleLabel: 'Selling', eyebrow: 'Decision Drawer', title: 'Sell Gear', hint: 'Choose Gear to cash in. Done keeps everything.', prompt: p };
    if (p.type === 'TRADE_OFFER_SELECT') return { key: 'trade', decision: true, forceOpen: true, toggleLabel: 'Trading', eyebrow: 'Decision Drawer', title: 'Trade Offer', hint: 'Choose cards to offer. Gifts are allowed, but the other player must accept.', prompt: p };
    if (p.type === 'TRADE_ACCEPT') return { key: 'trade-review', decision: true, forceOpen: true, toggleLabel: 'Review', eyebrow: 'Decision Drawer', title: 'Trade Offered', hint: 'Inspect the offered cards, then accept or decline.', prompt: p };
    if (p.type === 'ADD_FOE_FROM_HAND') return { key: 'add-foe', decision: true, forceOpen: true, toggleLabel: 'Choose Foe', eyebrow: 'Decision Drawer', title: 'Add Foe to Combat', hint: 'Choose exactly which Foe joins the current fight.', prompt: p };
    if (p.type === 'DISCARD_HAND_CARDS') return { key: 'discard-hand', decision: true, forceOpen: true, toggleLabel: 'Discard', eyebrow: 'Decision Drawer', title: 'Choose Cards to Discard', hint: `Pick ${p.meta?.count || 1} card${(p.meta?.count || 1) === 1 ? '' : 's'} to discard. Inspect first if needed.`, prompt: p };
    if (p.type === 'DISCARD_GEAR' || p.type === 'DISCARD_GEAR_VALUE') return { key: 'discard-gear', decision: true, forceOpen: true, toggleLabel: 'Discard', eyebrow: 'Decision Drawer', title: 'Choose Gear to Lose', hint: p.message || 'Choose the Gear required by the prompt.', prompt: p };
    if (p.type === 'LOOT_BODY') return { key: 'body-loot', decision: true, forceOpen: true, toggleLabel: 'Loot', eyebrow: 'Decision Drawer', title: 'Loot the Body', hint: 'Choose one card from the fallen goblin. It goes to your hand.', prompt: p };
    return { key: 'prompt', decision: true, forceOpen: true, toggleLabel: 'Choose', eyebrow: 'Decision Drawer', title: promptTitle(p), hint: p.message || 'Resolve the current choice.', prompt: p };
  }
  if (state?.bodyLoot?.requiresYou) return { key: 'body-loot', decision: true, forceOpen: true, toggleLabel: 'Loot', eyebrow: 'Decision Drawer', title: 'Loot the Body', hint: `Choose one card from ${state.bodyLoot.victimName || 'the fallen goblin'}.`, bodyLoot: state.bodyLoot };
  if (state?.reaction?.requiresYou) return { key: 'reaction', decision: true, forceOpen: true, toggleLabel: 'React', eyebrow: 'Reaction Drawer', title: state.reaction.title || 'Reaction Window', hint: state.reaction.message || 'Use a legal reaction or pass.', reaction: state.reaction };
  if (state?.phase === 'TRIBUTE' && isMyTurn()) return { key: 'tribute', forceOpen: true, toggleLabel: 'Tribute', eyebrow: 'Decision Drawer', title: 'Tribute Required', hint: `Pick ${Math.max(0, Number(you?.handCount || 0) - Number(you?.handLimit || 0))} excess card${Math.max(0, Number(you?.handCount || 0) - Number(you?.handLimit || 0)) === 1 ? '' : 's'} to give/discard.` };
  if (state?.phase === 'COMBAT') {
    const playable = playableHandCount();
    let hint = playable ? `${playable} combat-relevant card${playable === 1 ? '' : 's'} can be played now. Glowing cards are legal.` : 'No legal combat cards right now. Pass when you are done.';
    if (!addFoeEnablerCard() && hasFoeInHand()) hint = 'Foes in hand need Unexpected Company before they can join combat.';
    return { key: 'combat', eyebrow: 'Combat Hand', title: 'Combat Cards', hint };
  }
  if (state?.phase === 'POST_COMBAT' && isMyTurn()) return { key: 'loot', eyebrow: 'Use Loot', title: 'Use Loot / Gear', hint: 'Play legal cards, equip, carry, trade, or sell before Tribute is checked.' };
  const playable = playableHandCount();
  return { key: 'normal', eyebrow: state?.phase === 'COMBAT' ? 'Combat Toolkit' : 'Cards', title: 'Your Hand', hint: playable ? `${playable} card${playable === 1 ? '' : 's'} can be played now — glowing first.` : 'Tap cards to inspect. Expand when you need more room.' };
}

function drawerDecisionContent(mode) {
  const cards = mode.prompt?.options || mode.bodyLoot?.cards || [];
  if (mode.key === 'reaction') {
    return `<div class="drawer-decision-panel drawer-reaction-panel">
      <div class="drawer-decision-copy"><strong>${escapeHtml(mode.title)}</strong><span>${escapeHtml(mode.hint)}</span></div>
      ${mobileActionButtonsHtml(reactionButtons(mode.reaction), 'drawer-reaction-actions')}
    </div>`;
  }
  if (!cards.length && !['trade-review'].includes(mode.key)) {
    return `<div class="drawer-empty-state">${assetIconHtml('discard', 'event-sigil')}<span>No cards are available for this decision.</span>${drawerControls(mode)}</div>`;
  }
  const cardHtmlList = cards.map((c) => drawerDecisionCardHtml(c, mode)).join('');
  return `<div class="drawer-decision-panel drawer-${escapeHtml(mode.key)}">
    <div class="drawer-decision-copy"><strong>${escapeHtml(mode.title)}</strong><span>${escapeHtml(mode.hint)}</span></div>
    <div class="hand-tray v075-hand-tray expanded-tray decision-tray"><div class="card-row hand-row expanded-hand-row decision-hand-row">${cardHtmlList}</div></div>
    ${drawerControls(mode)}
  </div>`;
}

function drawerDecisionCardHtml(card, mode) {
  if (!card) return '';
  const selectedSellCard = selectedSell.has(card.instanceId);
  const selectedTradeCard = selectedTrade.has(card.instanceId);
  const selectedDiscardCard = selectedTribute.has(card.instanceId);
  if (mode.key === 'sell') {
    const value = Number(card.junkValue || card.scrapValue || 0);
    return `<button class="drawer-card-choice ${selectedSellCard ? 'selected' : ''}" data-drawer-sell-card="${card.instanceId}">${cardHtml(card,{compact:true})}<span>${selectedSellCard ? '✓ Selling' : `${value} Junk`}</span></button>`;
  }
  if (mode.key === 'trade') {
    return `<button class="drawer-card-choice ${selectedTradeCard ? 'selected' : ''}" data-drawer-trade-card="${card.instanceId}">${cardHtml(card,{compact:true})}<span>${selectedTradeCard ? '✓ Offered' : 'Offer'}</span></button>`;
  }
  if (mode.key === 'discard-hand' || mode.key === 'discard-gear') {
    return `<button class="drawer-card-choice ${selectedDiscardCard ? 'selected' : ''}" data-drawer-discard-card="${card.instanceId}">${cardHtml(card,{compact:true})}<span>${selectedDiscardCard ? '✓ Picked' : 'Pick'}</span></button>`;
  }
  if (mode.key === 'trade-review') {
    return `<button class="drawer-card-choice inspect-only" data-drawer-inspect-card="${card.instanceId}">${cardHtml(card,{compact:true})}<span>Inspect</span></button>`;
  }
  return `<button class="drawer-card-choice" data-drawer-prompt-card="${card.instanceId}">${cardHtml(card,{compact:true})}<span>${mode.key === 'add-foe' ? 'Add to combat' : mode.key === 'body-loot' ? 'Take card' : 'Choose'}</span></button>`;
}

function drawerControls(mode) {
  if (mode.key === 'sell') {
    return `<div class="drawer-decision-actions"><span class="micro">Selected ${selectedSell.size}</span><button class="primary" data-drawer-sell-confirm ${selectedSell.size ? '' : 'disabled'}>Sell Selected</button><button data-drawer-prompt-cancel>Done</button></div>`;
  }
  if (mode.key === 'trade') {
    return `<div class="drawer-decision-actions"><span class="micro">Offering ${selectedTrade.size}</span><button class="primary" data-drawer-trade-confirm ${selectedTrade.size ? '' : 'disabled'}>Send Offer</button><button data-drawer-prompt-cancel>Cancel Trade</button></div>`;
  }
  if (mode.key === 'trade-review') {
    return `<div class="drawer-decision-actions"><button class="primary" data-drawer-trade-accept>Accept Trade</button><button data-drawer-trade-decline>Decline</button></div>`;
  }
  if (mode.key === 'discard-hand') {
    const need = mode.prompt?.meta?.count || 1;
    return `<div class="drawer-decision-actions"><span class="micro">Selected ${selectedTribute.size}/${need}</span><button class="primary" data-drawer-discard-confirm ${selectedTribute.size === need ? '' : 'disabled'}>Discard Selected</button></div>`;
  }
  if (mode.key === 'discard-gear') {
    const need = mode.prompt?.meta?.count || 1;
    return `<div class="drawer-decision-actions"><span class="micro">Selected ${selectedTribute.size}${need ? `/${need}` : ''}</span><button class="primary" data-drawer-discard-confirm ${selectedTribute.size ? '' : 'disabled'}>Confirm Choice</button></div>`;
  }
  if (mode.key === 'add-foe') return `<div class="drawer-decision-actions"><button data-drawer-prompt-cancel>Cancel</button></div>`;
  if (mode.key === 'prompt') return `<div class="drawer-decision-actions"><button data-drawer-prompt-cancel>Pass / Cancel if optional</button></div>`;
  return '';
}

function attachDrawerHandlers(root, mode) {
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
  root.querySelectorAll('[data-drawer-inspect-card]').forEach((btn) => btn.addEventListener('click', () => {
    const card = findVisibleCardByInstance(btn.dataset.drawerInspectCard) || (mode.prompt?.options || []).find((c) => c.instanceId === btn.dataset.drawerInspectCard);
    if (card) inspectCard(card);
  }));
  root.querySelectorAll('[data-drawer-prompt-card]').forEach((btn) => btn.addEventListener('click', () => emitAction('RESOLVE_PROMPT', { cardId: btn.dataset.drawerPromptCard })));
  root.querySelectorAll('[data-drawer-sell-card]').forEach((btn) => btn.addEventListener('click', () => {
    if (selectedSell.has(btn.dataset.drawerSellCard)) selectedSell.delete(btn.dataset.drawerSellCard);
    else selectedSell.add(btn.dataset.drawerSellCard);
    renderHand();
  }));
  root.querySelectorAll('[data-drawer-sell-confirm]').forEach((btn) => btn.addEventListener('click', () => {
    if (!selectedSell.size) return;
    emitAction('RESOLVE_PROMPT', { cardIds: [...selectedSell] });
    selectedSell.clear();
  }));
  root.querySelectorAll('[data-drawer-trade-card]').forEach((btn) => btn.addEventListener('click', () => {
    if (selectedTrade.has(btn.dataset.drawerTradeCard)) selectedTrade.delete(btn.dataset.drawerTradeCard);
    else selectedTrade.add(btn.dataset.drawerTradeCard);
    renderHand();
  }));
  root.querySelectorAll('[data-drawer-trade-confirm]').forEach((btn) => btn.addEventListener('click', () => {
    if (!selectedTrade.size) return;
    emitAction('RESOLVE_PROMPT', { cardIds: [...selectedTrade] });
    selectedTrade.clear();
  }));
  root.querySelectorAll('[data-drawer-trade-accept]').forEach((btn) => btn.addEventListener('click', () => emitAction('RESOLVE_PROMPT', { accept: true })));
  root.querySelectorAll('[data-drawer-trade-decline]').forEach((btn) => btn.addEventListener('click', () => emitAction('RESOLVE_PROMPT', { decline: true })));
  root.querySelectorAll('[data-drawer-discard-card]').forEach((btn) => btn.addEventListener('click', () => {
    const id = btn.dataset.drawerDiscardCard;
    if (selectedTribute.has(id)) selectedTribute.delete(id);
    else selectedTribute.add(id);
    renderHand();
  }));
  root.querySelectorAll('[data-drawer-discard-confirm]').forEach((btn) => btn.addEventListener('click', () => {
    if (!selectedTribute.size) return;
    emitAction('RESOLVE_PROMPT', { cardIds: [...selectedTribute] });
    selectedTribute.clear();
  }));
  root.querySelectorAll('[data-drawer-prompt-cancel]').forEach((btn) => btn.addEventListener('click', () => emitAction('RESOLVE_PROMPT', { cancel: true })));
  root.querySelectorAll('[data-reaction-action]').forEach((btn) => btn.addEventListener('click', () => handleReactionButton(btn.dataset.reactionAction, btn.dataset.value)));
}


function attachHandScrollControls(root) {
  const tray = root.querySelector('.hand-tray');
  if (!tray) return;
  if (tray.classList.contains('expanded-tray')) return;
  const scrollByAmount = () => Math.max(160, Math.floor(tray.clientWidth * 0.72));
  root.querySelector('.hand-scroll-prev')?.addEventListener('click', (event) => {
    event.stopPropagation();
    tray.scrollBy({ left: -scrollByAmount(), behavior: 'smooth' });
  });
  root.querySelector('.hand-scroll-next')?.addEventListener('click', (event) => {
    event.stopPropagation();
    tray.scrollBy({ left: scrollByAmount(), behavior: 'smooth' });
  });
  tray.addEventListener('wheel', (event) => {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      tray.scrollLeft += event.deltaY;
      event.preventDefault();
    }
  }, { passive: false });
  tray.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.target.closest('button')) return;
    handDrag = { tray, x: event.clientX, left: tray.scrollLeft, moved: false };
    tray.setPointerCapture?.(event.pointerId);
  });
  tray.addEventListener('pointermove', (event) => {
    if (!handDrag || handDrag.tray !== tray) return;
    const dx = event.clientX - handDrag.x;
    if (Math.abs(dx) > 4) handDrag.moved = true;
    tray.scrollLeft = handDrag.left - dx;
  });
  tray.addEventListener('pointerup', () => { handDrag = null; });
  tray.addEventListener('pointercancel', () => { handDrag = null; });
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

function addFoeEnablerCard() {
  return (state?.you?.hand || []).find((c) => c.id === 'SPECIAL_UNEXPECTED_COMPANY_A' || c.effect?.type === 'ADD_FOE_FROM_HAND') || null;
}

function hasFoeInHand() {
  return (state?.you?.hand || []).some((c) => c.type === 'THREAT');
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
  if (!ownsVisibleCard(card)) return false;
  if (!r.requiresYou) return false;
  if (r.type === 'HEX_CANCEL_REACTION') return card.id === 'SPECIAL_WISHING_RING_A';
  if (r.type === 'DIE_ROLL_REACTION') return card.id === 'SPECIAL_LOADED_DIE';
  if (r.type === 'FLEE_FAILURE_REACTION') return card.id === 'TRICK_INVISIBILITY';
  if (r.type === 'FLEE_SUCCESS_REACTION') return card.id === 'TRICK_FLASK_GLUE';
  return false;
}

function isCardPlayable(card) {
  if (!state || !card) return false;
  if (!ownsVisibleCard(card)) return false;
  return serverCardActions(card).length > 0;
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

function discardViewerCardHtml(c) {
  return `<button class="discard-viewer-card full-discard-card" data-discard-card-id="${c.instanceId}">
    ${cardHtml(c,{compact:true})}
    <div class="discard-card-copy"><strong>${escapeHtml(c.publicName)}</strong><span>${escapeHtml(typeLabel(c))} · ${escapeHtml(cardBottom(c))}</span><p>${escapeHtml(c.publicText || 'No rules text.')}</p></div>
  </button>`;
}

function showDiscardViewer(kind = 'chamber') {
  const cards = state.discardPiles?.[kind] || [];
  const label = kind === 'loot' ? 'Loot Discard' : 'Chamber Discard';
  const root = $('inspectContent');
  root.innerHTML = `<h2>${escapeHtml(label)}</h2><p class="micro">Any player can inspect discarded cards at any time. Tap a card for the full inspector.</p><div class="discard-viewer-grid full-discard-grid">${cards.length ? cards.slice().reverse().map(discardViewerCardHtml).join('') : '<p>No discarded cards yet.</p>'}</div>`;
  root.querySelectorAll('[data-discard-card-id]').forEach((btn) => btn.addEventListener('click', () => {
    const card = cards.find((c) => c.instanceId === btn.dataset.discardCardId);
    if (card) inspectCard(card);
  }));
  $('inspectOverlay').classList.remove('hidden');
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
  root.querySelectorAll('[data-server-card-action]').forEach((btn) => btn.addEventListener('click', () => {
    closeInspect();
    emitServerCardAction(card, btn.dataset.serverCardAction);
  }));
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
    if (a === 'ASSIGN_HIRELING_GEAR') emitAction('ASSIGN_HIRELING_GEAR', { cardId: card.instanceId });
    if (a === 'START_TROUBLE') emitAction('START_TROUBLE', { cardId: card.instanceId });
    if (a === 'USE_WISH_RING') emitAction('USE_WISH_RING');
    if (a === 'USE_LOADED_DIE') emitAction('USE_LOADED_DIE', { value: Number(btn.dataset.value) });
    if (a === 'USE_INVISIBILITY_ESCAPE') emitAction('USE_INVISIBILITY_ESCAPE');
    if (a === 'USE_FLASK_GLUE') emitAction('USE_FLASK_GLUE');
  }));
  $('inspectOverlay').classList.remove('hidden');
}



function serverCardSource(card) {
  if (!card) return null;
  const fromHand = (state?.you?.hand || []).find((c) => c.instanceId === card.instanceId);
  return fromHand || card;
}

function serverCardActions(card) {
  const source = serverCardSource(card);
  if (!source) return [];
  const direct = Array.isArray(source.legalActions) ? source.legalActions : null;
  if (direct) return direct;
  return state?.legalCardActions?.[source.instanceId] || [];
}

function serverCardActionButton(action, index) {
  if (!action) return '';
  const cls = action.style || '';
  const reason = action.reason ? ` title="${escapeHtml(action.reason)}"` : '';
  return `<button class="${escapeHtml(cls)}" data-server-card-action="${index}"${reason}>${escapeHtml(action.label || action.type || 'Use')}</button>`;
}

function serverActionsHtml(card) {
  const actions = serverCardActions(card);
  if (!actions.length) return '';
  return actions.map((a, i) => serverCardActionButton(a, i)).join('');
}

function emitServerCardAction(card, index) {
  const actions = serverCardActions(card);
  const action = actions[Number(index)];
  if (!action) return;
  emitAction(action.type, action.payload || {});
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
  if (!ownsVisibleCard(card)) {
    return `<p>No legal actions right now.</p><p class="micro">You are viewing this card publicly. Only the player who owns the card can use it.</p>`;
  }
  const actionsHtml = serverActionsHtml(card);
  if (actionsHtml) return actionsHtml;
  return `<p>No legal actions right now.</p><p class="micro">${whyNotPlayable(card)}</p>`;
}

function whyNotPlayable(card) {
  if (!ownsVisibleCard(card)) return 'You are viewing this card publicly.';
  if (state.pendingPrompt) return 'Resolve the current prompt first.';
  if (state.pendingHex) return 'Resolve the revealed Hex first.';
  if (state.reaction) return 'Only matching reaction cards can be used right now.';
  if (card.type === 'THREAT') return 'Foes need the correct window: Start Trouble after no Foe appears, Restless combat, or Unexpected Company.';
  if (card.type === 'TRICK') return 'This Trick is waiting for its timing window.';
  if (card.type === 'THREAT_MODIFIER') return 'Foe Modifiers can only be played during combat.';
  return 'The server says this card has no legal action right now.';
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
    <h3>Equipped / Carried Gear</h3><div class="card-row">${gearCards.length ? gearCards.map((g) => cardHtml(g, { compact: true })).join('') : '<span class="micro">No public Gear.</span>'}</div>
    ${(!p.isYou && isMyTurn() && ['START_TURN','NO_THREAT_CHOICE','POST_COMBAT','END_TURN'].includes(state.phase)) ? `<div class="action-list player-trade-actions"><button class="primary" id="tradeWithPlayer">Trade with ${escapeHtml(p.name)}</button></div>` : ''}`;
  const tradeBtn = $('tradeWithPlayer');
  if (tradeBtn) tradeBtn.addEventListener('click', () => { closeInspect(); emitAction('START_TRADE', { targetPlayerId: p.id }); });
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
  const map = {
    LOBBY: 'Goblin Tavern Lobby',
    ROLL_FOR_FIRST: 'Opening Roll',
    START_TURN: 'Open Chamber',
    NO_THREAT_CHOICE: 'Choose Your Move',
    HEX_REVEAL: 'Hex Revealed',
    COMBAT: 'Combat',
    ESCAPE: 'Flee',
    POST_COMBAT: 'Use Loot',
    TRIBUTE: 'Tribute',
    END_TURN: 'End Turn',
    GAME_OVER: 'Game Over'
  };
  return map[phase] || 'Table State';
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
