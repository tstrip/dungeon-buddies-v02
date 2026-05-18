const { buildParityReport } = require('./parity');

const REQUIRED_FIELDS = ['id', 'deck', 'type', 'publicName', 'publicText', 'flavorText'];
const VALID_DECKS = new Set(['CHAMBER', 'LOOT']);
const VALID_ENFORCEMENT = new Set(['AUTO', 'GUIDED']);

const SUPPORTED_EFFECT_TYPES = new Set([
  'GAIN_RENOWN', 'LOSE_RENOWN', 'LOSE_ROLE', 'LOSE_ORIGIN',
  'DISCARD_FROM_HAND', 'DISCARD_HAND', 'DISCARD_GEAR', 'DRAW_LOOT', 'DRAW_CHAMBER',
  'MODIFY_COMBAT_TOTAL', 'MODIFY_ESCAPE_ROLL', 'AUTO_ESCAPE', 'KNOCKOUT',
  'TRANSFER_RENOWN', 'SELL_GEAR_FOR_RENOWN', 'ADD_EXTRA_CALLING_SLOT', 'ADD_EXTRA_KIN_SLOT',
  'CHEAT_GEAR', 'ADD_FOE_FROM_HAND', 'ADD_MATCHING_FOE', 'REMOVE_FOE_LOOT_ONLY',
  'OUT_TO_LUNCH', 'FRIENDSHIP_END', 'ILLUSION_SWAP', 'WAND_DOWSING', 'DIVINE_INTERVENTION',
  'DOPPELGANGER', 'FORCE_REROLL_FLEE', 'NO_EFFECT', 'MULTI_EFFECT', 'CHANGE_ROLE',
  'CHANGE_ORIGIN', 'NEXT_COMBAT_DELTA', 'ADD_DIE_PENALTY', 'ONLY_BODY_GEAR_NEXT_COMBAT',
  'DISCARD_ALL_HEAVY_GEAR', 'DISCARD_HAND_AND_GEAR', 'DISCARD_ALL_IDENTITIES',
  'CHOOSE_DISCARD_HAND_OR_LOSE_GLORY', 'ROLL_DISCARD_OWNED', 'ROLL_LOSE_GLORY',
  'LOSE_HEAD_OR_GLORY', 'LOSE_ALL_ROLES_OR_GLORY', 'SET_TO_LOWEST_GLORY', 'LAWYERS_BAD_NEWS',
  'ADJACENT_TAKE_GEAR', 'HIGHEST_TAKE_GEAR', 'DISCARD_GEAR_VALUE_OR_ALL', 'INCOME_TAX',
  'YUPPIE_WATER', 'GAIN_IF_HIGHEST_OR_TIED', 'KILL_HIRELING_GAIN_GLORY',
  'CANCEL_ACTIVE_HEX', 'TRANSFER_COMBAT', 'SET_DIE_ROLL'
]);

