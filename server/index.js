const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { chamberCards, lootCards } = require('./cards');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
function randomId(alphabet, length) {
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
const codeId = () => randomId('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 5);
const instanceId = () => randomId('abcdefghijklmnopqrstuvwxyz0123456789', 10);
const rooms = new Map();

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/health', (_, res) => res.json({ ok: true, rooms: rooms.size }));

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

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

function draw(room, deckName) {
  const deckKey = deckName === 'CHAMBER' ? 'chamberDeck' : 'lootDeck';
  const discardKey = deckName === 'CHAMBER' ? 'chamberDiscard' : 'lootDiscard';
  if (room[deckKey].length === 0 && room[discardKey].length > 0) {
    room[deckKey] = shuffle(room[discardKey]);
    room[discardKey] = [];
    log(room, `${deckName === 'CHAMBER' ? 'Chamber' : 'Loot'} discard was shuffled back into the deck.`);
  }
  return room[deckKey].shift() || null;
}

function log(room, message) {
  room.log.push({ at: Date.now(), message });
  if (room.log.length > 120) room.log.shift();
}

function getPlayer(room, playerId) {
  return room.players.find((p) => p.id === playerId);
}

function getActive(room) {
  return room.players[room.activePlayerIndex];
}

function handLimit(player) {
  let limit = 5;
  if (player.origin?.mechanicalSlot === 'DWARF_EQUIV') limit += 1;
  return limit;
}

function heavyLimit(player) {
  let limit = 1;
  if (player.origin?.mechanicalSlot === 'DWARF_EQUIV') limit += 1;
  return limit;
}

function gearCombatBonus(player) {
  return player.gear.reduce((sum, card) => sum + (card.combatBonus || 0), 0);
}

function gearEscapeBonus(player) {
  return player.gear.reduce((sum, card) => sum + (card.escapeBonus || 0), 0);
}

function roleCombatBonusAgainstThreats(player, threats) {
  let bonus = 0;
  if (player.role?.mechanicalSlot === 'CLERIC_EQUIV') {
    if (threats.some((t) => (t.tags || []).includes('RESTLESS'))) bonus += 3;
  }
  return bonus;
}

function activeHasTieWin(room) {
  const active = getActive(room);
  return active?.role?.mechanicalSlot === 'WARRIOR_EQUIV';
}

function playerBaseTotal(room, player) {
  if (!player) return 0;
  return player.renown + gearCombatBonus(player) + roleCombatBonusAgainstThreats(player, room.combat?.threats || []);
}

function threatBaseTotal(room) {
  if (!room.combat) return 0;
  let total = 0;
  for (const threat of room.combat.threats) {
    total += threat.strength || 0;
    for (const rule of threat.specialRules || []) {
      if (rule.type === 'BONUS_AGAINST_ROLE') {
        const active = getActive(room);
        if (active?.role?.mechanicalSlot === rule.roleMechanicalSlot) total += rule.amount || 0;
      }
    }
  }
  total += room.combat.threatDelta || 0;
  return Math.max(0, total);
}

function combatTotals(room) {
  if (!room.combat) return null;
  const active = getActive(room);
  const helper = room.combat.helperId ? getPlayer(room, room.combat.helperId) : null;
  const playerTotal = playerBaseTotal(room, active) + playerBaseTotal(room, helper) + (room.combat.playerDelta || 0);
  const threatTotal = threatBaseTotal(room);
  const wins = activeHasTieWin(room) ? playerTotal >= threatTotal : playerTotal > threatTotal;
  return { playerTotal, threatTotal, wins, tieWin: activeHasTieWin(room) };
}

function findCardInHand(player, instanceIdValue) {
  const idx = player.hand.findIndex((c) => c.instanceId === instanceIdValue);
  if (idx === -1) return null;
  const [card] = player.hand.splice(idx, 1);
  return card;
}

function discardCard(room, card) {
  if (!card) return;
  if (card.deck === 'CHAMBER') room.chamberDiscard.push(card);
  else room.lootDiscard.push(card);
}

function gainRenown(player, amount, canWin, fromCombat = false) {
  let next = player.renown + amount;
  if (!fromCombat && !canWin && next >= 10) next = 9;
  player.renown = Math.min(10, Math.max(1, next));
}

function applyEffect(room, player, effect, sourceCard) {
  if (!player || !effect) return;
  switch (effect.type) {
    case 'LOSE_RENOWN': {
      const min = effect.minimum ?? 1;
      player.renown = Math.max(min, player.renown - (effect.amount || 1));
      log(room, `${player.name} lost ${effect.amount || 1} Renown.`);
      break;
    }
    case 'LOSE_ROLE': {
      if (player.role) {
        discardCard(room, player.role);
        log(room, `${player.name} lost their Role.`);
      }
      player.role = null;
      break;
    }
    case 'LOSE_ORIGIN': {
      if (player.origin) {
        discardCard(room, player.origin);
        log(room, `${player.name} lost their Origin.`);
      }
      player.origin = null;
      break;
    }
    case 'DISCARD_CARD_RANDOM': {
      const count = Math.min(effect.count || 1, player.hand.length);
      for (let i = 0; i < count; i++) {
        const index = Math.floor(Math.random() * player.hand.length);
        const [card] = player.hand.splice(index, 1);
        discardCard(room, card);
      }
      log(room, `${player.name} discarded ${count} random card${count === 1 ? '' : 's'}.`);
      break;
    }
    case 'DISCARD_HAND': {
      const count = player.hand.length;
      while (player.hand.length) discardCard(room, player.hand.pop());
      log(room, `${player.name} discarded their hand (${count} cards).`);
      break;
    }
    case 'DISCARD_GEAR': {
      const candidates = player.gear.filter((g) => {
        if (effect.slot === 'ANY') return true;
        if (effect.slot === 'HAND') return g.slot === 'HAND';
        return g.slot === effect.slot;
      });
      if (candidates.length === 0) {
        log(room, `${player.name} had no matching Gear to lose.`);
        break;
      }
      const lost = candidates[0];
      player.gear = player.gear.filter((g) => g.instanceId !== lost.instanceId);
      discardCard(room, lost);
      log(room, `${player.name} lost ${lost.publicName}.`);
      break;
    }
    case 'DRAW_LOOT': {
      const drawn = [];
      for (let i = 0; i < (effect.count || 1); i++) {
        const card = draw(room, 'LOOT');
        if (card) {
          player.hand.push(card);
          drawn.push(card);
        }
      }
      log(room, `${player.name} drew ${drawn.length} Loot.`);
      break;
    }
    case 'GAIN_RENOWN': {
      gainRenown(player, effect.amount || 1, Boolean(effect.canWin), false);
      log(room, `${player.name} gained ${effect.amount || 1} Renown${effect.canWin ? '' : ' (cannot win this way)'}.`);
      break;
    }
    default:
      log(room, `${sourceCard?.publicName || 'A card'} requires manual resolution.`);
  }
}

function resolveHex(room, player, card) {
  for (const effect of card.effects || []) applyEffect(room, player, effect, card);
  discardCard(room, card);
}

function enterEndOrTribute(room) {
  const active = getActive(room);
  if (active.hand.length > handLimit(active)) {
    room.phase = 'TRIBUTE';
    log(room, `${active.name} must give Tribute down to ${handLimit(active)} cards.`);
  } else {
    room.phase = 'END_TURN';
  }
}

function nextTurn(room) {
  room.combat = null;
  room.activePlayerIndex = (room.activePlayerIndex + 1) % room.players.length;
  room.phase = 'START_TURN';
  const active = getActive(room);
  log(room, `${active.name}'s turn begins.`);
}

function startCombat(room, threat) {
  room.phase = 'COMBAT';
  room.combat = {
    threats: [threat],
    modifiers: [],
    helperId: null,
    helpRequested: false,
    playerDelta: 0,
    threatDelta: 0,
    lootDelta: 0,
    passes: {},
    charmed: false
  };
  log(room, `A Threat appears: ${threat.publicName} (${threat.strength}).`);
}

function resetPasses(room) {
  if (room.combat) room.combat.passes = {};
}

function allPlayersPassed(room) {
  if (!room.combat) return false;
  return room.players.every((p) => room.combat.passes[p.id]);
}

function totalThreatRewards(room) {
  const renown = room.combat.threats.reduce((sum, t) => sum + (t.renownReward || 0), 0);
  const loot = room.combat.threats.reduce((sum, t) => sum + (t.lootReward || 0), 0) + (room.combat.lootDelta || 0);
  return { renown, loot: Math.max(0, loot) };
}

function resolveCombat(room) {
  if (!room.combat) return;
  const active = getActive(room);
  const helper = room.combat.helperId ? getPlayer(room, room.combat.helperId) : null;
  const totals = combatTotals(room);
  const rewards = totalThreatRewards(room);

  if (room.combat.charmed) {
    for (let i = 0; i < rewards.loot; i++) {
      const card = draw(room, 'LOOT');
      if (card) active.hand.push(card);
    }
    for (const threat of room.combat.threats) discardCard(room, threat);
    for (const mod of room.combat.modifiers) discardCard(room, mod);
    log(room, `${active.name} bypassed the Threat and took ${rewards.loot} Loot but gained no Renown.`);
    room.combat = null;
    enterEndOrTribute(room);
    return;
  }

  if (totals.wins) {
    gainRenown(active, rewards.renown, true, true);
    for (let i = 0; i < rewards.loot; i++) {
      const card = draw(room, 'LOOT');
      if (card) active.hand.push(card);
    }
    if (helper?.origin?.mechanicalSlot === 'ELF_EQUIV') {
      gainRenown(helper, 1, false, false);
      log(room, `${helper.name} gained 1 Renown for helping.`);
    }
    log(room, `${active.name}${helper ? ` and ${helper.name}` : ''} defeated the Threat side (${totals.playerTotal} vs ${totals.threatTotal}) and earned ${rewards.renown} Renown / ${rewards.loot} Loot.`);
    for (const threat of room.combat.threats) discardCard(room, threat);
    for (const mod of room.combat.modifiers) discardCard(room, mod);
    room.combat = null;
    if (active.renown >= 10) {
      room.status = 'finished';
      room.phase = 'GAME_OVER';
      room.winnerId = active.id;
      log(room, `${active.name} wins by defeating a Threat and reaching 10 Renown!`);
      return;
    }
    enterEndOrTribute(room);
  } else {
    log(room, `${active.name}${helper ? ` and ${helper.name}` : ''} lost combat (${totals.playerTotal} vs ${totals.threatTotal}). Escape rolls begin.`);
    const runners = [active, helper].filter(Boolean);
    for (const runner of runners) rollEscapeAndApply(room, runner);
    for (const threat of room.combat.threats) discardCard(room, threat);
    for (const mod of room.combat.modifiers) discardCard(room, mod);
    room.combat = null;
    enterEndOrTribute(room);
  }
}

function escapeTarget(player) {
  let bonus = gearEscapeBonus(player);
  if (player.origin?.mechanicalSlot === 'ELF_EQUIV') bonus += 1;
  return { bonus, target: 5 };
}

function rollEscapeAndApply(room, player) {
  const { bonus, target } = escapeTarget(player);
  const roll = Math.floor(Math.random() * 6) + 1;
  const total = roll + bonus;
  if (total >= target) {
    log(room, `${player.name} escaped with a ${roll}${bonus ? ` + ${bonus}` : ''}.`);
    return;
  }
  log(room, `${player.name} failed to escape with a ${roll}${bonus ? ` + ${bonus}` : ''}. Consequences happen.`);
  for (const threat of room.combat.threats) {
    applyConsequence(room, player, threat.consequence, threat);
  }
}

function applyConsequence(room, player, consequence, threat) {
  if (!consequence) return;
  if (consequence.type === 'KNOCKOUT') {
    while (player.hand.length) discardCard(room, player.hand.pop());
    while (player.gear.length) discardCard(room, player.gear.pop());
    log(room, `${player.name} was Knocked Out by ${threat.publicName}: hand and Gear discarded.`);
    return;
  }
  if (consequence.type === 'DISCARD_GEAR' || consequence.type === 'DISCARD_CARD_RANDOM' || consequence.type === 'DISCARD_HAND' || consequence.type === 'LOSE_ROLE' || consequence.type === 'LOSE_ORIGIN' || consequence.type === 'LOSE_RENOWN') {
    applyEffect(room, player, consequence, threat);
    return;
  }
  log(room, `${threat.publicName}'s Consequence needs manual resolution.`);
}

function canEquip(player, card) {
  if (card.type !== 'GEAR') return { ok: false, reason: 'Only Gear can be equipped.' };
  if (card.slot === 'HEAD' && player.gear.some((g) => g.slot === 'HEAD')) return { ok: false, reason: 'Head slot is already full.' };
  if (card.slot === 'BODY' && player.gear.some((g) => g.slot === 'BODY')) return { ok: false, reason: 'Body slot is already full.' };
  if (card.slot === 'FEET' && player.gear.some((g) => g.slot === 'FEET')) return { ok: false, reason: 'Feet slot is already full.' };
  if (card.slot === 'HAND') {
    const used = player.gear.reduce((sum, g) => sum + (g.slot === 'HAND' ? (g.handsUsed || 1) : 0), 0);
    if (used + (card.handsUsed || 1) > 2) return { ok: false, reason: 'You do not have enough free hands.' };
  }
  if (card.isHeavy) {
    const heavyCount = player.gear.filter((g) => g.isHeavy).length;
    if (heavyCount + 1 > heavyLimit(player)) return { ok: false, reason: 'You cannot carry more Heavy Gear.' };
  }
  return { ok: true };
}

function publicCard(card) {
  if (!card) return null;
  const { instanceId, id, deck, type, publicName, publicText, strength, renownReward, lootReward, tags, slot, handsUsed, combatBonus, escapeBonus, scrapValue, isHeavy, mechanicalSlot, effects, timing } = card;
  return { instanceId, id, deck, type, publicName, publicText, strength, renownReward, lootReward, tags, slot, handsUsed, combatBonus, escapeBonus, scrapValue, isHeavy, mechanicalSlot, effects, timing };
}

function project(room, viewerId) {
  const active = getActive(room);
  const projection = {
    code: room.code,
    status: room.status,
    phase: room.phase,
    activePlayerId: active?.id || null,
    activePlayerName: active?.name || null,
    winnerId: room.winnerId || null,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
      isYou: p.id === viewerId,
      renown: p.renown,
      handCount: p.hand.length,
      handLimit: handLimit(p),
      role: publicCard(p.role),
      origin: publicCard(p.origin),
      gear: p.gear.map(publicCard),
      hand: p.id === viewerId ? p.hand.map(publicCard) : undefined
    })),
    decks: {
      chamber: room.chamberDeck?.length || 0,
      loot: room.lootDeck?.length || 0,
      chamberDiscard: room.chamberDiscard?.length || 0,
      lootDiscard: room.lootDiscard?.length || 0
    },
    revealedCard: publicCard(room.revealedCard),
    combat: room.combat ? {
      threats: room.combat.threats.map(publicCard),
      modifiers: room.combat.modifiers.map(publicCard),
      helperId: room.combat.helperId,
      helpRequested: room.combat.helpRequested,
      playerDelta: room.combat.playerDelta,
      threatDelta: room.combat.threatDelta,
      lootDelta: room.combat.lootDelta,
      passes: room.combat.passes,
      totals: combatTotals(room)
    } : null,
    log: room.log.slice(-80),
    chat: room.chat.slice(-60)
  };
  return projection;
}

