const chamberCards = [
  // Role / class-equivalent mechanical slots
  {
    id: 'CHAMBER_ROLE_001_EQUIV', deck: 'CHAMBER', type: 'ROLE', publicName: 'Bruiser', mechanicalSlot: 'WARRIOR_EQUIV',
    publicText: 'Close fights favor you. During your own combat, you may burn one card for +1 to your side.',
    enforcement: 'AUTO'
  },
  {
    id: 'CHAMBER_ROLE_002_EQUIV', deck: 'CHAMBER', type: 'ROLE', publicName: 'Spellwrecker', mechanicalSlot: 'WIZARD_EQUIV',
    publicText: 'A hand full of nonsense can become a solution. Future build: banish a Threat for Loot only.',
    enforcement: 'GUIDED'
  },
  {
    id: 'CHAMBER_ROLE_003_EQUIV', deck: 'CHAMBER', type: 'ROLE', publicName: 'Cutpurse', mechanicalSlot: 'THIEF_EQUIV',
    publicText: 'During someone else’s combat, burn a card to give their side -2. Future build: risky Gear theft.',
    enforcement: 'GUIDED'
  },
  {
    id: 'CHAMBER_ROLE_004_EQUIV', deck: 'CHAMBER', type: 'ROLE', publicName: 'Gravefriend', mechanicalSlot: 'CLERIC_EQUIV',
    publicText: '+3 against Restless Threats. Future build: discard-pile draw tricks.',
    enforcement: 'GUIDED'
  },

  // Origin / race-equivalent mechanical slots
  {
    id: 'CHAMBER_ORIGIN_001_EQUIV', deck: 'CHAMBER', type: 'ORIGIN', publicName: 'Brightkin', mechanicalSlot: 'ELF_EQUIV',
    publicText: '+1 to Escape. When you help someone win combat, gain 1 Renown, but not the winning Renown.',
    enforcement: 'AUTO'
  },
  {
    id: 'CHAMBER_ORIGIN_002_EQUIV', deck: 'CHAMBER', type: 'ORIGIN', publicName: 'Deepborn', mechanicalSlot: 'DWARF_EQUIV',
    publicText: 'Hand limit 6. You may carry one extra Heavy Gear.',
    enforcement: 'AUTO'
  },
  {
    id: 'CHAMBER_ORIGIN_003_EQUIV', deck: 'CHAMBER', type: 'ORIGIN', publicName: 'Halfstep', mechanicalSlot: 'HALFLING_EQUIV',
    publicText: 'The first Gear sale you make each game counts double. Cannot buy the final Renown.',
    enforcement: 'AUTO'
  },

  // Threats / monster-equivalent skeleton deck
  {
    id: 'CHAMBER_THREAT_001_EQUIV', deck: 'CHAMBER', type: 'THREAT', publicName: 'Basement Goblin', strength: 1, renownReward: 1, lootReward: 1,
    publicText: 'Tiny, mean, and already in your house.', tags: [], consequence: { type: 'LOSE_RENOWN', amount: 1, minimum: 1 }, enforcement: 'AUTO'
  },
  {
    id: 'CHAMBER_THREAT_002_EQUIV', deck: 'CHAMBER', type: 'THREAT', publicName: 'Tax Troll', strength: 4, renownReward: 1, lootReward: 2,
    publicText: 'It has forms. It has questions. It has time.', tags: [], consequence: { type: 'DISCARD_FROM_HAND', count: 2, method: 'RANDOM' }, enforcement: 'AUTO'
  },
  {
    id: 'CHAMBER_THREAT_003_EQUIV', deck: 'CHAMBER', type: 'THREAT', publicName: 'Rust Bat', strength: 6, renownReward: 1, lootReward: 2,
    publicText: 'It mostly attacks your stuff.', tags: [], consequence: { type: 'DISCARD_GEAR', target: 'ANY_GEAR', slot: 'ANY', choice: 'PLAYER' }, enforcement: 'GUIDED'
  },
  {
    id: 'CHAMBER_THREAT_004_EQUIV', deck: 'CHAMBER', type: 'THREAT', publicName: 'Restless Accountant', strength: 8, renownReward: 1, lootReward: 2,
    publicText: 'Still balancing the books. Somehow still dead.', tags: ['RESTLESS'], consequence: { type: 'LOSE_ROLE' }, enforcement: 'AUTO'
  },
  {
    id: 'CHAMBER_THREAT_005_EQUIV', deck: 'CHAMBER', type: 'THREAT', publicName: 'Hallway Ogre', strength: 10, renownReward: 1, lootReward: 3,
    publicText: 'A large problem in a narrow space.', tags: [], consequence: { type: 'LOSE_RENOWN', amount: 2, minimum: 1 }, enforcement: 'AUTO'
  },
  {
    id: 'CHAMBER_THREAT_006_EQUIV', deck: 'CHAMBER', type: 'THREAT', publicName: 'The Loud Thing Upstairs', strength: 12, renownReward: 1, lootReward: 3,
    publicText: 'Nobody knows what it is. Everyone knows it is too loud.', tags: [], consequence: { type: 'DISCARD_HAND', count: 'ALL' }, enforcement: 'AUTO'
  },
  {
    id: 'CHAMBER_THREAT_007_EQUIV', deck: 'CHAMBER', type: 'THREAT', publicName: 'Mirror Knight', strength: 14, renownReward: 1, lootReward: 4,
    publicText: 'Especially annoying for people who solve problems by hitting them.', tags: [], specialRules: [{ type: 'BONUS_AGAINST_ROLE', roleMechanicalSlot: 'WARRIOR_EQUIV', amount: 4 }], consequence: { type: 'DISCARD_GEAR', target: 'EQUIPPED_GEAR', slot: 'HAND', choice: 'PLAYER' }, enforcement: 'GUIDED'
  },
  {
    id: 'CHAMBER_THREAT_008_EQUIV', deck: 'CHAMBER', type: 'THREAT', publicName: 'The Paperwork Hydra', strength: 16, renownReward: 2, lootReward: 4,
    publicText: 'Every form grows two more forms.', tags: [], consequence: { type: 'KNOCKOUT' }, enforcement: 'GUIDED'
  },
  {
    id: 'CHAMBER_THREAT_009_EQUIV', deck: 'CHAMBER', type: 'THREAT', publicName: 'Definitely Not a Dragon', strength: 18, renownReward: 2, lootReward: 5,
    publicText: 'Legally distinct. Emotionally identical.', tags: [], consequence: { type: 'KNOCKOUT' }, enforcement: 'GUIDED'
  },
  {
    id: 'CHAMBER_THREAT_010_EQUIV', deck: 'CHAMBER', type: 'THREAT', publicName: 'The Final Problem', strength: 20, renownReward: 2, lootReward: 5,
    publicText: 'The table collectively decides this is your problem.', tags: [], consequence: { type: 'LOSE_RENOWN', amount: 3, minimum: 1 }, enforcement: 'AUTO'
  },

  // Hexes / curse-equivalent skeleton deck
  { id: 'CHAMBER_HEX_001_EQUIV', deck: 'CHAMBER', type: 'HEX', publicName: 'Reputation Leak', publicText: 'Lose 1 Renown, minimum 1.', timing: ['ON_REVEAL', 'ANY_TIME'], target: 'ANY_PLAYER', effects: [{ type: 'LOSE_RENOWN', amount: 1, minimum: 1 }], enforcement: 'AUTO' },
  { id: 'CHAMBER_HEX_002_EQUIV', deck: 'CHAMBER', type: 'HEX', publicName: 'Career Crisis', publicText: 'Lose your Role.', timing: ['ON_REVEAL', 'ANY_TIME'], target: 'ANY_PLAYER', effects: [{ type: 'LOSE_ROLE' }], enforcement: 'AUTO' },
  { id: 'CHAMBER_HEX_003_EQUIV', deck: 'CHAMBER', type: 'HEX', publicName: 'Identity Audit', publicText: 'Lose your Origin.', timing: ['ON_REVEAL', 'ANY_TIME'], target: 'ANY_PLAYER', effects: [{ type: 'LOSE_ORIGIN' }], enforcement: 'AUTO' },
  { id: 'CHAMBER_HEX_004_EQUIV', deck: 'CHAMBER', type: 'HEX', publicName: 'Wardrobe Malfunction', publicText: 'Lose one equipped Body Gear if possible.', timing: ['ON_REVEAL', 'ANY_TIME'], target: 'ANY_PLAYER', effects: [{ type: 'DISCARD_GEAR', target: 'EQUIPPED_GEAR', slot: 'BODY', choice: 'PLAYER' }], enforcement: 'GUIDED' },
  { id: 'CHAMBER_HEX_005_EQUIV', deck: 'CHAMBER', type: 'HEX', publicName: 'Butterfingers', publicText: 'Discard 1 random card.', timing: ['ON_REVEAL', 'ANY_TIME'], target: 'ANY_PLAYER', effects: [{ type: 'DISCARD_FROM_HAND', count: 1, method: 'RANDOM' }], enforcement: 'AUTO' },
  { id: 'CHAMBER_HEX_006_EQUIV', deck: 'CHAMBER', type: 'HEX', publicName: 'Sudden Confidence Problem', publicText: 'Play during combat. Player side gets -5 this combat.', timing: ['DURING_COMBAT'], target: 'PLAYER_SIDE', effects: [{ type: 'MODIFY_COMBAT_TOTAL', side: 'PLAYER', amount: -5 }], enforcement: 'AUTO' },
  { id: 'CHAMBER_HEX_007_EQUIV', deck: 'CHAMBER', type: 'HEX', publicName: 'Bad Exit Strategy', publicText: 'Target gets -1 to their next Escape roll.', timing: ['ON_REVEAL', 'ANY_TIME'], target: 'ANY_PLAYER', effects: [{ type: 'MODIFY_ESCAPE_ROLL', amount: -1, duration: 'NEXT_ESCAPE' }], enforcement: 'AUTO' },
  { id: 'CHAMBER_HEX_008_EQUIV', deck: 'CHAMBER', type: 'HEX', publicName: 'Rules Fog', publicText: 'Manual resolution. Decide the source-equivalent effect at the table, then confirm.', timing: ['ON_REVEAL', 'ANY_TIME'], target: 'ACTIVE_PLAYER', effects: [{ type: 'MANUAL_PROMPT' }], enforcement: 'MANUAL' },

  // Threat modifiers / monster enhancer-equivalents
  { id: 'CHAMBER_MODIFIER_001_EQUIV', deck: 'CHAMBER', type: 'THREAT_MODIFIER', publicName: 'Annoyingly Prepared', publicText: 'Play during combat on the active Threat. Threat +5, Loot +1.', timing: ['DURING_COMBAT'], target: 'ACTIVE_THREAT', strengthDelta: 5, lootDelta: 1, enforcement: 'AUTO' },
  { id: 'CHAMBER_MODIFIER_002_EQUIV', deck: 'CHAMBER', type: 'THREAT_MODIFIER', publicName: 'Unreasonably Large', publicText: 'Play during combat on the active Threat. Threat +10, Loot +2.', timing: ['DURING_COMBAT'], target: 'ACTIVE_THREAT', strengthDelta: 10, lootDelta: 2, enforcement: 'AUTO' },
  { id: 'CHAMBER_MODIFIER_003_EQUIV', deck: 'CHAMBER', type: 'THREAT_MODIFIER', publicName: 'Deeply Tired', publicText: 'Play during combat on the active Threat. Threat -5, Loot -1.', timing: ['DURING_COMBAT'], target: 'ACTIVE_THREAT', strengthDelta: -5, lootDelta: -1, enforcement: 'AUTO' },
  { id: 'CHAMBER_MODIFIER_004_EQUIV', deck: 'CHAMBER', type: 'THREAT_MODIFIER', publicName: 'Carrying a Suspicious Backpack', publicText: 'Play during combat on the active Threat. Loot +1.', timing: ['DURING_COMBAT'], target: 'ACTIVE_THREAT', strengthDelta: 0, lootDelta: 1, enforcement: 'AUTO' }
];

