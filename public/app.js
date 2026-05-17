const socket = io();
const SESSION_KEY = 'lootGoblinsV043Session';
let state = null;
let selectedTribute = new Set();
let selectedSell = new Set();

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
  if (roomFromUrl && !state) $('codeInput').value = roomFromUrl.toUpperCase();
  if (saved && !state) {
    $('resumeCopy').textContent = `Room ${saved.roomCode} · Player ${saved.playerName}`;
    showScreen('resumeScreen');
  }
}

function showScreen(id) {
  for (const s of screens) $(s).classList.toggle('hidden', s !== id);
}

function setConnection(text) {
  const el = $('connection');
  if (el) el.textContent = text;
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
$('closeInspect').addEventListener('click', closeInspect);
$('inspectOverlay').addEventListener('click', (e) => { if (e.target.id === 'inspectOverlay') closeInspect(); });

function me() { return state?.players.find((p) => p.isYou); }
function active() { return state?.players.find((p) => p.id === state.activePlayerId); }
function isMyTurn() { return me()?.id === state?.activePlayerId; }
function myHand() { return state?.you?.hand || []; }

function render() {
  if (!state) return;
  if (state.status === 'LOBBY') renderLobby();
  else renderGame();
}

function renderLobby() {
  showScreen('lobbyScreen');
  $('lobbyRoomCode').textContent = state.code;
  const seats = $('lobbySeats');
  seats.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const p = state.players[i];
    const div = document.createElement('div');
    div.className = 'seat';
    div.innerHTML = p
      ? `<strong>${escapeHtml(p.name)}${p.isYou ? ' (you)' : ''}</strong><span>${i === 0 ? 'Host' : 'Joined'} · ${p.connected ? 'online' : 'offline'}</span>`
      : `<strong>Open seat</strong><span>Waiting</span>`;
    seats.appendChild(div);
  }
  $('startGameBtn').disabled = !(state.players[0]?.isYou && state.players.length === 3);
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
    <div class="mini-stack"><span></span><span></span><span></span></div>
    <div class="pile-copy"><strong>${escapeHtml(pile.label)}</strong><small>${escapeHtml(pile.sub)} · ${Number(pile.count || 0)}</small></div>
  </div>`;
}

function deriveMovement() {
  const msg = latestEvent();
  if (!msg) return null;
  if (/opened a Chamber/i.test(msg)) return { from: 'CHAMBER_DECK', to: 'REVEAL_ZONE', label: 'Chamber Deck → Reveal Zone', detail: msg };
  if (/looted the room/i.test(msg)) return { from: 'CHAMBER_DECK', to: 'PLAYER_HAND', label: 'Chamber Deck → Hand', detail: msg };
  if (/drew \d+ Loot/i.test(msg) || /drew .* Loot/i.test(msg)) return { from: 'LOOT_DECK', to: 'PLAYER_HAND', label: 'Loot Deck → Hand', detail: msg };
  if (/drew \d+ Chamber/i.test(msg) || /drew .* Chamber/i.test(msg)) return { from: 'CHAMBER_DECK', to: 'PLAYER_HAND', label: 'Chamber Deck → Hand', detail: msg };
  if (/went to .* hand/i.test(msg)) return { from: 'REVEAL_ZONE', to: 'PLAYER_HAND', label: 'Reveal Zone → Hand', detail: msg };
  if (/faces/i.test(msg)) return { from: 'REVEAL_ZONE', to: 'COMBAT_ZONE', label: 'Reveal Zone → Combat Zone', detail: msg };
  if (/played/i.test(msg) && /combat|Foe|side|modifier|Prepared|Puddle|Health|Confidence|Stair/i.test(msg)) return { from: 'PLAYER_HAND', to: 'COMBAT_ZONE', label: 'Hand → Combat Zone', detail: msg };
  if (/discarded|discard/i.test(msg)) return { from: 'TABLE', to: 'DISCARD', label: 'Card → Discard', detail: msg };
  if (/rolled Flee/i.test(msg)) return { from: 'DIE', to: 'FLEE_ZONE', label: 'Die Roll → Flee Zone', detail: msg };
  if (/escaped|failed to escape/i.test(msg)) return { from: 'FLEE_ZONE', to: 'RESULT', label: 'Flee Zone → Result', detail: msg };
  return { from: null, to: null, label: 'Latest table event', detail: msg };
}

function tableBoardHtml(options = {}) {
  const move = deriveMovement();
  const centerLabel = options.centerLabel || centerZoneLabel();
  const centerSub = options.centerSub || centerZoneSub();
  const centerClass = options.centerClass || centerZoneClass();
  return `<div class="board-mat">
    <div class="board-piles board-piles-left">
      ${boardPile('CHAMBER_DECK', 'Chamber', 'Deck', state.decks?.chamber || 0, move)}
      ${boardPile('CHAMBER_DISCARD', 'Chamber', 'Discard', state.decks?.chamberDiscard || 0, move)}
    </div>
    <div class="board-center">
      <div class="movement-banner ${move?.from || move?.to ? 'active' : ''}">
        <div class="movement-label">${escapeHtml(move?.label || 'Table ready')}</div>
        <div class="movement-detail">${escapeHtml(move?.detail || 'Cards will move through the table here.')}</div>
      </div>
      <div class="center-zone ${centerClass}">
        <strong>${escapeHtml(centerLabel)}</strong>
        <span>${escapeHtml(centerSub)}</span>
      </div>
    </div>
    <div class="board-piles board-piles-right">
      ${boardPile('LOOT_DECK', 'Loot', 'Deck', state.decks?.loot || 0, move)}
      ${boardPile('LOOT_DISCARD', 'Loot', 'Discard', state.decks?.lootDiscard || 0, move)}
    </div>
  </div>`;
}

function boardPile(key, label, sub, count, move) {
  const classes = ['board-pile'];
  if (move?.from === key) classes.push('source');
  if (move?.to === key) classes.push('destination');
  if (Number(count || 0) <= 0) classes.push('empty');
  return `<div class="${classes.join(' ')}">
    <div class="table-stack"><span></span><span></span><span></span></div>
    <div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(sub)} · ${Number(count || 0)}</small></div>
  </div>`;
}

function centerZoneLabel() {
  if (state.phase === 'COMBAT') return 'Combat Zone';
  if (state.phase === 'ESCAPE') return 'Flee Zone';
  if (state.revealCard) return 'Reveal Zone';
  if (state.pendingPrompt) return 'Prompt Zone';
  return 'Table Center';
}

function centerZoneSub() {
  if (state.phase === 'COMBAT') return 'Foes, modifiers, and played Tricks live here.';
  if (state.phase === 'ESCAPE') return 'Dice rolls and Bad News resolve here.';
  if (state.revealCard) return `${state.revealCard.publicName} is being resolved.`;
  if (state.pendingPrompt) return state.pendingPrompt.message || 'Waiting for a player choice.';
  return 'Revealed cards will appear here.';
}

function centerZoneClass() {
  if (state.phase === 'COMBAT') return 'combat-center';
  if (state.phase === 'ESCAPE') return 'flee-center';
  if (state.revealCard) return 'reveal-center';
  return '';
}

function renderPhaseBanner() {
  const root = $('phaseBanner');
  const you = me();
  let title = '';
  let copy = '';
  let buttons = [];

  if (state.phase === 'GAME_OVER') {
    const winner = state.players.find((p) => p.id === state.winnerId);
    title = `${winner?.name || 'Someone'} wins!`;
    copy = 'The final Glory came from a combat victory.';
  } else if (state.pendingPrompt) {
    title = state.pendingPrompt.requiresYou ? 'Your decision required' : 'Table prompt pending';
    copy = state.pendingPrompt.message;
  } else if (state.phase === 'START_TURN') {
    title = isMyTurn() ? 'Your Turn — Open Chamber' : `${active()?.name}'s Turn — Open Chamber`;
    copy = isMyTurn() ? 'Step 1: open a Chamber. You may also play Calling, Kin, or Gear before opening.' : `Waiting for ${active()?.name} to open a Chamber.`;
    if (isMyTurn()) buttons.push(buttonHtml('Open Chamber', 'OPEN_CHAMBER', 'primary'));
  } else if (state.phase === 'NO_THREAT_CHOICE') {
    title = isMyTurn() ? 'No Foe — Choose Your Move' : `${active()?.name} chooses next`;
    copy = isMyTurn() ? 'Start Trouble with a Foe from hand, or Loot the Room for a hidden Chamber card.' : `Waiting for ${active()?.name} to Start Trouble or Loot the Room.`;
    if (isMyTurn()) {
      buttons.push(buttonHtml('Loot the Room', 'SEARCH_ROOM', 'primary'));
      buttons.push(`<span class="micro">To Start Trouble, tap a Foe in your hand. Loot the Room draws a hidden Chamber card.</span>`);
    }
  } else if (state.phase === 'COMBAT') {
    const totals = state.combat?.totals;
    const marginText = totals ? (totals.margin >= 0 ? `${active()?.name} is ahead by ${totals.margin}` : `${active()?.name} is losing by ${Math.abs(totals.margin)}`) : '';
    title = `Combat — ${active()?.name} vs ${state.combat?.threats?.[0]?.publicName || 'Foe'}`;
    copy = `${marginText}. Reaction window open.`;
    buttons = combatButtons();
  } else if (state.phase === 'ESCAPE') {
    const runner = state.players.find((p) => p.id === state.escape?.currentPlayerId);
    const foeName = state.escape?.threat?.publicName || 'the Foe';
    const bonus = state.escape?.fleeBonus || 0;
    title = runner?.isYou ? `Your Flee Roll — ${foeName}` : `${runner?.name || 'Someone'} must Flee`;
    copy = runner?.isYou
      ? `Roll 1d6. Target: 5+. Your current Flee bonus: ${signed(bonus)}.`
      : `Waiting for ${runner?.name || 'the runner'} to roll 1d6 against ${foeName}. Target: 5+.`;
    if (runner?.isYou) buttons.push(buttonHtml(state.escape?.autoFlee ? 'Use Automatic Flee' : 'Roll to Flee', 'ROLL_ESCAPE', 'primary'));
  } else if (state.phase === 'TRIBUTE') {
    title = isMyTurn() ? 'Tribute Required' : `${active()?.name} must resolve Tribute`;
    copy = isMyTurn() ? `Your hand is ${you.handCount}/${you.handLimit}. Choose excess cards below.` : `Waiting for ${active()?.name} to give or discard excess cards.`;
  } else if (state.phase === 'END_TURN') {
    title = isMyTurn() ? 'End Your Turn' : `${active()?.name}'s turn is wrapping up`;
    copy = isMyTurn() ? 'Everything required is resolved. End your turn when ready.' : `Waiting for ${active()?.name} to end their turn.`;
    if (isMyTurn()) buttons.push(buttonHtml('End Turn', 'END_TURN', 'primary'));
  } else {
    title = `${prettyPhase(state.phase)}`;
    copy = 'Follow the table prompt.';
  }

  root.innerHTML = `<div class="eyebrow">Room ${state.code} · Turn ${state.turnNumber || 0}</div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(copy)}</p><div class="primary-action">${buttons.join('')}</div>`;
  root.querySelectorAll('[data-action]').forEach((btn) => btn.addEventListener('click', () => emitAction(btn.dataset.action)));
  root.querySelectorAll('[data-combat-action]').forEach((btn) => btn.addEventListener('click', () => handleCombatButton(btn.dataset.combatAction, btn.dataset.target)));
}