function broadcast(room) {
  for (const p of room.players) {
    if (p.socketId) io.to(p.socketId).emit('state', project(room, p.id));
  }
}

function fail(socket, message) {
  socket.emit('toast', { type: 'error', message });
}

function ok(socket, message) {
  socket.emit('toast', { type: 'ok', message });
}

function makeRoom(hostName, socket) {
  let code = codeId();
  while (rooms.has(code)) code = codeId();
  const player = makePlayer(hostName, socket.id, true);
  const room = {
    code,
    status: 'lobby',
    phase: 'LOBBY',
    hostId: player.id,
    players: [player],
    activePlayerIndex: 0,
    chamberDeck: [],
    lootDeck: [],
    chamberDiscard: [],
    lootDiscard: [],
    revealedCard: null,
    combat: null,
    log: [],
    chat: []
  };
  rooms.set(code, room);
  log(room, `${player.name} created the room.`);
  socket.join(code);
  socket.data.roomCode = code;
  socket.data.playerId = player.id;
  return room;
}

function makePlayer(name, socketId, host = false) {
  return {
    id: instanceId(),
    name: String(name || 'Player').trim().slice(0, 24) || 'Player',
    socketId,
    connected: true,
    host,
    renown: 1,
    hand: [],
    role: null,
    origin: null,
    gear: [],
    firstSaleUsed: false
  };
}

