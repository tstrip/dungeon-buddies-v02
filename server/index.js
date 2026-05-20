const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { chamberCards, lootCards } = require('./cards');
const { buildParityReport } = require('./parity');
const { buildRulesLockReport } = require('./rulesLock');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;

const rooms = new Map();
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/health', (_, res) => res.json({ ok: true, rooms: rooms.size, version: '0.11.8.3-action-banner-sell-helper-hotfix-v0783' }));
app.get('/parity', (_, res) => res.json(buildParityReport(chamberCards, lootCards)));
app.get('/rules-lock', (_, res) => res.json(buildRulesLockReport(chamberCards, lootCards, rooms)));
app.get('/qa', (_, res) => res.json(buildRulesLockReport(chamberCards, lootCards, rooms)));
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

function eventMetadata(kind, title = '', detail = '', card = null, options = {}) {
  const k = String(kind || '').toLowerCase();
  const t = String(title || '');
  const d = String(detail || '');
  const joined = `${t} ${d}`;
  const cardType = String(card?.type || '').toUpperCase();
  let priority = options.priority || null;
  let audience = options.audience || 'all';
  let requiresAck = typeof options.requiresAck === 'boolean' ? options.requiresAck : null;
  let category = options.category || k || 'table';

  if (!priority) {
    // Log-only: bookkeeping, waiting, negotiation drafts, and pass states.
    if (/use loot|sell before tribute|use\/sell|using loot|loot phase|tribute pending|window complete|done buffing|done nerfing|confirmed no more|waiting/i.test(joined)) priority = 'log';
    else if (k === 'backup' && !/locked|joins|accepted|deal locked/i.test(joined)) priority = 'log';
    else if (k === 'turn') priority = 'log';

    // Hard: moments that change immediate table reality and should stop the table.
    else if (['bad','death','game','flee','zero-glory'].includes(k)) priority = 'hard';
    else if (k === 'backup' && /locked|joins|accepted|deal locked/i.test(joined)) priority = 'hard';
    else if (k === 'trade' && /accepted|complete|locked|trade/i.test(joined)) priority = 'hard';
    else if (k === 'roll' && /opening roll complete|goes first|winner|flee result|loaded die/i.test(joined)) priority = 'hard';
    else if (k === 'prompt' && /hex needs|choice required|bad news|death|body/i.test(joined)) priority = 'hard';
    else if (k === 'combat') priority = 'hard';
    else if (k === 'card' && ['TRICK','THREAT','THREAT_MODIFIER'].includes(cardType)) priority = 'hard';
    else if (/bad news|goblin down|victory|flee result|foe added|added .*foe|combat card|opening roll complete|goes first|backup deal locked/i.test(joined)) priority = 'hard';

    // Hex reveals/resolved should be visible but not double-acknowledged.
    else if (k === 'hex' && /hex needs|choice required|hex canceled|hex blocked/i.test(joined)) priority = 'hard';
    else if (k === 'hex') priority = 'soft';

    // Soft: visible public updates that should not stop play.
    else if (['gear','draw','reveal','glory','tribute','effect'].includes(k)) priority = 'soft';
    else if (k === 'card' && ['ROLE','ORIGIN','GEAR','SPECIAL'].includes(cardType)) priority = 'soft';
    else if (/kin played|calling played|gear equipped|gear carried|added to hand|card drawn/i.test(joined)) priority = 'soft';

    else priority = 'log';
  }

  if (requiresAck === null) requiresAck = priority === 'hard';
  if (priority === 'log') requiresAck = false;

  return { priority, audience, requiresAck, category };
}

function tableNotice(room, kind, title, detail, card = null) {
  const meta = eventMetadata(kind, title, detail, card, { priority: 'log', requiresAck: false });
  room.tableNotice = { at: Date.now(), kind, title, detail, card: publicCard(card), ...meta };
}

function announce(room, kind, title, detail, card = null, options = {}) {
  const meta = eventMetadata(kind, title, detail, card, options);
  const announcement = {
    at: Date.now(),
    id: instanceId(),
    kind,
    title,
    detail,
    card: publicCard(card),
    importance: options.importance || (meta.priority === 'hard' ? 'major' : 'normal'),
    ...meta
  };
  room.announcement = announcement;
  room.tableNotice = { at: announcement.at, kind, title, detail, card: publicCard(card), ...meta };
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

function describeBadNews(threat) {
  const e = threat?.consequence || {};
  if (!e || !e.type) return threat?.publicText || 'Bad News happens.';
  if (e.type === 'LOSE_RENOWN') return `Lose ${e.amount || 1} Glory.`;
  if (e.type === 'DISCARD_HAND_CARDS') return `Discard ${e.count || e.amount || 1} card${(e.count || e.amount || 1) === 1 ? '' : 's'} from hand.`;
  if (e.type === 'DISCARD_GEAR') {
    if (e.slot === 'HEAD') return 'Lose one equipped Head Gear. If you have no matching Gear, nothing is discarded.';
    if (e.target === 'NON_HEAVY_GEAR') return 'Choose one non-Heavy Gear to discard.';
    return 'Discard Gear matching the card effect.';
  }
  if (e.type === 'LOSE_HEAD_OR_GLORY') return 'Lose one Head Gear. If you have no Head Gear, lose 1 Glory.';
  if (e.type === 'HIGHEST_TAKE_GEAR') return 'The highest-Glory players each take one Gear from you.';
  if (e.type === 'KNOCKOUT') return 'You are knocked out. Other goblins may loot the body.';
  if (e.type === 'ROLL_LOSE_GLORY') return 'Roll a die, then lose Glory based on the result.';
  if (e.type === 'LAWYERS_BAD_NEWS') return 'Legal trouble hits. Follow the card’s Bad News exactly.';
  if (e.type === 'DISCARD_OWNED_CARDS') return `Discard ${e.count || 1} owned card${(e.count || 1) === 1 ? '' : 's'}.`;
  if (e.type === 'DEATH') return 'Death. Loot the body.';
  if (e.type === 'BAD_NEWS_CHOICE' || e.type === 'CHOOSE_BAD_NEWS_OPTION') return 'Choose how the Bad News hits you.';
  return String(e.type).replaceAll('_', ' ').toLowerCase();
}

function playedAnnouncement(room, player, card, label = 'Card Played', detail = '') {
  if (!card) return;
  movement(room, 'PLAYER_HAND', card.type === 'THREAT' ? 'COMBAT_ZONE' : 'TABLE', 'Card Played', `${player?.name || 'A player'} played ${card.publicName}.`, card);
  const tactical = ['TRICK','THREAT','THREAT_MODIFIER'].includes(card.type);
  announce(room, 'card', label, detail || `${player?.name || 'A player'} played ${card.publicName}.`, card, {
    priority: tactical ? 'hard' : 'soft',
    audience: 'all',
    requiresAck: tactical,
    importance: tactical ? 'major' : 'normal',
    category: 'card'
  });
}

function markFresh(card, deckName, reason = 'PRIVATE_DRAW') {
  if (!card) return card;
  card.fresh = true;
  card.freshAt = Date.now();
  card.freshFrom = deckName;
  card.freshReason = reason;
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
    extraOrigins: [],
    callingPermit: null,
    kinPermit: null
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
    badNewsText: card.type === 'THREAT' ? (card.badNewsText || describeBadNews(card)) : undefined,
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
    oneUse: Boolean(card.oneUse || card.type === 'TRICK' || /\bOne-use\b/i.test(card.publicText || '')),
    consumable: Boolean(card.consumable || card.type === 'TRICK' || /\b(Potion|Poison|Drink|Water)\b/i.test(card.publicName || '')),
    cheated: Boolean(card.cheated),
    attachedCards: (card.attachedCards || []).map(publicCard),
    attachmentNames: (card.attachedCards || []).map((a) => a.publicName),
    attachedToCardId: card.attachedToCardId || null,
    attachedToName: card.attachedToName || null,
    isClone: Boolean(card.isClone),
    fresh: Boolean(card.fresh),
    freshAt: card.freshAt || null,
    freshFrom: card.freshFrom || null,
    freshReason: card.freshReason || null
  };
}


function publicStatusEffect(effect) {
  if (!effect) return null;
  return {
    id: effect.id,
    type: effect.type,
    publicName: effect.publicName || effect.sourceName || statusEffectName(effect),
    description: effect.description || statusEffectDescription(effect),
    sourceName: effect.sourceName || null,
    sourceId: effect.sourceId || null,
    amount: effect.amount || 0,
    duration: effect.duration || null,
    expires: effect.expires || null,
    visible: effect.visible !== false
  };
}

function statusEffectName(effect) {
  const map = {
    NEXT_COMBAT_DELTA: 'Next Combat Penalty',
    ONLY_BODY_GEAR_NEXT_COMBAT: 'Unfriendly Mirror',
    DIE_ROLL_PENALTY: 'Bird on Your Head',
    MODIFY_ESCAPE_ROLL: 'Flee Modifier',
    AUTO_ESCAPE: 'Automatic Escape'
  };
  return map[effect?.type] || 'Ongoing Effect';
}

function statusEffectDescription(effect) {
  if (!effect) return '';
  if (effect.type === 'NEXT_COMBAT_DELTA') return `${effect.amount || 0} to your next combat, then discard this effect.`;
  if (effect.type === 'ONLY_BODY_GEAR_NEXT_COMBAT') return 'In your next combat, only Body Gear bonuses count. Then discard this effect.';
  if (effect.type === 'DIE_ROLL_PENALTY') return `${effect.amount || -1} to die rolls until your Head Gear is lost or discarded.`;
  if (effect.type === 'MODIFY_ESCAPE_ROLL') return `${effect.amount || 0} to your next Flee roll.`;
  if (effect.type === 'AUTO_ESCAPE') return 'Your next Flee succeeds automatically.';
  return 'This effect is waiting to happen.';
}

function addStatusEffect(room, player, sourceCard, data) {
  const effect = {
    id: instanceId(),
    sourceId: sourceCard?.instanceId || sourceCard?.id || null,
    sourceName: sourceCard?.publicName || null,
    publicName: data.publicName || sourceCard?.publicName || statusEffectName(data),
    description: data.description || statusEffectDescription(data),
    visible: data.visible !== false,
    ...data
  };
  player.temporaryEffects.push(effect);
  announce(room, 'hex', effect.publicName, `${player.name}: ${effect.description}`, sourceCard, { importance: 'major' });
  return effect;
}

function clearStatusEffects(player, predicate) {
  const removed = [];
  player.temporaryEffects = (player.temporaryEffects || []).filter((e) => {
    if (predicate(e)) { removed.push(e); return false; }
    return true;
  });
  return removed;
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
    callingPermit: publicCard(p.callingPermit),
    kinPermit: publicCard(p.kinPermit),
    carriedGear: p.carriedGear.map(publicCard),
    equippedGear: p.equippedGear.map(publicCard),
    combatBonus: gearCombatBonus(p) + roleStaticCombatBonus(room, p),
    escapeBonus: gearFleeBonus(p) + originFleeBonus(p) + temporaryFleeBonus(p),
    heavyCount: heavyCount(p),
    heavyLimit: heavyLimit(p),
    extraCallingSlots: p.extraCallingSlots || 0,
    extraKinSlots: p.extraKinSlots || 0,
    usedHalfstepSale: Boolean(p.usedHalfstepSale),
    statusEffects: (p.temporaryEffects || []).filter((e) => e.visible !== false).map(publicStatusEffect),
    dead: Boolean(p.dead)
  };
}

function serializeRoom(room, viewerId) {
  const active = getActive(room);
  const viewer = getPlayer(room, viewerId);
  return {
    version: '0.11.8.3-action-banner-sell-helper-hotfix-v0783',
    code: room.code,
    status: room.status,
    phase: room.phase,
    turnNumber: room.turnNumber,
    activePlayerId: active?.id || null,
    activePlayerName: active?.name || null,
    winnerId: room.winnerId || null,
    players: room.players.map((p) => publicPlayer(room, p, viewerId)),
    you: viewer ? { id: viewer.id, name: viewer.name, hand: viewer.hand.map((c) => publicCardForViewer(room, viewer, c)) } : null,
    decks: {
      chamber: room.chamberDeck.length,
      loot: room.lootDeck.length,
      chamberDiscard: room.chamberDiscard.length,
      lootDiscard: room.lootDiscard.length
    },
    discardPiles: {
      chamber: room.chamberDiscard.slice(-60).map(publicCard),
      loot: room.lootDiscard.slice(-60).map(publicCard)
    },
    revealCard: publicCard(room.revealCard),
    tableNotice: room.tableNotice || null,
    announcement: room.announcement || null,
    movement: room.movement || null,
    reaction: serializeReaction(room, viewerId),
    combat: serializeCombat(room),
    escape: serializeEscape(room),
    firstRoll: serializeFirstRoll(room, viewerId),
    pendingPrompt: serializePrompt(room.pendingPrompt, viewerId),
    pendingHex: serializePendingHex(room, viewerId),
    bodyLoot: serializeBodyLoot(room, viewerId),
    tradeOffer: serializeTradeOffer(room, viewerId),
    log: room.log.slice(-80),
    chat: room.chat.slice(-60),
    legalActions: viewer ? legalActions(room, viewer) : [],
    legalCardActions: viewer ? legalCardActions(room, viewer) : {}
  };
}





function actionPayload(type, payload = {}) {
  return { type, payload };
}

function legalCardAction(label, type, payload = {}, style = '', reason = '') {
  return {
    label,
    type,
    payload,
    style,
    reason
  };
}

function publicCardForViewer(room, player, card) {
  const c = publicCard(card);
  if (!c) return c;
  const ownedInHand = player?.hand?.some((h) => h.instanceId === card.instanceId);
  c.ownedByYou = Boolean(ownedInHand);
  c.legalActions = ownedInHand ? legalCardActionsForCard(room, player, card) : [];
  return c;
}

function legalCardActions(room, player) {
  const out = {};
  if (!player) return out;
  for (const card of player.hand || []) {
    out[card.instanceId] = legalCardActionsForCard(room, player, card);
  }
  return out;
}

function actionBlockedByTableState(room, player) {
  if (!room || !player) return true;
  if (player.dead) return true;
  if (room.pendingPrompt) return true;
  if (room.pendingHex) return true;
  return false;
}

function legalReactionActionsForCard(room, player, card) {
  const actions = [];
  const r = room.reaction;
  if (!r || !card) return actions;
  const eligible = r.eligiblePlayerIds || (r.playerId ? [r.playerId] : []);
  if (!eligible.includes(player.id) || r.passes?.[player.id]) return actions;
  if (r.type === 'HEX_CANCEL_REACTION' && card.id === 'SPECIAL_WISHING_RING_A') {
    actions.push(legalCardAction('Cancel Hex', 'USE_WISH_RING', {}, 'primary', 'Use Wish Ring to cancel this Hex.'));
  } else if (r.type === 'DIE_ROLL_REACTION' && card.id === 'SPECIAL_LOADED_DIE') {
    for (let value = 1; value <= 6; value++) actions.push(legalCardAction(`Set die to ${value}`, 'USE_LOADED_DIE', { value }, value === 6 ? 'primary' : '', 'Choose the final die face.'));
  } else if (r.type === 'FLEE_FAILURE_REACTION' && card.id === 'TRICK_INVISIBILITY') {
    actions.push(legalCardAction('Escape Automatically', 'USE_INVISIBILITY_ESCAPE', {}, 'primary', 'Use before Bad News happens.'));
  } else if (r.type === 'FLEE_SUCCESS_REACTION' && card.id === 'TRICK_FLASK_GLUE') {
    actions.push(legalCardAction('Force Flee Reroll', 'USE_FLASK_GLUE', {}, 'primary', 'Interfere with this successful Flee roll.'));
  }
  return actions;
}

