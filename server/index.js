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
app.get('/health', (_, res) => res.json({ ok: true, rooms: rooms.size, version: '0.3.0' }));
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

function shuffle(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function expandDeck(defs) {
  return shuffle(defs.map((def) => ({ ...clone(def), instanceId: instanceId() })));
}

function log(room, message) {
  room.log.push({ at: Date.now(), message });
  if (room.log.length > 180) room.log.shift();
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
    usedHalfstepSale: false
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
    strength: card.strength,
    renownReward: card.renownReward,
    lootReward: card.lootReward,
    tags: card.tags || [],
    slot: card.slot,
    handsUsed: card.handsUsed,
    combatBonus: card.combatBonus,
    escapeBonus: card.escapeBonus,
    scrapValue: card.scrapValue,
    isHeavy: Boolean(card.isHeavy),
    mechanicalSlot: card.mechanicalSlot,
    timing: card.timing || [],
    target: card.target,
    strengthDelta: card.strengthDelta,
    lootDelta: card.lootDelta,
    enforcement: card.enforcement
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
    carriedGear: p.carriedGear.map(publicCard),
    equippedGear: p.equippedGear.map(publicCard),
    combatBonus: gearCombatBonus(p) + roleStaticCombatBonus(room, p),
    escapeBonus: gearEscapeBonus(p) + originEscapeBonus(p) + temporaryEscapeBonus(p),
    heavyCount: heavyCount(p),
    heavyLimit: heavyLimit(p)
  };
}

function serializeRoom(room, viewerId) {
  const active = getActive(room);
  const viewer = getPlayer(room, viewerId);
  return {
    version: '0.3.0',
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
    combat: serializeCombat(room),
    pendingPrompt: serializePrompt(room.pendingPrompt, viewerId),
    log: room.log.slice(-80),
    chat: room.chat.slice(-60),
    legalActions: viewer ? legalActions(room, viewer) : []
  };
}

function serializeCombat(room) {
  if (!room.combat) return null;
  const totals = combatTotals(room);
  return {
    activePlayerId: room.combat.activePlayerId,
    helperPlayerId: room.combat.helperPlayerId,
    backupRequest: room.combat.backupRequest,
    threats: room.combat.threats.map((t) => ({ ...publicCard(t), modifiers: (t.modifiers || []).map(publicCard), finalStrength: finalThreatStrength(room, t), finalLoot: finalThreatLoot(t) })),
    playerDelta: room.combat.playerDelta || 0,
    threatDelta: room.combat.threatDelta || 0,
    playedTricks: (room.combat.playedTricks || []).map(publicCard),
    passes: room.combat.passes,
    totals
  };
}