function startGame(room) {
  room.status = 'playing';
  room.phase = 'START_TURN';
  room.chamberDeck = expandDeck(chamberCards);
  room.lootDeck = expandDeck(lootCards);
  room.chamberDiscard = [];
  room.lootDiscard = [];
  room.players = shuffle(room.players);
  room.activePlayerIndex = 0;
  for (const p of room.players) {
    p.renown = 1;
    p.hand = [];
    p.role = null;
    p.origin = null;
    p.gear = [];
    p.firstSaleUsed = false;
    for (let i = 0; i < 4; i++) {
      const c = draw(room, 'CHAMBER');
      if (c) p.hand.push(c);
      const l = draw(room, 'LOOT');
      if (l) p.hand.push(l);
    }
  }
  log(room, `Game started. ${getActive(room).name} goes first.`);
}

function requireActive(room, socket) {
  const active = getActive(room);
  return active && socket.data.playerId === active.id;
}

function currentRoom(socket) {
  const code = socket.data.roomCode;
  return code ? rooms.get(code) : null;
}

function handleAction(socket, action) {
  const room = currentRoom(socket);
  if (!room) return fail(socket, 'You are not in a room.');
  if (room.status === 'finished') return fail(socket, 'The game is over.');
  const actor = getPlayer(room, socket.data.playerId);
  if (!actor) return fail(socket, 'Player not found.');

  try {
    switch (action.type) {
      case 'START_GAME': {
        if (room.status !== 'lobby') return fail(socket, 'Game already started.');
        if (room.players.length !== 3) return fail(socket, 'Dungeon Buddies v0.2 needs exactly 3 players.');
        if (room.hostId !== actor.id) return fail(socket, 'Only the host can start.');
        startGame(room);
        break;
      }
      case 'OPEN_CHAMBER': {
        if (!requireActive(room, socket)) return fail(socket, 'Only the active player can open a Chamber.');
        if (room.phase !== 'START_TURN') return fail(socket, 'You cannot open a Chamber right now.');
        const card = draw(room, 'CHAMBER');
        if (!card) return fail(socket, 'The Chamber deck is empty.');
        room.revealedCard = card;
        log(room, `${actor.name} opened a Chamber: ${card.publicName}.`);
        if (card.type === 'THREAT') {
          room.revealedCard = null;
          startCombat(room, card);
        } else if (card.type === 'HEX') {
          resolveHex(room, actor, card);
          room.revealedCard = null;
          room.phase = 'NO_THREAT_CHOICE';
        } else {
          actor.hand.push(card);
          room.revealedCard = null;
          log(room, `${actor.name} added ${card.publicName} to hand.`);
          room.phase = 'NO_THREAT_CHOICE';
        }
        break;
      }
      case 'SEARCH_ROOM': {
        if (!requireActive(room, socket)) return fail(socket, 'Only the active player can Search.');
        if (room.phase !== 'NO_THREAT_CHOICE') return fail(socket, 'You cannot Search right now.');
        const card = draw(room, 'CHAMBER');
        if (card) actor.hand.push(card);
        log(room, `${actor.name} searched the room and drew a hidden Chamber card.`);
        enterEndOrTribute(room);
        break;
      }
      case 'START_TROUBLE': {
        if (!requireActive(room, socket)) return fail(socket, 'Only the active player can Start Trouble.');
        if (room.phase !== 'NO_THREAT_CHOICE') return fail(socket, 'You cannot Start Trouble right now.');
        const card = findCardInHand(actor, action.cardId);
        if (!card) return fail(socket, 'That card is not in your hand.');
        if (card.type !== 'THREAT') {
          actor.hand.push(card);
          return fail(socket, 'You can only Start Trouble with a Threat.');
        }
        log(room, `${actor.name} started trouble with ${card.publicName}.`);
        startCombat(room, card);
        break;
      }
      case 'PLAY_CARD': {
        const card = findCardInHand(actor, action.cardId);
        if (!card) return fail(socket, 'That card is not in your hand.');
        const handled = playCard(room, actor, card, action);
        if (!handled.ok) {
          actor.hand.push(card);
          return fail(socket, handled.reason);
        }
        break;
      }
      case 'REQUEST_BACKUP': {
        if (!requireActive(room, socket)) return fail(socket, 'Only the active player can ask for Backup.');
        if (room.phase !== 'COMBAT' || !room.combat) return fail(socket, 'No combat is active.');
        room.combat.helpRequested = true;
        resetPasses(room);
        log(room, `${actor.name} called for Backup${action.offer ? `: ${String(action.offer).slice(0, 80)}` : '.'}`);
        break;
      }
      case 'ACCEPT_BACKUP': {
        if (room.phase !== 'COMBAT' || !room.combat) return fail(socket, 'No combat is active.');
        if (!room.combat.helpRequested) return fail(socket, 'No Backup was requested.');
        if (requireActive(room, socket)) return fail(socket, 'You cannot back yourself up.');
        if (room.combat.helperId) return fail(socket, 'Backup already joined.');
        room.combat.helperId = actor.id;
        resetPasses(room);
        log(room, `${actor.name} joined as Backup.`);
        break;
      }
      case 'DECLINE_BACKUP': {
        if (room.phase !== 'COMBAT' || !room.combat) return fail(socket, 'No combat is active.');
        if (requireActive(room, socket)) return fail(socket, 'You cannot decline your own Backup request.');
        log(room, `${actor.name} declined Backup.`);
        break;
      }
      case 'PASS_REACTION': {
        if (room.phase !== 'COMBAT' || !room.combat) return fail(socket, 'No combat is active.');
        room.combat.passes[actor.id] = true;
        log(room, `${actor.name} passed.`);
        if (allPlayersPassed(room)) resolveCombat(room);
        break;
      }
      case 'END_TURN': {
        if (!requireActive(room, socket)) return fail(socket, 'Only the active player can end the turn.');
        if (room.phase === 'TRIBUTE') return fail(socket, 'You must finish Tribute first.');
        if (room.phase !== 'END_TURN') return fail(socket, 'You cannot end the turn yet.');
        nextTurn(room);
        break;
      }
      case 'GIVE_TRIBUTE': {
        if (!requireActive(room, socket)) return fail(socket, 'Only the active player gives Tribute.');
        if (room.phase !== 'TRIBUTE') return fail(socket, 'No Tribute is needed right now.');
        const excess = actor.hand.length - handLimit(actor);
        if (excess <= 0) {
          room.phase = 'END_TURN';
          break;
        }
        const selected = Array.isArray(action.cardIds) ? action.cardIds.slice(0, excess) : [];
        if (selected.length !== excess) return fail(socket, `Select exactly ${excess} card${excess === 1 ? '' : 's'} for Tribute.`);
        const cards = [];
        for (const cid of selected) {
          const c = findCardInHand(actor, cid);
          if (!c) {
            for (const back of cards) actor.hand.push(back);
            return fail(socket, 'One selected card is not in your hand.');
          }
          cards.push(c);
        }
        const lowest = Math.min(...room.players.map((p) => p.renown));
        const recipients = room.players.filter((p) => p.id !== actor.id && p.renown === lowest);
        let recipient = recipients.find((p) => p.id === action.recipientId) || recipients[0];
        if (actor.renown === lowest && recipients.length === 0) recipient = null;
        if (recipient) {
          recipient.hand.push(...cards);
          log(room, `${actor.name} gave ${cards.length} Tribute card${cards.length === 1 ? '' : 's'} to ${recipient.name}.`);
        } else {
          cards.forEach((c) => discardCard(room, c));
          log(room, `${actor.name} discarded ${cards.length} Tribute card${cards.length === 1 ? '' : 's'}.`);
        }
        room.phase = 'END_TURN';
        break;
      }
      default:
        return fail(socket, 'Unknown action.');
    }
    broadcast(room);
  } catch (err) {
    console.error(err);
    fail(socket, err.message || 'Action failed.');
    broadcast(room);
  }
}

