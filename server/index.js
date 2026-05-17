const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { chamberCards, lootCards } = require('./cards');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;

const rooms = new Map();
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/health', (_, res) => res.json({ ok: true, rooms: rooms.size, version: '0.6.2-one-for-one-automation' }));
app.get('/', (_, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));

function randomId(alphabet, length) {
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
const roomCode = () => randomId(ALPHABET, 5);
const instanceId = () => randomId(ID_ALPHABET, 10);
const playerId = () => `p_${randomId(ID_ALPHABET, 12)}`;
const clone = (obj) => JSON.parse(JSON.stringify(obj));

function rollD6() {
  return Math.floor(Math.random() * 6) + 1;
}

function shuffle(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isPlayableDefinition(def) {
  if (!def) return false;
  const v6LiveIds = new Set([
    'SPECIAL_STEAL_LEVEL',
    'SPECIAL_UNEXPECTED_COMPANY_A', 'SPECIAL_MATCHING_PROBLEM', 'SPECIAL_FINE_PRINT_PERMIT',
    'SPECIAL_MAGIC_LAMP', 'SPECIAL_POLYMORPH', 'SPECIAL_OUT_TO_LUNCH', 'SPECIAL_ILLUSION',
    'SPECIAL_DIVINE_INTERVENTION', 'SPECIAL_WAND_DOWSING', 'SPECIAL_FRIENDSHIP',
    'SPECIAL_MIXED_KIN', 'SPECIAL_OVERQUALIFIED',
    'TRICK_DOPPELGANGER', 'TRICK_INSTANT_WALL'
  ]);
  if (v6LiveIds.has(def.id)) return true;
  if (def.type === 'TRICK' && def.effect?.type === 'MODIFY_COMBAT_TOTAL') return true;
  if (def.enforcement === 'MANUAL') return false;
  if (def.effect?.type === 'MANUAL_PROMPT') return false;
  if (def.consequence?.type === 'MANUAL_PROMPT') return false;
  return true;
}

function expandDeck(defs) {
  const expanded = [];
  for (const def of defs) {
    if (!isPlayableDefinition(def)) continue;
    const copies = Number(def.copies || 1);
    for (let i = 0; i < copies; i++) {
      const card = { ...clone(def), instanceId: instanceId() };
      delete card.copies;
      expanded.push(card);
    }
  }
  return shuffle(expanded);
}

function log(room, message) {
  room.log.push({ at: Date.now(), message });
  if (room.log.length > 180) room.log.shift();
}

function tableNotice(room, kind, title, detail, card = null) {
  room.tableNotice = { at: Date.now(), kind, title, detail, card: publicCard(card) };
}

function announce(room, kind, title, detail, card = null, options = {}) {
  const announcement = {
    at: Date.now(),
    id: instanceId(),
    kind,
    title,
    detail,
    card: publicCard(card),
    importance: options.importance || 'normal'
  };
  room.announcement = announcement;
  room.tableNotice = { at: announcement.at, kind, title, detail, card: publicCard(card) };
}

function movement(room, from, to, label, detail, card = null) {
  room.movement = {
    id: instanceId(),
    at: Date.now(),
    from,
    to,
    label,
    detail,
    card: publicCard(card)
  };
}

function markFresh(card, deckName) {
  if (!card) return card;
  card.fresh = true;
  card.freshAt = Date.now();
  card.freshFrom = deckName;
  return card;
}

function emitError(socket, message) {
  socket.emit('toast', { type: 'error', message });
}

function emitOk(socket, message) {
  socket.emit('toast', { type: 'ok', message });
}

function getPlayer(room, id) {
  return room.players.find((p) => p.id === id);
}

function getActive(room) {
  return room.players[room.activePlayerIndex] || null;
}

function activeId(room) {
  return getActive(room)?.id || null;
}

function isOwnTurn(room, socket) {
  return socket.data.playerId && socket.data.playerId === activeId(room);
}

function createPlayer(name, socket) {
  return {
    id: playerId(),
    socketId: socket.id,
    name: String(name || 'Player').trim().slice(0, 24) || 'Player',
    connected: true,
    renown: 1,
    hand: [],
    role: null,
    origin: null,
    carriedGear: [],
    equippedGear: [],
    temporaryEffects: [],
    usedHalfstepSale: false,
    extraCallingSlots: 0,
    extraKinSlots: 0,
    dead: false,
    extraRoles: [],
    extraOrigins: []
  };
}

function publicCard(card) {
  if (!card) return null;
  return {
    instanceId: card.instanceId,
    id: card.id,
    deck: card.deck,
    type: card.type,
    publicName: card.publicName,
    publicText: card.publicText,
    flavorText: card.flavorText,
    strength: card.strength,
    renownReward: card.renownReward,
    lootReward: card.lootReward,
    tags: card.tags || [],
    slot: card.slot,
    handsUsed: card.handsUsed,
    combatBonus: card.combatBonus,
    escapeBonus: card.escapeBonus,
    scrapValue: card.scrapValue ?? card.junkValue,
    junkValue: card.junkValue ?? card.scrapValue,
    isHeavy: Boolean(card.isHeavy),
    mechanicalSlot: card.mechanicalSlot,
    timing: card.timing || [],
    target: card.target,
    strengthDelta: card.strengthDelta,
    lootDelta: card.lootDelta,
    enforcement: card.enforcement,
    requiresNoKin: Boolean(card.requiresNoKin),
    conditionalBonuses: card.conditionalBonuses || [],
    usableByCallings: card.usableByCallings || [],
    notUsableByCallings: card.notUsableByCallings || [],
    usableByOrigins: card.usableByOrigins || [],
    notUsableByOrigins: card.notUsableByOrigins || [],
    effect: card.effect ? { ...card.effect } : undefined,
    cheated: Boolean(card.cheated),
    isClone: Boolean(card.isClone),
    fresh: Boolean(card.fresh),
    freshAt: card.freshAt || null,
    freshFrom: card.freshFrom || null
  };
}

function publicPlayer(room, p, viewerId) {
  return {
    id: p.id,
    name: p.name,
    isYou: p.id === viewerId,
    connected: p.connected,
    renown: p.renown,
    handCount: p.hand.length,
    handLimit: handLimit(p),
    role: publicCard(p.role),
    origin: publicCard(p.origin),
    extraRoles: (p.extraRoles || []).map(publicCard),
    extraOrigins: (p.extraOrigins || []).map(publicCard),
    carriedGear: p.carriedGear.map(publicCard),
    equippedGear: p.equippedGear.map(publicCard),
    combatBonus: gearCombatBonus(p) + roleStaticCombatBonus(room, p),
    escapeBonus: gearFleeBonus(p) + originFleeBonus(p) + temporaryFleeBonus(p),
    heavyCount: heavyCount(p),
    heavyLimit: heavyLimit(p),
    extraCallingSlots: p.extraCallingSlots || 0,
    extraKinSlots: p.extraKinSlots || 0,
    dead: Boolean(p.dead)
  };
}

function serializeRoom(room, viewerId) {
  const active = getActive(room);
  const viewer = getPlayer(room, viewerId);
  return {
    version: '0.6.2-one-for-one-automation',
    code: room.code,
    status: room.status,
    phase: room.phase,
    turnNumber: room.turnNumber,
    activePlayerId: active?.id || null,
    activePlayerName: active?.name || null,
    winnerId: room.winnerId || null,
    players: room.players.map((p) => publicPlayer(room, p, viewerId)),
    you: viewer ? { id: viewer.id, name: viewer.name, hand: viewer.hand.map(publicCard) } : null,
    decks: {
      chamber: room.chamberDeck.length,
      loot: room.lootDeck.length,
      chamberDiscard: room.chamberDiscard.length,
      lootDiscard: room.lootDiscard.length
    },
    revealCard: publicCard(room.revealCard),
    tableNotice: room.tableNotice || null,
    announcement: room.announcement || null,
    movement: room.movement || null,
    combat: serializeCombat(room),
    escape: serializeEscape(room),
    firstRoll: serializeFirstRoll(room, viewerId),
    pendingPrompt: serializePrompt(room.pendingPrompt, viewerId),
    log: room.log.slice(-80),
    chat: room.chat.slice(-60),
    legalActions: viewer ? legalActions(room, viewer) : []
  };
}


function serializeFirstRoll(room, viewerId) {
  if (!room.firstRoll) return null;
  const rolls = room.firstRoll.rolls || {};
  const previous = room.firstRoll.previous || [];
  return {
    round: room.firstRoll.round || 1,
    eligible: room.firstRoll.eligible || [],
    rolls,
    previous,
    latest: room.firstRoll.latest || null,
    winnerId: room.firstRoll.winnerId || null,
    requiresYou: room.phase === 'ROLL_FOR_FIRST' && (room.firstRoll.eligible || []).includes(viewerId) && !rolls[viewerId]
  };
}

function serializeCombat(room) {
  if (!room.combat) return null;
  const totals = combatTotals(room);
  return {
    activePlayerId: room.combat.activePlayerId,
    helperPlayerId: room.combat.helperPlayerId,
    backupRequest: room.combat.backupRequest,
    backupDeal: room.combat.backupDeal,
    threats: room.combat.threats.map((t) => ({ ...publicCard(t), modifiers: (t.modifiers || []).map(publicCard), finalStrength: finalFoeStrength(room, t), finalLoot: finalFoeLoot(t) })),
    playerDelta: room.combat.playerDelta || 0,
    threatDelta: room.combat.threatDelta || 0,
    playedTricks: (room.combat.playedTricks || []).map(publicCard),
    roleUses: room.combat.roleUses || {},
    passes: room.combat.passes,
    totals
  };
}

function serializeEscape(room) {
  if (!room.escape) return null;
  const current = currentEscapeEntry(room);
  const runner = current ? getPlayer(room, current.playerId) : null;
  const threat = current?.threat || room.escape.threat;
  return {
    runners: room.escape.runners || [],
    queue: (room.escape.queue || []).map((entry, i) => ({ index: i, playerId: entry.playerId, playerName: getPlayer(room, entry.playerId)?.name || 'Player', threat: publicCard(entry.threat) })),
    index: room.escape.index || 0,
    currentPlayerId: runner?.id || null,
    currentPlayerName: runner?.name || null,
    threat: publicCard(threat),
    targetNumber: 5,
    fleeBonus: runner ? gearFleeBonus(runner) + originFleeBonus(runner) + temporaryFleeBonus(runner) : 0,
    autoFlee: runner ? runner.temporaryEffects.some((e) => e.type === 'AUTO_ESCAPE') : false,
    lastRoll: room.escape.lastRoll || null
  };
}

function currentEscapeEntry(room) {
  if (!room.escape) return null;
  if (Array.isArray(room.escape.queue)) return room.escape.queue[room.escape.index || 0] || null;
  return room.escape.currentPlayerId ? { playerId: room.escape.currentPlayerId, threat: room.escape.threat } : null;
}

function serializePrompt(prompt, viewerId) {
  if (!prompt) return null;
  const requiresYou = prompt.playerId === viewerId;
  let options = [];
  if (requiresYou) {
    if (prompt.type === 'CHOOSE_PLAYER') options = (prompt.options || []).map((p) => ({ id: p.id, name: p.name }));
    else options = (prompt.options || []).map(publicCard);
  }
  return {
    id: prompt.id,
    type: prompt.type,
    playerId: prompt.playerId,
    message: prompt.message,
    options,
    requiresYou,
    meta: prompt.meta || {}
  };
}

function broadcast(room) {
  for (const p of room.players) {
    if (!p.socketId) continue;
    const socket = io.sockets.sockets.get(p.socketId);
    if (socket) socket.emit('state', serializeRoom(room, p.id));
  }
}

function draw(room, deckName) {
  const deckKey = deckName === 'CHAMBER' ? 'chamberDeck' : 'lootDeck';
  const discardKey = deckName === 'CHAMBER' ? 'chamberDiscard' : 'lootDiscard';
  if (room[deckKey].length === 0 && room[discardKey].length > 0) {
    room[deckKey] = shuffle(room[discardKey].splice(0));
    log(room, `${deckName === 'CHAMBER' ? 'Chamber' : 'Loot'} discard was shuffled back into the deck.`);
  }
  return room[deckKey].shift() || null;
}

function discardCard(room, card) {
  if (!card) return;
  card.fresh = false;
  card.freshAt = null;
  const to = card.deck === 'CHAMBER' ? 'CHAMBER_DISCARD' : 'LOOT_DISCARD';
  if (card.deck === 'CHAMBER') room.chamberDiscard.push(card);
  else room.lootDiscard.push(card);
  movement(room, 'TABLE', to, 'Card → Discard', `${card.publicName || 'A card'} moved to discard.`, card);
}

function hasRole(player, slot) {
  return player?.role?.mechanicalSlot === slot || (player?.extraRoles || []).some((r) => r.mechanicalSlot === slot);
}
function hasOrigin(player, slot) {
  return player?.origin?.mechanicalSlot === slot || (player?.extraOrigins || []).some((r) => r.mechanicalSlot === slot);
}

function handLimit(player) {
  return hasOrigin(player, 'DWARF_EQUIV') ? 6 : 5;
}
function heavyLimit(player) {
  return hasOrigin(player, 'DWARF_EQUIV') ? 99 : 1;
}
function heavyCount(player) {
  return [...player.carriedGear, ...player.equippedGear].filter((g) => g.isHeavy).length;
}
function gearCombatBonus(player) {
  const gear = hasTemp(player, 'ONLY_BODY_GEAR_NEXT_COMBAT') ? player.equippedGear.filter((g) => g.slot === 'BODY') : player.equippedGear;
  return gear.reduce((sum, g) => sum + effectiveGearCombatBonus(player, g), 0);
}
function gearFleeBonus(player) {
  return player.equippedGear.reduce((sum, g) => sum + (Number(g.escapeBonus) || 0), 0);
}
function originFleeBonus(player) {
  return hasOrigin(player, 'ELF_EQUIV') ? 1 : 0;
}
function temporaryFleeBonus(player) {
  return player.temporaryEffects.filter((e) => e.type === 'MODIFY_ESCAPE_ROLL').reduce((sum, e) => sum + (e.amount || 0), 0) + dieRollPenalty(player);
}
function dieRollPenalty(player) {
  return player.temporaryEffects.filter((e) => e.type === 'DIE_ROLL_PENALTY').reduce((sum, e) => sum + (e.amount || 0), 0);
}
function hasTemp(player, type) {
  return player.temporaryEffects.some((e) => e.type === type);
}
function roleStaticCombatBonus(room, player) {
  // Most Calling combat powers are guided/manual for now; only always-on bonuses belong here.
  return 0;
}
function handsUsed(player) {
  return player.equippedGear.filter((g) => g.slot === 'HAND').reduce((sum, g) => sum + (Number(g.handsUsed) || 1), 0);
}
function handCapacity(player) {
  return 2 + player.equippedGear.reduce((sum, g) => sum + (Number(g.extraHands) || 0), 0);
}
function activeHasTieWin(room) {
  return hasRole(getActive(room), 'WARRIOR_EQUIV');
}
function playerCombatTotal(room, player) {
  if (!player) return 0;
  return player.renown + gearCombatBonus(player) + roleStaticCombatBonus(room, player);
}
function threatSpecialBonus(room, threat) {
  let total = 0;
  const active = getActive(room);
  for (const rule of threat.specialRules || []) {
    if (rule.type === 'BONUS_AGAINST_ROLE' && hasRole(active, rule.roleMechanicalSlot)) total += rule.amount || 0;
    if (rule.type === 'BONUS_AGAINST_ORIGIN' && hasOrigin(active, rule.originMechanicalSlot)) total += rule.amount || 0;
    if (rule.type === 'BONUS_IF_NO_ORIGIN' && !active?.origin && !(active?.extraOrigins || []).length) total += rule.amount || 0;
    if (rule.type === 'BONUS_IF_NO_ROLE' && !active?.role && !(active?.extraRoles || []).length) total += rule.amount || 0;
    if (rule.type === 'BONUS_IF_ACTIVE_RENOWN_AT_LEAST' && active?.renown >= (rule.value || 0)) total += rule.amount || 0;
  }
  return total;
}
function finalFoeStrength(room, threat) {
  return Math.max(0, (threat.strength || 0) + threatSpecialBonus(room, threat) + (threat.modifiers || []).reduce((s, m) => s + (m.strengthDelta || 0), 0));
}
function finalFoeLoot(threat) {
  return Math.max(1, (threat.lootReward || 0) + (threat.modifiers || []).reduce((s, m) => s + (m.lootDelta || 0), 0));
}
function combatTotals(room) {
  if (!room.combat) return null;
  const active = getPlayer(room, room.combat.activePlayerId);
  const helper = room.combat.helperPlayerId ? getPlayer(room, room.combat.helperPlayerId) : null;
  const playerTotal = playerCombatTotal(room, active) + playerCombatTotal(room, helper) + (room.combat.playerDelta || 0);
  const threatTotal = room.combat.threats.reduce((sum, t) => sum + finalFoeStrength(room, t), 0) + (room.combat.threatDelta || 0);
  const wins = activeHasTieWin(room) ? playerTotal >= threatTotal : playerTotal > threatTotal;
  return { playerTotal, threatTotal, wins, margin: playerTotal - threatTotal, tieWin: activeHasTieWin(room) };
}

function startCombat(room, threat) {
  threat.modifiers = [];
  room.combat = {
    activePlayerId: activeId(room),
    helperPlayerId: null,
    backupRequest: null,
    backupDeal: null,
    threats: [threat],
    playerDelta: 0,
    threatDelta: 0,
    playedTricks: [],
    roleUses: {},
    passes: {}
  };
  const active = getActive(room);
  const nextCombatDelta = active ? active.temporaryEffects.filter((e) => e.type === 'NEXT_COMBAT_DELTA').reduce((sum, e) => sum + (e.amount || 0), 0) : 0;
  if (nextCombatDelta) {
    room.combat.playerDelta += nextCombatDelta;
    active.temporaryEffects = active.temporaryEffects.filter((e) => e.type !== 'NEXT_COMBAT_DELTA');
    announce(room, 'combat', 'Lingering Penalty Applied', `${active.name} has ${nextCombatDelta} to this combat.`, null, { importance: 'normal' });
  }
  resetCombatPasses(room);
  room.phase = 'COMBAT';
  room.revealCard = threat;
  announce(room, 'combat', 'Combat Begins', `${getActive(room).name} faces ${threat.publicName}.`, threat, { importance: 'major' });
  log(room, `${getActive(room).name} faces ${threat.publicName}.`);
}

function resetCombatPasses(room) {
  if (!room.combat) return;
  room.combat.passes = {};
  for (const p of room.players) room.combat.passes[p.id] = false;
}

function findAndRemoveFromHand(player, cardId) {
  const idx = player.hand.findIndex((c) => c.instanceId === cardId);
  if (idx < 0) return null;
  return player.hand.splice(idx, 1)[0];
}

function findCardByInstance(cards, cardId) {
  return cards.find((c) => c.instanceId === cardId) || null;
}

function removeCardByInstance(cards, cardId) {
  const idx = cards.findIndex((c) => c.instanceId === cardId);
  if (idx < 0) return null;
  return cards.splice(idx, 1)[0];
}

function allOwnedCards(player) {
  return [...player.hand, ...player.carriedGear, ...player.equippedGear];
}

function addFoeToCombat(room, foe, sourcePlayer) {
  if (!room.combat || !foe) return false;
  foe.modifiers = foe.modifiers || [];
  room.combat.threats.push(foe);
  resetCombatPasses(room);
  movement(room, 'PLAYER_HAND', 'COMBAT_ZONE', 'Hand → Combat Zone', `${sourcePlayer?.name || 'A player'} added ${foe.publicName} to the combat.`, foe);
  announce(room, 'combat', 'Another Foe Joined', `${sourcePlayer?.name || 'A player'} added ${foe.publicName}. Defeat the combined Foe side or Flee from each Foe.`, foe, { importance: 'major' });
  log(room, `${sourcePlayer?.name || 'A player'} added ${foe.publicName} to the combat.`);
  return true;
}

function cloneFoeForMate(source) {
  const copy = clone(source);
  copy.instanceId = instanceId();
  copy.publicName = `${source.publicName} Twin`;
  copy.isClone = true;
  copy.modifiers = (source.modifiers || []).map((m) => ({ ...clone(m), instanceId: instanceId() }));
  return copy;
}

function removeFoeAt(room, index) {
  if (!room.combat || index < 0 || index >= room.combat.threats.length) return null;
  const [foe] = room.combat.threats.splice(index, 1);
  for (const m of foe.modifiers || []) discardCard(room, m);
  discardCard(room, foe);
  return foe;
}

function canActOutsideCombat(room) {
  return ['START_TURN', 'NO_THREAT_CHOICE', 'END_TURN'].includes(room.phase);
}

function effectiveGearCombatBonus(player, card) {
  let bonus = Number(card.combatBonus || 0);
  for (const rule of card.conditionalBonuses || []) {
    if (rule.ifOrigin && player.origin?.id === rule.ifOrigin) bonus += Number(rule.combatBonus || 0);
    if (rule.ifCalling && player.role?.id === rule.ifCalling) bonus += Number(rule.combatBonus || 0);
  }
  return bonus;
}

function validateGearEquip(player, card) {
  if (card.type !== 'GEAR') return 'That is not Gear.';
  if (card.cheated) return null;
  const roleIds = [player.role, ...(player.extraRoles || [])].filter(Boolean).map((r) => r.id);
  const originIds = [player.origin, ...(player.extraOrigins || [])].filter(Boolean).map((r) => r.id);
  if ((card.usableByCallings || []).length && !card.usableByCallings.some((id) => roleIds.includes(id))) return `Only the right Calling can equip ${card.publicName}.`;
  if ((card.notUsableByCallings || []).length && roleIds.some((id) => card.notUsableByCallings.includes(id))) return `${card.publicName} cannot be equipped by your current Calling.`;
  if ((card.usableByOrigins || []).length && !card.usableByOrigins.some((id) => originIds.includes(id))) return `Only the right Kin can equip ${card.publicName}.`;
  if ((card.notUsableByOrigins || []).length && originIds.some((id) => card.notUsableByOrigins.includes(id))) return `${card.publicName} cannot be equipped by your current Kin.`;
  if (card.requiresNoKin && (player.origin || (player.extraOrigins || []).length)) return `${card.publicName} is only usable if you have no Kin.`;
  const combinedHeavy = heavyCount(player) + (card.isHeavy && !player.carriedGear.some((g) => g.instanceId === card.instanceId) ? 1 : 0);
  if (combinedHeavy > heavyLimit(player)) return `You can only carry ${heavyLimit(player)} Heavy Gear right now.`;
  if (card.slot === 'HEAD' && player.equippedGear.some((g) => g.slot === 'HEAD')) return 'Your Head slot is already full.';
  if (card.slot === 'BODY' && player.equippedGear.some((g) => g.slot === 'BODY')) return 'Your Body slot is already full.';
  if (card.slot === 'FEET' && player.equippedGear.some((g) => g.slot === 'FEET')) return 'Your Feet slot is already full.';
  if (card.slot === 'HAND' && handsUsed(player) + (card.handsUsed || 1) > handCapacity(player)) return 'You do not have enough free hands.';
  return null;
}

function carryGear(player, card) {
  if (card) card.fresh = false;
  player.carriedGear.push(card);
}

function equipGear(player, card) {
  if (card) card.fresh = false;
  player.equippedGear.push(card);
}

function applyEffect(room, player, effect, sourceCard, context = {}) {
  if (!player || !effect) return true;
  switch (effect.type) {
    case 'GAIN_RENOWN': {
      gainGlory(room, player, effect.amount || 1, Boolean(effect.canWin), false);
      return true;
    }
    case 'LOSE_RENOWN': {
      const amount = effect.amount || 1;
      const min = effect.minimum ?? 1;
      const before = player.renown;
      player.renown = Math.max(min, player.renown - amount);
      announce(room, 'effect', 'Glory Changed', `${player.name}: ${before} → ${player.renown} Glory.`, sourceCard, { importance: 'normal' });
      log(room, `${player.name} lost ${amount} Glory.`);
      return true;
    }
    case 'LOSE_ROLE': {
      if (player.role) { const lost = player.role; discardCard(room, lost); player.role = null; announce(room, 'effect', 'Calling Lost', `${player.name} lost ${lost.publicName}.`, sourceCard, { importance: 'normal' }); log(room, `${player.name} lost ${lost.publicName}.`); }
      else {
        if (sourceCard?.id === 'HEX_LOSE_CLASS') { const before = player.renown; player.renown = Math.max(1, player.renown - 1); announce(room, 'effect', 'No Calling to Lose', `${player.name} had no Calling, so Glory changed ${before} → ${player.renown}.`, sourceCard, { importance: 'normal' }); log(room, `${player.name} had no Calling and lost 1 Glory instead.`); }
        else { announce(room, 'effect', 'No Effect', `${player.name} had no Calling to lose.`, sourceCard, { importance: 'normal' }); log(room, `${player.name} had no Calling to lose.`); }
      }
      return true;
    }
    case 'LOSE_ORIGIN': {
      if (player.origin) { const lost = player.origin; discardCard(room, lost); player.origin = null; announce(room, 'effect', 'Kin Lost', `${player.name} lost ${lost.publicName}.`, sourceCard, { importance: 'normal' }); log(room, `${player.name} lost ${lost.publicName}.`); }
      else { announce(room, 'effect', 'No Effect', `${player.name} had no Kin to lose.`, sourceCard, { importance: 'normal' }); log(room, `${player.name} had no Kin to lose.`); }
      return true;
    }
    case 'DISCARD_FROM_HAND': {
      const count = Math.min(effect.count || 1, player.hand.length);
      if (count <= 0) { announce(room, 'effect', 'No Effect', `${player.name} had no cards to discard.`, sourceCard, { importance: 'normal' }); log(room, `${player.name} had no cards to discard.`); return true; }
      if (effect.method === 'PLAYER_CHOICE') {
        announce(room, 'prompt', 'Choice Required', `${player.name} must discard ${count} card${count === 1 ? '' : 's'} from hand.`, sourceCard, { importance: 'major' });
        createPrompt(room, {
          type: 'DISCARD_HAND_CARDS',
          playerId: player.id,
          message: `${player.name} must discard ${count} card${count === 1 ? '' : 's'} from hand.`,
          options: player.hand.slice(),
          meta: { count, after: context.after || 'CONTINUE' }
        });
        return false;
      }
      for (let i = 0; i < count; i++) {
        const idx = effect.method === 'RANDOM' ? Math.floor(Math.random() * player.hand.length) : 0;
        const [card] = player.hand.splice(idx, 1);
        discardCard(room, card);
      }
      announce(room, 'effect', 'Cards Discarded', `${player.name} discarded ${count} card${count === 1 ? '' : 's'}.`, sourceCard, { importance: 'normal' });
      log(room, `${player.name} discarded ${count} card${count === 1 ? '' : 's'}.`);
      return true;
    }
    case 'DISCARD_HAND': {
      const count = player.hand.length;
      while (player.hand.length) discardCard(room, player.hand.pop());
      announce(room, 'effect', 'Hand Discarded', `${player.name} discarded their hand (${count} cards).`, sourceCard, { importance: 'major' });
      log(room, `${player.name} discarded their hand (${count} cards).`);
      return true;
    }
    case 'DISCARD_GEAR': {
      const candidates = selectableGear(player, effect);
      if (candidates.length === 0) { announce(room, 'effect', 'No Matching Gear', `${player.name} had no matching Gear, so the Hex had no effect.`, sourceCard, { importance: 'normal' }); log(room, `${player.name} had no matching Gear to lose.`); return true; }
      if (effect.choice === 'PLAYER' || candidates.length > 1) {
        announce(room, 'prompt', 'Choose Gear to Discard', `${player.name} must choose Gear for ${sourceCard?.publicName || 'the effect'}.`, sourceCard, { importance: 'major' });
        createPrompt(room, { type: 'DISCARD_GEAR', playerId: player.id, message: `${player.name} must discard Gear.`, options: candidates, meta: { effect, after: context.after || 'CONTINUE' } });
        return false;
      }
      discardSpecificGear(room, player, candidates[0].instanceId);
      return true;
    }
    case 'DRAW_LOOT': {
      const drawn = drawMany(room, player, 'LOOT', effect.count || 1);
      announce(room, 'draw', 'Loot Drawn', `${player.name} drew ${drawn} Loot.`, sourceCard, { importance: 'normal' });
      log(room, `${player.name} drew ${drawn} Loot.`);
      return true;
    }
    case 'DRAW_CHAMBER': {
      const drawn = drawMany(room, player, 'CHAMBER', effect.count || 1);
      announce(room, 'draw', 'Chamber Drawn', `${player.name} drew ${drawn} Chamber.`, sourceCard, { importance: 'normal' });
      log(room, `${player.name} drew ${drawn} Chamber.`);
      return true;
    }
    case 'MODIFY_COMBAT_TOTAL': {
      if (!room.combat) return true;
      const amount = effect.amount || 0;
      if (effect.side === 'THREAT') room.combat.threatDelta += amount;
      else room.combat.playerDelta += amount;
      announce(room, 'combat', 'Combat Total Changed', `${sourceCard?.publicName || 'A card'} changed ${effect.side === 'THREAT' ? 'Foe' : 'Player'} side by ${amount > 0 ? '+' : ''}${amount}.`, sourceCard, { importance: 'major' });
      log(room, `${sourceCard?.publicName || 'A card'} changed ${effect.side === 'THREAT' ? 'Foe' : 'Player'} side by ${amount > 0 ? '+' : ''}${amount}.`);
      return true;
    }
    case 'MODIFY_ESCAPE_ROLL': {
      player.temporaryEffects.push({ type: 'MODIFY_ESCAPE_ROLL', amount: effect.amount || 0, duration: effect.duration || 'NEXT_ESCAPE' });
      log(room, `${player.name} has ${effect.amount > 0 ? '+' : ''}${effect.amount || 0} to their next Flee roll.`);
      return true;
    }
    case 'AUTO_ESCAPE': {
      player.temporaryEffects.push({ type: 'AUTO_ESCAPE', duration: 'NEXT_ESCAPE' });
      log(room, `${player.name} has an automatic Flee ready.`);
      return true;
    }
    case 'KNOCKOUT': {
      const lootable = [];
      while (player.hand.length) lootable.push(player.hand.pop());
      while (player.carriedGear.length) lootable.push(player.carriedGear.pop());
      while (player.equippedGear.length) lootable.push(player.equippedGear.pop());
      const shuffled = shuffle(lootable);
      const looters = room.players.filter((p) => p.id !== player.id);
      let taken = 0;
      for (const looter of looters) {
        const card = shuffled.shift();
        if (!card) break;
        markFresh(card, 'BODY_LOOT');
        looter.hand.push(card);
        taken++;
      }
      while (shuffled.length) discardCard(room, shuffled.pop());
      player.dead = true;
      announce(room, 'effect', 'Death / Body Looted', `${player.name} died, kept Glory/Calling/Kin, and ${taken} card${taken === 1 ? '' : 's'} were looted by the table.`, sourceCard, { importance: 'major' });
      log(room, `${player.name} died. Other players looted ${taken} card${taken === 1 ? '' : 's'}; the rest was discarded.`);
      return true;
    }
    case 'TRANSFER_RENOWN': {
      const target = getPlayer(room, context.targetPlayerId);
      if (!target || target.id === player.id) {
        createPrompt(room, { type: 'CHOOSE_PLAYER', playerId: player.id, message: `${sourceCard?.publicName || 'This card'}: choose a player to steal Glory from.`, options: room.players.filter((p) => p.id !== player.id), meta: { effect, sourceCard, after: context.after || 'TO_TRIBUTE_OR_END' } });
        return false;
      }
      if (target.renown <= (effect.minimum ?? 1)) {
        announce(room, 'effect', 'No Stealable Glory', `${target.name} had no stealable Glory.`, sourceCard, { importance: 'normal' });
        log(room, `${target.name} had no stealable Glory.`);
        return true;
      }
      target.renown = Math.max(effect.minimum ?? 1, target.renown - (effect.amount || 1));
      gainGlory(room, player, effect.amount || 1, Boolean(effect.canWin), false);
      announce(room, 'effect', 'Glory Stolen', `${player.name} stole ${effect.amount || 1} Glory from ${target.name}.`, sourceCard, { importance: 'major' });
      log(room, `${player.name} stole ${effect.amount || 1} Glory from ${target.name}.`);
      return true;
    }
    case 'SELL_GEAR_FOR_RENOWN': {
      const options = [...player.hand.filter((c) => c.type === 'GEAR'), ...player.carriedGear, ...player.equippedGear];
      if (!options.length) { log(room, `${player.name} had no Gear to sell.`); return true; }
      createPrompt(room, { type: 'SELL_GEAR', playerId: player.id, message: `${player.name} may sell Gear for Glory.`, options, meta: { effect, after: context.after || 'TO_TRIBUTE_OR_END' } });
      return false;
    }
    case 'ADD_EXTRA_CALLING_SLOT': {
      player.extraCallingSlots = (player.extraCallingSlots || 0) + 1;
      announce(room, 'effect', 'Extra Calling Slot', `${player.name} may keep one extra Calling.`, sourceCard, { importance: 'major' });
      log(room, `${player.name} gained an extra Calling slot.`);
      return true;
    }
    case 'ADD_EXTRA_KIN_SLOT': {
      player.extraKinSlots = (player.extraKinSlots || 0) + 1;
      announce(room, 'effect', 'Extra Kin Slot', `${player.name} may keep one extra Kin.`, sourceCard, { importance: 'major' });
      log(room, `${player.name} gained an extra Kin slot.`);
      return true;
    }
    case 'CHEAT_GEAR': {
      const options = allOwnedCards(player).filter((c) => c.type === 'GEAR');
      if (!options.length) { announce(room, 'effect', 'No Gear to Permit', `${player.name} had no Gear for ${sourceCard?.publicName || 'the permit'}.`, sourceCard, { importance: 'normal' }); return true; }
      createPrompt(room, { type: 'CHEAT_GEAR', playerId: player.id, message: `Choose Gear to legalize with ${sourceCard?.publicName || 'Fine Print Permit'}.`, options, meta: { after: context.after || 'TO_TRIBUTE_OR_END' } });
      return false;
    }
    case 'ADD_FOE_FROM_HAND': {
      if (!room.combat) return true;
      const options = player.hand.filter((c) => c.type === 'THREAT');
      if (!options.length) { announce(room, 'effect', 'No Foe in Hand', `${player.name} had no Foe to add.`, sourceCard, { importance: 'normal' }); return true; }
      createPrompt(room, { type: 'ADD_FOE_FROM_HAND', playerId: player.id, message: `Choose a Foe from hand to add to combat.`, options, meta: { after: context.after || 'CONTINUE' } });
      return false;
    }
    case 'ADD_MATCHING_FOE': {
      if (!room.combat || !room.combat.threats.length) return true;
      const mate = cloneFoeForMate(room.combat.threats[0]);
      room.combat.threats.push(mate);
      resetCombatPasses(room);
      announce(room, 'combat', 'Matching Foe Appears', `${mate.publicName} joins the combat with matching modifiers.`, mate, { importance: 'major' });
      log(room, `${mate.publicName} joined the combat.`);
      return true;
    }
    case 'REMOVE_FOE_LOOT_ONLY': {
      if (!room.combat || !room.combat.threats.length) return true;
      const active = getPlayer(room, room.combat.activePlayerId);
      const foe = removeFoeAt(room, 0);
      const loot = finalFoeLoot(foe);
      const split = drawLootWithBackupDeal(room, active, room.combat.helperPlayerId ? getPlayer(room, room.combat.helperPlayerId) : null, loot);
      announce(room, 'combat', 'Foe Removed', `${sourceCard?.publicName || 'A card'} removed ${foe.publicName}. No Glory. ${loot} Loot was drawn.`, sourceCard, { importance: 'major' });
      log(room, `${foe.publicName} was removed without Glory. Loot split active ${split.activeGets}, helper ${split.helperGets}.`);
      if (!room.combat.threats.length) { cleanupCombatToDiscard(room); moveToTributeOrEnd(room); }
      else resetCombatPasses(room);
      return true;
    }
    case 'OUT_TO_LUNCH': {
      if (!room.combat) return true;
      const active = getPlayer(room, room.combat.activePlayerId);
      cleanupCombatToDiscard(room);
      drawMany(room, active, 'LOOT', 2);
      announce(room, 'combat', 'Lunch Break', `${active.name} drew 2 Loot. No Glory was gained.`, sourceCard, { importance: 'major' });
      moveToTributeOrEnd(room);
      return true;
    }
    case 'FRIENDSHIP_END': {
      if (!room.combat) return true;
      const active = getPlayer(room, room.combat.activePlayerId);
      cleanupCombatToDiscard(room);
      drawMany(room, active, 'CHAMBER', 1);
      announce(room, 'combat', 'Foes Leave Peacefully', `${active.name} drew one hidden Chamber card. No Glory or Loot was gained.`, sourceCard, { importance: 'major' });
      moveToTributeOrEnd(room);
      return true;
    }
    case 'ILLUSION_SWAP': {
      if (!room.combat) return true;
      const options = player.hand.filter((c) => c.type === 'THREAT');
      if (!options.length) { announce(room, 'effect', 'No Replacement Foe', `${player.name} had no Foe to swap in.`, sourceCard, { importance: 'normal' }); return true; }
      createPrompt(room, { type: 'ILLUSION_SWAP', playerId: player.id, message: `Choose a Foe from hand to replace the current Foe.`, options, meta: { after: context.after || 'CONTINUE' } });
      return false;
    }
    case 'WAND_DOWSING': {
      const options = [...room.chamberDiscard, ...room.lootDiscard];
      if (!options.length) { announce(room, 'effect', 'No Discards', `There were no discard cards to recover.`, sourceCard, { importance: 'normal' }); return true; }
      createPrompt(room, { type: 'CHOOSE_DISCARD_CARD', playerId: player.id, message: `Choose any card from discard to take into hand.`, options, meta: { after: context.after || 'TO_TRIBUTE_OR_END' } });
      return false;
    }
    case 'DIVINE_INTERVENTION': {
      let winners = [];
      for (const p of room.players) {
        if (hasRole(p, 'CLERIC_EQUIV')) {
          gainGlory(room, p, 1, true, false);
          if (p.renown >= 10) winners.push(p);
        }
      }
      announce(room, 'effect', 'Divine Scheduling Conflict', winners.length ? `${winners.map((p) => p.name).join(', ')} reached 10 Glory!` : `All Gravefriends gained 1 Glory.`, sourceCard, { importance: 'major' });
      if (winners.length) { room.phase = 'GAME_OVER'; room.status = 'GAME_OVER'; room.winnerId = winners[0].id; }
      return true;
    }
    case 'DOPPELGANGER': {
      if (!room.combat) return true;
      if (room.combat.helperPlayerId) { announce(room, 'effect', 'Doppelgoblin Failed', `Doppelgoblin only works if you have no Backup.`, sourceCard, { importance: 'normal' }); return true; }
      const fighter = getPlayer(room, room.combat.activePlayerId);
      const amount = playerCombatTotal(room, fighter);
      room.combat.playerDelta += amount;
      announce(room, 'combat', 'Doppelgoblin Joins', `${fighter.name}'s current combat strength was added again: +${amount}.`, sourceCard, { importance: 'major' });
      resetCombatPasses(room);
      return true;
    }
    case 'FORCE_REROLL_FLEE': {
      if (!room.escape?.lastRoll) return true;
      room.escape.lastRoll.forceReroll = true;
      announce(room, 'roll', 'Reroll Required', `${player.name} played ${sourceCard?.publicName}. The current Flee roll must be rolled again.`, sourceCard, { importance: 'major' });
      return true;
    }

    case 'NO_EFFECT': {
      announce(room, 'effect', 'No Effect', `${sourceCard?.publicName || 'The effect'} had no further effect.`, sourceCard, { importance: 'normal' });
      return true;
    }
    case 'MULTI_EFFECT': {
      let complete = true;
      for (const inner of effect.effects || []) {
        const ok = applyEffect(room, player, inner, sourceCard, context);
        if (!ok) complete = false;
      }
      return complete;
    }
    case 'CHANGE_ROLE': {
      if (!player.role) { announce(room, 'effect', 'No Effect', `${player.name} had no Calling to change.`, sourceCard, { importance: 'normal' }); return true; }
      discardCard(room, player.role); player.role = null;
      const revealed = [];
      let found = null;
      while (!found) {
        const c = draw(room, 'CHAMBER');
        if (!c) break;
        revealed.push(c);
        if (c.type === 'ROLE') found = c;
      }
      for (const c of revealed) {
        if (c === found) continue;
        discardCard(room, c);
      }
      if (found) { player.role = found; announce(room, 'effect', 'Calling Changed', `${player.name} is now ${found.publicName}.`, found, { importance: 'major' }); }
      else announce(room, 'effect', 'No Calling Found', `${player.name} lost their Calling and no replacement appeared.`, sourceCard, { importance: 'major' });
      return true;
    }
    case 'CHANGE_ORIGIN': {
      if (!player.origin) { announce(room, 'effect', 'No Effect', `${player.name} had no Kin to change.`, sourceCard, { importance: 'normal' }); return true; }
      discardCard(room, player.origin); player.origin = null;
      const revealed = [];
      let found = null;
      while (!found) {
        const c = draw(room, 'CHAMBER');
        if (!c) break;
        revealed.push(c);
        if (c.type === 'ORIGIN') found = c;
      }
      for (const c of revealed) {
        if (c === found) continue;
        discardCard(room, c);
      }
      if (found) { player.origin = found; announce(room, 'effect', 'Kin Changed', `${player.name} is now ${found.publicName}.`, found, { importance: 'major' }); }
      else announce(room, 'effect', 'No Kin Found', `${player.name} lost their Kin and no replacement appeared.`, sourceCard, { importance: 'major' });
      return true;
    }
    case 'NEXT_COMBAT_DELTA': {
      player.temporaryEffects.push({ type: 'NEXT_COMBAT_DELTA', amount: effect.amount || 0, duration: 'NEXT_COMBAT' });
      announce(room, 'effect', 'Next Combat Penalty', `${player.name} has ${effect.amount} in their next combat.`, sourceCard, { importance: 'normal' });
      return true;
    }
    case 'ADD_DIE_PENALTY': {
      player.temporaryEffects.push({ type: 'DIE_ROLL_PENALTY', amount: effect.amount || -1 });
      announce(room, 'effect', 'Die Roll Penalty', `${player.name} has ${effect.amount || -1} to die rolls until the penalty is removed.`, sourceCard, { importance: 'normal' });
      return true;
    }
    case 'ONLY_BODY_GEAR_NEXT_COMBAT': {
      player.temporaryEffects.push({ type: 'ONLY_BODY_GEAR_NEXT_COMBAT', duration: 'NEXT_COMBAT' });
      announce(room, 'effect', 'Mirror Curse', `${player.name}'s next combat only counts Body Gear bonuses.`, sourceCard, { importance: 'normal' });
      return true;
    }
    case 'DISCARD_ALL_HEAVY_GEAR': {
      const heavy = [...player.carriedGear, ...player.equippedGear].filter((g) => g.isHeavy);
      for (const g of heavy) discardSpecificGear(room, player, g.instanceId);
      announce(room, 'effect', 'Heavy Gear Dropped', `${player.name} discarded ${heavy.length} Heavy Gear.`, sourceCard, { importance: 'major' });
      return true;
    }
    case 'DISCARD_HAND_AND_GEAR': {
      const count = player.hand.length + player.carriedGear.length + player.equippedGear.length;
      while (player.hand.length) discardCard(room, player.hand.pop());
      while (player.carriedGear.length) discardCard(room, player.carriedGear.pop());
      while (player.equippedGear.length) discardCard(room, player.equippedGear.pop());
      announce(room, 'effect', 'Everything Lost', `${player.name} discarded hand and all Gear (${count} cards).`, sourceCard, { importance: 'major' });
      return true;
    }
    case 'DISCARD_ALL_IDENTITIES': {
      if (player.role) { discardCard(room, player.role); player.role = null; }
      if (player.origin) { discardCard(room, player.origin); player.origin = null; }
      while ((player.extraRoles || []).length) discardCard(room, player.extraRoles.pop());
      while ((player.extraOrigins || []).length) discardCard(room, player.extraOrigins.pop());
      announce(room, 'effect', 'Ordinary Again', `${player.name} lost all Callings and Kin.`, sourceCard, { importance: 'major' });
      return true;
    }
    case 'CHOOSE_DISCARD_HAND_OR_LOSE_GLORY': {
      createPrompt(room, { type: 'CHOOSE_BAD_NEWS_OPTION', playerId: player.id, message: `Choose Bad News: discard your hand or lose ${effect.amount || 2} Glory.`, options: [], meta: { option: 'HAND_OR_GLORY', amount: effect.amount || 2, after: context.after || 'CONTINUE' } });
      return false;
    }
    case 'ROLL_DISCARD_OWNED': {
      const raw = rollD6();
      const count = Math.min(raw, allOwnedCards(player).length);
      if (!count) { announce(room, 'roll', 'Bad News Roll', `${player.name} rolled ${raw}, but had nothing to lose.`, sourceCard, { importance: 'major' }); return true; }
      createPrompt(room, { type: 'DISCARD_OWNED_CARDS', playerId: player.id, message: `${player.name} rolled ${raw}. Choose ${count} card${count === 1 ? '' : 's'} from hand/Gear to discard.`, options: allOwnedCards(player), meta: { count, after: context.after || 'CONTINUE' } });
      announce(room, 'roll', 'Bad News Roll', `${player.name} rolled ${raw} and must discard ${count} card${count === 1 ? '' : 's'}.`, sourceCard, { importance: 'major' });
      return false;
    }
    case 'ROLL_LOSE_GLORY': {
      const raw = rollD6();
      const loss = raw <= 2 ? raw : raw;
      const before = player.renown;
      player.renown = Math.max(1, player.renown - loss);
      announce(room, 'roll', 'Bad News Roll', `${player.name} rolled ${raw} and Glory changed ${before} → ${player.renown}.`, sourceCard, { importance: 'major' });
      return true;
    }
    case 'LOSE_HEAD_OR_GLORY': {
      const heads = player.equippedGear.filter((g) => g.slot === 'HEAD');
      if (heads.length) { discardSpecificGear(room, player, heads[0].instanceId); announce(room, 'effect', 'Head Gear Lost', `${player.name} lost ${heads[0].publicName}.`, heads[0], { importance: 'major' }); }
      else { const before = player.renown; player.renown = Math.max(1, player.renown - 1); announce(room, 'effect', 'No Head Gear', `${player.name} had no Head Gear, so Glory changed ${before} → ${player.renown}.`, sourceCard, { importance: 'major' }); }
      return true;
    }
    case 'LOSE_ALL_ROLES_OR_GLORY': {
      if (player.role || (player.extraRoles || []).length) { if (player.role) { discardCard(room, player.role); player.role = null; } while ((player.extraRoles || []).length) discardCard(room, player.extraRoles.pop()); announce(room, 'effect', 'Calling Lost', `${player.name} lost all Callings.`, sourceCard, { importance: 'major' }); }
      else { const before = player.renown; player.renown = Math.max(1, player.renown - (effect.amount || 3)); announce(room, 'effect', 'No Calling', `${player.name} lost Glory ${before} → ${player.renown}.`, sourceCard, { importance: 'major' }); }
      return true;
    }
    case 'SET_TO_LOWEST_GLORY': {
      const min = Math.min(...room.players.map((p) => p.renown));
      const before = player.renown; player.renown = min;
      announce(room, 'effect', 'Glory Setback', `${player.name}'s Glory changed ${before} → ${player.renown}.`, sourceCard, { importance: 'major' });
      return true;
    }
    case 'LAWYERS_BAD_NEWS': {
      const gear = [...player.carriedGear, ...player.equippedGear][0];
      if (gear) discardSpecificGear(room, player, gear.instanceId);
      for (const other of room.players.filter((p) => p.id !== player.id)) {
        if (player.hand.length) { const card = player.hand.splice(Math.floor(Math.random()*player.hand.length),1)[0]; markFresh(card, 'LAWYERS'); other.hand.push(card); }
      }
      announce(room, 'effect', 'Legal Trouble', `${player.name} lost Gear and other players drew from their hand.`, sourceCard, { importance: 'major' });
      return true;
    }
    case 'ADJACENT_TAKE_GEAR': {
      const publicGear = [...player.carriedGear, ...player.equippedGear];
      const others = room.players.filter((p) => p.id !== player.id);
      let moved = 0;
      for (const other of others.slice(0, effect.count || 2)) {
        const gear = publicGear.shift();
        if (!gear) break;
        discardSpecificGear(room, player, gear.instanceId);
        markFresh(gear, 'TAKEN_GEAR');
        other.hand.push(gear);
        moved++;
      }
      announce(room, 'effect', 'Gear Taken', `${moved} Gear card${moved === 1 ? '' : 's'} were taken from ${player.name}.`, sourceCard, { importance: 'major' });
      return true;
    }
    case 'HIGHEST_TAKE_GEAR': {
      const max = Math.max(...room.players.map((p) => p.renown));
      const takers = room.players.filter((p) => p.id !== player.id && p.renown === max);
      let moved = 0;
      for (const taker of takers) {
        const gear = [...player.carriedGear, ...player.equippedGear][0];
        if (!gear) break;
        discardSpecificGear(room, player, gear.instanceId);
        markFresh(gear, 'TAKEN_GEAR');
        taker.hand.push(gear);
        moved++;
      }
      announce(room, 'effect', 'Highest Took Gear', `${moved} Gear card${moved === 1 ? '' : 's'} moved from ${player.name} to the highest-Glory player(s).`, sourceCard, { importance: 'major' });
      return true;
    }
    case 'DISCARD_GEAR_VALUE_OR_ALL': {
      const gear = [...player.carriedGear, ...player.equippedGear].sort((a,b)=>gearJunkValue(b)-gearJunkValue(a));
      let total = 0, count = 0;
      for (const g of gear) { if (total >= (effect.value || 1000)) break; total += gearJunkValue(g); discardSpecificGear(room, player, g.instanceId); count++; }
      announce(room, 'effect', 'Gear Payment', `${player.name} discarded ${count} Gear worth ${total} Junk.`, sourceCard, { importance: 'major' });
      return true;
    }
    case 'INCOME_TAX': {
      for (const p of room.players) {
        const gear = [...p.carriedGear, ...p.equippedGear][0];
        if (gear) discardSpecificGear(room, p, gear.instanceId);
        else p.renown = Math.max(1, p.renown - 1);
      }
      announce(room, 'effect', 'Dungeon Tax Paid', `Each player paid one Gear or lost 1 Glory.`, sourceCard, { importance: 'major' });
      return true;
    }
    case 'YUPPIE_WATER': {
      if (!room.combat) return true;
      const active = getPlayer(room, room.combat.activePlayerId);
      const helper = room.combat.helperPlayerId ? getPlayer(room, room.combat.helperPlayerId) : null;
      let bonus = 0;
      if (hasOrigin(active, 'ELF_EQUIV')) bonus += 2;
      if (helper && hasOrigin(helper, 'ELF_EQUIV')) bonus += 2;
      room.combat.playerDelta += bonus;
      announce(room, 'combat', 'Brightkin Refreshed', `${sourceCard?.publicName || 'A card'} gave the player side +${bonus}.`, sourceCard, { importance: 'major' });
      resetCombatPasses(room);
      return true;
    }
    case 'GAIN_IF_HIGHEST_OR_TIED': {
      const max = Math.max(...room.players.map((p) => p.renown));
      if (player.renown >= max) gainGlory(room, player, effect.amount || 1, false, false);
      else announce(room, 'effect', 'No Effect', `${player.name} was not tied for highest Glory.`, sourceCard, { importance: 'normal' });
      return true;
    }
    case 'KILL_HIRELING_GAIN_GLORY': {
      const hireling = [...player.equippedGear, ...player.carriedGear].find((g) => g.id === 'GEAR_HIRELING');
      if (hireling) { discardSpecificGear(room, player, hireling.instanceId); gainGlory(room, player, 1, false, false); announce(room, 'effect', 'Helper Dismissed', `${player.name} discarded Little Helper and gained 1 Glory.`, sourceCard, { importance: 'major' }); }
      else announce(room, 'effect', 'No Helper', `${player.name} had no Little Helper to dismiss.`, sourceCard, { importance: 'normal' });
      return true;
    }
    case 'CANCEL_ACTIVE_HEX': {
      announce(room, 'effect', 'Wish Held', `${sourceCard?.publicName || 'Wish Ring'} is ready to cancel Hexes when reaction timing is open.`, sourceCard, { importance: 'normal' });
      return true;
    }
    case 'TRANSFER_COMBAT': {
      if (!room.combat) return true;
      const target = getPlayer(room, context.targetPlayerId);
      if (!target || target.id === room.combat.activePlayerId) { announce(room, 'effect', 'No Transfer', `No valid combat transfer target was chosen.`, sourceCard, { importance: 'normal' }); return true; }
      room.combat.activePlayerId = target.id;
      resetCombatPasses(room);
      announce(room, 'combat', 'Combat Transferred', `${target.name} is now fighting the Foe side.`, sourceCard, { importance: 'major' });
      return true;
    }
    case 'MANUAL_PROMPT': {
      createPrompt(room, { type: 'MANUAL', playerId: context.playerId || player.id, message: `${sourceCard?.publicName || 'This card'} needs table resolution.`, options: [], meta: { after: context.after || 'CONTINUE' } });
      return false;
    }
    default: {
      log(room, `${sourceCard?.publicName || 'A card'} has an effect not automated yet.`);
      return true;
    }
  }
}

function drawMany(room, player, deck, count, markAsFresh = true) {
  let drawn = 0;
  for (let i = 0; i < count; i++) {
    const c = draw(room, deck);
    if (c) {
      if (markAsFresh) markFresh(c, deck);
      player.hand.push(c);
      drawn++;
      movement(room, deck === 'CHAMBER' ? 'CHAMBER_DECK' : 'LOOT_DECK', 'PLAYER_HAND', `${deck === 'CHAMBER' ? 'Chamber' : 'Loot'} Deck → Hand`, `${player.name} drew ${c.publicName}.`, c);
    }
  }
  return drawn;
}

function gainGlory(room, player, amount, canWin, fromCombat) {
  const before = player.renown;
  let next = before + amount;
  if (!fromCombat && !canWin && next >= 10) next = 9;
  player.renown = Math.max(1, Math.min(10, next));
  const gained = player.renown - before;
  if (gained > 0) log(room, `${player.name} gained ${gained} Glory.`);
  else if (!fromCombat && !canWin && before >= 9) log(room, `${player.name} cannot gain the final Glory outside combat.`);
}

function selectableGear(player, effect) {
  let zones = [];
  if (effect.target === 'EQUIPPED_GEAR') zones = player.equippedGear;
  else if (effect.target === 'CARRIED_GEAR') zones = player.carriedGear;
  else zones = [...player.equippedGear, ...player.carriedGear];
  let candidates = zones.filter((g) => {
    if (!effect.slot || effect.slot === 'ANY') return true;
    return g.slot === effect.slot;
  });
  if (effect.selector === 'HEAVY') candidates = candidates.filter((g) => g.isHeavy);
  if (effect.selector === 'HIGHEST_COMBAT_BONUS' && candidates.length) {
    const max = Math.max(...candidates.map((g) => Number(g.combatBonus || 0)));
    candidates = candidates.filter((g) => Number(g.combatBonus || 0) === max);
  }
  return candidates;
}

function discardSpecificGear(room, player, gearId) {
  let idx = player.equippedGear.findIndex((g) => g.instanceId === gearId);
  if (idx >= 0) {
    const [card] = player.equippedGear.splice(idx, 1);
    discardCard(room, card);
    log(room, `${player.name} discarded equipped Gear: ${card.publicName}.`);
    return true;
  }
  idx = player.carriedGear.findIndex((g) => g.instanceId === gearId);
  if (idx >= 0) {
    const [card] = player.carriedGear.splice(idx, 1);
    discardCard(room, card);
    log(room, `${player.name} discarded carried Gear: ${card.publicName}.`);
    return true;
  }
  return false;
}

function createPrompt(room, prompt) {
  room.pendingPrompt = { ...prompt, id: instanceId() };
}

function continueAfterPrompt(room, after) {
  room.pendingPrompt = null;
  if (after === 'TO_NO_THREAT_CHOICE') room.phase = 'NO_THREAT_CHOICE';
  else if (after === 'CONTINUE_ESCAPE') continueFlee(room);
  else if (after === 'TO_TRIBUTE_OR_END') moveToTributeOrEnd(room);
}

function legalActions(room, player) {
  const actions = [];
  if (room.status === 'LOBBY') {
    if (room.players[0]?.id === player.id && room.players.length === 3) actions.push('START_GAME');
    return actions;
  }
  if (room.pendingPrompt?.playerId === player.id) actions.push('RESOLVE_PROMPT');
  if (room.phase === 'ROLL_FOR_FIRST' && room.firstRoll?.eligible?.includes(player.id) && !room.firstRoll.rolls?.[player.id]) actions.push('ROLL_FIRST');
  if (room.phase === 'START_TURN' && activeId(room) === player.id) actions.push('OPEN_CHAMBER');
  if (canActOutsideCombat(room) && activeId(room) === player.id) actions.push('PLAY_TABLE_CARDS');
  if (room.phase === 'NO_THREAT_CHOICE' && activeId(room) === player.id) actions.push('SEARCH_ROOM', 'START_TROUBLE');
  if (room.phase === 'END_TURN' && activeId(room) === player.id) actions.push('END_TURN');
  if (room.phase === 'TRIBUTE' && activeId(room) === player.id) actions.push('GIVE_TRIBUTE');
  if (room.phase === 'COMBAT') actions.push('COMBAT_ACTIONS', 'PASS_COMBAT');
  if (room.phase === 'ESCAPE' && room.escape?.currentPlayerId === player.id) actions.push('ROLL_ESCAPE');
  return actions;
}


function rollForFirst(room, player) {
  if (!room.firstRoll) room.firstRoll = { round: 1, eligible: room.players.map((p) => p.id), rolls: {}, previous: [], latest: null, winnerId: null };
  if (!room.firstRoll.eligible.includes(player.id)) return `${player.name} is not part of this tie-break roll.`;
  if (room.firstRoll.rolls[player.id]) return `${player.name} has already rolled.`;
  const raw = rollD6();
  room.firstRoll.rolls[player.id] = raw;
  room.firstRoll.latest = { playerId: player.id, playerName: player.name, raw, at: Date.now() };
  announce(room, 'roll', 'Opening Roll', `${player.name} rolled ${raw}.`, null, { importance: 'normal' });
  log(room, `${player.name} rolled ${raw} to see who goes first.`);
  resolveFirstRollIfReady(room);
  return null;
}

function resolveFirstRollIfReady(room) {
  const first = room.firstRoll;
  if (!first) return;
  const rolledIds = Object.keys(first.rolls || {});
  if (rolledIds.length < first.eligible.length) return;
  const max = Math.max(...first.eligible.map((id) => first.rolls[id] || 0));
  const tied = first.eligible.filter((id) => first.rolls[id] === max);
  first.previous.push({ round: first.round, rolls: { ...first.rolls }, tied });
  if (tied.length > 1) {
    first.round += 1;
    first.eligible = tied;
    first.rolls = {};
    first.latest = null;
    announce(room, 'roll', 'Opening Roll Tie', `${tied.map((id) => getPlayer(room, id)?.name || 'Player').join(', ')} tied for first. They roll again.`, null, { importance: 'major' });
    log(room, `Tie for first. ${tied.map((id) => getPlayer(room, id)?.name || 'Player').join(', ')} roll again.`);
    return;
  }
  const winnerId = tied[0];
  first.winnerId = winnerId;
  room.activePlayerIndex = Math.max(0, room.players.findIndex((p) => p.id === winnerId));
  room.turnNumber = 1;
  room.phase = 'START_TURN';
  announce(room, 'roll', 'Opening Roll Winner', `${getPlayer(room, winnerId)?.name || 'Someone'} goes first.`, null, { importance: 'major' });
  log(room, `${getPlayer(room, winnerId)?.name || 'Someone'} goes first.`);
}

function moveToTributeOrEnd(room) {
  const active = getActive(room);
  if (!active) return;
  if (active.hand.length > handLimit(active)) room.phase = 'TRIBUTE';
  else room.phase = 'END_TURN';
}

function endTurn(room) {
  room.revealCard = null;
  room.combat = null;
  room.escape = null;
  room.pendingPrompt = null;
  room.tableNotice = null;
  room.activePlayerIndex = (room.activePlayerIndex + 1) % room.players.length;
  room.turnNumber += 1;
  room.phase = 'START_TURN';
  const next = getActive(room);
  announce(room, 'turn', 'Next Turn', `${next.name}'s turn begins.`, null, { importance: 'normal' });
  log(room, `${next.name}'s turn begins.`);
}

function setupGame(room) {
  room.status = 'GAME';
  room.phase = 'ROLL_FOR_FIRST';
  room.turnNumber = 0;
  room.activePlayerIndex = 0;
  room.chamberDeck = expandDeck(chamberCards);
  room.lootDeck = expandDeck(lootCards);
  room.chamberDiscard = [];
  room.lootDiscard = [];
  room.revealCard = null;
  room.combat = null;
  room.escape = null;
  room.pendingPrompt = null;
  room.tableNotice = null;
  room.announcement = null;
  room.winnerId = null;
  room.firstRoll = { round: 1, eligible: room.players.map((p) => p.id), rolls: {}, previous: [], latest: null, winnerId: null };
  for (const p of room.players) {
    p.renown = 1;
    p.hand = [];
    p.role = null;
    p.origin = null;
    p.carriedGear = [];
    p.equippedGear = [];
    p.temporaryEffects = [];
    p.usedHalfstepSale = false;
    p.extraCallingSlots = 0;
    p.extraKinSlots = 0;
    p.dead = false;
    p.extraRoles = [];
    p.extraOrigins = [];
    drawMany(room, p, 'CHAMBER', 4, false);
    drawMany(room, p, 'LOOT', 4, false);
  }
  announce(room, 'roll', 'Opening Roll', 'Each goblin draws 4 Chamber and 4 Loot cards. Roll a d6 to see who opens the first Chamber.', null, { importance: 'major' });
  log(room, `Game started. Each goblin drew 4 Chamber and 4 Loot cards. Roll to see who goes first.`);
}

function resolveHex(room, card, targetPlayer, after = 'TO_NO_THREAT_CHOICE') {
  log(room, `Hex revealed: ${card.publicName}.`);
  announce(room, 'hex', 'Hex Revealed', `${card.publicName} affects ${targetPlayer.name}.`, card, { importance: 'major' });
  if (after === 'TO_NO_THREAT_CHOICE' && targetPlayer.equippedGear.some((g) => g.id === 'GEAR_SANDALS_PROTECTION')) {
    announce(room, 'hex', 'Hex Blocked', `${targetPlayer.name}'s Sandals of Protection blocked ${card.publicName}.`, card, { importance: 'major' });
    discardCard(room, card);
    room.phase = 'NO_THREAT_CHOICE';
    return;
  }
  let complete = true;
  for (const effect of card.effects || []) {
    const ok = applyEffect(room, targetPlayer, effect, card, { after, revealedHex: true });
    if (!ok) complete = false;
  }
  discardCard(room, card);
  if (complete) {
    if (!room.tableNotice || room.tableNotice.kind === 'hex') {
      announce(room, 'hex', 'Hex Resolved', `${card.publicName} finished resolving for ${targetPlayer.name}.`, card, { importance: 'normal' });
    }
    room.phase = after === 'TO_NO_THREAT_CHOICE' ? 'NO_THREAT_CHOICE' : room.phase;
  } else {
    announce(room, 'prompt', 'Hex Needs a Choice', `${targetPlayer.name} must choose how ${card.publicName} resolves.`, card, { importance: 'major' });
  }
}

function canFoePursuePlayer(threat, player) {
  for (const rule of threat.willNotPursue || []) {
    if (rule.type === 'NEVER') return false;
    if (rule.type === 'RENOWN_BELOW' && player.renown < rule.value) return false;
  }
  return true;
}


function totalCombatLoot(room) {
  if (!room.combat) return 0;
  return room.combat.threats.reduce((s, t) => s + finalFoeLoot(t), 0);
}

function describeBackupDeal(deal, helperName = 'helper') {
  if (!deal) return 'No Backup deal locked.';
  const n = Number(deal.lootCount || 0);
  if (n <= 0) return `${helperName} helps for free.`;
  return `${helperName} gets first ${n} Loot card${n === 1 ? '' : 's'} if the Foe is defeated.`;
}

function drawLootWithBackupDeal(room, active, helper, lootCount) {
  const cards = [];
  for (let i = 0; i < lootCount; i++) {
    const c = draw(room, 'LOOT');
    if (c) cards.push(c);
  }
  let helperGets = 0;
  let activeGets = 0;
  if (helper && room.combat?.backupDeal) {
    const share = Math.max(0, Math.min(cards.length, Number(room.combat.backupDeal.lootCount || 0)));
    const helperCards = cards.splice(0, share);
    helperCards.forEach((c) => markFresh(c, 'LOOT'));
    helper.hand.push(...helperCards);
    if (helperCards.length) movement(room, 'LOOT_DECK', 'PLAYER_HAND', 'Loot Deck → Helper Hand', `${helper.name} received ${helperCards.length} Loot from the Backup deal.`, helperCards[0]);
    helperGets = helperCards.length;
  }
  cards.forEach((c) => markFresh(c, 'LOOT'));
  if (cards.length) movement(room, 'LOOT_DECK', 'PLAYER_HAND', 'Loot Deck → Hand', `${active.name} received ${cards.length} Loot.`, cards[0]);
  active.hand.push(...cards);
  activeGets = cards.length;
  return { activeGets, helperGets };
}

function resolveCombat(room) {
  const totals = combatTotals(room);
  const active = getPlayer(room, room.combat.activePlayerId);
  const helper = room.combat.helperPlayerId ? getPlayer(room, room.combat.helperPlayerId) : null;
  if (totals.wins) {
    const renown = room.combat.threats.reduce((s, t) => s + (t.renownReward || 0), 0);
    const loot = totalCombatLoot(room);
    gainGlory(room, active, renown, true, true);
    const split = drawLootWithBackupDeal(room, active, helper, loot);
    const helperLine = helper
      ? ` Backup deal: ${helper.name} gets ${split.helperGets} Loot, ${active.name} gets ${split.activeGets}.`
      : '';
    announce(room, 'combat', 'Combat Won', `${active.name} defeated the Foe side. +${renown} Glory, ${loot} total Loot.${helperLine}`, room.combat.threats[0], { importance: 'major' });
    log(room, `${active.name} defeated the Foe side. Loot split: ${active.name} ${split.activeGets}${helper ? `, ${helper.name} ${split.helperGets}` : ''}.`);
    if (hasOrigin(helper, 'ELF_EQUIV')) gainGlory(room, helper, room.combat.threats.length, false, false);
    cleanupCombatToDiscard(room);
    if (active.renown >= 10) {
      room.phase = 'GAME_OVER';
      room.status = 'GAME_OVER';
      room.winnerId = active.id;
      announce(room, 'game', 'Game Won', `${active.name} wins by combat!`, null, { importance: 'major' });
      log(room, `${active.name} wins by combat!`);
    } else moveToTributeOrEnd(room);
  } else {
    announce(room, 'combat', 'Combat Lost', `${active.name} could not beat the Foe side. Flee begins.`, room.combat.threats[0], { importance: 'major' });
    log(room, `${active.name} failed to defeat the Foe side. Flee begins.`);
    const possibleRunners = [active, helper].filter(Boolean);
    const queue = [];
    for (const threat of room.combat.threats) {
      for (const p of possibleRunners) {
        if (canFoePursuePlayer(threat, p)) queue.push({ playerId: p.id, threat: clone(threat) });
        else log(room, `${threat.publicName} will not pursue ${p.name}.`);
      }
    }
    if (queue.length === 0) {
      announce(room, 'combat', 'No Flee Needed', 'No Foe pursued the losing side. Combat ends.', null, { importance: 'normal' });
      cleanupCombatToDiscard(room);
      moveToTributeOrEnd(room);
    } else {
      room.phase = 'ESCAPE';
      room.escape = { queue, runners: queue.map((q) => q.playerId), index: 0, currentPlayerId: queue[0].playerId, threat: queue[0].threat, lastRoll: null };
    }
  }
}

function cleanupCombatToDiscard(room) {
  if (!room.combat) return;
  for (const threat of room.combat.threats) {
    for (const m of threat.modifiers || []) discardCard(room, m);
    discardCard(room, threat);
  }
  for (const trick of room.combat.playedTricks || []) discardCard(room, trick);
  const active = getActive(room);
  if (active) active.temporaryEffects = active.temporaryEffects.filter((e) => !['ONLY_BODY_GEAR_NEXT_COMBAT'].includes(e.type));
  room.combat = null;
  room.escape = null;
}

function continueFlee(room) {
  if (!room.escape) return;
  room.escape.index += 1;
  if (room.escape.index >= room.escape.runners.length) {
    announce(room, 'flee', 'Flee Complete', 'All Flee rolls are resolved. Combat is over.', null, { importance: 'normal' });
    cleanupCombatToDiscard(room);
    moveToTributeOrEnd(room);
  } else {
    const current = currentEscapeEntry(room);
    room.escape.currentPlayerId = current?.playerId || null;
    room.escape.threat = current?.threat || null;
    room.escape.lastRoll = null;
  }
}

function rollFlee(room, player) {
  const entry = currentEscapeEntry(room);
  const currentThreat = entry?.threat || room.escape?.threat;
  if (player.temporaryEffects.some((e) => e.type === 'AUTO_ESCAPE')) {
    player.temporaryEffects = player.temporaryEffects.filter((e) => e.type !== 'AUTO_ESCAPE');
    announce(room, 'roll', 'Automatic Flee', `${player.name} automatically escaped ${currentThreat?.publicName || 'the Foe'}.`, currentThreat, { importance: 'major' });
    log(room, `${player.name} automatically escaped.`);
    continueFlee(room);
    return;
  }
  const raw = rollD6();
  const bonus = gearFleeBonus(player) + originFleeBonus(player) + temporaryFleeBonus(player);
  const total = raw + bonus;
  player.temporaryEffects = player.temporaryEffects.filter((e) => e.duration !== 'NEXT_ESCAPE');
  room.escape.lastRoll = { raw, bonus, total };
  announce(room, 'roll', 'Flee Roll', `${player.name} rolled ${raw}${bonus ? ` ${bonus > 0 ? '+' : ''}${bonus}` : ''} = ${total}.`, currentThreat, { importance: 'major' });
  log(room, `${player.name} rolled Flee: ${raw}${bonus ? ` ${bonus > 0 ? '+' : ''}${bonus}` : ''} = ${total}.`);
  if (total >= 5) {
    announce(room, 'roll', 'Flee Succeeded', `${player.name} escaped ${currentThreat?.publicName || 'the Foe'}.`, currentThreat, { importance: 'major' });
    log(room, `${player.name} escaped.`);
    continueFlee(room);
  } else {
    const threat = currentThreat;
    announce(room, 'roll', 'Flee Failed', `${player.name} failed to escape ${threat.publicName}. Bad News resolves.`, threat, { importance: 'major' });
    log(room, `${player.name} failed to escape ${threat.publicName}.`);
    const ok = applyEffect(room, player, threat.consequence, threat, { after: 'CONTINUE_ESCAPE' });
    if (ok) continueFlee(room);
  }
}

function allCombatPlayersPassed(room) {
  return room.players.every((p) => room.combat.passes[p.id]);
}

function makeRoom(hostName, socket) {
  let code;
  do { code = roomCode(); } while (rooms.has(code));
  const host = createPlayer(hostName, socket);
  const room = {
    code,
    status: 'LOBBY',
    phase: 'LOBBY',
    turnNumber: 0,
    players: [host],
    activePlayerIndex: 0,
    chamberDeck: [], lootDeck: [], chamberDiscard: [], lootDiscard: [],
    revealCard: null,
    combat: null,
    escape: null,
    pendingPrompt: null,
    winnerId: null,
    announcement: null,
    log: [],
    chat: []
  };
  rooms.set(code, room);
  socket.data.roomCode = code;
  socket.data.playerId = host.id;
  log(room, `${host.name} created the room.`);
  socket.emit('session', { roomCode: code, playerId: host.id, playerName: host.name });
  broadcast(room);
  return room;
}

function attachSocketToPlayer(room, player, socket) {
  player.socketId = socket.id;
  player.connected = true;
  socket.data.roomCode = room.code;
  socket.data.playerId = player.id;
  socket.join(room.code);
  socket.emit('session', { roomCode: room.code, playerId: player.id, playerName: player.name });
}

io.on('connection', (socket) => {
  socket.emit('ready', { version: '0.6.2-one-for-one-automation' });

  socket.on('createRoom', ({ name }) => {
    const room = makeRoom(name, socket);
    socket.join(room.code);
  });

  socket.on('joinRoom', ({ name, code }) => {
    const room = rooms.get(String(code || '').trim().toUpperCase());
    if (!room) return emitError(socket, 'Room not found.');
    if (room.players.length >= 3) return emitError(socket, 'This v0.6 table is limited to 3 players.');
    const player = createPlayer(name, socket);
    room.players.push(player);
    attachSocketToPlayer(room, player, socket);
    log(room, `${player.name} joined the room.`);
    broadcast(room);
  });

  socket.on('resumeRoom', ({ roomCode, playerId }) => {
    const room = rooms.get(String(roomCode || '').trim().toUpperCase());
    if (!room) return emitError(socket, 'Room expired or not found. Create a new room.');
    const player = getPlayer(room, playerId);
    if (!player) return emitError(socket, 'Saved player was not found in this room.');
    attachSocketToPlayer(room, player, socket);
    log(room, `${player.name} rejoined.`);
    broadcast(room);
  });

  socket.on('chat', ({ message }) => {
    const room = rooms.get(socket.data.roomCode);
    const player = room && getPlayer(room, socket.data.playerId);
    if (!room || !player) return;
    const text = String(message || '').trim().slice(0, 240);
    if (!text) return;
    room.chat.push({ at: Date.now(), name: player.name, message: text });
    if (room.chat.length > 100) room.chat.shift();
    broadcast(room);
  });

  socket.on('action', (payload = {}) => {
    const room = rooms.get(socket.data.roomCode);
    const player = room && getPlayer(room, socket.data.playerId);
    if (!room || !player) return emitError(socket, 'You are not in a room.');
    try {
      handleAction(socket, room, player, payload);
      broadcast(room);
    } catch (err) {
      console.error(err);
      emitError(socket, err.message || 'Action failed.');
      broadcast(room);
    }
  });

  socket.on('disconnect', () => {
    const room = rooms.get(socket.data.roomCode);
    if (!room) return;
    const player = getPlayer(room, socket.data.playerId);
    if (!player) return;
    player.connected = false;
    player.socketId = null;
    log(room, `${player.name} went offline.`);
    broadcast(room);
  });
});

function handleAction(socket, room, player, payload) {
  const type = payload.type;
  if (type === 'MARK_CARD_SEEN') {
    const card = player.hand.find((c) => c.instanceId === payload.cardId);
    if (card) { card.fresh = false; card.freshAt = null; }
    return;
  }
  if (room.pendingPrompt && type !== 'RESOLVE_PROMPT') return emitError(socket, 'A prompt must be resolved before anything else can happen.');

  if (type === 'START_GAME') {
    if (room.status !== 'LOBBY') return emitError(socket, 'Game already started.');
    if (room.players[0].id !== player.id) return emitError(socket, 'Only the host can start the game.');
    if (room.players.length !== 3) return emitError(socket, 'You need exactly 3 players to start.');
    setupGame(room);
    return;
  }

  if (type === 'ROLL_FIRST') {
    if (room.phase !== 'ROLL_FOR_FIRST') return emitError(socket, 'The opening roll is not active.');
    const err = rollForFirst(room, player);
    if (err) return emitError(socket, err);
    return;
  }

  if (type === 'OPEN_CHAMBER') {
    if (room.phase !== 'START_TURN') return emitError(socket, 'You can only open a Chamber at the start of your turn.');
    if (!isOwnTurn(room, socket)) return emitError(socket, 'Only the active player can open a Chamber.');
    const card = draw(room, 'CHAMBER');
    if (!card) return emitError(socket, 'The Chamber deck is empty.');
    room.revealCard = card;
    announce(room, 'reveal', 'Chamber Opened', `${player.name} revealed ${card.publicName}.`, card, { importance: 'major' });
    log(room, `${player.name} opened a Chamber: ${card.publicName}.`);
    if (card.type === 'THREAT') startCombat(room, card);
    else if (card.type === 'HEX') resolveHex(room, card, player, 'TO_NO_THREAT_CHOICE');
    else {
      markFresh(card, 'CHAMBER');
      player.hand.push(card);
      movement(room, 'REVEAL_ZONE', 'PLAYER_HAND', 'Reveal Zone → Hand', `${card.publicName} went to ${player.name}'s hand.`, card);
      announce(room, 'draw', 'Card Added to Hand', `${card.publicName} went to ${player.name}'s hand.`, card, { importance: 'normal' });
      log(room, `${card.publicName} went to ${player.name}'s hand.`);
      room.phase = 'NO_THREAT_CHOICE';
    }
    return;
  }

  if (type === 'PLAY_CARD') {
    const card = findCardInPlayerZones(player, payload.cardId);
    if (!card) return emitError(socket, 'Card not found.');
    playCard(socket, room, player, card, payload);
    return;
  }

  if (type === 'START_TROUBLE') {
    if (room.phase !== 'NO_THREAT_CHOICE' || !isOwnTurn(room, socket)) return emitError(socket, 'You can only Start Trouble after a non-Foe Chamber reveal on your turn.');
    const card = findAndRemoveFromHand(player, payload.cardId);
    if (!card || card.type !== 'THREAT') return emitError(socket, 'Choose a Foe from your hand to Start Trouble.');
    startCombat(room, card);
    return;
  }

  if (type === 'SEARCH_ROOM') {
    if (room.phase !== 'NO_THREAT_CHOICE' || !isOwnTurn(room, socket)) return emitError(socket, 'Only the active player can Loot the Room in this phase.');
    const card = draw(room, 'CHAMBER');
    if (card) {
      markFresh(card, 'CHAMBER');
      player.hand.push(card);
      movement(room, 'CHAMBER_DECK', 'PLAYER_HAND', 'Chamber Deck → Hand', `${player.name} drew a hidden Chamber card.`, card);
    }
    announce(room, 'draw', 'Loot the Room', `${player.name} drew a hidden Chamber card into hand.`, null, { importance: 'normal' });
    log(room, `${player.name} looted the room and drew a hidden Chamber card.`);
    room.revealCard = null;
    moveToTributeOrEnd(room);
    return;
  }

  if (type === 'REQUEST_BACKUP') {
    if (room.phase !== 'COMBAT' || !room.combat) return emitError(socket, 'Backup can only be requested during combat.');
    if (room.combat.activePlayerId !== player.id) return emitError(socket, 'Only the active combat player can request Backup.');
    if (room.combat.helperPlayerId) return emitError(socket, 'You already have Backup in this combat.');
    const target = getPlayer(room, payload.targetPlayerId);
    if (!target || target.id === player.id) return emitError(socket, 'Choose another player for Backup.');
    room.combat.backupRequest = { fromPlayerId: player.id, toPlayerId: target.id, stage: 'NEGOTIATING', deal: null };
    announce(room, 'backup', 'Backup Negotiation', `${player.name} asks ${target.name} for Backup. ${player.name} must propose a Loot deal.`, null, { importance: 'major' });
    log(room, `${player.name} opened Backup negotiation with ${target.name}.`);
    return;
  }

  if (type === 'SET_BACKUP_DEAL') {
    if (room.phase !== 'COMBAT' || !room.combat?.backupRequest) return emitError(socket, 'No Backup negotiation is open.');
    if (room.combat.backupRequest.fromPlayerId !== player.id) return emitError(socket, 'Only the fighter can propose the Backup deal.');
    const helper = getPlayer(room, room.combat.backupRequest.toPlayerId);
    const maxLoot = Math.max(0, totalCombatLoot(room));
    const lootCount = payload.allLoot ? maxLoot : Math.max(0, Math.min(maxLoot, Number(payload.lootCount || 0)));
    room.combat.backupRequest.deal = { lootCount, totalLootAtOffer: maxLoot };
    announce(room, 'backup', 'Backup Deal Offered', `${player.name} offers ${helper?.name || 'the helper'} ${lootCount} of ${maxLoot} Loot if the Foe is defeated.`, null, { importance: 'major' });
    log(room, `${player.name} offered ${helper?.name || 'helper'} ${lootCount}/${maxLoot} Loot for Backup.`);
    return;
  }

  if (type === 'ACCEPT_BACKUP') {
    if (!room.combat?.backupRequest || room.combat.backupRequest.toPlayerId !== player.id) return emitError(socket, 'No Backup request for you.');
    if (!room.combat.backupRequest.deal) return emitError(socket, 'Wait for the fighter to propose a Loot deal first.');
    room.combat.helperPlayerId = player.id;
    room.combat.backupDeal = room.combat.backupRequest.deal;
    const fighter = getPlayer(room, room.combat.activePlayerId);
    const dealText = describeBackupDeal(room.combat.backupDeal, player.name);
    room.combat.backupRequest = null;
    resetCombatPasses(room);
    announce(room, 'backup', 'Backup Deal Locked', `${player.name} joins ${fighter?.name || 'the fight'}. ${dealText}`, null, { importance: 'major' });
    log(room, `${player.name} joined the combat as Backup. ${dealText}`);
    return;
  }

  if (type === 'DECLINE_BACKUP') {
    if (!room.combat?.backupRequest || room.combat.backupRequest.toPlayerId !== player.id) return emitError(socket, 'No Backup request for you.');
    announce(room, 'backup', 'Backup Declined', `${player.name} declined the Backup negotiation.`, null, { importance: 'normal' });
    log(room, `${player.name} declined Backup.`);
    room.combat.backupRequest = null;
    return;
  }

  if (type === 'PASS_COMBAT') {
    if (room.phase !== 'COMBAT' || !room.combat) return emitError(socket, 'There is no combat to pass on.');
    room.combat.passes[player.id] = true;
    announce(room, 'combat', 'Done Buffing/Nerfing', `${player.name} is done adding buffs or nerfs for now.`, null, { importance: 'normal' });
    log(room, `${player.name} confirmed no more combat cards.`);
    if (allCombatPlayersPassed(room)) resolveCombat(room);
    return;
  }

  if (type === 'ROLL_ESCAPE') {
    if (room.phase !== 'ESCAPE' || room.escape?.currentPlayerId !== player.id) return emitError(socket, 'It is not your Flee roll.');
    rollFlee(room, player);
    return;
  }


  if (type === 'BRUISER_BERSERK') {
    if (room.phase !== 'COMBAT' || !room.combat) return emitError(socket, 'Berserk can only be used during combat.');
    if (!hasRole(player, 'WARRIOR_EQUIV')) return emitError(socket, 'Only a Bruiser can Berserk.');
    const uses = room.combat.roleUses[player.id]?.berserk || 0;
    if (uses >= 3) return emitError(socket, 'Bruiser Berserk can only be used three times per combat.');
    const options = allOwnedCards(player).filter((c) => c.instanceId !== player.role?.instanceId);
    if (!options.length) return emitError(socket, 'You need a card to discard for Berserk.');
    createPrompt(room, { type: 'DISCARD_FOR_BERSERK', playerId: player.id, message: `Choose a card to discard for Bruiser +3.`, options, meta: { after: 'CONTINUE' } });
    return;
  }

  if (type === 'CUTPURSE_BACKSTAB') {
    if (room.phase !== 'COMBAT' || !room.combat) return emitError(socket, 'Backstab can only be used during combat.');
    if (!hasRole(player, 'THIEF_EQUIV')) return emitError(socket, 'Only a Cutpurse can Backstab.');
    if (room.combat.activePlayerId === player.id) return emitError(socket, 'You cannot Backstab yourself.');
    const options = allOwnedCards(player).filter((c) => c.instanceId !== player.role?.instanceId);
    if (!options.length) return emitError(socket, 'You need a card to discard for Backstab.');
    createPrompt(room, { type: 'DISCARD_FOR_BACKSTAB', playerId: player.id, message: `Choose a card to discard. Player side gets -2.`, options, meta: { after: 'CONTINUE' } });
    return;
  }

  if (type === 'HEXHAND_CHARM') {
    if (room.phase !== 'COMBAT' || !room.combat) return emitError(socket, 'Charm can only be used during combat.');
    if (player.id !== room.combat.activePlayerId) return emitError(socket, 'Only the fighter can charm away a Foe.');
    if (!hasRole(player, 'WIZARD_EQUIV')) return emitError(socket, 'Only a Hexhand can charm a Foe.');
    if (player.hand.length < 3) return emitError(socket, 'You need at least 3 cards in hand to charm a Foe.');
    while (player.hand.length) discardCard(room, player.hand.pop());
    const foe = removeFoeAt(room, 0);
    const loot = foe ? finalFoeLoot(foe) : 0;
    drawLootWithBackupDeal(room, player, null, loot);
    announce(room, 'combat', 'Foe Charmed Away', `${player.name} discarded their hand. ${foe?.publicName || 'The Foe'} left. No Glory; ${loot} Loot was drawn.`, foe, { importance: 'major' });
    if (!room.combat.threats.length) { cleanupCombatToDiscard(room); moveToTributeOrEnd(room); } else resetCombatPasses(room);
    return;
  }

  if (type === 'GIVE_TRIBUTE') {
    if (room.phase !== 'TRIBUTE' || !isOwnTurn(room, socket)) return emitError(socket, 'Tribute is not required from you right now.');
    resolveTribute(socket, room, player, payload);
    return;
  }

  if (type === 'END_TURN') {
    if (room.phase !== 'END_TURN' || !isOwnTurn(room, socket)) return emitError(socket, 'You cannot end your turn yet. Follow the phase prompt.');
    endTurn(room);
    return;
  }

  if (type === 'RESOLVE_PROMPT') {
    resolvePrompt(socket, room, player, payload);
    return;
  }

  return emitError(socket, 'Unknown action.');
}

function findCardInPlayerZones(player, cardId) {
  return player.hand.find((c) => c.instanceId === cardId) || player.carriedGear.find((c) => c.instanceId === cardId) || player.equippedGear.find((c) => c.instanceId === cardId) || null;
}

function playCard(socket, room, player, card, payload) {
  if (card.type === 'ROLE') {
    if (!canActOutsideCombat(room) || activeId(room) !== player.id) return emitError(socket, 'Callings can only be played on your own turn outside combat.');
    const real = findAndRemoveFromHand(player, card.instanceId);
    if (!player.role) player.role = real;
    else if ((player.extraRoles || []).length < (player.extraCallingSlots || 0)) player.extraRoles.push(real);
    else { discardCard(room, player.role); player.role = real; }
    announce(room, 'effect', 'Calling Played', `${player.name} became ${real.publicName}.`, real, { importance: 'normal' });
    log(room, `${player.name} became ${real.publicName}.`);
    return;
  }

  if (card.type === 'ORIGIN') {
    if (!canActOutsideCombat(room) || activeId(room) !== player.id) return emitError(socket, 'Kins can only be played on your own turn outside combat.');
    const real = findAndRemoveFromHand(player, card.instanceId);
    if (!player.origin) player.origin = real;
    else if ((player.extraOrigins || []).length < (player.extraKinSlots || 0)) player.extraOrigins.push(real);
    else { discardCard(room, player.origin); player.origin = real; }
    announce(room, 'effect', 'Kin Played', `${player.name} became ${real.publicName}.`, real, { importance: 'normal' });
    log(room, `${player.name} became ${real.publicName}.`);
    return;
  }

  if (card.type === 'GEAR') {
    if (!canActOutsideCombat(room) || activeId(room) !== player.id) return emitError(socket, 'Gear can only be played on your own turn outside combat.');
    const mode = payload.mode || 'EQUIP';
    const fromHand = player.hand.some((c) => c.instanceId === card.instanceId);
    const fromCarried = player.carriedGear.some((c) => c.instanceId === card.instanceId);
    if (mode === 'CARRY') {
      if (!fromHand) return emitError(socket, 'Only Gear from hand can be carried.');
      const combinedHeavy = heavyCount(player) + (card.isHeavy ? 1 : 0);
      if (combinedHeavy > heavyLimit(player)) return emitError(socket, `You can only carry ${heavyLimit(player)} Heavy Gear right now.`);
      const real = findAndRemoveFromHand(player, card.instanceId);
      carryGear(player, real);
      log(room, `${player.name} carried ${real.publicName}.`);
      return;
    }
    if (mode === 'EQUIP') {
      const err = validateGearEquip(player, card);
      if (err) return emitError(socket, err);
      let real;
      if (fromHand) real = findAndRemoveFromHand(player, card.instanceId);
      else if (fromCarried) {
        const idx = player.carriedGear.findIndex((g) => g.instanceId === card.instanceId);
        real = player.carriedGear.splice(idx, 1)[0];
      }
      else return emitError(socket, 'Gear must be in hand or carried to equip.');
      equipGear(player, real);
      announce(room, 'gear', 'Gear Equipped', `${player.name} equipped ${real.publicName}.`, real, { importance: 'normal' });
      log(room, `${player.name} equipped ${real.publicName}.`);
      return;
    }
    if (mode === 'UNEQUIP') {
      const idx = player.equippedGear.findIndex((g) => g.instanceId === card.instanceId);
      if (idx < 0) return emitError(socket, 'That Gear is not equipped.');
      const [real] = player.equippedGear.splice(idx, 1);
      carryGear(player, real);
      announce(room, 'gear', 'Gear Carried', `${player.name} moved ${real.publicName} to carried Gear.`, real, { importance: 'normal' });
      log(room, `${player.name} moved ${real.publicName} to carried Gear.`);
      return;
    }
  }

  if (card.type === 'SPECIAL') {
    const timing = card.timing || [];
    const canPlayAny = timing.includes('ANY_TIME');
    const canPlayCombat = timing.includes('DURING_COMBAT') && room.phase === 'COMBAT';
    const canPlayOwnTurn = canActOutsideCombat(room) && activeId(room) === player.id;
    if (!canPlayAny && !canPlayCombat && !canPlayOwnTurn) return emitError(socket, 'That Special is not playable in this timing window.');
    const real = findAndRemoveFromHand(player, card.instanceId);
    if (!real) return emitError(socket, 'Special must be in your hand.');
    const ok = applyEffect(room, player, real.effect, real, { after: room.phase === 'COMBAT' ? 'CONTINUE' : 'TO_TRIBUTE_OR_END', targetPlayerId: payload.targetPlayerId });
    discardCard(room, real);
    if (room.phase === 'COMBAT') resetCombatPasses(room);
    announce(room, 'card', 'Special Played', `${player.name} played ${real.publicName}.`, real, { importance: 'major' });
    log(room, `${player.name} played ${real.publicName}${room.phase === 'COMBAT' ? '. Everyone must confirm again.' : '.'}`);
    return;
  }

  if (card.type === 'TRICK') {
    if (room.phase === 'ESCAPE') {
      const timing = card.timing || [];
      const isRunner = room.escape?.currentPlayerId === player.id;
      if (!isRunner) return emitError(socket, 'Only the current fleeing player can play Flee Tricks right now.');
      if (!timing.includes('BEFORE_ESCAPE_ROLL')) return emitError(socket, 'That Trick is not playable before this Flee roll.');
      const real = findAndRemoveFromHand(player, card.instanceId);
      if (!real) return emitError(socket, 'Trick must be in your hand.');
      applyEffect(room, player, real.effect, real);
      discardCard(room, real);
      announce(room, 'card', 'Flee Trick Played', `${player.name} played ${real.publicName} before Fleeing.`, real, { importance: 'major' });
      log(room, `${player.name} played ${real.publicName} before Fleeing.`);
      return;
    }
    if (!room.combat || room.phase !== 'COMBAT') return emitError(socket, 'Tricks can only be played during combat unless their card says otherwise.');
    if (!(card.timing || []).includes('DURING_COMBAT')) return emitError(socket, 'That Trick is not playable in this combat window.');
    const real = findAndRemoveFromHand(player, card.instanceId);
    if (!real) return emitError(socket, 'Trick must be in your hand.');
    const effect = { ...(real.effect || {}) };
    if (effect.type === 'MODIFY_COMBAT_TOTAL' && payload.side) effect.side = payload.side;
    const displayed = { ...real, effect };
    applyEffect(room, player, effect, displayed);
    room.combat.playedTricks.push(displayed);
    resetCombatPasses(room);
    announce(room, 'card', 'Combat Card Played', `${player.name} played ${real.publicName}. Everyone can buff, nerf, or finish.`, real, { importance: 'major' });
    log(room, `${player.name} played ${real.publicName}. Everyone must confirm again.`);
    return;
  }

  if (card.type === 'THREAT_MODIFIER') {
    if (!room.combat || room.phase !== 'COMBAT') return emitError(socket, 'Foe Modifiers can only be played during combat.');
    const real = findAndRemoveFromHand(player, card.instanceId);
    if (!real) return emitError(socket, 'Modifier must be in your hand.');
    const threat = room.combat.threats[0];
    threat.modifiers = threat.modifiers || [];
    threat.modifiers.push(real);
    resetCombatPasses(room);
    announce(room, 'card', 'Foe Modifier Attached', `${player.name} attached ${real.publicName} to ${threat.publicName}.`, real, { importance: 'major' });
    log(room, `${player.name} attached ${real.publicName} to ${threat.publicName}. Everyone must confirm again.`);
    return;
  }

  if (card.type === 'HEX') {
    // Classic rule: Hex/Curse cards in hand may be played on any player at almost any time.
    const real = findAndRemoveFromHand(player, card.instanceId);
    if (!real) return emitError(socket, 'Hex must be in your hand.');
    const target = getPlayer(room, payload.targetPlayerId) || getActive(room) || player;
    let complete = true;
    for (const effect of real.effects || []) {
      const ok = applyEffect(room, target, effect, real, { after: room.phase === 'ESCAPE' ? 'CONTINUE_ESCAPE' : 'CONTINUE' });
      if (!ok) complete = false;
    }
    discardCard(room, real);
    if (room.phase === 'COMBAT') resetCombatPasses(room);
    announce(room, 'hex', 'Hex Played', `${player.name} played ${real.publicName} on ${target.name}.`, real, { importance: 'major' });
    log(room, `${player.name} played Hex: ${real.publicName} on ${target.name}.${room.phase === 'COMBAT' ? ' Everyone must confirm again.' : ''}`);
    return;
  }

  if (card.type === 'THREAT') {
    if (room.phase === 'COMBAT' && room.combat && (card.tags || []).includes('RESTLESS') && room.combat.threats.some((t) => (t.tags || []).includes('RESTLESS'))) {
      const real = findAndRemoveFromHand(player, card.instanceId);
      if (!real) return emitError(socket, 'Restless Foe must be in your hand.');
      addFoeToCombat(room, real, player);
      return;
    }
    return emitError(socket, 'Foes are played with Start Trouble after a non-Foe Chamber reveal, or Restless into a Restless combat.');
  }
  return emitError(socket, 'That card has no legal action right now.');
}

function resolveTribute(socket, room, player, payload) {
  const over = player.hand.length - handLimit(player);
  if (over <= 0) { room.phase = 'END_TURN'; return; }
  const cardIds = Array.isArray(payload.cardIds) ? payload.cardIds : [];
  if (cardIds.length !== over) return emitError(socket, `Choose exactly ${over} card${over === 1 ? '' : 's'} for Tribute.`);
  const unique = [...new Set(cardIds)];
  if (unique.length !== cardIds.length) return emitError(socket, 'Choose different cards.');
  const minGlory = Math.min(...room.players.map((p) => p.renown));
  const activeIsLowest = player.renown === minGlory;
  let recipient = null;
  if (!activeIsLowest) {
    const legalRecipients = room.players.filter((p) => p.id !== player.id && p.renown === minGlory);
    recipient = getPlayer(room, payload.targetPlayerId) || legalRecipients[0];
    if (!recipient || !legalRecipients.some((p) => p.id === recipient.id)) return emitError(socket, 'Choose a lowest-Glory player as recipient.');
  }
  const moved = [];
  for (const id of unique) {
    const card = findAndRemoveFromHand(player, id);
    if (!card) return emitError(socket, 'One selected Tribute card was not in your hand.');
    moved.push(card);
  }
  if (recipient) {
    moved.forEach((c) => { c.fresh = true; c.freshAt = Date.now(); c.freshFrom = 'TRIBUTE'; });
    recipient.hand.push(...moved);
    if (moved.length) movement(room, 'PLAYER_HAND', 'PLAYER_HAND', 'Tribute → Hand', `${recipient.name} received ${moved.length} Tribute card${moved.length === 1 ? '' : 's'}.`, moved[0]);
    announce(room, 'tribute', 'Tribute Given', `${player.name} gave ${moved.length} Tribute card${moved.length === 1 ? '' : 's'} to ${recipient.name}.`, null, { importance: 'normal' });
    log(room, `${player.name} gave ${moved.length} Tribute card${moved.length === 1 ? '' : 's'} to ${recipient.name}.`);
  } else {
    for (const card of moved) discardCard(room, card);
    announce(room, 'tribute', 'Tribute Discarded', `${player.name} discarded ${moved.length} excess card${moved.length === 1 ? '' : 's'} because they were tied for lowest Glory.`, null, { importance: 'normal' });
    log(room, `${player.name} discarded ${moved.length} excess card${moved.length === 1 ? '' : 's'} because they were tied for lowest Glory.`);
  }
  room.phase = 'END_TURN';
}


function removeOwnedGearOrHandCard(player, cardId) {
  let idx = player.hand.findIndex((c) => c.instanceId === cardId && c.type === 'GEAR');
  if (idx >= 0) return player.hand.splice(idx, 1)[0];
  idx = player.carriedGear.findIndex((c) => c.instanceId === cardId);
  if (idx >= 0) return player.carriedGear.splice(idx, 1)[0];
  idx = player.equippedGear.findIndex((c) => c.instanceId === cardId);
  if (idx >= 0) return player.equippedGear.splice(idx, 1)[0];
  return null;
}
function gearJunkValue(card) {
  return Number(card?.junkValue ?? card?.scrapValue ?? 0) || 0;
}

function removeAndDiscardOwnedCard(room, player, cardId) {
  let card = findAndRemoveFromHand(player, cardId);
  if (!card) {
    let idx = player.carriedGear.findIndex((c) => c.instanceId === cardId);
    if (idx >= 0) card = player.carriedGear.splice(idx, 1)[0];
  }
  if (!card) {
    let idx = player.equippedGear.findIndex((c) => c.instanceId === cardId);
    if (idx >= 0) card = player.equippedGear.splice(idx, 1)[0];
  }
  if (card) discardCard(room, card);
  return card;
}

function resolvePrompt(socket, room, player, payload) {
  const prompt = room.pendingPrompt;
  if (!prompt) return emitError(socket, 'No prompt to resolve.');
  if (prompt.playerId !== player.id) return emitError(socket, 'This prompt is not for you.');
  const after = prompt.meta?.after || 'CONTINUE';
  if (prompt.type === 'DISCARD_GEAR') {
    const valid = (prompt.options || []).some((c) => c.instanceId === payload.cardId);
    if (!valid) return emitError(socket, 'Choose a valid Gear card.');
    const chosen = (prompt.options || []).find((c) => c.instanceId === payload.cardId);
    discardSpecificGear(room, player, payload.cardId);
    announce(room, 'effect', 'Gear Discarded', `${player.name} discarded ${chosen?.publicName || 'Gear'}.`, chosen, { importance: 'major' });
    continueAfterPrompt(room, after);
    return;
  }
  if (prompt.type === 'DISCARD_HAND_CARDS') {
    const need = prompt.meta?.count || 1;
    const ids = Array.isArray(payload.cardIds) ? [...new Set(payload.cardIds)] : [];
    if (ids.length !== need) return emitError(socket, `Choose exactly ${need} card${need === 1 ? '' : 's'} to discard.`);
    const valid = new Set((prompt.options || []).map((c) => c.instanceId));
    if (!ids.every((id) => valid.has(id))) return emitError(socket, 'Choose valid cards from your hand.');
    for (const id of ids) {
      const card = findAndRemoveFromHand(player, id);
      if (card) discardCard(room, card);
    }
    announce(room, 'effect', 'Cards Discarded', `${player.name} discarded ${ids.length} chosen card${ids.length === 1 ? '' : 's'} from hand.`, null, { importance: 'major' });
    log(room, `${player.name} discarded ${ids.length} chosen card${ids.length === 1 ? '' : 's'} from hand.`);
    continueAfterPrompt(room, after);
    return;
  }

  if (prompt.type === 'CHOOSE_PLAYER') {
    const target = getPlayer(room, payload.targetPlayerId);
    if (!target || target.id === player.id) return emitError(socket, 'Choose another player.');
    const ok = applyEffect(room, player, prompt.meta.effect, prompt.meta.sourceCard, { after, targetPlayerId: target.id });
    if (ok) continueAfterPrompt(room, after);
    return;
  }
  if (prompt.type === 'MANUAL') {
    log(room, `${player.name} confirmed advanced card resolution.`);
    continueAfterPrompt(room, after);
    return;
  }

  if (prompt.type === 'ADD_FOE_FROM_HAND') {
    const valid = (prompt.options || []).some((c) => c.instanceId === payload.cardId);
    if (!valid) return emitError(socket, 'Choose a valid Foe from your hand.');
    const foe = findAndRemoveFromHand(player, payload.cardId);
    if (!foe || foe.type !== 'THREAT') return emitError(socket, 'That Foe is no longer in your hand.');
    addFoeToCombat(room, foe, player);
    continueAfterPrompt(room, after);
    return;
  }

  if (prompt.type === 'ILLUSION_SWAP') {
    const valid = (prompt.options || []).some((c) => c.instanceId === payload.cardId);
    if (!valid) return emitError(socket, 'Choose a valid replacement Foe.');
    const replacement = findAndRemoveFromHand(player, payload.cardId);
    if (!replacement || replacement.type !== 'THREAT') return emitError(socket, 'That replacement Foe is no longer in your hand.');
    const oldFoe = removeFoeAt(room, 0);
    replacement.modifiers = [];
    room.combat.threats.unshift(replacement);
    resetCombatPasses(room);
    announce(room, 'combat', 'Illusion Swap', `${oldFoe?.publicName || 'A Foe'} was replaced by ${replacement.publicName}.`, replacement, { importance: 'major' });
    log(room, `${player.name} replaced ${oldFoe?.publicName || 'a Foe'} with ${replacement.publicName}.`);
    continueAfterPrompt(room, after);
    return;
  }

  if (prompt.type === 'CHOOSE_DISCARD_CARD') {
    const id = payload.cardId;
    let card = removeCardByInstance(room.chamberDiscard, id);
    if (!card) card = removeCardByInstance(room.lootDiscard, id);
    if (!card) return emitError(socket, 'Choose a valid discard card.');
    markFresh(card, 'DISCARD');
    player.hand.push(card);
    movement(room, 'DISCARD', 'PLAYER_HAND', 'Discard → Hand', `${player.name} recovered ${card.publicName}.`, card);
    announce(room, 'effect', 'Card Recovered', `${player.name} took ${card.publicName} from the discard pile.`, card, { importance: 'major' });
    continueAfterPrompt(room, after);
    return;
  }

  if (prompt.type === 'CHEAT_GEAR') {
    const valid = (prompt.options || []).some((c) => c.instanceId === payload.cardId);
    if (!valid) return emitError(socket, 'Choose valid Gear.');
    let gear = player.hand.find((c) => c.instanceId === payload.cardId);
    if (gear) { findAndRemoveFromHand(player, gear.instanceId); gear.cheated = true; equipGear(player, gear); }
    else {
      gear = player.carriedGear.find((c) => c.instanceId === payload.cardId) || player.equippedGear.find((c) => c.instanceId === payload.cardId);
      if (!gear) return emitError(socket, 'Gear was no longer available.');
      gear.cheated = true;
      if (player.carriedGear.some((c) => c.instanceId === gear.instanceId)) {
        player.carriedGear = player.carriedGear.filter((c) => c.instanceId !== gear.instanceId);
        equipGear(player, gear);
      }
    }
    announce(room, 'gear', 'Fine Print Approved', `${gear.publicName} is now legal for ${player.name}.`, gear, { importance: 'major' });
    continueAfterPrompt(room, after);
    return;
  }

  if (prompt.type === 'DISCARD_FOR_BERSERK') {
    const valid = (prompt.options || []).some((c) => c.instanceId === payload.cardId);
    if (!valid) return emitError(socket, 'Choose a valid card to discard.');
    removeAndDiscardOwnedCard(room, player, payload.cardId);
    room.combat.roleUses[player.id] = room.combat.roleUses[player.id] || {};
    room.combat.roleUses[player.id].berserk = (room.combat.roleUses[player.id].berserk || 0) + 1;
    room.combat.playerDelta += 3;
    resetCombatPasses(room);
    announce(room, 'combat', 'Bruiser Berserk', `${player.name} discarded a card for +3.`, player.role, { importance: 'major' });
    continueAfterPrompt(room, after);
    return;
  }

  if (prompt.type === 'DISCARD_FOR_BACKSTAB') {
    const valid = (prompt.options || []).some((c) => c.instanceId === payload.cardId);
    if (!valid) return emitError(socket, 'Choose a valid card to discard.');
    removeAndDiscardOwnedCard(room, player, payload.cardId);
    room.combat.playerDelta -= 2;
    resetCombatPasses(room);
    announce(room, 'combat', 'Cutpurse Backstab', `${player.name} discarded a card. Player side gets -2.`, player.role, { importance: 'major' });
    continueAfterPrompt(room, after);
    return;
  }


  if (prompt.type === 'DISCARD_OWNED_CARDS') {
    const need = prompt.meta?.count || 1;
    const ids = Array.isArray(payload.cardIds) ? [...new Set(payload.cardIds)] : [];
    if (ids.length !== need) return emitError(socket, `Choose exactly ${need} card${need === 1 ? '' : 's'} to discard.`);
    const valid = new Set((prompt.options || []).map((c) => c.instanceId));
    if (!ids.every((id) => valid.has(id))) return emitError(socket, 'Choose valid owned cards.');
    for (const id of ids) removeAndDiscardOwnedCard(room, player, id);
    announce(room, 'effect', 'Cards Discarded', `${player.name} discarded ${ids.length} card${ids.length === 1 ? '' : 's'}.`, null, { importance: 'major' });
    continueAfterPrompt(room, after);
    return;
  }

  if (prompt.type === 'CHOOSE_BAD_NEWS_OPTION') {
    const option = payload.option || 'LOSE_GLORY';
    if (prompt.meta?.option === 'HAND_OR_GLORY' && option === 'DISCARD_HAND') {
      while (player.hand.length) discardCard(room, player.hand.pop());
      announce(room, 'effect', 'Hand Discarded', `${player.name} discarded their hand.`, null, { importance: 'major' });
    } else {
      const amount = prompt.meta?.amount || 2;
      const before = player.renown;
      player.renown = Math.max(1, player.renown - amount);
      announce(room, 'effect', 'Glory Lost', `${player.name}'s Glory changed ${before} → ${player.renown}.`, null, { importance: 'major' });
    }
    continueAfterPrompt(room, after);
    return;
  }

  if (prompt.type === 'SELL_GEAR') {
    const ids = Array.isArray(payload.cardIds) ? [...new Set(payload.cardIds)] : [];
    if (!ids.length) return emitError(socket, 'Choose at least one Gear card to sell.');
    const valid = new Set((prompt.options || []).map((c) => c.instanceId));
    if (!ids.every((id) => valid.has(id))) return emitError(socket, 'Choose valid Gear to sell.');
    const sold = [];
    for (const id of ids) {
      const card = removeOwnedGearOrHandCard(player, id);
      if (!card) return emitError(socket, 'One selected Gear card was no longer available.');
      sold.push(card);
    }
    let values = sold.map(gearJunkValue);
    let total = values.reduce((a, b) => a + b, 0);
    let doubled = false;
    if (prompt.meta?.effect?.doubleHighest && values.length) {
      total += Math.max(...values);
      doubled = true;
    } else if (player.origin?.mechanicalSlot === 'HALFLING_EQUIV' && !player.usedHalfstepSale && values.length) {
      total += Math.max(...values);
      player.usedHalfstepSale = true;
      doubled = true;
    }
    for (const card of sold) discardCard(room, card);
    const threshold = prompt.meta?.effect?.threshold || 1000;
    const glory = Math.floor(total / threshold);
    announce(room, 'effect', 'Gear Sold', `${player.name} sold ${sold.length} Gear for ${total} Junk Value${doubled ? ' with a double-value bonus' : ''}.`, null, { importance: 'major' });
    log(room, `${player.name} sold ${sold.length} Gear for ${total} Junk Value${doubled ? ' with a double-value bonus' : ''}.`);
    if (glory > 0) gainGlory(room, player, glory, Boolean(prompt.meta?.effect?.canWin), false);
    else log(room, `Not enough Junk Value for Glory.`);
    continueAfterPrompt(room, after);
    return;
  }
  emitError(socket, 'Unknown prompt type.');
}

server.listen(PORT, () => {
  console.log(`Loot Goblins v0.6.2 one-for-one automation listening on ${PORT}`);
});