function legalCardActionsForCard(room, player, card) {
  const actions = [];
  if (!room || !player || !card) return actions;
  const inHand = player.hand?.some((c) => c.instanceId === card.instanceId);
  if (!inHand) return actions;

  if (room.reaction) return legalReactionActionsForCard(room, player, card);
  if (actionBlockedByTableState(room, player)) return actions;

  const isActive = activeId(room) === player.id;
  const outsideCombatOwnTurn = canActOutsideCombat(room) && isActive;

  if (card.type === 'ROLE') {
    if (outsideCombatOwnTurn && !callingCards(player).some((r) => r.id === card.id)) {
      actions.push(legalCardAction(`Play ${card.publicName}`, 'PLAY_CARD', { cardId: card.instanceId }, 'primary', 'Play this Calling.'));
    }
    return actions;
  }

  if (card.type === 'ORIGIN') {
    if (outsideCombatOwnTurn && !kinCards(player).some((r) => r.id === card.id)) {
      actions.push(legalCardAction(`Play ${card.publicName}`, 'PLAY_CARD', { cardId: card.instanceId }, 'primary', 'Play this Kin.'));
    }
    return actions;
  }

  if (card.type === 'GEAR') {
    if (!outsideCombatOwnTurn || isOneUseConsumable(card)) return actions;
    if (!validateGearEquip(player, card)) actions.push(legalCardAction('Equip', 'PLAY_CARD', { cardId: card.instanceId, mode: 'EQUIP' }, 'primary', 'Equip this Gear.'));
    const combinedHeavy = heavyCount(player) + (card.isHeavy ? 1 : 0);
    if (combinedHeavy <= heavyLimit(player)) actions.push(legalCardAction('Carry', 'PLAY_CARD', { cardId: card.instanceId, mode: 'CARRY' }, '', 'Carry this Gear without equipping it.'));
    actions.push(legalCardAction('Sell / cash in', 'SELL_GEAR', { cardIds: [card.instanceId] }, '', 'Sell this Gear for Junk.'));
    if (card.id !== 'GEAR_HIRELING' && hasLittleHelperWithCapacity(player)) actions.push(legalCardAction('Give to Little Helper', 'ASSIGN_HIRELING_GEAR', { cardId: card.instanceId }, '', 'Assign this Gear to your Little Helper.'));
    return actions;
  }

  if (card.type === 'THREAT') {
    if (room.phase === 'NO_THREAT_CHOICE' && isActive) {
      actions.push(legalCardAction('Start Trouble', 'START_TROUBLE', { cardId: card.instanceId }, 'primary', 'Start combat with this Foe.'));
    }
    if (room.phase === 'COMBAT' && room.combat && (card.tags || []).includes('RESTLESS') && room.combat.threats.some((t) => (t.tags || []).includes('RESTLESS'))) {
      actions.push(legalCardAction('Join Restless Combat', 'PLAY_CARD', { cardId: card.instanceId }, 'primary', 'Restless Foes can join Restless combat.'));
    }
    return actions;
  }

  if (card.type === 'TRICK') {
    if (room.phase === 'ESCAPE' && room.escape?.currentPlayerId === player.id && (card.timing || []).includes('BEFORE_ESCAPE_ROLL')) {
      actions.push(legalCardAction('Play before Flee roll', 'PLAY_CARD', { cardId: card.instanceId }, 'primary', 'Use this before rolling to Flee.'));
      return actions;
    }
    if (room.phase !== 'COMBAT' || !room.combat || !(card.timing || []).includes('DURING_COMBAT')) return actions;
    if (card.effect?.type === 'MODIFY_COMBAT_TOTAL') {
      const amt = Number(card.effect.amount || 0);
      actions.push(legalCardAction(`${amt >= 0 ? 'Buff' : 'Nerf'} Player Side ${amt >= 0 ? '+' : ''}${amt}`, 'PLAY_CARD', { cardId: card.instanceId, side: 'PLAYER' }, 'primary', 'Apply this Trick to the player side.'));
      actions.push(legalCardAction(`${amt >= 0 ? 'Buff' : 'Nerf'} Foe Side ${amt >= 0 ? '+' : ''}${amt}`, 'PLAY_CARD', { cardId: card.instanceId, side: 'THREAT' }, '', 'Apply this Trick to the Foe side.'));
    } else {
      actions.push(legalCardAction('Play Combat Trick', 'PLAY_CARD', { cardId: card.instanceId }, 'primary', 'Use this one-use Trick during combat.'));
    }
    return actions;
  }

  if (card.type === 'THREAT_MODIFIER') {
    if (room.phase !== 'COMBAT' || !room.combat?.threats?.length) return actions;
    if (room.combat.threats.length > 1) {
      for (const foe of room.combat.threats) actions.push(legalCardAction(`Attach to ${foe.publicName}`, 'PLAY_CARD', { cardId: card.instanceId, targetFoeInstanceId: foe.instanceId }, 'primary', 'Modify this Foe.'));
    } else {
      actions.push(legalCardAction('Attach to Foe', 'PLAY_CARD', { cardId: card.instanceId }, 'primary', 'Modify the Foe.'));
    }
    return actions;
  }

  if (card.type === 'HEX') {
    // Hexes are broadly playable, but only from hand and only when no blocking prompt/reaction is active.
    for (const p of room.players.filter((p) => !p.dead)) {
      actions.push(legalCardAction(`Hex ${p.name}${p.id === player.id ? ' (you)' : ''}`, 'PLAY_CARD', { cardId: card.instanceId, targetPlayerId: p.id }, p.id === player.id ? '' : 'primary', 'Play this Hex on that player.'));
    }
    return actions;
  }

  if (card.type === 'SPECIAL') {
    const timing = card.timing || [];
    const canPlayAny = timing.includes('ANY_TIME');
    const canPlayCombat = timing.includes('DURING_COMBAT') && room.phase === 'COMBAT';
    const canPlayOwnTurn = timing.includes('OWN_TURN_OUTSIDE_COMBAT') && outsideCombatOwnTurn;
    const canPlayPostCombatWin = timing.includes('POST_COMBAT_WIN') && room.phase === 'POST_COMBAT' && isActive && room.lastCombatWonThisTurn;
    if (!canPlayAny && !canPlayCombat && !canPlayOwnTurn && !canPlayPostCombatWin) return actions;

    if (card.effect?.type === 'ADD_FOE_FROM_HAND') {
      const hasFoe = player.hand.some((c) => c.type === 'THREAT');
      if (room.phase === 'COMBAT' && hasFoe) actions.push(legalCardAction('Use Unexpected Company', 'PLAY_CARD', { cardId: card.instanceId }, 'primary', 'Choose a Foe from hand to add to combat.'));
      return actions;
    }
    if (card.effect?.type === 'ADD_EXTRA_CALLING_SLOT') {
      if (player.role) actions.push(legalCardAction(`Attach ${card.publicName}`, 'PLAY_CARD', { cardId: card.instanceId }, 'primary', 'Attach to your Calling.'));
      return actions;
    }
    if (card.effect?.type === 'ADD_EXTRA_KIN_SLOT') {
      if (player.origin) actions.push(legalCardAction(`Attach ${card.publicName}`, 'PLAY_CARD', { cardId: card.instanceId }, 'primary', 'Attach to your Kin.'));
      return actions;
    }
    if (card.id === 'SPECIAL_STEAL_LEVEL') {
      for (const p of room.players.filter((p) => p.id !== player.id && !p.dead)) actions.push(legalCardAction(`Steal from ${p.name}`, 'PLAY_CARD', { cardId: card.instanceId, targetPlayerId: p.id }, 'primary', 'Target this player.'));
      return actions;
    }
    if (card.id === 'SPECIAL_TRANSFERRAL' && room.phase === 'COMBAT') {
      for (const p of room.players.filter((p) => p.id !== player.id && p.id !== room.combat?.activePlayerId && !p.dead)) actions.push(legalCardAction(`Transfer to ${p.name}`, 'PLAY_CARD', { cardId: card.instanceId, targetPlayerId: p.id }, 'primary', 'Transfer this combat.'));
      return actions;
    }
    if (room.phase === 'COMBAT' && ['SPECIAL_MAGIC_LAMP','SPECIAL_POLYMORPH','SPECIAL_MATCHING_PROBLEM','SPECIAL_ILLUSION'].includes(card.id) && room.combat?.threats?.length > 1) {
      const verb = card.id === 'SPECIAL_MATCHING_PROBLEM' ? 'Copy' : card.id === 'SPECIAL_ILLUSION' ? 'Replace' : 'Remove';
      for (const foe of room.combat.threats) actions.push(legalCardAction(`${verb} ${foe.publicName}`, 'PLAY_CARD', { cardId: card.instanceId, targetFoeInstanceId: foe.instanceId }, 'primary', `${verb} this Foe.`));
      return actions;
    }
    actions.push(legalCardAction(`Play ${card.publicName}`, 'PLAY_CARD', { cardId: card.instanceId }, 'primary', 'Play this Special.'));
    return actions;
  }

  return actions;
}


function serializePendingHex(room, viewerId) {
  const h = room.pendingHex;
  if (!h) return null;
  const target = getPlayer(room, h.targetPlayerId);
  return {
    card: publicCard(h.card),
    targetPlayerId: h.targetPlayerId,
    targetPlayerName: target?.name || 'Player',
    after: h.after || 'TO_NO_THREAT_CHOICE',
    source: h.source || 'REVEAL',
    requiresYou: viewerId === h.targetPlayerId
  };
}

function serializeTradeOffer(room, viewerId) {
  const offer = room.tradeOffer;
  if (!offer) return null;
  const from = getPlayer(room, offer.fromPlayerId);
  const to = getPlayer(room, offer.toPlayerId);
  const offered = (offer.cardIds || []).map((id) => findCardInPlayerZones(from, id)).filter(Boolean).map(publicCard);
  return {
    id: offer.id,
    fromPlayerId: offer.fromPlayerId,
    fromPlayerName: from?.name || 'Player',
    toPlayerId: offer.toPlayerId,
    toPlayerName: to?.name || 'Player',
    cardIds: offer.cardIds || [],
    cards: offered,
    stage: offer.stage || 'OFFERED',
    requiresYou: viewerId === offer.toPlayerId,
    canRescind: viewerId === offer.fromPlayerId
  };
}