function playCard(room, actor, card, action) {
  const active = getActive(room);
  const ownTurn = active?.id === actor.id;

  if (card.type === 'ROLE') {
    if (!ownTurn || room.phase === 'COMBAT') return { ok: false, reason: 'Roles can be played only on your turn outside combat.' };
    if (actor.role) discardCard(room, actor.role);
    actor.role = card;
    log(room, `${actor.name} became ${card.publicName}.`);
    return { ok: true };
  }

  if (card.type === 'ORIGIN') {
    if (!ownTurn || room.phase === 'COMBAT') return { ok: false, reason: 'Origins can be played only on your turn outside combat.' };
    if (actor.origin) discardCard(room, actor.origin);
    actor.origin = card;
    log(room, `${actor.name} became ${card.publicName}.`);
    return { ok: true };
  }

  if (card.type === 'GEAR') {
    if (!ownTurn || room.phase === 'COMBAT') return { ok: false, reason: 'Gear can be equipped only on your turn outside combat.' };
    const allowed = canEquip(actor, card);
    if (!allowed.ok) return { ok: false, reason: allowed.reason };
    actor.gear.push(card);
    log(room, `${actor.name} equipped ${card.publicName}.`);
    return { ok: true };
  }

  if (card.type === 'THREAT_MODIFIER') {
    if (room.phase !== 'COMBAT' || !room.combat) return { ok: false, reason: 'Threat modifiers can only be played during combat.' };
    room.combat.threatDelta += card.strengthDelta || 0;
    room.combat.lootDelta += card.lootDelta || 0;
    room.combat.modifiers.push(card);
    resetPasses(room);
    log(room, `${actor.name} played ${card.publicName}: Threat side ${card.strengthDelta >= 0 ? '+' : ''}${card.strengthDelta}.`);
    return { ok: true };
  }

  if (card.type === 'TRICK') {
    const effect = card.effect || {};
    if (effect.type === 'MODIFY_COMBAT_TOTAL') {
      if (room.phase !== 'COMBAT' || !room.combat) return { ok: false, reason: 'This Trick must be played during combat.' };
      if (effect.side === 'PLAYER') room.combat.playerDelta += effect.amount || 0;
      if (effect.side === 'THREAT') room.combat.threatDelta += effect.amount || 0;
      discardCard(room, card);
      resetPasses(room);
      log(room, `${actor.name} played ${card.publicName}: ${effect.side === 'PLAYER' ? 'player side' : 'Threat side'} ${effect.amount >= 0 ? '+' : ''}${effect.amount}.`);
      return { ok: true };
    }
    if (effect.type === 'DRAW_LOOT') {
      if (!ownTurn || room.phase === 'COMBAT') return { ok: false, reason: 'This can only be played on your turn outside combat.' };
      applyEffect(room, actor, effect, card);
      discardCard(room, card);
      return { ok: true };
    }
    if (effect.type === 'MODIFY_ESCAPE_ROLL' || effect.type === 'AUTO_ESCAPE' || effect.type === 'REROLL_ESCAPE') {
      return { ok: false, reason: 'Escape Tricks are reserved for the next build pass; keep this card for now.' };
    }
  }

  if (card.type === 'SPECIAL') {
    const effect = card.effect || {};
    if (!ownTurn || room.phase === 'COMBAT') return { ok: false, reason: 'Special cards can be played only on your turn outside combat.' };
    if (effect.type === 'GAIN_RENOWN' || effect.type === 'DRAW_LOOT') {
      applyEffect(room, actor, effect, card);
      discardCard(room, card);
      return { ok: true };
    }
    if (effect.type === 'SELL_GEAR_FOR_RENOWN') {
      actor.hand.push(card);
      return { ok: false, reason: 'Use the Sell Gear button in a later build pass. For now, track selling manually.' };
    }
  }

  return { ok: false, reason: `${card.publicName} is not playable right now.` };
}