function buttonHtml(label, action, cls = '') { return `<button class="${cls}" data-action="${action}">${escapeHtml(label)}</button>`; }

function combatButtons() {
  const buttons = [];
  const you = me();
  const combat = state.combat;
  if (!combat) return buttons;
  if (combat.backupRequest?.toPlayerId === you.id) {
    buttons.push(`<button class="primary" data-combat-action="ACCEPT_BACKUP">Accept Backup</button>`);
    buttons.push(`<button data-combat-action="DECLINE_BACKUP">Decline</button>`);
    return buttons;
  }
  if (combat.activePlayerId === you.id && !combat.helperPlayerId) {
    for (const p of state.players.filter((p) => p.id !== you.id)) {
      buttons.push(`<button data-combat-action="REQUEST_BACKUP" data-target="${p.id}">Request Backup: ${escapeHtml(p.name)}</button>`);
    }
  }
  buttons.push(`<button data-combat-action="PASS_COMBAT">Pass Combat</button>`);
  return buttons;
}

function handleCombatButton(action, target) {
  if (action === 'REQUEST_BACKUP') emitAction('REQUEST_BACKUP', { targetPlayerId: target, deal: 'Table deal / negotiated out loud' });
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
      <div class="player-stats">Hand ${p.handCount}/${p.handLimit} · Gear +${p.combatBonus} · Flee +${p.escapeBonus} · ${p.connected ? 'online' : 'offline'}</div>
      <div class="player-stats">Calling: ${p.role ? escapeHtml(p.role.publicName) : 'none'} · Kin: ${p.origin ? escapeHtml(p.origin.publicName) : 'none'}</div>
      <div class="slot-line">${slotChips(p)}</div>
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
  if (state.phase === 'COMBAT' && state.combat) return renderCombat(root);
  if (state.phase === 'ESCAPE' && state.escape) return renderEscape(root);
  const reveal = state.revealCard;
  let html = `<div class="table-event"><strong>Latest:</strong> ${escapeHtml(latestEvent())}</div>`;
  html += tableBoardHtml();
  html += `<div class="zone-title"><h2>Active Table</h2><span class="micro">${prettyPhase(state.phase)}</span></div>`;
  if (reveal) {
    html += `<div class="reveal-zone"><h3>Reveal Zone</h3><p class="micro">This is the card currently being resolved.</p><div class="card-row">${cardHtml(reveal, { tableSmall: false })}</div></div>`;
  } else {
    html += `<div class="empty-zone"><div><strong>No active card</strong><br><span>Cards revealed from the Chamber will appear here before moving zones.</span></div></div>`;
  }
  root.innerHTML = html;
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
  root.innerHTML = `
    <div class="table-event"><strong>Flee:</strong> ${escapeHtml(runner?.name || 'Runner')} must roll against ${escapeHtml(esc.threat?.publicName || 'the Foe')}.</div>
    ${tableBoardHtml({ centerLabel: 'Flee Zone', centerSub: `${runner?.name || 'Runner'} is rolling against ${esc.threat?.publicName || 'the Foe'}.`, centerClass: 'flee-center' })}
    <div class="zone-title"><h2>Flee Zone</h2><span class="micro">Classic d6 roll</span></div>
    <div class="escape-layout">
      <div>
        <h3>${escapeHtml(runner?.name || 'Runner')} vs ${escapeHtml(esc.threat?.publicName || 'Foe')}</h3>
        <p class="micro">Roll 1d6. Add Flee bonuses and penalties. Final result of 5 or more escapes the Bad News.</p>
        <div class="dice-stage">
          <div class="die-face">${escapeHtml(raw)}</div>
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
      </div>
      <div class="card-row">${esc.threat ? cardHtml(esc.threat, { tableSmall: true }) : ''}</div>
    </div>
  `;
}