function serializeReaction(room, viewerId) {
  const r = room.reaction;
  if (!r) return null;
  const eligible = r.eligiblePlayerIds || (r.playerId ? [r.playerId] : []);
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    message: r.message,
    playerId: r.playerId || null,
    runnerId: r.runnerId || null,
    eligiblePlayerIds: eligible,
    passes: r.passes || {},
    requiresYou: eligible.includes(viewerId) && !r.passes?.[viewerId],
    card: publicCard(r.card || r.hexCard || r.threat),
    roll: r.roll || null,
    meta: r.meta || {}
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
    badNewsText: describeBadNews(threat),
    badNewsCard: publicCard(threat),
    lastRoll: room.escape.lastRoll || null,
    awaitingContinue: Boolean(room.escape.awaitingContinue)
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
    if (prompt.type === 'CHOOSE_PLAYER' || prompt.type === 'CHOOSE_HIRELING_TARGET') {
      options = (prompt.options || []).map((p) => ({
        id: p.id,
        name: p.name,
        renown: p.renown,
        power: p.renown + gearCombatBonus(p),
        helperCount: littleHelpers(p).length,
        helperName: littleHelpers(p)[0]?.publicName || 'Little Helper'
      }));
    } else options = (prompt.options || []).map(publicCard);
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


function serializeBodyLoot(room, viewerId) {
  const loot = room.bodyLoot;
  if (!loot) return null;
  const victim = getPlayer(room, loot.victimId);
  const currentId = loot.looterIds?.[loot.index || 0] || null;
  return {
    id: loot.id,
    victimId: loot.victimId,
    victimName: victim?.name || 'Player',
    cardCount: loot.cards?.length || 0,
    looterIds: loot.looterIds || [],
    currentLooterId: currentId,
    currentLooterName: currentId ? (getPlayer(room, currentId)?.name || 'Player') : null,
    index: loot.index || 0,
    requiresYou: currentId === viewerId,
    cards: currentId === viewerId ? (loot.cards || []).map(publicCard) : []
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
  if (Array.isArray(card.attachedCards) && card.attachedCards.length) {
    const attachments = card.attachedCards.splice(0);
    for (const attached of attachments) discardCard(room, attached);
  }
  card.fresh = false;
  card.freshAt = null;
  const to = card.deck === 'CHAMBER' ? 'CHAMBER_DISCARD' : 'LOOT_DISCARD';
  if (card.deck === 'CHAMBER') room.chamberDiscard.push(card);
  else room.lootDiscard.push(card);
  movement(room, 'TABLE', to, 'Card → Discard', `${card.publicName || 'A card'} moved to discard.`, card);
}

function discardCallingPermit(room, player, reason = '') {
  if (!player?.callingPermit) return null;
  const permit = player.callingPermit;
  player.callingPermit = null;
  player.extraCallingSlots = 0;
  discardCard(room, permit);
  while ((player.extraRoles || []).length) {
    const extra = player.extraRoles.pop();
    discardCard(room, extra);
    announce(room, 'effect', 'Extra Calling Discarded', `${player.name} lost ${extra.publicName} because ${permit.publicName} left play.`, extra, { importance: 'normal' });
  }
  if (reason) log(room, `${permit.publicName} left play: ${reason}`);
  return permit;
}

function discardKinPermit(room, player, reason = '') {
  if (!player?.kinPermit) return null;
  const permit = player.kinPermit;
  player.kinPermit = null;
  player.extraKinSlots = 0;
  discardCard(room, permit);
  while ((player.extraOrigins || []).length) {
    const extra = player.extraOrigins.pop();
    discardCard(room, extra);
    announce(room, 'effect', 'Extra Kin Discarded', `${player.name} lost ${extra.publicName} because ${permit.publicName} left play.`, extra, { importance: 'normal' });
  }
  if (reason) log(room, `${permit.publicName} left play: ${reason}`);
  return permit;
}

function attachCallingPermit(room, player, permit) {
  if (!permit) return false;
  if (!player.role) return false;
  if (player.callingPermit) discardCallingPermit(room, player, 'a new Calling permit replaced it');
  permit.attachedToCardId = player.role.instanceId;
  permit.attachedToName = player.role.publicName;
  player.callingPermit = permit;
  player.extraCallingSlots = 1;
  announce(room, 'effect', 'Overqualified Attached', `${player.name} attached ${permit.publicName} to ${player.role.publicName}. With one Calling, disadvantages are ignored. A second Calling may be played.`, permit, { importance: 'major' });
  log(room, `${player.name} attached ${permit.publicName} to ${player.role.publicName}.`);
  revalidateIdentityGear(room, player);
  return true;
}

function attachKinPermit(room, player, permit) {
  if (!permit) return false;
  if (!player.origin) return false;
  if (player.kinPermit) discardKinPermit(room, player, 'a new Kin permit replaced it');
  permit.attachedToCardId = player.origin.instanceId;
  permit.attachedToName = player.origin.publicName;
  player.kinPermit = permit;
  player.extraKinSlots = 1;
  announce(room, 'effect', 'Mixed Kin Attached', `${player.name} attached ${permit.publicName} to ${player.origin.publicName}. With one Kin, disadvantages are ignored. A second Kin may be played.`, permit, { importance: 'major' });
  log(room, `${player.name} attached ${permit.publicName} to ${player.origin.publicName}.`);
  revalidateIdentityGear(room, player);
  return true;
}

function loseCallingByInstance(room, player, instanceId, sourceCard = null) {
  const all = callingCards(player);
  if (!all.length) return null;
  let lost = null;
  if (player.role?.instanceId === instanceId || !instanceId) {
    lost = player.role;
    player.role = null;
    if ((player.extraRoles || []).length) player.role = player.extraRoles.shift();
  } else {
    const idx = (player.extraRoles || []).findIndex((r) => r.instanceId === instanceId);
    if (idx >= 0) [lost] = player.extraRoles.splice(idx, 1);
  }
  if (!lost) return null;
  discardCard(room, lost);
  announce(room, 'effect', 'Calling Lost', `${player.name} lost ${lost.publicName}.`, sourceCard || lost, { importance: 'major' });
  if (player.callingPermit?.attachedToCardId === lost.instanceId || (player.callingPermit && callingCards(player).length > 1 && !player.role)) {
    discardCallingPermit(room, player, `attached Calling ${lost.publicName} was lost`);
  }
  if (!player.callingPermit && (player.extraRoles || []).length) {
    while (player.extraRoles.length) discardCard(room, player.extraRoles.pop());
  }
  revalidateIdentityGear(room, player);
  return lost;
}

function loseKinByInstance(room, player, instanceId, sourceCard = null) {
  const all = kinCards(player);
  if (!all.length) return null;
  let lost = null;
  if (player.origin?.instanceId === instanceId || !instanceId) {
    lost = player.origin;
    player.origin = null;
    if ((player.extraOrigins || []).length) player.origin = player.extraOrigins.shift();
  } else {
    const idx = (player.extraOrigins || []).findIndex((r) => r.instanceId === instanceId);
    if (idx >= 0) [lost] = player.extraOrigins.splice(idx, 1);
  }
  if (!lost) return null;
  discardCard(room, lost);
  announce(room, 'effect', 'Kin Lost', `${player.name} lost ${lost.publicName}.`, sourceCard || lost, { importance: 'major' });
  if (player.kinPermit?.attachedToCardId === lost.instanceId || (player.kinPermit && kinCards(player).length > 1 && !player.origin)) {
    discardKinPermit(room, player, `attached Kin ${lost.publicName} was lost`);
  }
  if (!player.kinPermit && (player.extraOrigins || []).length) {
    while (player.extraOrigins.length) discardCard(room, player.extraOrigins.pop());
  }
  revalidateIdentityGear(room, player);
  return lost;
}

function callingCards(player) {
  return [player?.role, ...((player?.extraRoles) || [])].filter(Boolean);
}
function kinCards(player) {
  return [player?.origin, ...((player?.extraOrigins) || [])].filter(Boolean);
}
function hasRole(player, slot) {
  return callingCards(player).some((r) => r.mechanicalSlot === slot);
}
function hasOrigin(player, slot) {
  return kinCards(player).some((r) => r.mechanicalSlot === slot);
}
function callingDisadvantagesSuppressed(player) {
  return Boolean(player?.callingPermit && callingCards(player).length === 1);
}
function kinDisadvantagesSuppressed(player) {
  return Boolean(player?.kinPermit && kinCards(player).length === 1);
}
function identityNames(cards) {
  return cards.map((c) => c.publicName).filter(Boolean).join(' + ') || 'none';
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
  const baseGear = hasTemp(player, 'ONLY_BODY_GEAR_NEXT_COMBAT') ? player.equippedGear.filter((g) => g.slot === 'BODY') : player.equippedGear;
  const helperGear = hasTemp(player, 'ONLY_BODY_GEAR_NEXT_COMBAT') ? helperCarriedGear(player).filter((g) => g.slot === 'BODY') : helperCarriedGear(player);
  return [...baseGear, ...helperGear].reduce((sum, g) => sum + effectiveGearCombatBonus(player, g), 0);
}

function gearFleeBonus(player) {
  return [...player.equippedGear, ...helperCarriedGear(player)].reduce((sum, g) => sum + (Number(g.escapeBonus) || 0), 0);
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
function littleHelpers(player) {
  return [...(player?.equippedGear || []), ...(player?.carriedGear || [])].filter((g) => g.id === 'GEAR_HIRELING');
}
function activeLittleHelpers(player) {
  return (player?.equippedGear || []).filter((g) => g.id === 'GEAR_HIRELING');
}
function helperCarriedGear(player) {
  return activeLittleHelpers(player).flatMap((h) => (h.attachedCards || []).filter((c) => c.type === 'GEAR'));
}
function hasLittleHelperWithCapacity(player) {
  return littleHelpers(player).some((h) => !(h.attachedCards || []).some((c) => c.type === 'GEAR'));
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
    if (rule.type === 'BONUS_AGAINST_ROLE' && !callingDisadvantagesSuppressed(active) && hasRole(active, rule.roleMechanicalSlot)) total += rule.amount || 0;
    if (rule.type === 'BONUS_AGAINST_ORIGIN' && !kinDisadvantagesSuppressed(active) && hasOrigin(active, rule.originMechanicalSlot)) total += rule.amount || 0;
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
  const nextCombatEffects = active ? active.temporaryEffects.filter((e) => e.type === 'NEXT_COMBAT_DELTA') : [];
  const nextCombatDelta = nextCombatEffects.reduce((sum, e) => sum + (e.amount || 0), 0);
  if (nextCombatDelta) {
    room.combat.playerDelta += nextCombatDelta;
    active.temporaryEffects = active.temporaryEffects.filter((e) => e.type !== 'NEXT_COMBAT_DELTA');
    announce(room, 'combat', 'Delayed Hex Applied', `${active.name}'s delayed effect applied: ${nextCombatDelta} to this combat.`, null, { importance: 'major' });
  }
  if (active?.temporaryEffects.some((e) => e.type === 'ONLY_BODY_GEAR_NEXT_COMBAT')) {
    announce(room, 'combat', 'Unfriendly Mirror Applied', `${active.name}'s next-combat Hex is active: only Body Gear bonuses count in this combat.`, null, { importance: 'major' });
  }
  resetCombatPasses(room);
  room.phase = 'COMBAT';
  room.revealCard = threat;
  announce(room, 'combat', 'Combat Begins', `${getActive(room).name} faces ${threat.publicName}. Bad News if they fail: ${describeBadNews(threat)}`, threat, { importance: 'major' });
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
  announce(room, 'combat', 'Foe Added to Combat', `${sourcePlayer?.name || 'A player'} added ${foe.publicName}. Bad News: ${describeBadNews(foe)} Foe side now: ${describeFoeSide(room)}.`, foe, { importance: 'major' });
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

function foeIndexById(room, targetFoeInstanceId) {
  if (!room.combat || !targetFoeInstanceId) return 0;
  const idx = room.combat.threats.findIndex((t) => t.instanceId === targetFoeInstanceId);
  return idx >= 0 ? idx : 0;
}

function describeFoeSide(room) {
  if (!room.combat?.threats?.length) return 'no Foes';
  return room.combat.threats.map((t) => `${t.publicName} (${finalFoeStrength(room, t)} STR, ${finalFoeLoot(t)} Loot)`).join(' + ');
}

function canActOutsideCombat(room) {
  return ['START_TURN', 'NO_THREAT_CHOICE', 'POST_COMBAT', 'END_TURN'].includes(room.phase);
}

function effectiveGearCombatBonus(player, card) {
  let bonus = Number(card.combatBonus || 0);
  for (const rule of card.conditionalBonuses || []) {
    if (rule.ifOrigin && kinCards(player).some((o) => o.id === rule.ifOrigin)) bonus += Number(rule.combatBonus || 0);
    if (rule.ifCalling && callingCards(player).some((r) => r.id === rule.ifCalling)) bonus += Number(rule.combatBonus || 0);
  }
  return bonus;
}


function isOneUseConsumable(card) {
  if (!card) return false;
  return Boolean(card.oneUse || card.consumable || card.type === 'TRICK' || /\bOne-use\b/i.test(card.publicText || '') || /\b(Potion|Poison|Drink|Water)\b/i.test(card.publicName || ''));
}

function validateGearEquip(player, card) {
  if (isOneUseConsumable(card)) return 'That is a one-use Trick, not equipable Gear.';
  if (card.type !== 'GEAR') return 'That is not Gear.';
  if (card.cheated) return null;
  const roleIds = callingCards(player).map((r) => r.id);
  const originIds = kinCards(player).map((r) => r.id);
  const suppressCallingBad = callingDisadvantagesSuppressed(player);
  const suppressKinBad = kinDisadvantagesSuppressed(player);
  if ((card.usableByCallings || []).length && !card.usableByCallings.some((id) => roleIds.includes(id))) return `Only the right Calling can equip ${card.publicName}.`;
  if (!suppressCallingBad && (card.notUsableByCallings || []).length && roleIds.some((id) => card.notUsableByCallings.includes(id))) return `${card.publicName} cannot be equipped by your current Calling.`;
  if ((card.usableByOrigins || []).length && !card.usableByOrigins.some((id) => originIds.includes(id))) return `Only the right Kin can equip ${card.publicName}.`;
  if (!suppressKinBad && (card.notUsableByOrigins || []).length && originIds.some((id) => card.notUsableByOrigins.includes(id))) return `${card.publicName} cannot be equipped by your current Kin.`;
  if (!suppressKinBad && card.requiresNoKin && kinCards(player).length) return `${card.publicName} is only usable if you have no Kin.`;
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
      if (player.renown <= 0) {
        announce(room, 'zero-glory', 'Zero Glory', `${player.name} dropped to 0 Glory and has to build back up.`, sourceCard, { importance: 'major' });
      } else {
        announce(room, 'glory', 'Glory Changed', `${player.name}: ${before} → ${player.renown} Glory.`, sourceCard, { importance: before !== player.renown ? 'major' : 'normal' });
      }
      log(room, `${player.name} lost ${amount} Glory.`);
      return true;
    }
    case 'LOSE_ROLE': {
      const callings = callingCards(player);
      if (callings.length > 1 && !context.identityInstanceId) {
        createPrompt(room, { type: 'LOSE_CALLING_CHOICE', playerId: player.id, message: `${player.name} must choose a Calling to lose.`, options: callings, meta: { sourceCard, after: context.after || 'CONTINUE' } });
        return false;
      }
      const lost = callings.length ? loseCallingByInstance(room, player, context.identityInstanceId || callings[0].instanceId, sourceCard) : null;
      if (!lost) {
        if (sourceCard?.id === 'HEX_LOSE_CLASS') { const before = player.renown; player.renown = Math.max(1, player.renown - 1); announce(room, 'effect', 'No Calling to Lose', `${player.name} had no Calling, so Glory changed ${before} → ${player.renown}.`, sourceCard, { importance: 'normal' }); log(room, `${player.name} had no Calling and lost 1 Glory instead.`); }
        else { announce(room, 'effect', 'No Effect', `${player.name} had no Calling to lose.`, sourceCard, { importance: 'normal' }); log(room, `${player.name} had no Calling to lose.`); }
      }
      return true;
    }
    case 'LOSE_ORIGIN': {
      const kins = kinCards(player);
      if (kins.length > 1 && !context.identityInstanceId) {
        createPrompt(room, { type: 'LOSE_KIN_CHOICE', playerId: player.id, message: `${player.name} must choose a Kin to lose.`, options: kins, meta: { sourceCard, after: context.after || 'CONTINUE' } });
        return false;
      }
      const lost = kins.length ? loseKinByInstance(room, player, context.identityInstanceId || kins[0].instanceId, sourceCard) : null;
      if (!lost) { announce(room, 'effect', 'No Effect', `${player.name} had no Kin to lose.`, sourceCard, { importance: 'normal' }); log(room, `${player.name} had no Kin to lose.`); }
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
      return startDeathLooting(room, player, sourceCard, context);
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
      const options = ownedGearOptions(player);
      if (!options.length) { announce(room, 'gear', 'No Gear to Sell', `${player.name} had no Gear to sell.`, sourceCard, { importance: 'normal' }); log(room, `${player.name} had no Gear to sell.`); return true; }
      createPrompt(room, { type: 'SELL_GEAR', playerId: player.id, message: `${player.name} may sell Gear for Glory.`, options, meta: { effect, after: context.after || 'TO_TRIBUTE_OR_END' } });
      return false;
    }
    case 'ADD_EXTRA_CALLING_SLOT': {
      if (!player.role) { announce(room, 'effect', 'No Calling to Attach', `${player.name} needs a Calling in play before using ${sourceCard?.publicName || 'this card'}.`, sourceCard, { importance: 'normal' }); return true; }
      return attachCallingPermit(room, player, sourceCard);
    }
    case 'ADD_EXTRA_KIN_SLOT': {
      if (!player.origin) { announce(room, 'effect', 'No Kin to Attach', `${player.name} needs a Kin in play before using ${sourceCard?.publicName || 'this card'}.`, sourceCard, { importance: 'normal' }); return true; }
      return attachKinPermit(room, player, sourceCard);
    }
    case 'CHEAT_GEAR': {
      const options = allOwnedCards(player).filter((c) => c.type === 'GEAR');
      if (!options.length) { announce(room, 'effect', 'No Gear to Permit', `${player.name} had no Gear for ${sourceCard?.publicName || 'the permit'}.`, sourceCard, { importance: 'normal' }); return true; }
      createPrompt(room, { type: 'CHEAT_GEAR', playerId: player.id, message: `Choose Gear to legalize with ${sourceCard?.publicName || 'Fine Print Permit'}.`, options, meta: { after: context.after || 'TO_TRIBUTE_OR_END', sourceCard } });
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
      const targetIdx = foeIndexById(room, context.targetFoeInstanceId);
      const sourceFoe = room.combat.threats[targetIdx] || room.combat.threats[0];
      const mate = cloneFoeForMate(sourceFoe);
      room.combat.threats.splice(targetIdx + 1, 0, mate);
      resetCombatPasses(room);
      announce(room, 'combat', 'Matching Foe Appears', `${mate.publicName} copies ${sourceFoe.publicName}, including its current modifiers. Foe side: ${describeFoeSide(room)}.`, mate, { importance: 'major' });
      log(room, `${mate.publicName} joined the combat as a match for ${sourceFoe.publicName}.`);
      return true;
    }
    case 'REMOVE_FOE_LOOT_ONLY': {
      if (!room.combat || !room.combat.threats.length) return true;
      const active = getPlayer(room, room.combat.activePlayerId);
      const idx = foeIndexById(room, context.targetFoeInstanceId);
      const preview = room.combat.threats[idx] || room.combat.threats[0];
      const loot = finalFoeLoot(preview);
      const foe = removeFoeAt(room, idx);
      const split = drawLootWithBackupDeal(room, active, room.combat.helperPlayerId ? getPlayer(room, room.combat.helperPlayerId) : null, loot);
      announce(room, 'combat', 'Foe Removed', `${sourceCard?.publicName || 'A card'} removed ${foe.publicName}. No Glory. ${loot} Loot was drawn. ${room.combat?.threats?.length ? `Remaining Foe side: ${describeFoeSide(room)}.` : 'No Foes remain.'}`, sourceCard, { importance: 'major' });
      log(room, `${foe.publicName} was removed without Glory. Loot split active ${split.activeGets}, helper ${split.helperGets}.`);
      if (!room.combat.threats.length) { cleanupCombatToDiscard(room); moveToPostCombat(room); }
      else resetCombatPasses(room);
      return true;
    }
    case 'OUT_TO_LUNCH': {
      if (!room.combat) return true;
      const active = getPlayer(room, room.combat.activePlayerId);
      cleanupCombatToDiscard(room);
      drawMany(room, active, 'LOOT', 2);
      announce(room, 'combat', 'Lunch Break', `${active.name} drew 2 Loot. No Glory was gained.`, sourceCard, { importance: 'major' });
      moveToPostCombat(room);
      return true;
    }
    case 'FRIENDSHIP_END': {
      if (!room.combat) return true;
      const active = getPlayer(room, room.combat.activePlayerId);
      cleanupCombatToDiscard(room);
      drawMany(room, active, 'CHAMBER', 1);
      announce(room, 'combat', 'Foes Leave Peacefully', `${active.name} drew one hidden Chamber card. No Glory or Loot was gained.`, sourceCard, { importance: 'major' });
      moveToPostCombat(room);
      return true;
    }
    case 'ILLUSION_SWAP': {
      if (!room.combat) return true;
      const options = player.hand.filter((c) => c.type === 'THREAT');
      if (!options.length) { announce(room, 'effect', 'No Replacement Foe', `${player.name} had no Foe to swap in.`, sourceCard, { importance: 'normal' }); return true; }
      const targetIdx = foeIndexById(room, context.targetFoeInstanceId);
      const targetFoe = room.combat.threats[targetIdx] || room.combat.threats[0];
      createPrompt(room, { type: 'ILLUSION_SWAP', playerId: player.id, message: `Choose a Foe from hand to replace ${targetFoe.publicName}.`, options, meta: { after: context.after || 'CONTINUE', targetFoeInstanceId: targetFoe.instanceId } });
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
      if (winners.length) { room.phase = 'GAME_OVER'; room.status = 'GAME_OVER'; room.winnerId = winners[0].id; announce(room, 'game', 'VICTORY!', `${winners[0].name} reached 10 Glory. History will exaggerate this.`, sourceCard, { importance: 'major' }); }
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
      if (found) { player.role = found; revalidateIdentityGear(room, player); announce(room, 'effect', 'Calling Changed', `${player.name} is now ${found.publicName}.`, found, { importance: 'major' }); }
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
      if (found) { player.origin = found; revalidateIdentityGear(room, player); announce(room, 'effect', 'Kin Changed', `${player.name} is now ${found.publicName}.`, found, { importance: 'major' }); }
      else announce(room, 'effect', 'No Kin Found', `${player.name} lost their Kin and no replacement appeared.`, sourceCard, { importance: 'major' });
      return true;
    }
    case 'NEXT_COMBAT_DELTA': {
      const amount = effect.amount || 0;
      addStatusEffect(room, player, sourceCard, {
        type: 'NEXT_COMBAT_DELTA', amount, duration: 'NEXT_COMBAT', expires: 'next combat',
        publicName: sourceCard?.publicName || 'Next Combat Penalty',
        description: `${amount} to your next combat, then discard this effect.`
      });
      return true;
    }
    case 'ADD_DIE_PENALTY': {
      const amount = effect.amount || -1;
      addStatusEffect(room, player, sourceCard, {
        type: 'DIE_ROLL_PENALTY', amount, duration: 'UNTIL_HEAD_GEAR_LOST', expires: 'when Head Gear is lost',
        publicName: sourceCard?.publicName || 'Bird on Your Head',
        description: `${amount} to all die rolls until you lose or discard Head Gear.`
      });
      return true;
    }
    case 'ONLY_BODY_GEAR_NEXT_COMBAT': {
      addStatusEffect(room, player, sourceCard, {
        type: 'ONLY_BODY_GEAR_NEXT_COMBAT', duration: 'NEXT_COMBAT', expires: 'after next combat',
        publicName: sourceCard?.publicName || 'Unfriendly Mirror',
        description: 'In your next combat, only Body Gear bonuses count. Then discard this effect.'
      });
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
      if (player.callingPermit) discardCallingPermit(room, player, 'all identities were lost');
      if (player.kinPermit) discardKinPermit(room, player, 'all identities were lost');
      if (player.role) { discardCard(room, player.role); player.role = null; }
      if (player.origin) { discardCard(room, player.origin); player.origin = null; }
      while ((player.extraRoles || []).length) discardCard(room, player.extraRoles.pop());
      while ((player.extraOrigins || []).length) discardCard(room, player.extraOrigins.pop());
      revalidateIdentityGear(room, player);
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
      if (player.role || (player.extraRoles || []).length) { if (player.callingPermit) discardCallingPermit(room, player, 'all Callings were lost'); if (player.role) { discardCard(room, player.role); player.role = null; } while ((player.extraRoles || []).length) discardCard(room, player.extraRoles.pop()); announce(room, 'effect', 'Calling Lost', `${player.name} lost all Callings.`, sourceCard, { importance: 'major' }); }
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
      const targetValue = effect.value || 1000;
      const gear = ownedGearOptions(player).sort((a,b)=>gearJunkValue(b)-gearJunkValue(a));
      const totalAvailable = gear.reduce((sum, g) => sum + gearJunkValue(g), 0);
      if (!gear.length) {
        announce(room, 'effect', 'No Gear to Pay', `${player.name} had no Gear to lose.`, sourceCard, { importance: 'major' });
        log(room, `${player.name} had no Gear to lose for ${sourceCard?.publicName || 'Bad News'}.`);
        return true;
      }
      if (totalAvailable < targetValue) {
        let total = 0;
        for (const g of [...gear]) { total += gearJunkValue(g); removeAndDiscardOwnedCard(room, player, g.instanceId); }
        announce(room, 'effect', 'All Gear Lost', `${player.name} had less than ${targetValue} Junk in Gear and discarded all Gear (${total} Junk).`, sourceCard, { importance: 'major' });
        log(room, `${player.name} discarded all Gear (${total} Junk).`);
        return true;
      }
      createPrompt(room, {
        type: 'DISCARD_GEAR_VALUE',
        playerId: player.id,
        message: `${player.name} must discard Gear totaling at least ${targetValue} Junk.`,
        options: gear,
        meta: { targetValue, after: context.after || 'CONTINUE' }
      });
      announce(room, 'prompt', 'Gear Payment Due', `${player.name} must choose Gear totaling at least ${targetValue} Junk.`, sourceCard, { importance: 'major' });
      return false;
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
      const target = getPlayer(room, context.targetPlayerId);
      const candidates = room.players.filter((p) => littleHelpers(p).length);
      if (!target || !littleHelpers(target).length) {
        if (!candidates.length) { announce(room, 'effect', 'No Little Helper', `No player had Little Helper in play.`, sourceCard, { importance: 'normal' }); return true; }
        createPrompt(room, { type: 'CHOOSE_HIRELING_TARGET', playerId: player.id, message: `${sourceCard?.publicName || 'This card'}: choose a player with Little Helper.`, options: candidates, meta: { effect, sourceCard, after: context.after || 'TO_TRIBUTE_OR_END' } });
        return false;
      }
      const hireling = littleHelpers(target)[0];
      discardSpecificGear(room, target, hireling.instanceId);
      gainGlory(room, player, 1, false, false);
      announce(room, 'effect', 'Helper Dismissed', `${player.name} dismissed ${target.name}'s Little Helper and gained 1 Glory. Any Gear it carried was discarded.`, sourceCard, { importance: 'major' });
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

function startDeathLooting(room, victim, sourceCard, context = {}) {
  const lootable = [];
  while (victim.hand.length) lootable.push(victim.hand.pop());
  while (victim.carriedGear.length) lootable.push(victim.carriedGear.pop());
  while (victim.equippedGear.length) lootable.push(victim.equippedGear.pop());
  victim.dead = true;
  victim.temporaryEffects = (victim.temporaryEffects || []).filter((e) => e.persistsThroughDeath);
  const living = room.players.filter((p) => p.id !== victim.id && !p.dead);
  const groups = new Map();
  for (const p of living) {
    if (!groups.has(p.renown)) groups.set(p.renown, []);
    groups.get(p.renown).push(p);
  }
  const tieRolls = [];
  const ordered = [];
  [...groups.keys()].sort((a, b) => b - a).forEach((glory) => {
    const group = groups.get(glory);
    if (group.length > 1) {
      const rolled = group.map((p) => ({ player: p, roll: rollD6() })).sort((a, b) => b.roll - a.roll || a.player.name.localeCompare(b.player.name));
      tieRolls.push(`${group.map((p) => p.name).join(', ')} tied at ${glory} Glory; roll-off order: ${rolled.map((r) => `${r.player.name} (${r.roll})`).join(', ')}`);
      ordered.push(...rolled.map((r) => r.player));
    } else ordered.push(group[0]);
  });
  room.bodyLoot = {
    id: instanceId(),
    victimId: victim.id,
    cards: shuffle(lootable),
    looterIds: ordered.map((p) => p.id),
    index: 0,
    after: context.after || 'CONTINUE_ESCAPE',
    sourceCard: sourceCard ? publicCard(sourceCard) : null
  };
  const detail = lootable.length
    ? `${victim.name} died. ${lootable.length} card${lootable.length === 1 ? '' : 's'} are laid out for body looting. ${ordered.map((p) => p.name).join(' → ') || 'No one'} chooses in Glory order.${tieRolls.length ? ' ' + tieRolls.join(' ') : ''}`
    : `${victim.name} died, but had no cards to loot.`;
  announce(room, 'death', 'GOBLIN DOWN — LOOT THE BODY', `${detail} Take one card in Glory order. Try not to make eye contact.`, sourceCard, { importance: 'major' });
  log(room, `${victim.name} died. ${lootable.length} card${lootable.length === 1 ? '' : 's'} laid out for body looting.`);
  if (!lootable.length || !ordered.length) {
    finishBodyLooting(room);
    return false;
  }
  promptNextBodyLooter(room);
  return false;
}

function promptNextBodyLooter(room) {
  const loot = room.bodyLoot;
  if (!loot) return;
  while ((loot.index || 0) < (loot.looterIds || []).length) {
    const looter = getPlayer(room, loot.looterIds[loot.index || 0]);
    if (looter && !looter.dead) {
      const victim = getPlayer(room, loot.victimId);
      createPrompt(room, {
        type: 'LOOT_BODY',
        playerId: looter.id,
        message: `${looter.name}, choose one card to loot from ${victim?.name || 'the fallen goblin'}.`,
        options: loot.cards || [],
        meta: { bodyLootId: loot.id }
      });
      return;
    }
    loot.index += 1;
  }
  finishBodyLooting(room);
}

function finishBodyLooting(room) {
  const loot = room.bodyLoot;
  if (!loot) return;
  const remaining = loot.cards || [];
  const count = remaining.length;
  while (remaining.length) discardCard(room, remaining.pop());
  const after = loot.after || 'CONTINUE_ESCAPE';
  room.bodyLoot = null;
  room.pendingPrompt = null;
  announce(room, 'death', 'Body Looting Complete', count ? `${count} unclaimed card${count === 1 ? '' : 's'} were discarded.` : 'No cards remain to loot.', null, { importance: 'major' });
  continueAfterPrompt(room, after);
}

function reviveDeadPlayer(room, player) {
  player.dead = false;
  player.hand = [];
  drawMany(room, player, 'CHAMBER', 4, true, true);
  drawMany(room, player, 'LOOT', 4, true, true);
  announce(room, 'turn', 'Back in the Dungeon', `${player.name} returns on their turn with a fresh hand: 4 Chamber and 4 Loot. They keep their Glory, Calling, and Kin.`, null, { importance: 'major' });
  log(room, `${player.name} returned from death with a fresh starting hand.`);
}

function drawMany(room, player, deck, count, markAsFresh = true, allowDead = false) {
  if (player?.dead && !allowDead) return 0;
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
  if (!player || player.dead) return;
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
    if (card.slot === 'HEAD') clearHeadLinkedEffects(room, player, `${card.publicName} was discarded`);
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


function clearHeadLinkedEffects(room, player, reason = 'Head Gear changed') {
  const removed = clearStatusEffects(player, (e) => e.type === 'DIE_ROLL_PENALTY' && e.duration === 'UNTIL_HEAD_GEAR_LOST');
  if (removed.length) {
    announce(room, 'hex', 'Bird Removed', `${player.name}'s die-roll penalty ended because Head Gear was lost or moved.`, null, { importance: 'major' });
    log(room, `${player.name}'s die-roll penalty ended: ${reason}.`);
  }
}

function hasHandCard(player, cardId) {
  return Boolean(player?.hand?.some((c) => c.id === cardId));
}
function removeHandCardById(player, cardId) {
  const idx = player.hand.findIndex((c) => c.id === cardId);
  if (idx < 0) return null;
  return player.hand.splice(idx, 1)[0];
}
function reactionEligibleNames(room, reaction) {
  return (reaction.eligiblePlayerIds || []).map((id) => getPlayer(room, id)?.name || 'Player').join(', ');
}
function startReaction(room, reaction) {
  room.reaction = { id: instanceId(), passes: {}, ...reaction };
  announce(room, 'prompt', reaction.title || 'Reaction Window', reaction.message || `${reactionEligibleNames(room, room.reaction)} may respond.`, reaction.card || reaction.hexCard || reaction.threat || null, { importance: 'major' });
}
function clearReaction(room) { room.reaction = null; }
function allReactionEligiblePassed(room) {
  const r = room.reaction;
  if (!r) return true;
  return (r.eligiblePlayerIds || []).every((id) => r.passes?.[id]);
}
function setPostFleeRollReaction(room, runner) {
  if (!room.escape?.lastRoll || !runner) return;
  const roll = room.escape.lastRoll;
  if (roll.total >= 5) {
    const eligible = room.players.filter((p) => p.id !== runner.id && hasHandCard(p, 'TRICK_FLASK_GLUE')).map((p) => p.id);
    if (eligible.length) startReaction(room, { type: 'FLEE_SUCCESS_REACTION', runnerId: runner.id, eligiblePlayerIds: eligible, roll, threat: currentEscapeEntry(room)?.threat || room.escape.threat, title: 'Flee Reaction', message: `${runner.name} escaped. ${reactionEligibleNames(room, { eligiblePlayerIds: eligible })} may use a Glue-style card to force a reroll.` });
  } else {
    if (hasHandCard(runner, 'TRICK_INVISIBILITY')) startReaction(room, { type: 'FLEE_FAILURE_REACTION', runnerId: runner.id, playerId: runner.id, eligiblePlayerIds: [runner.id], roll, threat: currentEscapeEntry(room)?.threat || room.escape.threat, title: 'Flee Failed — Reaction?', message: `${runner.name} failed to Flee. Use an automatic escape card or take the Bad News.` });
  }
}
function maybeStartDieReaction(room, roller) {
  if (!room.escape?.lastRoll || !roller) return false;
  if (!hasHandCard(roller, 'SPECIAL_LOADED_DIE')) return false;
  startReaction(room, { type: 'DIE_ROLL_REACTION', runnerId: roller.id, playerId: roller.id, eligiblePlayerIds: [roller.id], roll: room.escape.lastRoll, threat: currentEscapeEntry(room)?.threat || room.escape.threat, title: 'Die Roll Reaction', message: `${roller.name} rolled a die. Use Loaded Die to change the result, or keep the roll.` });
  return true;
}
function finishDieReaction(room, runner) {
  clearReaction(room);
  setPostFleeRollReaction(room, runner);
}
function finishHexReturnPhase(room, after = 'CONTINUE') {
  const returnPhase = room.hexReturnPhase;
  room.hexReturnPhase = null;
  room.revealCard = null;
  if (after === 'TO_NO_THREAT_CHOICE') {
    room.phase = 'NO_THREAT_CHOICE';
    return;
  }
  if (after === 'TO_TRIBUTE_OR_END') {
    moveToTributeOrEnd(room);
    return;
  }
  if (after === 'TO_POST_COMBAT') {
    moveToPostCombat(room);
    return;
  }
  if (after === 'CONTINUE_ESCAPE') {
    room.phase = returnPhase && returnPhase !== 'HEX_REVEAL' ? returnPhase : 'ESCAPE';
    return;
  }
  if (after === 'CONTINUE' || after === 'STAY') {
    if (returnPhase && returnPhase !== 'HEX_REVEAL') room.phase = returnPhase;
    return;
  }
}

function completeHexResolution(room, card, targetPlayer, after = 'TO_NO_THREAT_CHOICE') {
  let complete = true;
  for (const effect of card.effects || []) {
    const ok = applyEffect(room, targetPlayer, effect, card, { after, revealedHex: true });
    if (!ok) complete = false;
  }
  discardCard(room, card);
  if (complete) {
    if (!room.tableNotice || room.tableNotice.kind === 'hex') announce(room, 'hex', 'Hex Finished', `${card.publicName} finished for ${targetPlayer.name}.`, card, { importance: 'normal' });
    finishHexReturnPhase(room, after);
  } else {
    announce(room, 'prompt', 'Hex Needs a Choice', `${targetPlayer.name} must choose how ${card.publicName} hits.`, card, { importance: 'major' });
  }
}
function startHexCancelReactionIfAvailable(room, card, targetPlayer, after, source) {
  if (hasHandCard(targetPlayer, 'SPECIAL_WISHING_RING_A')) {
    startReaction(room, { type: 'HEX_CANCEL_REACTION', playerId: targetPlayer.id, eligiblePlayerIds: [targetPlayer.id], hexCard: card, card, meta: { targetPlayerId: targetPlayer.id, after, source }, title: 'Hex Reaction', message: `${card.publicName} is about to affect ${targetPlayer.name}. ${targetPlayer.name} may use a Wish Ring to cancel it.` });
    return true;
  }
  return false;
}


function continueAfterPrompt(room, after) {
  room.pendingPrompt = null;
  if (room.hexReturnPhase && (after === 'STAY' || after === 'CONTINUE')) {
    finishHexReturnPhase(room, after);
    return;
  }
  if (room.hexReturnPhase && after === 'TO_NO_THREAT_CHOICE') {
    finishHexReturnPhase(room, after);
    return;
  }
  if (after === 'TO_NO_THREAT_CHOICE') room.phase = 'NO_THREAT_CHOICE';
  else if (after === 'CONTINUE_ESCAPE') continueFlee(room);
  else if (after === 'TO_TRIBUTE_OR_END') moveToTributeOrEnd(room);
  else if (after === 'TO_POST_COMBAT') moveToPostCombat(room);
  else if (after === 'STAY' || after === 'CONTINUE') return;
}


function legalActions(room, player) {
  const actions = [];
  if (room.status === 'LOBBY') {
    if (room.players[0]?.id === player.id && room.players.length === 3) actions.push('START_GAME');
    return actions;
  }
  if (room.pendingPrompt?.playerId === player.id) actions.push('RESOLVE_PROMPT');
  if (room.phase === 'HEX_REVEAL' && room.pendingHex?.targetPlayerId === player.id) actions.push('RESOLVE_HEX');
  if (room.phase === 'ROLL_FOR_FIRST' && room.firstRoll?.eligible?.includes(player.id) && !room.firstRoll.rolls?.[player.id]) actions.push('ROLL_FIRST');
  if (room.phase === 'START_TURN' && activeId(room) === player.id) actions.push('OPEN_CHAMBER');
  if (canActOutsideCombat(room) && activeId(room) === player.id) actions.push('PLAY_TABLE_CARDS', 'SELL_GEAR', 'START_TRADE');
  if (room.phase === 'NO_THREAT_CHOICE' && activeId(room) === player.id) actions.push('SEARCH_ROOM', 'START_TROUBLE');
  if (room.phase === 'POST_COMBAT' && activeId(room) === player.id) actions.push('DONE_POST_COMBAT');
  if (room.phase === 'END_TURN' && activeId(room) === player.id) actions.push('END_TURN');
  if (room.phase === 'TRIBUTE' && activeId(room) === player.id) actions.push('GIVE_TRIBUTE');
  if (room.phase === 'COMBAT') { actions.push('COMBAT_ACTIONS', 'PASS_COMBAT'); if (room.combat?.backupRequest?.fromPlayerId === player.id) actions.push('RESCIND_BACKUP'); }
  if (room.phase === 'ESCAPE' && room.escape?.currentPlayerId === player.id) {
    if (room.escape.awaitingContinue) actions.push('CONTINUE_FLEE');
    else { actions.push('ROLL_ESCAPE'); if ([...player.carriedGear, ...player.equippedGear].some((g) => g.id === 'GEAR_HIRELING')) actions.push('SACRIFICE_HIRELING_FLEE'); }
  }
  return actions;
}


function rollForFirst(room, player) {
  if (!room.firstRoll) room.firstRoll = { round: 1, eligible: room.players.map((p) => p.id), rolls: {}, previous: [], latest: null, winnerId: null };
  if (!room.firstRoll.eligible.includes(player.id)) return `${player.name} is not part of this tie-break roll.`;
  if (room.firstRoll.rolls[player.id]) return `${player.name} has already rolled.`;
  const raw = rollD6();
  room.firstRoll.rolls[player.id] = raw;
  room.firstRoll.latest = { playerId: player.id, playerName: player.name, raw, at: Date.now() };
  // Individual opening rolls update the shared roll board but do not create acknowledge events.
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
    // Tie state is visible in the opening roll panel; do not interrupt with an acknowledge modal.
    log(room, `Tie for first. ${tied.map((id) => getPlayer(room, id)?.name || 'Player').join(', ')} roll again.`);
    return;
  }
  const winnerId = tied[0];
  first.winnerId = winnerId;
  room.activePlayerIndex = Math.max(0, room.players.findIndex((p) => p.id === winnerId));
  room.turnNumber = 1;
  room.phase = 'START_TURN';
  const rollSummary = first.previous[first.previous.length - 1]?.rolls || first.rolls || {};
  const rollText = Object.entries(rollSummary).map(([id, val]) => `${getPlayer(room, id)?.name || 'Player'} rolled ${val}`).join(' · ');
  announce(room, 'roll', 'Opening Roll Complete', `${rollText}. ${getPlayer(room, winnerId)?.name || 'Someone'} goes first.`, null, { importance: 'major' });
  log(room, `${getPlayer(room, winnerId)?.name || 'Someone'} goes first.`);
}

function moveToTributeOrEnd(room) {
  const active = getActive(room);
  if (!active) return;
  if (!room.usedLootWindowThisTurn) {
    moveToPostCombat(room);
    return;
  }
  if (active.hand.length > handLimit(active)) room.phase = 'TRIBUTE';
  else room.phase = 'END_TURN';
}

function moveToPostCombat(room) {
  const active = getActive(room);
  if (!active) return;
  room.usedLootWindowThisTurn = true;
  room.phase = 'POST_COMBAT';
  announce(room, 'turn', 'Use Loot / Sell Before Tribute', `${active.name} may play, equip, carry, sell Gear, or trade before Tribute is checked.`, null, { priority: 'log', audience: 'actor', requiresAck: false, importance: 'normal' });
}

function finishPostCombat(room) {
  room.usedLootWindowThisTurn = true;
  announce(room, 'turn', 'Use/Sell Window Complete', `${getActive(room)?.name || 'The fighter'} is done using cards before Tribute.`, null, { importance: 'normal' });
  moveToTributeOrEnd(room);
}

function endTurn(room) {
  room.lastCombatWonThisTurn = false;
  room.revealCard = null;
  room.combat = null;
  room.escape = null;
  room.reaction = null;
  room.pendingPrompt = null;
  room.pendingHex = null;
  room.bodyLoot = null;
  room.tableNotice = null;
  room.tradeOffer = null;
  room.usedLootWindowThisTurn = false;
  room.activePlayerIndex = (room.activePlayerIndex + 1) % room.players.length;
  room.turnNumber += 1;
  room.phase = 'START_TURN';
  const next = getActive(room);
  if (next?.dead) {
    reviveDeadPlayer(room, next);
  } else {
    announce(room, 'turn', 'Next Turn', `${next.name}'s turn begins.`, null, { importance: 'normal' });
    log(room, `${next.name}'s turn begins.`);
  }
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
  room.reaction = null;
  room.pendingPrompt = null;
  room.pendingHex = null;
  room.bodyLoot = null;
  room.tableNotice = null;
  room.announcement = null;
  room.tradeOffer = null;
  room.usedLootWindowThisTurn = false;
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
    p.callingPermit = null;
    p.kinPermit = null;
    drawMany(room, p, 'CHAMBER', 4, false);
    drawMany(room, p, 'LOOT', 4, false);
  }
  announce(room, 'roll', 'Opening Roll', 'Each goblin draws 4 Chamber and 4 Loot cards. Roll a d6 to see who opens the first Chamber.', null, { importance: 'major' });
  log(room, `The table started. Each goblin drew 4 Chamber and 4 Loot cards. Roll to see who goes first.`);
}

function resolveHex(room, card, targetPlayer, after = 'TO_NO_THREAT_CHOICE', source = 'REVEAL') {
  log(room, `Hex revealed: ${card.publicName}.`);
  const previousPhase = room.phase;
  room.pendingHex = { card, targetPlayerId: targetPlayer.id, after, source, previousPhase };
  room.revealCard = card;
  room.phase = 'HEX_REVEAL';
  announce(room, 'hex', 'Hex Revealed', `${card.publicName} affects ${targetPlayer.name}. Read the card, then take the hit.`, card, { importance: 'major' });
}

function finishPendingHexResolution(room, player) {
  const pending = room.pendingHex;
  if (!pending) return `${player.name} has no Hex waiting.`;
  const targetPlayer = getPlayer(room, pending.targetPlayerId);
  if (!targetPlayer) return 'Hex target not found.';
  if (player.id !== targetPlayer.id) return `${targetPlayer.name} must take this Hex hit.`;
  const card = pending.card;
  const after = pending.after || 'TO_NO_THREAT_CHOICE';
  const source = pending.source || 'REVEAL';
  room.hexReturnPhase = pending.previousPhase || room.phase;
  room.pendingHex = null;
  if (after === 'TO_NO_THREAT_CHOICE' && targetPlayer.equippedGear.some((g) => g.id === 'GEAR_SANDALS_PROTECTION')) {
    announce(room, 'hex', 'Hex Blocked', `${targetPlayer.name}'s Sandals of Protection blocked ${card.publicName}.`, card, { importance: 'major' });
    discardCard(room, card);
    room.revealCard = null;
    room.phase = 'NO_THREAT_CHOICE';
    return null;
  }
  if (startHexCancelReactionIfAvailable(room, card, targetPlayer, after, source)) return null;
  completeHexResolution(room, card, targetPlayer, after);
  return null;
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
    room.lastCombatWonThisTurn = true;
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
      announce(room, 'game', 'VICTORY!', `${active.name} reached 10 Glory. History will exaggerate this.`, null, { importance: 'major' });
      log(room, `${active.name} wins by combat!`);
    } else moveToPostCombat(room);
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
      moveToPostCombat(room);
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
  if (active) {
    const removed = clearStatusEffects(active, (e) => e.type === 'ONLY_BODY_GEAR_NEXT_COMBAT');
    if (removed.length) announce(room, 'hex', 'Delayed Hex Cleared', `${active.name}'s next-combat Gear restriction has ended.`, null, { importance: 'normal' });
  }
  room.combat = null;
  room.escape = null;
}

function continueFlee(room) {
  if (!room.escape) return;
  room.escape.index += 1;
  if (room.escape.index >= (room.escape.queue || []).length) {
    announce(room, 'flee', 'Flee Complete', 'All Flee rolls are done. Combat is over.', null, { importance: 'normal' });
    cleanupCombatToDiscard(room);
    moveToPostCombat(room);
  } else {
    const current = currentEscapeEntry(room);
    room.escape.currentPlayerId = current?.playerId || null;
    room.escape.threat = current?.threat || null;
    room.escape.lastRoll = null;
  }
}

function resolveFleeOutcome(room, player) {
  if (room.reaction) return;
  if (!room.escape?.awaitingContinue || !room.escape?.lastRoll) return;
  const entry = currentEscapeEntry(room);
  const threat = entry?.threat || room.escape?.threat;
  const roll = room.escape.lastRoll;
  room.escape.awaitingContinue = false;
  if (roll.total >= 5) {
    announce(room, 'roll', 'Flee Succeeded', `${player.name} escaped ${threat?.publicName || 'the Foe'}.`, threat, { importance: 'major' });
    log(room, `${player.name} escaped.`);
    continueFlee(room);
  } else {
    announce(room, 'bad', 'BAD NEWS', `${player.name} failed to escape ${threat?.publicName || 'the Foe'}. ${describeBadNews(threat)}`, threat, { importance: 'major' });
    log(room, `${player.name} failed to escape ${threat?.publicName || 'the Foe'}.`);
    const ok = applyEffect(room, player, threat?.consequence, threat, { after: 'CONTINUE_ESCAPE' });
    if (ok) { announce(room, 'bad', 'Bad News Hit', `${player.name}: ${describeBadNews(threat)}`, threat, { importance: 'major' }); continueFlee(room); }
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
  room.escape.lastRoll = { raw, originalRaw: raw, bonus, total, success: total >= 5, at: Date.now(), changedBy: null };
  room.escape.awaitingContinue = true;
  announce(room, 'roll', 'Flee Roll', `${player.name} rolled ${raw}${bonus ? ` ${bonus > 0 ? '+' : ''}${bonus}` : ''} = ${total}. ${total >= 5 ? 'Success.' : 'Failure.'}`, currentThreat, { importance: 'major' });
  log(room, `${player.name} rolled Flee: ${raw}${bonus ? ` ${bonus > 0 ? '+' : ''}${bonus}` : ''} = ${total}.`);
  if (!maybeStartDieReaction(room, player)) setPostFleeRollReaction(room, player);
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
    reaction: null,
    pendingPrompt: null,
    bodyLoot: null,
    winnerId: null,
    announcement: null,
    tradeOffer: null,
    usedLootWindowThisTurn: false,
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
  socket.emit('ready', { version: '0.11.8.3-action-banner-sell-helper-hotfix-v0783' });

  socket.on('createRoom', ({ name }) => {
    const room = makeRoom(name, socket);
    socket.join(room.code);
  });

  socket.on('joinRoom', ({ name, code }) => {
    const room = rooms.get(String(code || '').trim().toUpperCase());
    if (!room) return emitError(socket, 'Room not found.');
    if (room.players.length >= 3) return emitError(socket, 'This table is limited to 3 players.');
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
  if (player.dead && !['RESOLVE_PROMPT', 'PASS_REACTION', 'RESOLVE_HEX'].includes(type)) return emitError(socket, 'Dead players wait for their next turn to return.');
  if (type === 'MARK_CARD_SEEN') {
    const card = player.hand.find((c) => c.instanceId === payload.cardId);
    if (card) { card.fresh = false; card.freshAt = null; }
    return;
  }
  if (room.pendingPrompt && !['RESOLVE_PROMPT','CANCEL_TRADE'].includes(type)) return emitError(socket, 'A choice must be finished before anything else can happen.');
  if (room.pendingHex && !['RESOLVE_HEX','MARK_CARD_SEEN'].includes(type)) return emitError(socket, 'Take the revealed Hex hit before continuing.');

  if (room.reaction && !['PASS_REACTION','USE_WISH_RING','USE_LOADED_DIE','USE_INVISIBILITY_ESCAPE','USE_FLASK_GLUE','MARK_CARD_SEEN'].includes(type)) {
    return emitError(socket, 'A reaction window is open. Respond to it before continuing.');
  }

  if (type === 'PASS_REACTION') {
    if (!room.reaction) return emitError(socket, 'No reaction is pending.');
    const r = room.reaction;
    if (!(r.eligiblePlayerIds || []).includes(player.id)) return emitError(socket, 'This reaction is not for you.');
    r.passes = r.passes || {};
    r.passes[player.id] = true;
    if (r.type === 'HEX_CANCEL_REACTION') {
      const target = getPlayer(room, r.meta?.targetPlayerId);
      const hex = r.hexCard;
      const after = r.meta?.after || 'TO_NO_THREAT_CHOICE';
      clearReaction(room);
      announce(room, 'hex', 'Hex Continues', `${player.name} did not cancel ${hex.publicName}.`, hex, { importance: 'normal' });
      completeHexResolution(room, hex, target, after);
      return;
    }
    if (r.type === 'DIE_ROLL_REACTION') {
      const runner = getPlayer(room, r.runnerId);
      finishDieReaction(room, runner);
      return;
    }
    if (r.type === 'FLEE_FAILURE_REACTION') {
      clearReaction(room);
      announce(room, 'roll', 'Bad News Pending', `${player.name} accepts the failed Flee result. Continue to resolve Bad News.`, r.threat, { importance: 'normal' });
      return;
    }
    if (r.type === 'FLEE_SUCCESS_REACTION') {
      announce(room, 'roll', 'No Flee Reaction', `${player.name} does not interfere with the escape.`, r.threat, { importance: 'normal' });
      if (allReactionEligiblePassed(room)) clearReaction(room);
      return;
    }
    return;
  }

  if (type === 'USE_WISH_RING') {
    const r = room.reaction;
    if (!r || r.type !== 'HEX_CANCEL_REACTION' || r.playerId !== player.id) return emitError(socket, 'No Hex cancellation is available for you.');
    const ring = removeHandCardById(player, 'SPECIAL_WISHING_RING_A');
    if (!ring) return emitError(socket, 'You do not have a Wish Ring.');
    const hex = r.hexCard;
    discardCard(room, ring);
    discardCard(room, hex);
    const after = r.meta?.after || 'TO_NO_THREAT_CHOICE';
    clearReaction(room);
    announce(room, 'hex', 'Hex Canceled', `${player.name} used Wish Ring to cancel ${hex.publicName}.`, ring, { importance: 'major' });
    log(room, `${player.name} canceled ${hex.publicName} with Wish Ring.`);
    finishHexReturnPhase(room, after);
    return;
  }

  if (type === 'USE_LOADED_DIE') {
    const r = room.reaction;
    if (!r || r.type !== 'DIE_ROLL_REACTION' || r.playerId !== player.id) return emitError(socket, 'No die-change reaction is available for you.');
    const chosen = Math.max(1, Math.min(6, Number(payload.value || 0)));
    if (!chosen) return emitError(socket, 'Choose a die value from 1 to 6.');
    const die = removeHandCardById(player, 'SPECIAL_LOADED_DIE');
    if (!die) return emitError(socket, 'You do not have Loaded Die.');
    const roll = room.escape?.lastRoll;
    if (!roll) return emitError(socket, 'No roll is waiting.');
    const before = roll.raw;
    roll.raw = chosen;
    roll.total = chosen + (roll.bonus || 0);
    roll.success = roll.total >= 5;
    roll.changedBy = player.name;
    discardCard(room, die);
    announce(room, 'roll', 'Loaded Die Used', `${player.name} changed the roll ${before} → ${chosen}. Final result: ${roll.total}. ${roll.success ? 'Success.' : 'Failure.'}`, die, { importance: 'major' });
    log(room, `${player.name} changed a die roll from ${before} to ${chosen}.`);
    finishDieReaction(room, player);
    return;
  }

  if (type === 'USE_INVISIBILITY_ESCAPE') {
    const r = room.reaction;
    if (!r || r.type !== 'FLEE_FAILURE_REACTION' || r.runnerId !== player.id) return emitError(socket, 'No failed-Flee escape reaction is available for you.');
    const potion = removeHandCardById(player, 'TRICK_INVISIBILITY');
    if (!potion) return emitError(socket, 'You do not have Invisibility Potion.');
    if (room.escape?.lastRoll) {
      room.escape.lastRoll.total = 5;
      room.escape.lastRoll.success = true;
      room.escape.lastRoll.changedBy = potion.publicName;
    }
    discardCard(room, potion);
    clearReaction(room);
    announce(room, 'roll', 'Automatic Escape', `${player.name} used ${potion.publicName} after failing. The Flee result is now a success.`, potion, { importance: 'major' });
    log(room, `${player.name} used ${potion.publicName} to escape after failing a Flee roll.`);
    return;
  }

  if (type === 'USE_FLASK_GLUE') {
    const r = room.reaction;
    if (!r || r.type !== 'FLEE_SUCCESS_REACTION' || !(r.eligiblePlayerIds || []).includes(player.id)) return emitError(socket, 'No successful-Flee reaction is available for you.');
    const glue = removeHandCardById(player, 'TRICK_FLASK_GLUE');
    if (!glue) return emitError(socket, 'You do not have Flask of Glue.');
    discardCard(room, glue);
    const runner = getPlayer(room, r.runnerId);
    room.escape.lastRoll = null;
    room.escape.awaitingContinue = false;
    clearReaction(room);
    announce(room, 'roll', 'Reroll Required', `${player.name} used ${glue.publicName}. ${runner?.name || 'The runner'} must roll to Flee again.`, glue, { importance: 'major' });
    log(room, `${player.name} used ${glue.publicName}; ${runner?.name || 'runner'} must reroll Flee.`);
    return;
  }

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

  if (type === 'RESOLVE_HEX') {
    if (room.phase !== 'HEX_REVEAL' || !room.pendingHex) return emitError(socket, 'No revealed Hex is waiting.');
    const err = finishPendingHexResolution(room, player);
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
      markFresh(card, 'CHAMBER', 'FACE_UP_REVEAL');
      player.hand.push(card);
      movement(room, 'REVEAL_ZONE', 'PLAYER_HAND', 'Face-Up Chamber → Hand', `${player.name} revealed ${card.publicName}; it went to their hand.`, card);
      announce(room, 'reveal', 'Face-Up Chamber Revealed', `${player.name} revealed ${card.publicName}. It went to their hand; they may play it now or choose their next move.`, card, { importance: 'major' });
      log(room, `${player.name} revealed ${card.publicName} face-up and added it to hand.`);
      room.phase = 'NO_THREAT_CHOICE';
    }
    return;
  }


  if (type === 'SELL_GEAR') {
    if (!canActOutsideCombat(room) || !isOwnTurn(room, socket)) return emitError(socket, 'You can only sell Gear on your own turn outside combat or Fleeing.');
    const effect = { type: 'SELL_GEAR_FOR_RENOWN', threshold: 1000, canWin: false };
    const directIds = Array.isArray(payload.cardIds) ? payload.cardIds : [];
    if (directIds.length) {
      const result = sellSpecificGear(room, player, directIds, effect);
      if (result.error) return emitError(socket, result.error);
      announce(room, 'gear', 'Gear Sold', `${player.name} sold ${result.sold.length} Gear for ${result.total} Junk Value${result.doubled ? ' with a double-value bonus' : ''}. +${result.glory} Glory.`, null, { importance: 'major' });
      log(room, `${player.name} sold ${result.sold.length} Gear for ${result.total} Junk Value.`);
      return;
    }
    const options = ownedGearOptions(player);
    if (!options.length) { emitOk(socket, 'No Gear to sell.'); announce(room, 'gear', 'No Gear to Sell', `${player.name} checked for Gear to sell, but had none. Turn state did not advance.`, null, { importance: 'normal' }); return; }
    createPrompt(room, { type: 'SELL_GEAR', playerId: player.id, message: `${player.name} may sell Gear for Glory. Selling is optional.`, options, meta: { effect, after: 'STAY', optional: true } });
    return;
  }

  if (type === 'START_TRADE') {
    if (!canActOutsideCombat(room) || !isOwnTurn(room, socket)) return emitError(socket, 'Trades can only be proposed on your own turn outside combat.');
    const target = getPlayer(room, payload.targetPlayerId);
    if (!target || target.id === player.id || target.dead) return emitError(socket, 'Choose another living player to trade with.');
    const options = tradeOfferOptions(player);
    if (!options.length) return emitError(socket, 'You have no cards available to offer.');
    createPrompt(room, { type: 'TRADE_OFFER_SELECT', playerId: player.id, message: `Choose cards to offer ${target.name}. Gifts are allowed; the other player must still accept.`, options, meta: { targetPlayerId: target.id, optional: true, after: 'STAY' } });
    announce(room, 'trade', 'Trade Started', `${player.name} is preparing an offer for ${target.name}.`, null, { importance: 'normal' });
    return;
  }

  if (type === 'CANCEL_TRADE') {
    if (!room.tradeOffer || room.tradeOffer.fromPlayerId !== player.id) return emitError(socket, 'You have no trade offer to rescind.');
    const target = getPlayer(room, room.tradeOffer.toPlayerId);
    announce(room, 'trade', 'Trade Rescinded', `${player.name} rescinded the trade offer${target ? ` to ${target.name}` : ''}.`, null, { importance: 'normal' });
    room.tradeOffer = null;
    if (room.pendingPrompt?.type === 'TRADE_ACCEPT') room.pendingPrompt = null;
    return;
  }

  if (type === 'GIVE_GEAR') {
    return emitError(socket, 'Direct giving has been replaced by Trade with Player. Tap a player and start a trade.');
  }

  if (type === 'SACRIFICE_HIRELING_FLEE') {
    if (room.phase !== 'ESCAPE' || room.escape?.currentPlayerId !== player.id) return emitError(socket, 'You can only sacrifice Little Helper while you are Fleeing.');
    const hireling = activeLittleHelpers(player)[0] || littleHelpers(player)[0];
    if (!hireling) return emitError(socket, 'You have no Little Helper to sacrifice.');
    const removed = discardSpecificGear(room, player, hireling.instanceId);
    if (!removed) return emitError(socket, 'Little Helper was no longer available.');
    if (room.escape) {
      room.escape.awaitingContinue = false;
      room.escape.lastRoll = null;
    }
    room.reaction = null;
    announce(room, 'flee', 'Little Helper Distracts the Foe', `${player.name} discarded Little Helper and escaped automatically. Any Gear it carried was discarded too.`, hireling, { importance: 'major' });
    log(room, `${player.name} sacrificed Little Helper to escape.`);
    continueFlee(room);
    return;
  }

  if (type === 'ASSIGN_HIRELING_GEAR') {
    if (!canActOutsideCombat(room) || !isOwnTurn(room, socket)) return emitError(socket, 'Little Helper can only take Gear on your own turn outside combat or Fleeing.');
    const result = assignGearToLittleHelper(room, player, payload.cardId);
    if (result.error) return emitError(socket, result.error);
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
      markFresh(card, 'CHAMBER', 'LOOT_ROOM');
      player.hand.push(card);
      movement(room, 'CHAMBER_DECK', 'PLAYER_HAND', 'Chamber Deck → Hand', `${player.name} drew a hidden Chamber card.`, card);
    }
    announce(room, 'draw', 'Loot the Room', `${player.name} drew a hidden Chamber card into hand.`, null, { importance: 'normal' });
    log(room, `${player.name} looted the room and drew a hidden Chamber card.`);
    room.revealCard = null;
    moveToTributeOrEnd(room);
    return;
  }

  if (type === 'ADD_FOE_FROM_HAND') {
    // Foes cannot be added just because they are in hand. The player must play the proper card
    // such as Unexpected Company, whose effect creates the add-Foe prompt.
    return emitError(socket, 'Play Unexpected Company to add a Foe from your hand.');
  }

  if (type === 'REQUEST_BACKUP') {
    if (room.phase !== 'COMBAT' || !room.combat) return emitError(socket, 'Backup can only be requested during combat.');
    if (room.combat.activePlayerId !== player.id) return emitError(socket, 'Only the active combat player can request Backup.');
    if (room.combat.helperPlayerId) return emitError(socket, 'You already have Backup in this combat.');
    const target = getPlayer(room, payload.targetPlayerId);
    if (!target || target.id === player.id) return emitError(socket, 'Choose another player for Backup.');
    room.combat.backupRequest = { fromPlayerId: player.id, toPlayerId: target.id, stage: 'NEGOTIATING', deal: null };
    // Negotiation state is shown in the combat panel; do not interrupt everyone with a popup.
    log(room, `${player.name} opened Backup negotiation with ${target.name}.`);
    return;
  }


  if (type === 'RESCIND_BACKUP' || type === 'CONTINUE_WITHOUT_BACKUP') {
    if (room.phase !== 'COMBAT' || !room.combat?.backupRequest) return emitError(socket, 'No Backup request is open.');
    if (room.combat.backupRequest.fromPlayerId !== player.id) return emitError(socket, 'Only the fighter can rescind the Backup request.');
    const helper = getPlayer(room, room.combat.backupRequest.toPlayerId);
    room.combat.backupRequest = null;
    // Canceled negotiation is routine state cleanup; no table-wide popup needed.
    log(room, `${player.name} canceled the Backup request${helper ? ` to ${helper.name}` : ''}.`);
    return;
  }

  if (type === 'SET_BACKUP_DEAL') {
    if (room.phase !== 'COMBAT' || !room.combat?.backupRequest) return emitError(socket, 'No Backup negotiation is open.');
    if (room.combat.backupRequest.fromPlayerId !== player.id) return emitError(socket, 'Only the fighter can propose the Backup deal.');
    const helper = getPlayer(room, room.combat.backupRequest.toPlayerId);
    const maxLoot = Math.max(0, totalCombatLoot(room));
    const lootCount = payload.allLoot ? maxLoot : Math.max(0, Math.min(maxLoot, Number(payload.lootCount || 0)));
    room.combat.backupRequest.deal = { lootCount, totalLootAtOffer: maxLoot };
    // Deal offer is visible in the Backup negotiation panel; only the final accepted deal should interrupt the table.
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
    // Declining Backup does not change combat math; update the panel/log only.
    log(room, `${player.name} declined Backup.`);
    room.combat.backupRequest = null;
    return;
  }

  if (type === 'PASS_COMBAT') {
    if (room.phase !== 'COMBAT' || !room.combat) return emitError(socket, 'There is no combat to pass on.');
    room.combat.passes[player.id] = true;
    // Passing/done buffing updates the combat pass tracker only; no public modal or popup needed.
    log(room, `${player.name} confirmed no more combat cards.`);
    if (allCombatPlayersPassed(room)) resolveCombat(room);
    return;
  }

  if (type === 'CONTINUE_FLEE') {
    if (room.reaction) return emitError(socket, 'A reaction window is open. Finish it before continuing.');
    if (room.phase !== 'ESCAPE' || room.escape?.currentPlayerId !== player.id || !room.escape.awaitingContinue) return emitError(socket, 'There is no Flee result waiting to continue.');
    resolveFleeOutcome(room, player);
    return;
  }

  if (type === 'ROLL_ESCAPE') {
    if (room.phase !== 'ESCAPE' || room.escape?.currentPlayerId !== player.id) return emitError(socket, 'It is not your Flee roll.');
    if (room.escape?.awaitingContinue) return emitError(socket, 'Finish the current Flee result first.');
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
    if (!room.combat.threats.length) { cleanupCombatToDiscard(room); moveToPostCombat(room); } else resetCombatPasses(room);
    return;
  }

  if (type === 'GIVE_TRIBUTE') {
    if (room.phase !== 'TRIBUTE' || !isOwnTurn(room, socket)) return emitError(socket, 'Tribute is not required from you right now.');
    resolveTribute(socket, room, player, payload);
    return;
  }

  if (type === 'DONE_POST_COMBAT') {
    if (room.phase !== 'POST_COMBAT' || !isOwnTurn(room, socket)) return emitError(socket, 'You can only finish using Loot after combat on your own turn.');
    finishPostCombat(room);
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
    if (callingCards(player).some((r) => r.id === card.id)) return emitError(socket, 'You cannot have two copies of the same Calling.');
    const real = findAndRemoveFromHand(player, card.instanceId);
    if (!real) return emitError(socket, 'Calling must be in your hand.');
    if (!player.role) player.role = real;
    else if (player.callingPermit && (player.extraRoles || []).length < 1) player.extraRoles.push(real);
    else {
      const old = player.role;
      player.role = real;
      discardCard(room, old);
      if (player.callingPermit?.attachedToCardId === old.instanceId) discardCallingPermit(room, player, `attached Calling ${old.publicName} was replaced`);
    }
    revalidateIdentityGear(room, player);
    playedAnnouncement(room, player, real, 'Calling Played', `${player.name} played ${real.publicName}. Callings: ${identityNames(callingCards(player))}.`);
    log(room, `${player.name} played Calling: ${real.publicName}.`);
    return;
  }

  if (card.type === 'ORIGIN') {
    if (!canActOutsideCombat(room) || activeId(room) !== player.id) return emitError(socket, 'Kins can only be played on your own turn outside combat.');
    if (kinCards(player).some((r) => r.id === card.id)) return emitError(socket, 'You cannot have two copies of the same Kin.');
    const real = findAndRemoveFromHand(player, card.instanceId);
    if (!real) return emitError(socket, 'Kin must be in your hand.');
    if (!player.origin) player.origin = real;
    else if (player.kinPermit && (player.extraOrigins || []).length < 1) player.extraOrigins.push(real);
    else {
      const old = player.origin;
      player.origin = real;
      discardCard(room, old);
      if (player.kinPermit?.attachedToCardId === old.instanceId) discardKinPermit(room, player, `attached Kin ${old.publicName} was replaced`);
    }
    revalidateIdentityGear(room, player);
    playedAnnouncement(room, player, real, 'Kin Played', `${player.name} played ${real.publicName}. Kin: ${identityNames(kinCards(player))}.`);
    log(room, `${player.name} played Kin: ${real.publicName}.`);
    return;
  }

  if (card.type === 'GEAR') {
    if (isOneUseConsumable(card)) return emitError(socket, 'That is a one-use Trick, not Gear. Use it during its timing window; it will discard after use.');
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
      announce(room, 'gear', 'Gear Carried', `${player.name} carried ${real.publicName}. It is in play but not equipped.`, real, { importance: 'major' });
      movement(room, 'PLAYER_HAND', 'PLAYER_GEAR', 'Gear Carried', `${player.name} carried ${real.publicName}.`, real);
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
      announce(room, 'gear', 'Gear Equipped', `${player.name} equipped ${real.publicName}.`, real, { importance: 'major' });
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
    const canPlayOwnTurn = timing.includes('OWN_TURN_OUTSIDE_COMBAT') && canActOutsideCombat(room) && activeId(room) === player.id;
    const canPlayPostCombatWin = timing.includes('POST_COMBAT_WIN') && room.phase === 'POST_COMBAT' && activeId(room) === player.id && room.lastCombatWonThisTurn;
    if (!canPlayAny && !canPlayCombat && !canPlayOwnTurn && !canPlayPostCombatWin) {
      if (timing.includes('POST_COMBAT_WIN')) return emitError(socket, `${card.publicName} can only be played after you win combat.`);
      return emitError(socket, 'That Special is not playable in this timing window.');
    }
    if (card.effect?.type === 'ADD_EXTRA_CALLING_SLOT') {
      if (!player.role) return emitError(socket, 'Play a Calling first, then attach Overqualified to it.');
      const realPermit = findAndRemoveFromHand(player, card.instanceId);
      if (!realPermit) return emitError(socket, 'Special must be in your hand.');
      attachCallingPermit(room, player, realPermit);
      return;
    }
    if (card.effect?.type === 'ADD_EXTRA_KIN_SLOT') {
      if (!player.origin) return emitError(socket, 'Play a Kin first, then attach Mixed Kin Permit to it.');
      const realPermit = findAndRemoveFromHand(player, card.instanceId);
      if (!realPermit) return emitError(socket, 'Special must be in your hand.');
      attachKinPermit(room, player, realPermit);
      return;
    }
    const real = findAndRemoveFromHand(player, card.instanceId);
    if (!real) return emitError(socket, 'Special must be in your hand.');
    const after = room.phase === 'COMBAT' ? 'CONTINUE' : (room.phase === 'POST_COMBAT' ? 'TO_POST_COMBAT' : 'TO_TRIBUTE_OR_END');
    const ok = applyEffect(room, player, real.effect, real, { after, targetPlayerId: payload.targetPlayerId, targetFoeInstanceId: payload.targetFoeInstanceId });
    // Fine Print Permit attaches to Gear and remains with that Gear instead of going to discard.
    if (real.effect?.type !== 'CHEAT_GEAR') discardCard(room, real);
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
    if (room.combat.threats.length > 1 && !payload.targetFoeInstanceId) return emitError(socket, 'Choose which Foe gets this modifier.');
    const real = findAndRemoveFromHand(player, card.instanceId);
    if (!real) return emitError(socket, 'Modifier must be in your hand.');
    const threat = room.combat.threats[foeIndexById(room, payload.targetFoeInstanceId)] || room.combat.threats[0];
    threat.modifiers = threat.modifiers || [];
    threat.modifiers.push(real);
    resetCombatPasses(room);
    announce(room, 'card', 'Foe Modifier Attached', `${player.name} attached ${real.publicName} to ${threat.publicName}. Foe side: ${describeFoeSide(room)}.`, real, { importance: 'major' });
    log(room, `${player.name} attached ${real.publicName} to ${threat.publicName}. Everyone must confirm again.`);
    return;
  }

  if (card.type === 'HEX') {
    // Classic rule: Hex/Curse cards in hand may be played on any player at almost any time.
    const real = findAndRemoveFromHand(player, card.instanceId);
    if (!real) return emitError(socket, 'Hex must be in your hand.');
    const target = getPlayer(room, payload.targetPlayerId) || getActive(room) || player;
    const after = room.phase === 'ESCAPE' ? 'CONTINUE_ESCAPE' : 'CONTINUE';
    log(room, `${player.name} played Hex: ${real.publicName} on ${target.name}.${room.phase === 'COMBAT' ? ' Everyone must confirm again.' : ''}`);
    resolveHex(room, real, target, after, 'PLAYED');
    if (room.phase === 'COMBAT') resetCombatPasses(room);
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
  const livingPlayers = room.players.filter((p) => !p.dead);
  const minGlory = Math.min(...livingPlayers.map((p) => p.renown));
  const activeIsLowest = player.renown === minGlory;
  let recipient = null;
  if (!activeIsLowest) {
    const legalRecipients = room.players.filter((p) => p.id !== player.id && !p.dead && p.renown === minGlory);
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

function removeOwnedGearOrHandCardAny(player, cardId) {
  let idx = player.hand.findIndex((c) => c.instanceId === cardId);
  if (idx >= 0) return player.hand.splice(idx, 1)[0];
  idx = player.carriedGear.findIndex((c) => c.instanceId === cardId);
  if (idx >= 0) return player.carriedGear.splice(idx, 1)[0];
  idx = player.equippedGear.findIndex((c) => c.instanceId === cardId);
  if (idx >= 0) return player.equippedGear.splice(idx, 1)[0];
  return null;
}

function tradeOfferOptions(player) {
  return [...player.hand, ...player.carriedGear, ...player.equippedGear].filter((c) => c && !c.isClone);
}

function gearJunkValue(card) {
  return Number(card?.junkValue ?? card?.scrapValue ?? 0) || 0;
}

function ownedGearOptions(player) {
  return [...player.hand.filter((c) => c.type === 'GEAR' && !isOneUseConsumable(c)), ...player.carriedGear.filter((c) => !isOneUseConsumable(c)), ...player.equippedGear.filter((c) => !isOneUseConsumable(c))];
}

function inPlayGearOptions(player) {
  return [...player.carriedGear, ...player.equippedGear];
}

function assignGearToLittleHelper(room, player, gearId) {
  const helper = littleHelpers(player).find((h) => !(h.attachedCards || []).some((c) => c.type === 'GEAR'));
  if (!helper) return { error: 'You need a Little Helper with empty hands.' };
  let source = 'hand';
  let gear = findAndRemoveFromHand(player, gearId);
  if (!gear) {
    let idx = player.carriedGear.findIndex((g) => g.instanceId === gearId);
    if (idx >= 0) { source = 'carried'; gear = player.carriedGear.splice(idx, 1)[0]; }
  }
  if (!gear) {
    let idx = player.equippedGear.findIndex((g) => g.instanceId === gearId);
    if (idx >= 0) { source = 'equipped'; gear = player.equippedGear.splice(idx, 1)[0]; }
  }
  if (!gear || gear.type !== 'GEAR') return { error: 'Choose Gear you own.' };
  if (gear.id === 'GEAR_HIRELING') {
    if (source === 'hand') player.hand.push(gear);
    else if (source === 'carried') player.carriedGear.push(gear);
    else player.equippedGear.push(gear);
    return { error: 'Little Helper cannot carry another Little Helper.' };
  }
  if (source === 'equipped' && gear.slot === 'HEAD') clearHeadLinkedEffects(room, player, `${gear.publicName} was handed to Little Helper`);
  helper.attachedCards = helper.attachedCards || [];
  gear.attachedToCardId = helper.instanceId;
  gear.attachedToName = helper.publicName;
  gear.fresh = false;
  helper.attachedCards.push(gear);
  movement(room, 'PLAYER_HAND', 'PLAYER_GEAR', 'Gear → Little Helper', `${player.name}'s Little Helper took ${gear.publicName}.`, gear);
  announce(room, 'gear', 'Little Helper Takes Gear', `${player.name}'s Little Helper is now carrying and using ${gear.publicName}. If Little Helper leaves play, that Gear goes with it.`, gear, { importance: 'major' });
  log(room, `${player.name}'s Little Helper took ${gear.publicName}.`);
  return { gear, helper };
}

function canReceiveCarriedGear(player, gear) {
  if (!gear) return 'No Gear selected.';
  if (gear.isHeavy && heavyCount(player) + 1 > heavyLimit(player)) return `${player.name} cannot carry another Heavy Gear right now.`;
  return null;
}

function transferGearToPlayer(room, from, to, gearId) {
  let idx = from.carriedGear.findIndex((g) => g.instanceId === gearId);
  let zone = 'carried';
  if (idx < 0) { idx = from.equippedGear.findIndex((g) => g.instanceId === gearId); zone = 'equipped'; }
  if (idx < 0) return null;
  const source = zone === 'equipped' ? from.equippedGear : from.carriedGear;
  const [gear] = source.splice(idx, 1);
  const err = canReceiveCarriedGear(to, gear);
  if (err) { source.splice(idx, 0, gear); return { error: err }; }
  if (zone === 'equipped' && gear.slot === 'HEAD') clearHeadLinkedEffects(room, from, `${gear.publicName} was given away`);
  gear.fresh = true; gear.freshAt = Date.now(); gear.freshFrom = 'GEAR_TRANSFER';
  to.carriedGear.push(gear);
  movement(room, 'PLAYER_GEAR', 'PLAYER_GEAR', 'Gear Transfer', `${from.name} gave ${gear.publicName} to ${to.name}.`, gear);
  return { gear };
}


function sellSpecificGear(room, player, ids, effect = {}) {
  const unique = [...new Set(ids || [])];
  if (!unique.length) return { error: 'Choose at least one Gear card to sell.' };
  const available = ownedGearOptions(player);
  const byId = new Map(available.map((c) => [c.instanceId, c]));
  if (!unique.every((id) => byId.has(id))) return { error: 'Choose valid Gear to sell.' };

  const selected = unique.map((id) => byId.get(id));
  const values = selected.map(gearJunkValue);
  let total = values.reduce((a, b) => a + b, 0);
  let doubled = false;
  if (player.origin?.mechanicalSlot === 'HALFLING_EQUIV' && !player.usedHalfstepSale && values.length) {
    total += Math.max(...values);
    doubled = true;
  }

  const threshold = effect.threshold || 1000;
  const glory = Math.floor(total / threshold);
  if (glory <= 0) return { error: `Select at least ${threshold} Junk Value before selling.` };

  const sold = [];
  for (const id of unique) {
    const card = removeOwnedGearOrHandCard(player, id);
    if (!card) return { error: 'One selected Gear card was no longer available.' };
    sold.push(card);
  }
  if (doubled) player.usedHalfstepSale = true;
  for (const card of sold) {
    if (card.slot === 'HEAD') clearHeadLinkedEffects(room, player, `${card.publicName} was sold`);
    discardCard(room, card);
  }
  gainGlory(room, player, glory, Boolean(effect.canWin), false);
  return { sold, total, doubled, glory };
}

function revalidateIdentityGear(room, player) {
  const moved = [];
  for (let i = player.equippedGear.length - 1; i >= 0; i--) {
    const g = player.equippedGear[i];
    if (g.cheated) continue;
    const roleIds = callingCards(player).map((r) => r.id);
    const originIds = kinCards(player).map((r) => r.id);
    const suppressCallingBad = callingDisadvantagesSuppressed(player);
    const suppressKinBad = kinDisadvantagesSuppressed(player);
    let illegal = false;
    if ((g.usableByCallings || []).length && !g.usableByCallings.some((id) => roleIds.includes(id))) illegal = true;
    if (!suppressCallingBad && (g.notUsableByCallings || []).length && roleIds.some((id) => g.notUsableByCallings.includes(id))) illegal = true;
    if ((g.usableByOrigins || []).length && !g.usableByOrigins.some((id) => originIds.includes(id))) illegal = true;
    if (!suppressKinBad && (g.notUsableByOrigins || []).length && originIds.some((id) => g.notUsableByOrigins.includes(id))) illegal = true;
    if (!suppressKinBad && g.requiresNoKin && kinCards(player).length) illegal = true;
    if (illegal) {
      player.equippedGear.splice(i, 1);
      player.carriedGear.push(g);
      moved.push(g.publicName);
    }
  }
  if (moved.length) announce(room, 'gear', 'Gear No Longer Equipped', `${player.name} moved ${moved.join(', ')} to carried Gear after an identity change.`, null, { importance: 'major' });
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
  if (!prompt) return emitError(socket, 'No choice is waiting.');
  if (prompt.playerId !== player.id) return emitError(socket, 'This prompt is not for you.');
  const after = prompt.meta?.after || 'CONTINUE';
  if ((payload.cancel || payload.pass) && prompt.meta?.optional) {
    room.pendingPrompt = null;
    announce(room, 'prompt', 'Optional Choice Passed', `${player.name} passed on ${prompt.type.replaceAll('_', ' ').toLowerCase()}.`, null, { importance: 'normal' });
    continueAfterPrompt(room, after);
    return;
  }
  if (prompt.type === 'LOOT_BODY') {
    const loot = room.bodyLoot;
    if (!loot || prompt.meta?.bodyLootId !== loot.id) return emitError(socket, 'Body looting is no longer active.');
    const victim = getPlayer(room, loot.victimId);
    const idx = (loot.cards || []).findIndex((c) => c.instanceId === payload.cardId);
    if (idx < 0) return emitError(socket, 'Choose a valid card from the body loot pile.');
    const [card] = loot.cards.splice(idx, 1);
    markFresh(card, 'BODY_LOOT');
    player.hand.push(card);
    movement(room, 'BODY_LOOT', 'PLAYER_HAND', 'Body Loot → Hand', `${player.name} looted ${card.publicName} from ${victim?.name || 'the fallen goblin'}.`, card);
    announce(room, 'effect', 'Body Looted', `${player.name} took ${card.publicName} from ${victim?.name || 'the fallen goblin'}.`, card, { importance: 'major' });
    log(room, `${player.name} looted ${card.publicName} from ${victim?.name || 'a fallen goblin'}.`);
    loot.index = (loot.index || 0) + 1;
    room.pendingPrompt = null;
    if (!loot.cards.length || loot.index >= (loot.looterIds || []).length) finishBodyLooting(room);
    else promptNextBodyLooter(room);
    return;
  }
  if (prompt.type === 'DISCARD_GEAR') {
    const chosenId = payload.cardId || (Array.isArray(payload.cardIds) ? payload.cardIds[0] : null);
    const valid = (prompt.options || []).some((c) => c.instanceId === chosenId);
    if (!valid) return emitError(socket, 'Choose Gear from the available choices.');
    const chosen = (prompt.options || []).find((c) => c.instanceId === chosenId);
    discardSpecificGear(room, player, chosenId);
    announce(room, 'effect', 'Gear Discarded', `${player.name} discarded ${chosen?.publicName || 'Gear'}.`, chosen, { importance: 'major' });
    continueAfterPrompt(room, after);
    return;
  }
  if (prompt.type === 'DISCARD_GEAR_VALUE') {
    const targetValue = Number(prompt.meta?.targetValue || 0);
    const ids = Array.isArray(payload.cardIds) ? [...new Set(payload.cardIds)] : (payload.cardId ? [payload.cardId] : []);
    if (!ids.length) return emitError(socket, `Choose Gear totaling at least ${targetValue} Junk.`);
    const validById = new Map((prompt.options || []).map((c) => [c.instanceId, c]));
    if (!ids.every((id) => validById.has(id))) return emitError(socket, 'Choose Gear from the available choices.');
    const total = ids.reduce((sum, id) => sum + gearJunkValue(validById.get(id)), 0);
    if (total < targetValue) return emitError(socket, `Choose Gear totaling at least ${targetValue} Junk.`);
    const discarded = [];
    for (const id of ids) {
      const card = removeAndDiscardOwnedCard(room, player, id);
      if (card) discarded.push(card);
    }
    announce(room, 'effect', 'Gear Paid', `${player.name} discarded ${discarded.map((c) => c.publicName).join(', ') || 'chosen Gear'} for ${total} Junk.`, discarded[0] || null, { importance: 'major' });
    log(room, `${player.name} discarded ${discarded.length} Gear card${discarded.length === 1 ? '' : 's'} worth ${total} Junk.`);
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
    const targetIdx = foeIndexById(room, prompt.meta?.targetFoeInstanceId);
    const oldFoe = removeFoeAt(room, targetIdx);
    replacement.modifiers = [];
    room.combat.threats.splice(targetIdx, 0, replacement);
    resetCombatPasses(room);
    announce(room, 'combat', 'Illusion Swap', `${oldFoe?.publicName || 'A Foe'} was replaced by ${replacement.publicName}. Any modifiers on the old Foe were discarded. Foe side: ${describeFoeSide(room)}.`, replacement, { importance: 'major' });
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

  if (prompt.type === 'CHOOSE_HIRELING_TARGET') {
    const target = getPlayer(room, payload.targetPlayerId);
    if (!target || !littleHelpers(target).length) return emitError(socket, 'Choose a player with Little Helper.');
    const hireling = littleHelpers(target)[0];
    discardSpecificGear(room, target, hireling.instanceId);
    gainGlory(room, player, 1, false, false);
    announce(room, 'effect', 'Helper Dismissed', `${player.name} dismissed ${target.name}'s Little Helper and gained 1 Glory. Any Gear it carried was discarded too.`, prompt.meta?.sourceCard || hireling, { importance: 'major' });
    continueAfterPrompt(room, after);
    return;
  }

  if (prompt.type === 'CHEAT_GEAR') {
    const valid = (prompt.options || []).some((c) => c.instanceId === payload.cardId);
    if (!valid) return emitError(socket, 'Choose valid Gear.');
    let gear = player.hand.find((c) => c.instanceId === payload.cardId);
    if (gear) { findAndRemoveFromHand(player, gear.instanceId); gear.cheated = true; gear.attachedCards = gear.attachedCards || []; if (prompt.meta?.sourceCard) gear.attachedCards.push(prompt.meta.sourceCard); equipGear(player, gear); }
    else {
      gear = player.carriedGear.find((c) => c.instanceId === payload.cardId) || player.equippedGear.find((c) => c.instanceId === payload.cardId);
      if (!gear) return emitError(socket, 'Gear was no longer available.');
      gear.cheated = true;
      gear.attachedCards = gear.attachedCards || [];
      if (prompt.meta?.sourceCard && !gear.attachedCards.some((a) => a.instanceId === prompt.meta.sourceCard.instanceId)) gear.attachedCards.push(prompt.meta.sourceCard);
      if (player.carriedGear.some((c) => c.instanceId === gear.instanceId)) {
        player.carriedGear = player.carriedGear.filter((c) => c.instanceId !== gear.instanceId);
        equipGear(player, gear);
      }
    }
    announce(room, 'gear', 'Fine Print Attached', `${gear.publicName} is now legal for ${player.name}. The permit stays attached to that Gear.`, gear, { importance: 'major' });
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


  if (prompt.type === 'LOSE_CALLING_CHOICE') {
    const valid = (prompt.options || []).some((c) => c.instanceId === payload.cardId);
    if (!valid) return emitError(socket, 'Choose a valid Calling to lose.');
    loseCallingByInstance(room, player, payload.cardId, prompt.meta?.sourceCard);
    continueAfterPrompt(room, after);
    return;
  }

  if (prompt.type === 'LOSE_KIN_CHOICE') {
    const valid = (prompt.options || []).some((c) => c.instanceId === payload.cardId);
    if (!valid) return emitError(socket, 'Choose a valid Kin to lose.');
    loseKinByInstance(room, player, payload.cardId, prompt.meta?.sourceCard);
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

  if (prompt.type === 'DISCARD_GEAR_VALUE') {
    const ids = Array.isArray(payload.cardIds) ? [...new Set(payload.cardIds)] : [];
    const valid = new Map((prompt.options || []).map((c) => [c.instanceId, c]));
    if (!ids.length || !ids.every((id) => valid.has(id))) return emitError(socket, 'Choose valid Gear cards.');
    const total = ids.reduce((sum, id) => sum + gearJunkValue(valid.get(id)), 0);
    const target = prompt.meta?.targetValue || 1000;
    if (total < target) return emitError(socket, `Choose at least ${target} Junk Value in Gear.`);
    for (const id of ids) removeAndDiscardOwnedCard(room, player, id);
    announce(room, 'effect', 'Gear Payment Made', `${player.name} discarded ${ids.length} Gear worth ${total} Junk.`, null, { importance: 'major' });
    continueAfterPrompt(room, after);
    return;
  }


  if (prompt.type === 'TRADE_OFFER_SELECT') {
    const ids = Array.isArray(payload.cardIds) ? [...new Set(payload.cardIds)] : [];
    if (payload.cancel) { room.pendingPrompt = null; announce(room, 'trade', 'Trade Canceled', `${player.name} canceled the trade offer.`, null, { importance: 'normal' }); return; }
    const valid = new Set((prompt.options || []).map((c) => c.instanceId));
    if (!ids.length) return emitError(socket, 'Choose at least one card to offer, or cancel.');
    if (!ids.every((id) => valid.has(id))) return emitError(socket, 'Choose valid cards you own.');
    const target = getPlayer(room, prompt.meta?.targetPlayerId);
    if (!target) return emitError(socket, 'Trade target is no longer available.');
    room.tradeOffer = { id: instanceId(), fromPlayerId: player.id, toPlayerId: target.id, cardIds: ids, stage: 'OFFERED' };
    room.pendingPrompt = { id: instanceId(), type: 'TRADE_ACCEPT', playerId: target.id, message: `${player.name} offers ${ids.length} card${ids.length === 1 ? '' : 's'} to ${target.name}. Accept?`, options: ids.map((id) => findCardInPlayerZones(player, id)).filter(Boolean), meta: { tradeOfferId: room.tradeOffer.id, optional: true, after: 'STAY' } };
    announce(room, 'trade', 'Trade Offered', `${player.name} offered ${ids.length} card${ids.length === 1 ? '' : 's'} to ${target.name}.`, room.pendingPrompt.options[0] || null, { importance: 'major' });
    return;
  }

  if (prompt.type === 'TRADE_ACCEPT') {
    const offer = room.tradeOffer;
    if (!offer || prompt.meta?.tradeOfferId !== offer.id || offer.toPlayerId !== player.id) return emitError(socket, 'This trade offer is no longer active.');
    const from = getPlayer(room, offer.fromPlayerId);
    if (!from) { room.tradeOffer = null; room.pendingPrompt = null; return emitError(socket, 'The offering player left.'); }
    if (payload.cancel || payload.decline) {
      announce(room, 'trade', 'Trade Declined', `${player.name} declined ${from.name}'s trade offer.`, null, { importance: 'normal' });
      room.tradeOffer = null; room.pendingPrompt = null; return;
    }
    if (!payload.accept) return emitError(socket, 'Accept or decline the trade.');
    const moved = [];
    for (const id of offer.cardIds || []) {
      const card = removeOwnedGearOrHandCardAny(from, id);
      if (card) {
        if (card.type === 'GEAR' && card.slot === 'HEAD') clearHeadLinkedEffects(room, from, `${card.publicName} was traded away`);
        card.fresh = true; card.freshAt = Date.now(); card.freshFrom = 'TRADE'; moved.push(card);
      }
    }
    player.hand.push(...moved);
    announce(room, 'trade', 'Trade Accepted', `${player.name} accepted ${from.name}'s offer and received ${moved.length} card${moved.length === 1 ? '' : 's'}.`, moved[0] || null, { importance: 'major' });
    room.tradeOffer = null; room.pendingPrompt = null;
    return;
  }

  if (prompt.type === 'SELL_GEAR') {
    if (payload.cancel || payload.done) {
      room.pendingPrompt = null;
      announce(room, 'gear', 'Sell Gear Canceled', `${player.name} chose not to sell Gear.`, null, { importance: 'normal' });
      if (after !== 'STAY') continueAfterPrompt(room, after);
      return;
    }
    const ids = Array.isArray(payload.cardIds) ? payload.cardIds : [];
    if (!ids.length) { room.pendingPrompt = null; announce(room, 'gear', 'Sell Gear Skipped', `${player.name} sold no Gear.`, null, { importance: 'normal' }); if (after !== 'STAY') continueAfterPrompt(room, after); return; }
    const result = sellSpecificGear(room, player, ids, prompt.meta?.effect || {});
    if (result.error) return emitError(socket, result.error);
    announce(room, 'gear', 'Gear Sold', `${player.name} sold ${result.sold.length} Gear for ${result.total} Junk Value${result.doubled ? ' with a double-value bonus' : ''}. +${result.glory} Glory.`, null, { importance: 'major' });
    log(room, `${player.name} sold ${result.sold.length} Gear for ${result.total} Junk Value${result.doubled ? ' with a double-value bonus' : ''}.`);
    continueAfterPrompt(room, after);
    return;
  }
  emitError(socket, 'Unknown prompt type.');
}

server.listen(PORT, () => {
  console.log(`Loot Goblins v0.6.9 Trade + Backup + Tribute Flow listening on ${PORT}`);
});