function serializePrompt(prompt, viewerId) {
  if (!prompt) return null;
  return {
    id: prompt.id,
    type: prompt.type,
    playerId: prompt.playerId,
    message: prompt.message,
    options: (prompt.options || []).map(publicCard),
    requiresYou: prompt.playerId === viewerId,
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
  if (card.deck === 'CHAMBER') room.chamberDiscard.push(card);
  else room.lootDiscard.push(card);
}

function handLimit(player) {
  return player.origin?.mechanicalSlot === 'DWARF_EQUIV' ? 6 : 5;
}
function heavyLimit(player) {
  return player.origin?.mechanicalSlot === 'DWARF_EQUIV' ? 2 : 1;
}
function heavyCount(player) {
  return [...player.carriedGear, ...player.equippedGear].filter((g) => g.isHeavy).length;
}
function gearCombatBonus(player) {
  return player.equippedGear.reduce((sum, g) => sum + (Number(g.combatBonus) || 0), 0);
}
function gearEscapeBonus(player) {
  return player.equippedGear.reduce((sum, g) => sum + (Number(g.escapeBonus) || 0), 0);
}
function originEscapeBonus(player) {
  return player.origin?.mechanicalSlot === 'ELF_EQUIV' ? 1 : 0;
}
function temporaryEscapeBonus(player) {
  return player.temporaryEffects.filter((e) => e.type === 'MODIFY_ESCAPE_ROLL').reduce((sum, e) => sum + (e.amount || 0), 0);
}
function roleStaticCombatBonus(room, player) {
  let bonus = 0;
  if (player.role?.mechanicalSlot === 'CLERIC_EQUIV' && room.combat?.threats?.some((t) => (t.tags || []).includes('RESTLESS'))) bonus += 3;
  return bonus;
}
function handsUsed(player) {
  return player.equippedGear.filter((g) => g.slot === 'HAND').reduce((sum, g) => sum + (Number(g.handsUsed) || 1), 0);
}
function activeHasTieWin(room) {
  return getActive(room)?.role?.mechanicalSlot === 'WARRIOR_EQUIV';
}
function playerCombatTotal(room, player) {
  if (!player) return 0;
  return player.renown + gearCombatBonus(player) + roleStaticCombatBonus(room, player);
}
function threatSpecialBonus(room, threat) {
  let total = 0;
  const active = getActive(room);
  for (const rule of threat.specialRules || []) {
    if (rule.type === 'BONUS_AGAINST_ROLE' && active?.role?.mechanicalSlot === rule.roleMechanicalSlot) total += rule.amount || 0;
  }
  return total;
}
function finalThreatStrength(room, threat) {
  return Math.max(0, (threat.strength || 0) + threatSpecialBonus(room, threat) + (threat.modifiers || []).reduce((s, m) => s + (m.strengthDelta || 0), 0));
}
function finalThreatLoot(threat) {
  return Math.max(1, (threat.lootReward || 0) + (threat.modifiers || []).reduce((s, m) => s + (m.lootDelta || 0), 0));
}
function combatTotals(room) {
  if (!room.combat) return null;
  const active = getPlayer(room, room.combat.activePlayerId);
  const helper = room.combat.helperPlayerId ? getPlayer(room, room.combat.helperPlayerId) : null;
  const playerTotal = playerCombatTotal(room, active) + playerCombatTotal(room, helper) + (room.combat.playerDelta || 0);
  const threatTotal = room.combat.threats.reduce((sum, t) => sum + finalThreatStrength(room, t), 0) + (room.combat.threatDelta || 0);
  const wins = activeHasTieWin(room) ? playerTotal >= threatTotal : playerTotal > threatTotal;
  return { playerTotal, threatTotal, wins, margin: playerTotal - threatTotal, tieWin: activeHasTieWin(room) };
}

function startCombat(room, threat) {
  threat.modifiers = [];
  room.combat = {
    activePlayerId: activeId(room),
    helperPlayerId: null,
    backupRequest: null,
    threats: [threat],
    playerDelta: 0,
    threatDelta: 0,
    playedTricks: [],
    passes: {}
  };
  resetCombatPasses(room);
  room.phase = 'COMBAT';
  room.revealCard = threat;
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

function canActOutsideCombat(room) {
  return ['START_TURN', 'NO_THREAT_CHOICE', 'END_TURN'].includes(room.phase);
}

function validateGearEquip(player, card) {
  if (card.type !== 'GEAR') return 'That is not Gear.';
  const combinedHeavy = heavyCount(player) + (card.isHeavy && !player.carriedGear.some((g) => g.instanceId === card.instanceId) ? 1 : 0);
  if (combinedHeavy > heavyLimit(player)) return `You can only carry ${heavyLimit(player)} Heavy Gear right now.`;
  if (card.slot === 'HEAD' && player.equippedGear.some((g) => g.slot === 'HEAD')) return 'Your Head slot is already full.';
  if (card.slot === 'BODY' && player.equippedGear.some((g) => g.slot === 'BODY')) return 'Your Body slot is already full.';
  if (card.slot === 'FEET' && player.equippedGear.some((g) => g.slot === 'FEET')) return 'Your Feet slot is already full.';
  if (card.slot === 'HAND' && handsUsed(player) + (card.handsUsed || 1) > 2) return 'You do not have enough free hands.';
  return null;
}

function carryGear(player, card) {
  player.carriedGear.push(card);
}

function equipGear(player, card) {
  player.equippedGear.push(card);
}

function applyEffect(room, player, effect, sourceCard, context = {}) {
  if (!player || !effect) return true;
  switch (effect.type) {
    case 'GAIN_RENOWN': {
      gainRenown(room, player, effect.amount || 1, Boolean(effect.canWin), false);
      return true;
    }
    case 'LOSE_RENOWN': {
      const amount = effect.amount || 1;
      const min = effect.minimum ?? 1;
      player.renown = Math.max(min, player.renown - amount);
      log(room, `${player.name} lost ${amount} Renown.`);
      return true;
    }
    case 'LOSE_ROLE': {
      if (player.role) { discardCard(room, player.role); log(room, `${player.name} lost ${player.role.publicName}.`); }
      else log(room, `${player.name} had no Role to lose.`);
      player.role = null;
      return true;
    }
    case 'LOSE_ORIGIN': {
      if (player.origin) { discardCard(room, player.origin); log(room, `${player.name} lost ${player.origin.publicName}.`); }
      else log(room, `${player.name} had no Origin to lose.`);
      player.origin = null;
      return true;
    }
    case 'DISCARD_FROM_HAND': {
      const count = Math.min(effect.count || 1, player.hand.length);
      for (let i = 0; i < count; i++) {
        const idx = effect.method === 'RANDOM' ? Math.floor(Math.random() * player.hand.length) : 0;
        const [card] = player.hand.splice(idx, 1);
        discardCard(room, card);
      }
      log(room, `${player.name} discarded ${count} card${count === 1 ? '' : 's'}.`);
      return true;
    }
    case 'DISCARD_HAND': {
      const count = player.hand.length;
      while (player.hand.length) discardCard(room, player.hand.pop());
      log(room, `${player.name} discarded their hand (${count} cards).`);
      return true;
    }
    case 'DISCARD_GEAR': {
      const candidates = selectableGear(player, effect);
      if (candidates.length === 0) { log(room, `${player.name} had no matching Gear to lose.`); return true; }
      if (effect.choice === 'PLAYER' || candidates.length > 1) {
        createPrompt(room, { type: 'DISCARD_GEAR', playerId: player.id, message: `${player.name} must discard Gear.`, options: candidates, meta: { effect, after: context.after || 'CONTINUE' } });
        return false;
      }
      discardSpecificGear(room, player, candidates[0].instanceId);
      return true;
    }
    case 'DRAW_LOOT': {
      const drawn = drawMany(room, player, 'LOOT', effect.count || 1);
      log(room, `${player.name} drew ${drawn} Loot.`);
      return true;
    }
    case 'DRAW_CHAMBER': {
      const drawn = drawMany(room, player, 'CHAMBER', effect.count || 1);
      log(room, `${player.name} drew ${drawn} Chamber.`);
      return true;
    }
    case 'MODIFY_COMBAT_TOTAL': {
      if (!room.combat) return true;
      const amount = effect.amount || 0;
      if (effect.side === 'THREAT') room.combat.threatDelta += amount;
      else room.combat.playerDelta += amount;
      log(room, `${sourceCard?.publicName || 'A card'} changed ${effect.side === 'THREAT' ? 'Threat' : 'Player'} side by ${amount > 0 ? '+' : ''}${amount}.`);
      return true;
    }
    case 'MODIFY_ESCAPE_ROLL': {
      player.temporaryEffects.push({ type: 'MODIFY_ESCAPE_ROLL', amount: effect.amount || 0, duration: effect.duration || 'NEXT_ESCAPE' });
      log(room, `${player.name} has ${effect.amount > 0 ? '+' : ''}${effect.amount || 0} to their next Escape roll.`);
      return true;
    }
    case 'AUTO_ESCAPE': {
      player.temporaryEffects.push({ type: 'AUTO_ESCAPE', duration: 'NEXT_ESCAPE' });
      log(room, `${player.name} has an automatic Escape ready.`);
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

function drawMany(room, player, deck, count) {
  let drawn = 0;
  for (let i = 0; i < count; i++) {
    const c = draw(room, deck);
    if (c) { player.hand.push(c); drawn++; }
  }
  return drawn;
}

function gainRenown(room, player, amount, canWin, fromCombat) {
  const before = player.renown;
  let next = before + amount;
  if (!fromCombat && !canWin && next >= 10) next = 9;
  player.renown = Math.max(1, Math.min(10, next));
  const gained = player.renown - before;
  if (gained > 0) log(room, `${player.name} gained ${gained} Renown.`);
  else if (!fromCombat && !canWin && before >= 9) log(room, `${player.name} cannot gain the final Renown outside combat.`);
}

function selectableGear(player, effect) {
  let zones = [];
  if (effect.target === 'EQUIPPED_GEAR') zones = player.equippedGear;
  else if (effect.target === 'CARRIED_GEAR') zones = player.carriedGear;
  else zones = [...player.equippedGear, ...player.carriedGear];
  return zones.filter((g) => {
    if (!effect.slot || effect.slot === 'ANY') return true;
    return g.slot === effect.slot;
  });
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
  else if (after === 'CONTINUE_ESCAPE') continueEscape(room);
  else if (after === 'TO_TRIBUTE_OR_END') moveToTributeOrEnd(room);
}

function legalActions(room, player) {
  const actions = [];
  if (room.status === 'LOBBY') {
    if (room.players[0]?.id === player.id && room.players.length === 3) actions.push('START_GAME');
    return actions;
  }
  if (room.pendingPrompt?.playerId === player.id) actions.push('RESOLVE_PROMPT');
  if (room.phase === 'START_TURN' && activeId(room) === player.id) actions.push('OPEN_CHAMBER');
  if (canActOutsideCombat(room) && activeId(room) === player.id) actions.push('PLAY_TABLE_CARDS');
  if (room.phase === 'NO_THREAT_CHOICE' && activeId(room) === player.id) actions.push('SEARCH_ROOM', 'START_TROUBLE');
  if (room.phase === 'END_TURN' && activeId(room) === player.id) actions.push('END_TURN');
  if (room.phase === 'TRIBUTE' && activeId(room) === player.id) actions.push('GIVE_TRIBUTE');
  if (room.phase === 'COMBAT') actions.push('COMBAT_ACTIONS', 'PASS_COMBAT');
  if (room.phase === 'ESCAPE' && room.escape?.currentPlayerId === player.id) actions.push('ROLL_ESCAPE');
  return actions;
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
  room.activePlayerIndex = (room.activePlayerIndex + 1) % room.players.length;
  room.turnNumber += 1;
  room.phase = 'START_TURN';
  log(room, `${getActive(room).name}'s turn begins.`);
}

function setupGame(room) {
  room.status = 'GAME';
  room.phase = 'START_TURN';
  room.turnNumber = 1;
  room.activePlayerIndex = 0;
  room.chamberDeck = expandDeck(chamberCards);
  room.lootDeck = expandDeck(lootCards);
  room.chamberDiscard = [];
  room.lootDiscard = [];
  room.revealCard = null;
  room.combat = null;
  room.escape = null;
  room.pendingPrompt = null;
  room.winnerId = null;
  for (const p of room.players) {
    p.renown = 1;
    p.hand = [];
    p.role = null;
    p.origin = null;
    p.carriedGear = [];
    p.equippedGear = [];
    p.temporaryEffects = [];
    p.usedHalfstepSale = false;
    drawMany(room, p, 'CHAMBER', 4);
    drawMany(room, p, 'LOOT', 4);
  }
  log(room, `Game started. ${getActive(room).name} goes first.`);
}

function resolveHex(room, card, targetPlayer, after = 'TO_NO_THREAT_CHOICE') {
  log(room, `Hex revealed: ${card.publicName}.`);
  let complete = true;
  for (const effect of card.effects || []) {
    const ok = applyEffect(room, targetPlayer, effect, card, { after });
    if (!ok) complete = false;
  }
  discardCard(room, card);
  if (complete) room.phase = after === 'TO_NO_THREAT_CHOICE' ? 'NO_THREAT_CHOICE' : room.phase;
}

function resolveCombat(room) {
  const totals = combatTotals(room);
  const active = getPlayer(room, room.combat.activePlayerId);
  const helper = room.combat.helperPlayerId ? getPlayer(room, room.combat.helperPlayerId) : null;
  if (totals.wins) {
    const renown = room.combat.threats.reduce((s, t) => s + (t.renownReward || 0), 0);
    const loot = room.combat.threats.reduce((s, t) => s + finalThreatLoot(t), 0);
    gainRenown(room, active, renown, true, true);
    drawMany(room, active, 'LOOT', loot);
    log(room, `${active.name} defeated the Threat side and drew ${loot} Loot.`);
    if (helper?.origin?.mechanicalSlot === 'ELF_EQUIV') gainRenown(room, helper, 1, false, false);
    cleanupCombatToDiscard(room);
    if (active.renown >= 10) {
      room.phase = 'GAME_OVER';
      room.status = 'GAME_OVER';
      room.winnerId = active.id;
      log(room, `${active.name} wins by combat!`);
    } else moveToTributeOrEnd(room);
  } else {
    log(room, `${active.name} failed to defeat the Threat side. Escape begins.`);
    room.phase = 'ESCAPE';
    const runners = [active.id];
    if (helper) runners.push(helper.id);
    room.escape = { runners, index: 0, currentPlayerId: runners[0], threat: room.combat.threats[0], lastRoll: null };
  }
}

function cleanupCombatToDiscard(room) {
  if (!room.combat) return;
  for (const threat of room.combat.threats) {
    for (const m of threat.modifiers || []) discardCard(room, m);
    discardCard(room, threat);
  }
  for (const trick of room.combat.playedTricks || []) discardCard(room, trick);
  room.combat = null;
  room.escape = null;
}

function continueEscape(room) {
  if (!room.escape) return;
  room.escape.index += 1;
  if (room.escape.index >= room.escape.runners.length) {
    cleanupCombatToDiscard(room);
    moveToTributeOrEnd(room);
  } else {
    room.escape.currentPlayerId = room.escape.runners[room.escape.index];
    room.escape.lastRoll = null;
  }
}

function rollEscape(room, player) {
  if (player.temporaryEffects.some((e) => e.type === 'AUTO_ESCAPE')) {
    player.temporaryEffects = player.temporaryEffects.filter((e) => e.type !== 'AUTO_ESCAPE');
    log(room, `${player.name} automatically escaped.`);
    continueEscape(room);
    return;
  }
  const raw = Math.ceil(Math.random() * 6);
  const bonus = gearEscapeBonus(player) + originEscapeBonus(player) + temporaryEscapeBonus(player);
  const total = raw + bonus;
  player.temporaryEffects = player.temporaryEffects.filter((e) => e.duration !== 'NEXT_ESCAPE');
  room.escape.lastRoll = { raw, bonus, total };
  log(room, `${player.name} rolled Escape: ${raw}${bonus ? ` ${bonus > 0 ? '+' : ''}${bonus}` : ''} = ${total}.`);
  if (total >= 5) {
    log(room, `${player.name} escaped.`);
    continueEscape(room);
  } else {
    const threat = room.escape.threat;
    log(room, `${player.name} failed to escape ${threat.publicName}.`);
    const ok = applyEffect(room, player, threat.consequence, threat, { after: 'CONTINUE_ESCAPE' });
    if (ok) continueEscape(room);
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
  socket.emit('ready', { version: '0.3.0' });

  socket.on('createRoom', ({ name }) => {
    const room = makeRoom(name, socket);
    socket.join(room.code);
  });

  socket.on('joinRoom', ({ name, code }) => {
    const room = rooms.get(String(code || '').trim().toUpperCase());
    if (!room) return emitError(socket, 'Room not found.');
    if (room.players.length >= 3) return emitError(socket, 'This v0.3 table is limited to 3 players.');
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
  if (room.pendingPrompt && type !== 'RESOLVE_PROMPT') return emitError(socket, 'A prompt must be resolved before anything else can happen.');

  if (type === 'START_GAME') {
    if (room.status !== 'LOBBY') return emitError(socket, 'Game already started.');
    if (room.players[0].id !== player.id) return emitError(socket, 'Only the host can start the game.');
    if (room.players.length !== 3) return emitError(socket, 'You need exactly 3 players to start.');
    setupGame(room);
    return;
  }

  if (type === 'OPEN_CHAMBER') {
    if (room.phase !== 'START_TURN') return emitError(socket, 'You can only open a Chamber at the start of your turn.');
    if (!isOwnTurn(room, socket)) return emitError(socket, 'Only the active player can open a Chamber.');
    const card = draw(room, 'CHAMBER');
    if (!card) return emitError(socket, 'The Chamber deck is empty.');
    room.revealCard = card;
    log(room, `${player.name} opened a Chamber: ${card.publicName}.`);
    if (card.type === 'THREAT') startCombat(room, card);
    else if (card.type === 'HEX') resolveHex(room, card, player, 'TO_NO_THREAT_CHOICE');
    else {
      player.hand.push(card);
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
    if (room.phase !== 'NO_THREAT_CHOICE' || !isOwnTurn(room, socket)) return emitError(socket, 'You can only Start Trouble after a non-Threat Chamber reveal on your turn.');
    const card = findAndRemoveFromHand(player, payload.cardId);
    if (!card || card.type !== 'THREAT') return emitError(socket, 'Choose a Threat from your hand to Start Trouble.');
    startCombat(room, card);
    return;
  }

  if (type === 'SEARCH_ROOM') {
    if (room.phase !== 'NO_THREAT_CHOICE' || !isOwnTurn(room, socket)) return emitError(socket, 'Only the active player can Search Room in this phase.');
    const card = draw(room, 'CHAMBER');
    if (card) player.hand.push(card);
    log(room, `${player.name} searched the room and drew a hidden Chamber card.`);
    room.revealCard = null;
    moveToTributeOrEnd(room);
    return;
  }

  if (type === 'REQUEST_BACKUP') {
    if (room.phase !== 'COMBAT' || !room.combat) return emitError(socket, 'Backup can only be requested during combat.');
    if (room.combat.activePlayerId !== player.id) return emitError(socket, 'Only the active combat player can request Backup.');
    const target = getPlayer(room, payload.targetPlayerId);
    if (!target || target.id === player.id) return emitError(socket, 'Choose another player for Backup.');
    room.combat.backupRequest = { fromPlayerId: player.id, toPlayerId: target.id, deal: payload.deal || 'Custom table deal' };
    log(room, `${player.name} requested Backup from ${target.name}. Deal: ${room.combat.backupRequest.deal}.`);
    return;
  }

  if (type === 'ACCEPT_BACKUP') {
    if (!room.combat?.backupRequest || room.combat.backupRequest.toPlayerId !== player.id) return emitError(socket, 'No Backup request for you.');
    room.combat.helperPlayerId = player.id;
    room.combat.backupRequest = null;
    resetCombatPasses(room);
    log(room, `${player.name} joined the combat as Backup.`);
    return;
  }

  if (type === 'DECLINE_BACKUP') {
    if (!room.combat?.backupRequest || room.combat.backupRequest.toPlayerId !== player.id) return emitError(socket, 'No Backup request for you.');
    log(room, `${player.name} declined Backup.`);
    room.combat.backupRequest = null;
    return;
  }

  if (type === 'PASS_COMBAT') {
    if (room.phase !== 'COMBAT' || !room.combat) return emitError(socket, 'There is no combat to pass on.');
    room.combat.passes[player.id] = true;
    log(room, `${player.name} passed in combat.`);
    if (allCombatPlayersPassed(room)) resolveCombat(room);
    return;
  }

  if (type === 'ROLL_ESCAPE') {
    if (room.phase !== 'ESCAPE' || room.escape?.currentPlayerId !== player.id) return emitError(socket, 'It is not your Escape roll.');
    rollEscape(room, player);
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
    if (!canActOutsideCombat(room) || activeId(room) !== player.id) return emitError(socket, 'Roles can only be played on your own turn outside combat.');
    const real = findAndRemoveFromHand(player, card.instanceId);
    if (player.role) discardCard(room, player.role);
    player.role = real;
    log(room, `${player.name} became ${real.publicName}.`);
    return;
  }

  if (card.type === 'ORIGIN') {
    if (!canActOutsideCombat(room) || activeId(room) !== player.id) return emitError(socket, 'Origins can only be played on your own turn outside combat.');
    const real = findAndRemoveFromHand(player, card.instanceId);
    if (player.origin) discardCard(room, player.origin);
    player.origin = real;
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
      log(room, `${player.name} equipped ${real.publicName}.`);
      return;
    }
    if (mode === 'UNEQUIP') {
      const idx = player.equippedGear.findIndex((g) => g.instanceId === card.instanceId);
      if (idx < 0) return emitError(socket, 'That Gear is not equipped.');
      const [real] = player.equippedGear.splice(idx, 1);
      carryGear(player, real);
      log(room, `${player.name} moved ${real.publicName} to carried Gear.`);
      return;
    }
  }

  if (card.type === 'SPECIAL') {
    if (!canActOutsideCombat(room) || activeId(room) !== player.id) return emitError(socket, 'Specials in this build can be played only on your turn outside combat.');
    const real = findAndRemoveFromHand(player, card.instanceId);
    if (!real) return emitError(socket, 'Special must be in your hand.');
    const ok = applyEffect(room, player, real.effect, real, { after: 'TO_TRIBUTE_OR_END' });
    if (ok) discardCard(room, real);
    log(room, `${player.name} played ${real.publicName}.`);
    return;
  }

  if (card.type === 'TRICK') {
    if (!room.combat || room.phase !== 'COMBAT') return emitError(socket, 'Tricks can only be played during combat unless their card says otherwise.');
    if (!(card.timing || []).includes('DURING_COMBAT')) return emitError(socket, 'That Trick is not playable in this combat window.');
    const real = findAndRemoveFromHand(player, card.instanceId);
    if (!real) return emitError(socket, 'Trick must be in your hand.');
    applyEffect(room, player, real.effect, real);
    room.combat.playedTricks.push(real);
    resetCombatPasses(room);
    log(room, `${player.name} played ${real.publicName}. Passes reset.`);
    return;
  }

  if (card.type === 'THREAT_MODIFIER') {
    if (!room.combat || room.phase !== 'COMBAT') return emitError(socket, 'Threat Modifiers can only be played during combat.');
    const real = findAndRemoveFromHand(player, card.instanceId);
    if (!real) return emitError(socket, 'Modifier must be in your hand.');
    const threat = room.combat.threats[0];
    threat.modifiers = threat.modifiers || [];
    threat.modifiers.push(real);
    resetCombatPasses(room);
    log(room, `${player.name} attached ${real.publicName} to ${threat.publicName}. Passes reset.`);
    return;
  }

  if (card.type === 'HEX') {
    if (room.phase === 'COMBAT' && (card.timing || []).includes('DURING_COMBAT')) {
      const real = findAndRemoveFromHand(player, card.instanceId);
      for (const effect of real.effects || []) applyEffect(room, player, effect, real);
      discardCard(room, real);
      resetCombatPasses(room);
      log(room, `${player.name} played Hex: ${real.publicName}. Passes reset.`);
      return;
    }
    return emitError(socket, 'This Hex is not playable right now in v0.3.');
  }

  if (card.type === 'THREAT') return emitError(socket, 'Threats are played with Start Trouble after a non-Threat Chamber reveal.');
  return emitError(socket, 'That card has no legal action right now.');
}

function resolveTribute(socket, room, player, payload) {
  const over = player.hand.length - handLimit(player);
  if (over <= 0) { room.phase = 'END_TURN'; return; }
  const cardIds = Array.isArray(payload.cardIds) ? payload.cardIds : [];
  if (cardIds.length !== over) return emitError(socket, `Choose exactly ${over} card${over === 1 ? '' : 's'} for Tribute.`);
  const unique = [...new Set(cardIds)];
  if (unique.length !== cardIds.length) return emitError(socket, 'Choose different cards.');
  const minRenown = Math.min(...room.players.map((p) => p.renown));
  const activeIsLowest = player.renown === minRenown;
  let recipient = null;
  if (!activeIsLowest) {
    const legalRecipients = room.players.filter((p) => p.id !== player.id && p.renown === minRenown);
    recipient = getPlayer(room, payload.targetPlayerId) || legalRecipients[0];
    if (!recipient || !legalRecipients.some((p) => p.id === recipient.id)) return emitError(socket, 'Choose a lowest-Renown player as recipient.');
  }
  const moved = [];
  for (const id of unique) {
    const card = findAndRemoveFromHand(player, id);
    if (!card) return emitError(socket, 'One selected Tribute card was not in your hand.');
    moved.push(card);
  }
  if (recipient) {
    recipient.hand.push(...moved);
    log(room, `${player.name} gave ${moved.length} Tribute card${moved.length === 1 ? '' : 's'} to ${recipient.name}.`);
  } else {
    for (const card of moved) discardCard(room, card);
    log(room, `${player.name} discarded ${moved.length} excess card${moved.length === 1 ? '' : 's'} because they were tied for lowest Renown.`);
  }
  room.phase = 'END_TURN';
}

function resolvePrompt(socket, room, player, payload) {
  const prompt = room.pendingPrompt;
  if (!prompt) return emitError(socket, 'No prompt to resolve.');
  if (prompt.playerId !== player.id) return emitError(socket, 'This prompt is not for you.');
  const after = prompt.meta?.after || 'CONTINUE';
  if (prompt.type === 'DISCARD_GEAR') {
    const valid = (prompt.options || []).some((c) => c.instanceId === payload.cardId);
    if (!valid) return emitError(socket, 'Choose a valid Gear card.');
    discardSpecificGear(room, player, payload.cardId);
    continueAfterPrompt(room, after);
    return;
  }
  if (prompt.type === 'MANUAL') {
    log(room, `${player.name} confirmed manual resolution.`);
    continueAfterPrompt(room, after);
    return;
  }
  emitError(socket, 'Unknown prompt type.');
}

server.listen(PORT, () => {
  console.log(`Dungeon Buddies v0.3 listening on ${PORT}`);
});