const lootCards = [
  // Gear / item-equivalent skeleton deck
  { id: 'LOOT_GEAR_001_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Bucket Helm', publicText: '+1. Head Gear.', slot: 'HEAD', handsUsed: 0, combatBonus: 1, escapeBonus: 0, scrapValue: 400, isHeavy: false, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_002_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Questionable Armor', publicText: '+2. Body Gear.', slot: 'BODY', handsUsed: 0, combatBonus: 2, escapeBonus: 0, scrapValue: 600, isHeavy: false, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_003_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Boots of Leaving', publicText: '+1 combat, +1 Escape. Feet Gear.', slot: 'FEET', handsUsed: 0, combatBonus: 1, escapeBonus: 1, scrapValue: 400, isHeavy: false, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_004_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Pointy Stick', publicText: '+2. One Hand.', slot: 'HAND', handsUsed: 1, combatBonus: 2, escapeBonus: 0, scrapValue: 400, isHeavy: false, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_005_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Bigger Pointy Stick', publicText: '+4. Two Hands. Heavy.', slot: 'HAND', handsUsed: 2, combatBonus: 4, escapeBonus: 0, scrapValue: 800, isHeavy: true, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_006_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Suspicious Cape', publicText: '+1. No-slot Gear.', slot: 'NO_SLOT', handsUsed: 0, combatBonus: 1, escapeBonus: 0, scrapValue: 300, isHeavy: false, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_007_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Tiny Crown', publicText: '+2. Head Gear.', slot: 'HEAD', handsUsed: 0, combatBonus: 2, escapeBonus: 0, scrapValue: 700, isHeavy: false, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_008_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Heavy Door Shield', publicText: '+3. One Hand. Heavy.', slot: 'HAND', handsUsed: 1, combatBonus: 3, escapeBonus: 0, scrapValue: 600, isHeavy: true, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_009_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Fancy Pants', publicText: '+1. No-slot Gear.', slot: 'NO_SLOT', handsUsed: 0, combatBonus: 1, escapeBonus: 0, scrapValue: 500, isHeavy: false, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_010_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Management Sword', publicText: '+3. One Hand.', slot: 'HAND', handsUsed: 1, combatBonus: 3, escapeBonus: 0, scrapValue: 600, isHeavy: false, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_011_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Boots of Bad Decisions', publicText: '+2. Feet Gear.', slot: 'FEET', handsUsed: 0, combatBonus: 2, escapeBonus: 0, scrapValue: 500, isHeavy: false, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_012_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'The Big Coat', publicText: '+3. Body Gear. Heavy.', slot: 'BODY', handsUsed: 0, combatBonus: 3, escapeBonus: 0, scrapValue: 800, isHeavy: true, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_013_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Glow-in-the-Dark Belt', publicText: '+1. No-slot Gear.', slot: 'NO_SLOT', handsUsed: 0, combatBonus: 1, escapeBonus: 0, scrapValue: 200, isHeavy: false, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_014_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Exit Hat', publicText: '+1 Escape. Head Gear.', slot: 'HEAD', handsUsed: 0, combatBonus: 0, escapeBonus: 1, scrapValue: 300, isHeavy: false, enforcement: 'AUTO' },

  // Tricks / one-shot equivalents
  { id: 'LOOT_TRICK_001_EQUIV', deck: 'LOOT', type: 'TRICK', publicName: 'Pocket Sand', publicText: 'Play during combat. Player side +3.', scrapValue: 100, timing: ['DURING_COMBAT'], effect: { type: 'MODIFY_COMBAT_TOTAL', side: 'PLAYER', amount: 3 }, discardAfterUse: true, enforcement: 'AUTO' },
  { id: 'LOOT_TRICK_002_EQUIV', deck: 'LOOT', type: 'TRICK', publicName: 'Suspicious Shortcut', publicText: 'Play before Escape. +2 to the roll.', scrapValue: 200, timing: ['BEFORE_ESCAPE_ROLL'], effect: { type: 'MODIFY_ESCAPE_ROLL', amount: 2 }, discardAfterUse: true, enforcement: 'AUTO' },
  { id: 'LOOT_TRICK_003_EQUIV', deck: 'LOOT', type: 'TRICK', publicName: 'Loudly Incorrect Advice', publicText: 'Play during combat. Threat side +3.', scrapValue: 100, timing: ['DURING_COMBAT'], effect: { type: 'MODIFY_COMBAT_TOTAL', side: 'THREAT', amount: 3 }, discardAfterUse: true, enforcement: 'AUTO' },
  { id: 'LOOT_TRICK_004_EQUIV', deck: 'LOOT', type: 'TRICK', publicName: 'Emergency Snack', publicText: 'Play during combat. Player side +5.', scrapValue: 200, timing: ['DURING_COMBAT'], effect: { type: 'MODIFY_COMBAT_TOTAL', side: 'PLAYER', amount: 5 }, discardAfterUse: true, enforcement: 'AUTO' },
  { id: 'LOOT_TRICK_005_EQUIV', deck: 'LOOT', type: 'TRICK', publicName: 'Paperwork Delay', publicText: 'Play during combat. Threat side -3.', scrapValue: 200, timing: ['DURING_COMBAT'], effect: { type: 'MODIFY_COMBAT_TOTAL', side: 'THREAT', amount: -3 }, discardAfterUse: true, enforcement: 'AUTO' },
  { id: 'LOOT_TRICK_006_EQUIV', deck: 'LOOT', type: 'TRICK', publicName: 'Second Wind', publicText: 'Play after an Escape roll. Reroll it.', scrapValue: 300, timing: ['AFTER_ESCAPE_ROLL'], effect: { type: 'REROLL_ESCAPE' }, discardAfterUse: true, enforcement: 'GUIDED' },
  { id: 'LOOT_TRICK_007_EQUIV', deck: 'LOOT', type: 'TRICK', publicName: 'Fake Credentials', publicText: 'Play on your turn outside combat. Draw 1 Loot.', scrapValue: 300, timing: ['ANY_TIME_OWN_TURN'], effect: { type: 'DRAW_LOOT', count: 1 }, discardAfterUse: true, enforcement: 'AUTO' },
  { id: 'LOOT_TRICK_008_EQUIV', deck: 'LOOT', type: 'TRICK', publicName: 'Actually Helpful Advice', publicText: 'Play during combat. Player side +2.', scrapValue: 100, timing: ['DURING_COMBAT'], effect: { type: 'MODIFY_COMBAT_TOTAL', side: 'PLAYER', amount: 2 }, discardAfterUse: true, enforcement: 'AUTO' },
  { id: 'LOOT_TRICK_009_EQUIV', deck: 'LOOT', type: 'TRICK', publicName: 'Deeply Unhelpful Advice', publicText: 'Play during combat. Threat side +2.', scrapValue: 100, timing: ['DURING_COMBAT'], effect: { type: 'MODIFY_COMBAT_TOTAL', side: 'THREAT', amount: 2 }, discardAfterUse: true, enforcement: 'AUTO' },
  { id: 'LOOT_TRICK_010_EQUIV', deck: 'LOOT', type: 'TRICK', publicName: 'Lucky Break', publicText: 'Play before Escape. Automatically Escape.', scrapValue: 500, timing: ['BEFORE_ESCAPE_ROLL'], effect: { type: 'AUTO_ESCAPE' }, discardAfterUse: true, enforcement: 'GUIDED' },

  // Specials / rule-breaker skeleton
  { id: 'LOOT_SPECIAL_001_EQUIV', deck: 'LOOT', type: 'SPECIAL', publicName: 'Minor Reputation Boost', publicText: 'Gain 1 Renown. Cannot grant the final Renown.', scrapValue: 0, timing: ['ANY_TIME_OWN_TURN'], effect: { type: 'GAIN_RENOWN', amount: 1, canWin: false }, enforcement: 'AUTO' },
  { id: 'LOOT_SPECIAL_002_EQUIV', deck: 'LOOT', type: 'SPECIAL', publicName: 'Sellout Moment', publicText: 'Sell Gear. Every 1000 Scrap Value is +1 Renown. Cannot win this way.', scrapValue: 0, timing: ['ANY_TIME_OWN_TURN'], effect: { type: 'SELL_GEAR_FOR_RENOWN', threshold: 1000, canWin: false }, enforcement: 'GUIDED' },
  { id: 'LOOT_SPECIAL_003_EQUIV', deck: 'LOOT', type: 'SPECIAL', publicName: 'Fresh Inventory', publicText: 'Draw 2 Loot.', scrapValue: 0, timing: ['ANY_TIME_OWN_TURN'], effect: { type: 'DRAW_LOOT', count: 2 }, enforcement: 'AUTO' }
];

module.exports = { chamberCards, lootCards };