function renderCombat(root) {
  const combat = state.combat;
  const totals = combat.totals;
  const threat = combat.threats[0];
  const waiting = state.players.filter((p) => !combat.passes?.[p.id]);
  const needsYou = waiting.some((p) => p.isYou);
  const tableCopy = combat.backupRequest
    ? `${playerName(combat.backupRequest.toPlayerId)} has a Backup request to answer.`
    : needsYou
      ? 'Your response is needed: play a card, request Backup, or pass.'
      : waiting.length
        ? `Waiting for ${waiting.map((p) => p.name).join(', ')}.`
        : 'Everyone has passed. Combat will resolve.';
  root.innerHTML = `
    <div class="table-event"><strong>Combat:</strong> ${escapeHtml(tableCopy)}</div>
    ${tableBoardHtml({ centerLabel: 'Combat Zone', centerSub: `${playerName(combat.activePlayerId)} is fighting ${threat?.publicName || 'a Foe'}.`, centerClass: 'combat-center' })}
    <div class="pass-tracker">${state.players.map((p) => passPill(p, combat.passes?.[p.id])).join('')}</div>
    <div class="zone-title"><h2>Combat Zone</h2><span class="micro">${escapeHtml(passSummary(combat.passes))}</span></div>
    <div class="combat-layout">
      <div class="combat-side">
        <h3>Player Side</h3>
        <div>${escapeHtml(playerName(combat.activePlayerId))}${combat.helperPlayerId ? ` + ${escapeHtml(playerName(combat.helperPlayerId))}` : ''}</div>
        <div class="total-big">${totals.playerTotal}</div>
        <div class="micro">Glory + equipped Gear + Calling/Kin + Tricks</div>
        <div class="modifier-list">${combat.playedTricks.filter((c) => c.effect?.side === 'PLAYER').map((c) => `<span class="chip">${escapeHtml(c.publicName)}</span>`).join('')}</div>
      </div>
      <div class="vs">VS</div>
      <div class="combat-side">
        <h3>Foe Side</h3>
        <div class="card-row">${cardHtml(threat, { tableSmall: true })}</div>
        <div class="total-big">${totals.threatTotal}</div>
        <div class="micro">Loot if defeated: ${threat.finalLoot}</div>
        <div class="modifier-list">${(threat.modifiers || []).map((m) => `<span class="chip">${escapeHtml(m.publicName)} ${signed(m.strengthDelta)} / Loot ${signed(m.lootDelta)}</span>`).join('')}</div>
      </div>
    </div>
  `;
}