io.on('connection', (socket) => {
  socket.emit('ready');

  socket.on('createRoom', ({ name }) => {
    const room = makeRoom(name, socket);
    ok(socket, `Room ${room.code} created.`);
    broadcast(room);
  });

  socket.on('joinRoom', ({ code, name }) => {
    const room = rooms.get(String(code || '').trim().toUpperCase());
    if (!room) return fail(socket, 'Room not found.');
    const cleanName = String(name || '').trim().slice(0, 24) || 'Player';
    let player = room.players.find((p) => p.name.toLowerCase() === cleanName.toLowerCase() && !p.connected);
    if (player) {
      player.socketId = socket.id;
      player.connected = true;
      log(room, `${player.name} reconnected.`);
    } else {
      if (room.players.length >= 3) return fail(socket, 'This room already has 3 players.');
      if (room.status !== 'lobby') return fail(socket, 'This game already started.');
      player = makePlayer(cleanName, socket.id, false);
      room.players.push(player);
      log(room, `${player.name} joined the room.`);
    }
    socket.join(room.code);
    socket.data.roomCode = room.code;
    socket.data.playerId = player.id;
    ok(socket, `Joined room ${room.code}.`);
    broadcast(room);
  });

  socket.on('action', (action) => handleAction(socket, action || {}));

  socket.on('chat', ({ message }) => {
    const room = currentRoom(socket);
    const player = room ? getPlayer(room, socket.data.playerId) : null;
    if (!room || !player) return;
    const text = String(message || '').trim().slice(0, 240);
    if (!text) return;
    room.chat.push({ at: Date.now(), playerId: player.id, name: player.name, message: text });
    if (room.chat.length > 80) room.chat.shift();
    broadcast(room);
  });

  socket.on('disconnect', () => {
    const room = currentRoom(socket);
    if (!room) return;
    const player = getPlayer(room, socket.data.playerId);
    if (!player) return;
    player.connected = false;
    player.socketId = null;
    log(room, `${player.name} disconnected.`);
    broadcast(room);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Dungeon Buddies v0.2 listening on ${PORT}`);
});
