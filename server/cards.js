const chamberCards = [
  // Roles
  { id: 'CHAMBER_ROLE_001_EQUIV', deck: 'CHAMBER', type: 'ROLE', publicName: 'Bruiser', mechanicalSlot: 'WARRIOR_EQUIV', publicText: 'You are built for ugly fights. You win tied combats, and during your own combat you may discard a card for +1 strength.', effects: [{ type: 'WIN_COMBAT_TIES' }, { type: 'DISCARD_FOR_COMBAT_BONUS', amount: 1 }], enforcement: 'AUTO' },
  { id: 'CHAMBER_ROLE_002_EQUIV', deck: 'CHAMBER', type: 'ROLE', publicName: 'Spellwrecker', mechanicalSlot: 'WIZARD_EQUIV', publicText: 'During your combat, you may empty your hand to banish the current Threat. You gain its Loot, but no Renown.', effects: [{ type: 'REMOVE_THREAT_FROM_COMBAT', rewardMode: 'LOOT_ONLY' }], enforcement: 'GUIDED' },
  { id: 'CHAMBER_ROLE_003_EQUIV', deck: 'CHAMBER', type: 'ROLE', publicName: 'Cutpurse', mechanicalSlot: 'THIEF_EQUIV', publicText: 'During another player’s combat, you may discard a card to give their side -2. Outside combat, you may attempt a risky Gear steal.', effects: [{ type: 'BACKSTAB_PLAYER', combatDelta: -2 }, { type: 'ATTEMPT_STEAL_GEAR' }], enforcement: 'GUIDED' },
  { id: 'CHAMBER_ROLE_004_EQUIV', deck: 'CHAMBER', type: 'ROLE', publicName: 'Gravefriend', mechanicalSlot: 'CLERIC_EQUIV', publicText: 'You know where the old cards are buried. You gain +3 against Restless Threats.', effects: [{ type: 'COMBAT_BONUS_AGAINST_TAG', tag: 'RESTLESS', amount: 3 }], enforcement: 'GUIDED' },

  // Origins
  { id: 'CHAMBER_ORIGIN_001_EQUIV', deck: 'CHAMBER', type: 'ORIGIN', publicName: 'Brightkin', mechanicalSlot: 'ELF_EQUIV', publicText: '+1 to Escape. When you help another player win combat, gain 1 Renown, but this cannot be your winning Renown.', effects: [{ type: 'ESCAPE_BONUS', amount: 1 }, { type: 'GAIN_RENOWN_WHEN_HELPING_WIN', amount: 1, canWin: false }], enforcement: 'AUTO' },
  { id: 'CHAMBER_ORIGIN_002_EQUIV', deck: 'CHAMBER', type: 'ORIGIN', publicName: 'Deepborn', mechanicalSlot: 'DWARF_EQUIV', publicText: 'Your hand limit is 6. You may carry one extra Heavy Gear.', effects: [{ type: 'HAND_LIMIT_BONUS', amount: 1 }, { type: 'HEAVY_GEAR_LIMIT_BONUS', amount: 1 }], enforcement: 'AUTO' },
  { id: 'CHAMBER_ORIGIN_003_EQUIV', deck: 'CHAMBER', type: 'ORIGIN', publicName: 'Halfstep', mechanicalSlot: 'HALFLING_EQUIV', publicText: 'The first Gear sale you make each game counts double.', effects: [{ type: 'FIRST_SALE_DOUBLE_VALUE' }], enforcement: 'AUTO' },

  // Threats
  { id: 'CHAMBER_THREAT_001_EQUIV', deck: 'CHAMBER', type: 'THREAT', publicName: 'Basement Goblin', publicText: 'Tiny, mean, and somehow already in your house.', strength: 1, renownReward: 1, lootReward: 1, tags: [], consequence: { type: 'LOSE_RENOWN', amount: 1, minimum: 1 }, enforcement: 'AUTO' },
  { id: 'CHAMBER_THREAT_002_EQUIV', deck: 'CHAMBER', type: 'THREAT', publicName: 'Tax Troll', publicText: 'It has forms. It has questions. It has time.', strength: 4, renownReward: 1, lootReward: 2, tags: [], consequence: { type: 'DISCARD_CARD_RANDOM', count: 2 }, enforcement: 'AUTO' },
  { id: 'CHAMBER_THREAT_003_EQUIV', deck: 'CHAMBER', type: 'THREAT', publicName: 'Rust Bat', publicText: 'It only bites metal. Unfortunately, that is most of your plan.', strength: 6, renownReward: 1, lootReward: 2, tags: [], consequence: { type: 'DISCARD_GEAR', slot: 'ANY', choice: 'PLAYER' }, enforcement: 'GUIDED' },
  { id: 'CHAMBER_THREAT_004_EQUIV', deck: 'CHAMBER', type: 'THREAT', publicName: 'Restless Accountant', publicText: 'It died before reconciling the ledger.', strength: 8, renownReward: 1, lootReward: 2, tags: ['RESTLESS'], consequence: { type: 'LOSE_ROLE' }, enforcement: 'AUTO' },
  { id: 'CHAMBER_THREAT_005_EQUIV', deck: 'CHAMBER', type: 'THREAT', publicName: 'Hallway Ogre', publicText: 'Too wide for the hallway. Still your problem.', strength: 10, renownReward: 1, lootReward: 3, tags: [], consequence: { type: 'LOSE_RENOWN', amount: 2, minimum: 1 }, enforcement: 'AUTO' },
  { id: 'CHAMBER_THREAT_006_EQUIV', deck: 'CHAMBER', type: 'THREAT', publicName: 'The Loud Thing Upstairs', publicText: 'You never saw it. You heard enough.', strength: 12, renownReward: 1, lootReward: 3, tags: [], consequence: { type: 'DISCARD_HAND', count: 'ALL' }, enforcement: 'AUTO' },
  { id: 'CHAMBER_THREAT_007_EQUIV', deck: 'CHAMBER', type: 'THREAT', publicName: 'Mirror Knight', publicText: 'It fights like you, but with better posture.', strength: 14, renownReward: 1, lootReward: 4, tags: [], specialRules: [{ type: 'BONUS_AGAINST_ROLE', roleMechanicalSlot: 'WARRIOR_EQUIV', amount: 4 }], consequence: { type: 'DISCARD_GEAR', slot: 'HAND', choice: 'PLAYER' }, enforcement: 'GUIDED' },
  { id: 'CHAMBER_THREAT_008_EQUIV', deck: 'CHAMBER', type: 'THREAT', publicName: 'The Paperwork Hydra', publicText: 'Every form you finish creates two more.', strength: 16, renownReward: 2, lootReward: 4, tags: [], consequence: { type: 'KNOCKOUT' }, enforcement: 'GUIDED' },
  { id: 'CHAMBER_THREAT_009_EQUIV', deck: 'CHAMBER', type: 'THREAT', publicName: 'Definitely Not a Dragon', publicText: 'It is legally distinct and emotionally identical.', strength: 18, renownReward: 2, lootReward: 5, tags: [], consequence: { type: 'KNOCKOUT' }, enforcement: 'GUIDED' },
  { id: 'CHAMBER_THREAT_010_EQUIV', deck: 'CHAMBER', type: 'THREAT', publicName: 'The Final Problem', publicText: 'A terrible idea with excellent branding.', strength: 20, renownReward: 2, lootReward: 5, tags: [], consequence: { type: 'LOSE_RENOWN', amount: 3, minimum: 1 }, enforcement: 'AUTO' },

  // Hexes
  { id: 'CHAMBER_HEX_001_EQUIV', deck: 'CHAMBER', type: 'HEX', publicName: 'Stubbed Destiny', publicText: 'Lose 1 Renown, but not below 1.', effects: [{ type: 'LOSE_RENOWN', amount: 1, minimum: 1 }], enforcement: 'AUTO' },
  { id: 'CHAMBER_HEX_002_EQUIV', deck: 'CHAMBER', type: 'HEX', publicName: 'Wardrobe Malfunction', publicText: 'Lose one Body Gear if you have any.', effects: [{ type: 'DISCARD_GEAR', slot: 'BODY', choice: 'PLAYER' }], enforcement: 'GUIDED' },
  { id: 'CHAMBER_HEX_003_EQUIV', deck: 'CHAMBER', type: 'HEX', publicName: 'Forgot Who You Are', publicText: 'Lose your Role.', effects: [{ type: 'LOSE_ROLE' }], enforcement: 'AUTO' },
  { id: 'CHAMBER_HEX_004_EQUIV', deck: 'CHAMBER', type: 'HEX', publicName: 'Cursed Bloodline', publicText: 'Lose your Origin.', effects: [{ type: 'LOSE_ORIGIN' }], enforcement: 'AUTO' },
  { id: 'CHAMBER_HEX_005_EQUIV', deck: 'CHAMBER', type: 'HEX', publicName: 'Butterfingers', publicText: 'Discard one random card from your hand.', effects: [{ type: 'DISCARD_CARD_RANDOM', count: 1 }], enforcement: 'AUTO' },

  // Threat modifiers
  { id: 'CHAMBER_MODIFIER_001_EQUIV', deck: 'CHAMBER', type: 'THREAT_MODIFIER', publicName: 'Annoyingly Prepared', publicText: 'Play during combat. Threat gets +5 and is worth +1 Loot.', strengthDelta: 5, lootDelta: 1, timing: ['DURING_COMBAT'], enforcement: 'AUTO' },
  { id: 'CHAMBER_MODIFIER_002_EQUIV', deck: 'CHAMBER', type: 'THREAT_MODIFIER', publicName: 'Unreasonably Large', publicText: 'Play during combat. Threat gets +10 and is worth +2 Loot.', strengthDelta: 10, lootDelta: 2, timing: ['DURING_COMBAT'], enforcement: 'AUTO' },
  { id: 'CHAMBER_MODIFIER_003_EQUIV', deck: 'CHAMBER', type: 'THREAT_MODIFIER', publicName: 'Deeply Embarrassed', publicText: 'Play during combat. Threat gets -5 and is worth -1 Loot, minimum 0 extra Loot.', strengthDelta: -5, lootDelta: -1, timing: ['DURING_COMBAT'], enforcement: 'AUTO' }
];

