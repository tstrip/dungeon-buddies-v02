const socket = io();
const SESSION_KEY = 'lootGoblinsV041Session';
let state = null;
let selectedTribute = new Set();
let selectedSell = new Set();
let currentTab = 'log';

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
$('chatForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('chatInput');
  socket.emit('chat', { message: input.value });
  input.value = '';
});
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentTab = btn.dataset.tab;
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === currentTab));
    $('logBox').classList.toggle('hidden', currentTab !== 'log');
    $('chatBox').classList.toggle('hidden', currentTab !== 'chat');
  });
});

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
  $('chamberCount').textContent = state.decks.chamber;
  $('lootCount').textContent = state.decks.loot;
  $('chamberDiscard').textContent = `Chamber discard ${state.decks.chamberDiscard}`;
  $('lootDiscard').textContent = `Loot discard ${state.decks.lootDiscard}`;
  renderPhaseBanner();
  renderPlayers();
  renderActiveTable();
  renderPrompt();
  renderHand();
  renderLogAndChat();
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
  if (action === 'REQUEST_BACKUP') emitAction('REQUEST_BACKUP', { targetPlayerId: target, deal: 'Table deal / negotiated in chat' });
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
  let html = `<div class="zone-title"><h2>Active Table</h2><span class="micro">${prettyPhase(state.phase)}</span></div>`;
  if (reveal) {
    html += `<div class="reveal-zone"><h3>Reveal Zone</h3><div class="card-row">${cardHtml(reveal, { small: false })}</div></div>`;
  } else {
    html += `<div class="empty-zone"><div><strong>No active card</strong><br><span>Cards revealed from the Chamber will appear here before moving zones.</span></div></div>`;
  }
  root.innerHTML = html;
}

function renderEscape(root) {
  const esc = state.escape;
  const runner = state.players.find((p) => p.id === esc.currentPlayerId);
  const last = esc.lastRoll;
  const rollLine = last
    ? `<div class="roll-result"><strong>Last roll:</strong> ${last.raw} ${last.bonus ? signed(last.bonus) : '+0'} = <strong>${last.total}</strong> · ${last.total >= 5 ? 'escaped' : 'failed'}</div>`
    : `<div class="roll-result">No roll yet. Target number is <strong>5+</strong>.</div>`;
  root.innerHTML = `
    <div class="zone-title"><h2>Flee Zone</h2><span class="micro">Classic d6 roll</span></div>
    <div class="escape-layout">
      <div>
        <h3>${escapeHtml(runner?.name || 'Runner')} vs ${escapeHtml(esc.threat?.publicName || 'Foe')}</h3>
        <p>Roll 1d6. Add Flee bonuses and penalties. Final result of 5 or more escapes the Bad News.</p>
        <div class="dice-breakdown">
          <span>Target: <strong>5+</strong></span>
          <span>Flee bonus: <strong>${signed(esc.fleeBonus || 0)}</strong></span>
          <span>Runner ${Number(esc.index || 0) + 1}/${esc.runners?.length || 1}</span>
        </div>
        ${rollLine}
      </div>
      <div class="card-row">${esc.threat ? cardHtml(esc.threat, { small: true }) : ''}</div>
    </div>
  `;
}

function renderCombat(root) {
  const combat = state.combat;
  const totals = combat.totals;
  const threat = combat.threats[0];
  root.innerHTML = `
    <div class="zone-title"><h2>Combat Zone</h2><span class="micro">Passes: ${passSummary(combat.passes)}</span></div>
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
        <div class="card-row">${cardHtml(threat, { small: true })}</div>
        <div class="total-big">${totals.threatTotal}</div>
        <div class="micro">Loot if defeated: ${threat.finalLoot}</div>
        <div class="modifier-list">${(threat.modifiers || []).map((m) => `<span class="chip">${escapeHtml(m.publicName)} ${signed(m.strengthDelta)} / Loot ${signed(m.lootDelta)}</span>`).join('')}</div>
      </div>
    </div>
  `;
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
  if (state.phase === 'TRIBUTE' && isMyTurn()) {
    const need = you.handCount - you.handLimit;
    html += `<p class="micro">Tribute: select exactly ${need} card${need === 1 ? '' : 's'}, then confirm.</p>`;
    html += `<div class="card-row">${myHand().map((c) => cardHtml(c, { small: true, selectableTribute: true })).join('')}</div>`;
    html += tributeControls(need);
  } else {
    html += `<div class="card-row">${myHand().map((c) => cardHtml(c, { small: true, playable: isCardPlayable(c) })).join('')}</div>`;
  }
  root.innerHTML = html;
  root.querySelectorAll('[data-card-id]').forEach((cardEl) => {
    cardEl.addEventListener('click', () => {
      const card = myHand().find((c) => c.instanceId === cardEl.dataset.cardId);
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
  const classes = ['card'];
  if (opts.small) classes.push('small');
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
    <h3>Equipped / Carried Gear</h3><div class="card-row">${gearCards.length ? gearCards.map((g) => cardHtml(g, { small: true })).join('') : '<span class="micro">No public Gear.</span>'}</div>`;
  $('inspectOverlay').classList.remove('hidden');
}

function renderLogAndChat() {
  $('logBox').innerHTML = state.log.map((l) => `<div class="log-line">${escapeHtml(l.message)}</div>`).join('');
  $('logBox').scrollTop = $('logBox').scrollHeight;
  $('chatMessages').innerHTML = state.chat.map((m) => `<div class="chat-line"><strong>${escapeHtml(m.name)}:</strong> ${escapeHtml(m.message)}</div>`).join('');
  $('chatMessages').scrollTop = $('chatMessages').scrollHeight;
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