function passPill(p, passed) {
  return `<div class="pass-pill ${passed ? 'passed' : 'waiting'} ${p.isYou ? 'you' : ''}"><strong>${escapeHtml(p.name)}${p.isYou ? ' (you)' : ''}</strong><span class="micro">${passed ? 'Passed' : 'Waiting'}</span></div>`;
}

function passSummary(passes) {
  return state.players.map((p) => `${p.name}: ${passes?.[p.id] ? 'passed' : 'waiting'}`).join(' · ');
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
  if (p.type === 'MANUAL') {
    root.innerHTML = `<h3>Manual resolution</h3><p>${escapeHtml(p.message)}</p><button class="primary" id="confirmManual">Confirm Resolved</button>`;
    $('confirmManual').addEventListener('click', () => emitAction('RESOLVE_PROMPT'));
    return;
  }
}

function renderHand() {
  const root = $('handPanel');
  const you = me();
  if (!you) { root.innerHTML = ''; return; }
  const over = you.handCount > you.handLimit;
  let html = `<div class="hand-header"><h3>Your Hand</h3><span class="hand-limit ${over ? 'bad' : ''}">${you.handCount}/${you.handLimit}</span></div>`;
  html += `<p class="micro hand-help">Compact view: tap a card to expand details and show legal actions.</p>`;
  if (state.phase === 'TRIBUTE' && isMyTurn()) {
    const need = you.handCount - you.handLimit;
    html += `<p class="micro">Tribute: select exactly ${need} card${need === 1 ? '' : 's'}, then confirm.</p>`;
    html += `<div class="card-row hand-row">${myHand().map((c) => cardHtml(c, { compact: true, selectableTribute: true })).join('')}</div>`;
    html += tributeControls(need);
  } else {
    html += `<div class="card-row hand-row">${myHand().map((c) => cardHtml(c, { compact: true, playable: isCardPlayable(c) })).join('')}</div>`;
  }
  root.innerHTML = html;
  root.querySelectorAll('[data-card-id]').forEach((cardEl) => {
    cardEl.addEventListener('click', () => {
      const card = myHand().find((c) => c.instanceId === cardEl.dataset.cardId);
      if (!card) return;
      if (state.phase === 'TRIBUTE' && isMyTurn()) toggleTribute(card.instanceId);
      else inspectCard(card);
    });
  });
  const confirm = $('confirmTribute');
  if (confirm) confirm.addEventListener('click', () => confirmTribute());
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

function isCardPlayable(card) {
  if (!state || !card) return false;
  if (state.pendingPrompt) return false;
  if (card.type === 'ROLE' || card.type === 'ORIGIN' || card.type === 'GEAR' || card.type === 'SPECIAL') return isMyTurn() && ['START_TURN','NO_THREAT_CHOICE','END_TURN'].includes(state.phase);
  if (card.type === 'THREAT') return isMyTurn() && state.phase === 'NO_THREAT_CHOICE';
  if (card.type === 'TRICK' || card.type === 'THREAT_MODIFIER') return state.phase === 'COMBAT';
  if (card.type === 'HEX') return state.phase === 'COMBAT' && (card.timing || []).includes('DURING_COMBAT');
  return false;
}

function cardHtml(card, opts = {}) {
  if (!card) return '';
  if (opts.compact) return compactCardHtml(card, opts);
  const classes = ['card'];
  if (opts.tableSmall) classes.push('table-small');
  if (opts.playable) classes.push('playable');
  if (opts.selectableTribute && selectedTribute.has(card.instanceId)) classes.push('playable');
  if (opts.playable === false && state?.status !== 'LOBBY') classes.push('dim');
  const bottom = cardBottom(card);
  return `<article class="${classes.join(' ')}" data-card-id="${card.instanceId || ''}">
    <div class="type">${escapeHtml(typeLabel(card))}</div>
    <div class="title">${escapeHtml(card.publicName)}</div>
    <div class="art">ART</div>
    <div class="text">${escapeHtml(card.publicText || '')}</div>
    ${card.flavorText ? `<div class="flavor">${escapeHtml(card.flavorText)}</div>` : ''}
    <div class="stats">${escapeHtml(bottom)}</div>
  </article>`;
}

function compactCardHtml(card, opts = {}) {
  const classes = ['hand-card'];
  if (opts.playable) classes.push('playable');
  if (opts.selectableTribute && selectedTribute.has(card.instanceId)) classes.push('playable');
  if (opts.playable === false && state?.status !== 'LOBBY') classes.push('dim');
  return `<article class="${classes.join(' ')}" data-card-id="${card.instanceId || ''}">
    <div class="hand-card-type">${escapeHtml(typeLabel(card))}</div>
    <div class="hand-card-name">${escapeHtml(card.publicName)}</div>
    <div class="hand-card-main">${escapeHtml(cardGlance(card))}</div>
    <div class="hand-card-sub">${escapeHtml(cardGlanceSub(card))}</div>
  </article>`;
}

function cardGlance(card) {
  if (card.type === 'THREAT') return `STR ${card.strength}`;
  if (card.type === 'GEAR') return `+${card.combatBonus || 0}${card.escapeBonus ? ` · Flee +${card.escapeBonus}` : ''}`;
  if (card.type === 'THREAT_MODIFIER') return `Foe ${signed(card.strengthDelta)}`;
  if (card.type === 'TRICK') return trickGlance(card);
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
  if (card.type === 'TRICK') return (card.timing || []).map(prettyTiming).join(' / ') || 'Trick';
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
  if (card.type === 'THREAT_MODIFIER') return `Foe ${signed(card.strengthDelta)} · Loot ${signed(card.lootDelta)}`;
  if (card.type === 'TRICK') return `${card.timing?.join(', ') || 'Trick'} · ${card.junkValue ?? card.scrapValue ?? 0} Junk`;
  if (card.type === 'ROLE') return 'Calling';
  if (card.type === 'ORIGIN') return 'Kin';
  if (card.type === 'HEX') return card.timing?.join(', ') || 'Hex';
  return card.type || 'Card';
}

function typeLabel(card) {
  const map = { THREAT: 'Foe', HEX: 'Hex', ROLE: 'Calling', ORIGIN: 'Kin', GEAR: 'Gear', TRICK: 'Trick', SPECIAL: 'Special', THREAT_MODIFIER: 'Foe Modifier' };
  return map[card.type] || card.type;
}

function inspectCard(card) {
  if (!card) return;
  const root = $('inspectContent');
  const actions = cardActions(card);
  root.innerHTML = `<div class="inspect-layout"><div>${cardHtml(card)}</div><div><h2>${escapeHtml(card.publicName)}</h2><p>${escapeHtml(card.publicText || '')}</p>${card.flavorText ? `<p class="inspect-flavor">${escapeHtml(card.flavorText)}</p>` : ''}<div class="action-list">${actions}</div></div></div>`;
  root.querySelectorAll('[data-inspect-action]').forEach((btn) => btn.addEventListener('click', () => {
    const a = btn.dataset.inspectAction;
    closeInspect();
    if (a === 'PLAY') emitAction('PLAY_CARD', { cardId: card.instanceId });
    if (a === 'EQUIP') emitAction('PLAY_CARD', { cardId: card.instanceId, mode: 'EQUIP' });
    if (a === 'CARRY') emitAction('PLAY_CARD', { cardId: card.instanceId, mode: 'CARRY' });
    if (a === 'START_TROUBLE') emitAction('START_TROUBLE', { cardId: card.instanceId });
  }));
  $('inspectOverlay').classList.remove('hidden');
}

function cardActions(card) {
  const actions = [];
  if (state.pendingPrompt) return `<p>Resolve the current prompt first.</p>`;
  if ((card.type === 'ROLE' || card.type === 'ORIGIN') && isMyTurn() && ['START_TURN','NO_THREAT_CHOICE','END_TURN'].includes(state.phase)) actions.push(`<button class="primary" data-inspect-action="PLAY">Play ${typeLabel(card)}</button>`);
  if (card.type === 'GEAR' && isMyTurn() && ['START_TURN','NO_THREAT_CHOICE','END_TURN'].includes(state.phase)) {
    actions.push(`<button class="primary" data-inspect-action="EQUIP">Equip</button>`);
    actions.push(`<button data-inspect-action="CARRY">Carry</button>`);
  }
  if (card.type === 'THREAT' && isMyTurn() && state.phase === 'NO_THREAT_CHOICE') actions.push(`<button class="primary" data-inspect-action="START_TROUBLE">Start Trouble</button>`);
  if ((card.type === 'TRICK' || card.type === 'THREAT_MODIFIER') && state.phase === 'COMBAT') actions.push(`<button class="primary" data-inspect-action="PLAY">Play in Combat</button>`);
  if (card.type === 'TRICK' && state.phase === 'ESCAPE' && state.escape?.currentPlayerId === me()?.id && (card.timing || []).includes('BEFORE_ESCAPE_ROLL')) actions.push(`<button class="primary" data-inspect-action="PLAY">Play before Flee roll</button>`);
  if (card.type === 'HEX') actions.push(`<button class="primary" data-inspect-action="PLAY">Play Hex</button>`);
  if (card.type === 'SPECIAL' && isMyTurn() && ['START_TURN','NO_THREAT_CHOICE','END_TURN'].includes(state.phase)) actions.push(`<button class="primary" data-inspect-action="PLAY">Play Special</button>`);
  if (!actions.length) actions.push(`<p>No legal actions right now.</p><p class="micro">${whyNotPlayable(card)}</p>`);
  return actions.join('');
}

function whyNotPlayable(card) {
  if (!isMyTurn() && ['ROLE','ORIGIN','GEAR','SPECIAL','THREAT'].includes(card.type)) return 'This can only be used on your own turn in the correct phase.';
  if (card.type === 'THREAT_MODIFIER') return 'Foe Modifiers can only be played during combat.';
  if (card.type === 'TRICK') return 'This Trick is only available during its timing window, such as combat or before a Flee roll.';
  if (card.type === 'THREAT') return 'Foes are played with Start Trouble after no Foe appears.';
  return 'The current phase does not allow this card.';
}

function closeInspect() { $('inspectOverlay').classList.add('hidden'); }

function inspectPlayer(p) {
  const root = $('inspectContent');
  const gearCards = [...(p.equippedGear || []), ...(p.carriedGear || [])];
  root.innerHTML = `<h2>${escapeHtml(p.name)}</h2><p>Glory ${p.renown}/10 · Hand ${p.handCount}/${p.handLimit} · ${p.connected ? 'online' : 'offline'}</p>
    <p>Calling: ${p.role ? escapeHtml(p.role.publicName) : 'none'}<br>Kin: ${p.origin ? escapeHtml(p.origin.publicName) : 'none'}</p>
    <h3>Equipped / Carried Gear</h3><div class="card-row">${gearCards.length ? gearCards.map((g) => cardHtml(g, { compact: true })).join('') : '<span class="micro">No public Gear.</span>'}</div>`;
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
    REACTION_TO_BAD_NEWS: 'Bad News'
  };
  return map[t] || String(t || '').replaceAll('_', ' ').toLowerCase();
}

function prettyPhase(phase) {
  const map = { LOBBY: 'Lobby', START_TURN: 'Open Chamber', NO_THREAT_CHOICE: 'Choice', COMBAT: 'Combat', ESCAPE: 'Flee', TRIBUTE: 'Tribute', END_TURN: 'End Turn', GAME_OVER: 'Game Over' };
  return map[phase] || phase;
}
function playerName(id) { return state.players.find((p) => p.id === id)?.name || 'Unknown'; }
function signed(n) { return `${Number(n || 0) >= 0 ? '+' : ''}${Number(n || 0)}`; }
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

maybeShowResume();