const lootCards = [
  // Gear
  { id: 'LOOT_GEAR_001_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Bucket Helm', publicText: '+1. Head Gear.', slot: 'HEAD', handsUsed: 0, combatBonus: 1, scrapValue: 400, isHeavy: false, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_002_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Questionable Armor', publicText: '+2. Body Gear.', slot: 'BODY', handsUsed: 0, combatBonus: 2, scrapValue: 600, isHeavy: false, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_003_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Boots of Leaving', publicText: '+1. Feet Gear. +1 to Escape.', slot: 'FEET', handsUsed: 0, combatBonus: 1, escapeBonus: 1, scrapValue: 400, isHeavy: false, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_004_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Pointy Stick', publicText: '+2. One hand.', slot: 'HAND', handsUsed: 1, combatBonus: 2, scrapValue: 400, isHeavy: false, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_005_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Bigger Pointy Stick', publicText: '+4. Two hands. Heavy.', slot: 'HAND', handsUsed: 2, combatBonus: 4, scrapValue: 800, isHeavy: true, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_006_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Suspicious Cape', publicText: '+1. No slot.', slot: 'NO_SLOT', handsUsed: 0, combatBonus: 1, scrapValue: 300, isHeavy: false, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_007_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Tiny Crown', publicText: '+2. Head Gear.', slot: 'HEAD', handsUsed: 0, combatBonus: 2, scrapValue: 700, isHeavy: false, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_008_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Heavy Door Shield', publicText: '+3. One hand. Heavy.', slot: 'HAND', handsUsed: 1, combatBonus: 3, scrapValue: 600, isHeavy: true, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_009_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Fancy Pants', publicText: '+1. No slot. Terrible confidence boost.', slot: 'NO_SLOT', handsUsed: 0, combatBonus: 1, scrapValue: 500, isHeavy: false, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_010_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Management Sword', publicText: '+3. One hand.', slot: 'HAND', handsUsed: 1, combatBonus: 3, scrapValue: 600, isHeavy: false, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_011_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'Boots of Bad Decisions', publicText: '+2. Feet Gear.', slot: 'FEET', handsUsed: 0, combatBonus: 2, scrapValue: 500, isHeavy: false, enforcement: 'AUTO' },
  { id: 'LOOT_GEAR_012_EQUIV', deck: 'LOOT', type: 'GEAR', publicName: 'The Big Coat', publicText: '+3. Body Gear. Heavy.', slot: 'BODY', handsUsed: 0, combatBonus: 3, scrapValue: 800, isHeavy: true, enforcement: 'AUTO' },

  // Tricks
  { id: 'LOOT_TRICK_001_EQUIV', deck: 'LOOT', type: 'TRICK', publicName: 'Pocket Sand', publicText: 'Play during combat. Your side gets +3.', scrapValue: 100, timing: ['DURING_COMBAT'], effect: { type: 'MODIFY_COMBAT_TOTAL', side: 'PLAYER', amount: 3 }, discardAfterUse: true, enforcement: 'AUTO' },
  { id: 'LOOT_TRICK_002_EQUIV', deck: 'LOOT', type: 'TRICK', publicName: 'Suspicious Shortcut', publicText: 'Play before Escape. You get +2 to the Escape roll.', scrapValue: 200, timing: ['BEFORE_ESCAPE_ROLL'], effect: { type: 'MODIFY_ESCAPE_ROLL', amount: 2 }, discardAfterUse: true, enforcement: 'AUTO' },
  { id: 'LOOT_TRICK_003_EQUIV', deck: 'LOOT', type: 'TRICK', publicName: 'Loudly Incorrect Advice', publicText: 'Play during combat. Threat side gets +3.', scrapValue: 100, timing: ['DURING_COMBAT'], effect: { type: 'MODIFY_COMBAT_TOTAL', side: 'THREAT', amount: 3 }, discardAfterUse: true, enforcement: 'AUTO' },
  { id: 'LOOT_TRICK_004_EQUIV', deck: 'LOOT', type: 'TRICK', publicName: 'Emergency Snack', publicText: 'Play during combat. Your side gets +5.', scrapValue: 200, timing: ['DURING_COMBAT'], effect: { type: 'MODIFY_COMBAT_TOTAL', side: 'PLAYER', amount: 5 }, discardAfterUse: true, enforcement: 'AUTO' },
  { id: 'LOOT_TRICK_005_EQUIV', deck: 'LOOT', type: 'TRICK', publicName: 'Paperwork Delay', publicText: 'Play during combat. Threat side gets -3.', scrapValue: 200, timing: ['DURING_COMBAT'], effect: { type: 'MODIFY_COMBAT_TOTAL', side: 'THREAT', amount: -3 }, discardAfterUse: true, enforcement: 'AUTO' },
  { id: 'LOOT_TRICK_006_EQUIV', deck: 'LOOT', type: 'TRICK', publicName: 'Second Wind', publicText: 'Play after an Escape roll. Reroll it.', scrapValue: 300, timing: ['AFTER_ESCAPE_ROLL'], effect: { type: 'REROLL_ESCAPE' }, discardAfterUse: true, enforcement: 'GUIDED' },
  { id: 'LOOT_TRICK_007_EQUIV', deck: 'LOOT', type: 'TRICK', publicName: 'Fake Credentials', publicText: 'Play on your turn outside combat. Draw 1 Loot.', scrapValue: 300, timing: ['ANY_TIME_OWN_TURN'], effect: { type: 'DRAW_LOOT', count: 1 }, discardAfterUse: true, enforcement: 'AUTO' },
  { id: 'LOOT_TRICK_008_EQUIV', deck: 'LOOT', type: 'TRICK', publicName: 'Actually Helpful Advice', publicText: 'Play during combat. Your side gets +2.', scrapValue: 100, timing: ['DURING_COMBAT'], effect: { type: 'MODIFY_COMBAT_TOTAL', side: 'PLAYER', amount: 2 }, discardAfterUse: true, enforcement: 'AUTO' },
  { id: 'LOOT_TRICK_009_EQUIV', deck: 'LOOT', type: 'TRICK', publicName: 'Deeply Unhelpful Advice', publicText: 'Play during combat. Threat side gets +2.', scrapValue: 100, timing: ['DURING_COMBAT'], effect: { type: 'MODIFY_COMBAT_TOTAL', side: 'THREAT', amount: 2 }, discardAfterUse: true, enforcement: 'AUTO' },
  { id: 'LOOT_TRICK_010_EQUIV', deck: 'LOOT', type: 'TRICK', publicName: 'Lucky Break', publicText: 'Play before Escape. You automatically Escape.', scrapValue: 500, timing: ['BEFORE_ESCAPE_ROLL'], effect: { type: 'AUTO_ESCAPE' }, discardAfterUse: true, enforcement: 'GUIDED' },

  // Utility
  { id: 'LOOT_SPECIAL_001_EQUIV', deck: 'LOOT', type: 'SPECIAL', publicName: 'Minor Reputation Boost', publicText: 'Gain 1 Renown, but this cannot be your winning Renown.', scrapValue: 0, timing: ['ANY_TIME_OWN_TURN'], effect: { type: 'GAIN_RENOWN', amount: 1, canWin: false }, enforcement: 'AUTO' },
  { id: 'LOOT_SPECIAL_002_EQUIV', deck: 'LOOT', type: 'SPECIAL', publicName: 'Sellout Moment', publicText: 'Sell Gear for Renown: every 1000 Scrap Value is +1 Renown. Cannot win this way.', scrapValue: 0, timing: ['ANY_TIME_OWN_TURN'], effect: { type: 'SELL_GEAR_FOR_RENOWN', threshold: 1000, canWin: false }, enforcement: 'GUIDED' },
  { id: 'LOOT_SPECIAL_003_EQUIV', deck: 'LOOT', type: 'SPECIAL', publicName: 'Fresh Inventory', publicText: 'Draw 2 Loot.', scrapValue: 0, timing: ['ANY_TIME_OWN_TURN'], effect: { type: 'DRAW_LOOT', count: 2 }, enforcement: 'AUTO' }
];

module.exports = { chamberCards, lootCards };