function cardCopies(cards) {
  return cards.reduce((sum, card) => sum + Number(card.copies || 1), 0);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function collectEffects(card) {
  const effects = [];
  const push = (effect) => {
    if (!effect) return;
    effects.push(effect);
    for (const inner of asArray(effect.effects)) push(inner);
  };
  push(card.effect);
  for (const effect of asArray(card.effects)) push(effect);
  push(card.consequence);
  return effects.filter(Boolean);
}

function inspectCards(cards) {
  const issues = [];
  for (const card of cards) {
    for (const field of REQUIRED_FIELDS) {
      if (card[field] === undefined || card[field] === null || String(card[field]).trim() === '') {
        issues.push({ id: card.id || '(missing id)', severity: 'fail', area: 'Card Data', message: `Missing ${field}.` });
      }
    }

    if (!VALID_DECKS.has(card.deck)) {
      issues.push({ id: card.id, severity: 'fail', area: 'Card Data', message: `Invalid deck ${card.deck}.` });
    }
    if (!VALID_ENFORCEMENT.has(card.enforcement || 'AUTO')) {
      issues.push({ id: card.id, severity: 'fail', area: 'Automation', message: `Invalid/live enforcement ${card.enforcement}.` });
    }

    if (card.type === 'THREAT') {
      if (!Number.isFinite(Number(card.strength))) issues.push({ id: card.id, severity: 'fail', area: 'Foes', message: 'Foe is missing numeric strength.' });
      if (!Number.isFinite(Number(card.lootReward))) issues.push({ id: card.id, severity: 'fail', area: 'Foes', message: 'Foe is missing numeric Loot reward.' });
      if (!card.consequence) issues.push({ id: card.id, severity: 'warn', area: 'Foes', message: 'Foe has no Bad News/consequence object.' });
    }

    if (card.type === 'HEX') {
      if (!Array.isArray(card.effects) || card.effects.length === 0) issues.push({ id: card.id, severity: 'fail', area: 'Hexes', message: 'Hex has no effects array.' });
    }

    if (card.type === 'GEAR') {
      if (!card.slot) issues.push({ id: card.id, severity: 'fail', area: 'Gear', message: 'Gear is missing slot.' });
      for (const field of ['handsUsed', 'combatBonus', 'escapeBonus', 'junkValue']) {
        if (!Number.isFinite(Number(card[field] ?? card.scrapValue ?? 0))) {
          issues.push({ id: card.id, severity: 'fail', area: 'Gear', message: `Gear has invalid ${field}.` });
        }
      }
    }

    const allEffects = collectEffects(card);
    for (const effect of allEffects) {
      if (!effect.type || !SUPPORTED_EFFECT_TYPES.has(effect.type)) {
        issues.push({ id: card.id, severity: 'fail', area: 'Effects', message: `Unsupported effect type ${effect.type || '(missing)'}.` });
      }
    }

    if (card.type === 'TRICK' || card.type === 'SPECIAL') {
      const effects = allEffects;
      if (effects.length === 0 && !['ROLE', 'ORIGIN'].includes(card.type)) {
        issues.push({ id: card.id, severity: 'warn', area: 'Effects', message: 'Card has no explicit effect object.' });
      }
    }
  }
  return issues;
}

function inspectRooms(rooms) {
  const issues = [];
  for (const [code, room] of rooms.entries()) {
    if (!room.players || !Array.isArray(room.players)) issues.push({ room: code, severity: 'fail', area: 'Rooms', message: 'Room has no player array.' });
    if (room.status !== 'LOBBY' && (!room.chamberDeck || !room.lootDeck)) issues.push({ room: code, severity: 'fail', area: 'Rooms', message: 'Active room is missing one or more decks.' });
    if (room.status !== 'LOBBY' && room.players && room.players.length !== 3) issues.push({ room: code, severity: 'warn', area: 'Rooms', message: 'Active game does not have exactly three seats.' });
  }
  return issues;
}

function makeGate(id, label, ok, detail) {
  return { id, label, ok: Boolean(ok), detail };
}

function buildRulesLockReport(chamberCards, lootCards, rooms = new Map()) {
  const allCards = [...chamberCards, ...lootCards];
  const parity = buildParityReport(chamberCards, lootCards);
  const cardIssues = inspectCards(allCards);
  const roomIssues = inspectRooms(rooms);
  const failureIssues = [...cardIssues, ...roomIssues].filter((issue) => issue.severity === 'fail');
  const warningIssues = [...cardIssues, ...roomIssues].filter((issue) => issue.severity !== 'fail');

  const gates = [
    makeGate('deck-parity', 'Live deck matches the 168-card target', parity.ok, `${parity.counts.copies.chamber} Chamber / ${parity.counts.copies.loot} Loot / ${parity.counts.copies.total} total.`),
    makeGate('no-manual-resolution', 'No live card requires manual resolution', parity.manualIssues.length === 0, `${parity.manualIssues.length} issue(s).`),
    makeGate('no-player-facing-meta', 'No card exposes dev/meta text', parity.playerFacingTextIssues.length === 0, `${parity.playerFacingTextIssues.length} issue(s).`),
    makeGate('unique-card-ids', 'Unique card IDs are valid', parity.duplicateIdIssues.length === 0, `${parity.duplicateIdIssues.length} duplicate issue(s).`),
    makeGate('required-card-fields', 'Every live card has player-facing name/rules/flavor', cardIssues.filter((i) => i.area === 'Card Data' && i.severity === 'fail').length === 0, `${cardIssues.filter((i) => i.area === 'Card Data').length} issue(s).`),
    makeGate('rules-objects', 'Core card types include required mechanical data', failureIssues.length === 0, `${failureIssues.length} blocking issue(s), ${warningIssues.length} warning(s).`),
    makeGate('runtime-rooms', 'Runtime rooms are structurally valid', roomIssues.filter((i) => i.severity === 'fail').length === 0, `${roomIssues.length} active-room issue(s).`)
  ];

  return {
    version: '0.7.9-original-asset-kit',
    ok: gates.every((gate) => gate.ok),
    status: gates.every((gate) => gate.ok) ? 'MECHANICS_LOCK_CANDIDATE' : 'NEEDS_ATTENTION',
    gates,
    parity,
    issues: {
      blocking: failureIssues,
      warnings: warningIssues
    },
    qaNotes: [
      'This endpoint is a static and runtime guardrail, not a substitute for full human playtesting.',
      'The next milestone after a clean v0.7.9 test is expanded card-frame/table-prop work and preparation for card-art systems.'
    ]
  };
}

module.exports = { buildRulesLockReport };
