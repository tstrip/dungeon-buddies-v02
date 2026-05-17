const chamberCards = [
  // Callings
  {
    id: 'CALLING_BRUISER', deck: 'CHAMBER', type: 'ROLE', publicName: 'Bruiser', mechanicalSlot: 'WARRIOR_EQUIV',
    publicText: 'In combat, you may discard up to 3 cards for +1 combat bonus each. You win tied combats.',
    flavorText: 'A practical Calling for anyone who believes every puzzle has a door-shaped solution.',
    enforcement: 'GUIDED'
  },
  {
    id: 'CALLING_HEXHAND', deck: 'CHAMBER', type: 'ROLE', publicName: 'Hexhand', mechanicalSlot: 'WIZARD_EQUIV',
    publicText: 'During combat, if you have at least 3 cards in hand, you may discard your whole hand to remove one Foe. Gain its Loot, but no Glory. After failing to Flee, you may discard cards for +1 to the roll each.',
    flavorText: 'Magic is mostly confidence, hand gestures, and cleaning up later.',
    enforcement: 'GUIDED'
  },
  {
    id: 'CALLING_CUTPURSE', deck: 'CHAMBER', type: 'ROLE', publicName: 'Cutpurse', mechanicalSlot: 'THIEF_EQUIV',
    publicText: 'During another player’s combat, discard 1 card to give that player -2. On your own turn outside combat, discard 1 card to attempt to steal non-Heavy Gear from another player. Succeed on 4+. On failure, lose 1 Glory.',
    flavorText: 'Believes sharing is important, especially when other people start.',
    enforcement: 'GUIDED'
  },
  {
    id: 'CALLING_GRAVEFRIEND', deck: 'CHAMBER', type: 'ROLE', publicName: 'Gravefriend', mechanicalSlot: 'CLERIC_EQUIV',
    publicText: 'When drawing face-up, you may discard cards to draw from the matching discard pile instead. Against Restless Foes, you may discard up to 3 cards for +3 combat bonus each.',
    flavorText: 'Keeps in touch with old friends, even the very old ones.',
    enforcement: 'GUIDED'
  },

  // Kin
  {
    id: 'KIN_BRIGHTKIN', deck: 'CHAMBER', type: 'ORIGIN', publicName: 'Brightkin', mechanicalSlot: 'ELF_EQUIV',
    publicText: 'You get +1 to Flee. When you help another player defeat a Foe, gain 1 Glory. This cannot give you the final winning Glory.',
    flavorText: 'Graceful, helpful, and only a little pleased that everyone noticed.',
    enforcement: 'AUTO'
  },
  {
    id: 'KIN_DEEPBORN', deck: 'CHAMBER', type: 'ORIGIN', publicName: 'Deepborn', mechanicalSlot: 'DWARF_EQUIV',
    publicText: 'Your hand limit is 6. You may carry one extra Heavy Gear.',
    flavorText: 'Packs like every errand might become an expedition.',
    enforcement: 'AUTO'
  },
  {
    id: 'KIN_HALFSTEP', deck: 'CHAMBER', type: 'ORIGIN', publicName: 'Halfstep', mechanicalSlot: 'HALFLING_EQUIV',
    publicText: 'Once per turn, one Gear card you sell counts for double Junk Value. Selling cannot give you the final winning Glory.',
    flavorText: 'Small pockets, excellent receipts.',
    enforcement: 'GUIDED'
  },

  // Foes
  {
    id: 'FOE_LOW_001', deck: 'CHAMBER', type: 'THREAT', publicName: 'Basement Goblin', strength: 1, renownReward: 1, lootReward: 1,
    publicText: 'Defeat this Foe to gain 1 Glory and draw 1 Loot. Bad News: Lose 1 Glory, to a minimum of 1.',
    flavorText: 'Lives under the stairs and considers that a leadership position.',
    tags: [], consequence: { type: 'LOSE_RENOWN', amount: 1, minimum: 1 }, enforcement: 'AUTO'
  },
  {
    id: 'FOE_LOW_002', deck: 'CHAMBER', type: 'THREAT', publicName: 'Candle Slime', strength: 2, renownReward: 1, lootReward: 1,
    publicText: 'Defeat this Foe to gain 1 Glory and draw 1 Loot. Bad News: Discard 1 random card.',
    flavorText: 'Warm, wobbly, and gently ruining the carpet.',
    tags: [], consequence: { type: 'DISCARD_FROM_HAND', count: 1, method: 'RANDOM' }, enforcement: 'AUTO'
  },
  {
    id: 'FOE_LOW_003', deck: 'CHAMBER', type: 'THREAT', publicName: 'Rust Bat', strength: 3, renownReward: 1, lootReward: 1,
    publicText: 'Defeat this Foe to gain 1 Glory and draw 1 Loot. Bad News: Discard one equipped Hand Gear, if you have any.',
    flavorText: 'Mostly wings, teeth, and opinions about metal.',
    tags: [], consequence: { type: 'DISCARD_GEAR', target: 'EQUIPPED_GEAR', slot: 'HAND', choice: 'PLAYER' }, enforcement: 'GUIDED'
  },
  {
    id: 'FOE_LOW_RESTLESS_001', deck: 'CHAMBER', type: 'THREAT', publicName: 'Little Bone Guy', strength: 4, renownReward: 1, lootReward: 1,
    publicText: 'Restless. Defeat this Foe to gain 1 Glory and draw 1 Loot. Bad News: Lose your Calling.',
    flavorText: 'Small skeleton. Big schedule.',
    tags: ['RESTLESS'], consequence: { type: 'LOSE_ROLE' }, enforcement: 'AUTO'
  },
  {
    id: 'FOE_LOW_004', deck: 'CHAMBER', type: 'THREAT', publicName: 'Hallway Gremlin', strength: 4, renownReward: 1, lootReward: 2,
    publicText: 'Defeat this Foe to gain 1 Glory and draw 2 Loot. Bad News: Discard 2 cards from your hand.',
    flavorText: 'Not dangerous alone, but extremely committed to making the hallway worse.',
    tags: [], consequence: { type: 'DISCARD_FROM_HAND', count: 2, method: 'PLAYER_CHOICE' }, enforcement: 'GUIDED'
  },
  {
    id: 'FOE_MIDLOW_001', deck: 'CHAMBER', type: 'THREAT', publicName: 'Moss Troll', strength: 6, renownReward: 1, lootReward: 2,
    publicText: 'Defeat this Foe to gain 1 Glory and draw 2 Loot. This Foe will not pursue players below 3 Glory. Bad News: Lose 1 Glory.',
    flavorText: 'Patient, mossy, and somehow already disappointed in you.',
    tags: [], willNotPursue: [{ type: 'RENOWN_BELOW', value: 3 }], consequence: { type: 'LOSE_RENOWN', amount: 1, minimum: 1 }, enforcement: 'AUTO'
  },
  {
    id: 'FOE_MIDLOW_002', deck: 'CHAMBER', type: 'THREAT', publicName: 'Chest With Opinions', strength: 7, renownReward: 1, lootReward: 2,
    publicText: 'Defeat this Foe to gain 1 Glory and draw 2 Loot. Bad News: Discard one Gear you have in play.',
    flavorText: 'It was pretending to be treasure, but only because it had notes.',
    tags: [], consequence: { type: 'DISCARD_GEAR', target: 'PUBLIC_GEAR', slot: 'ANY', choice: 'PLAYER' }, enforcement: 'GUIDED'
  },
  {
    id: 'FOE_MIDLOW_004', deck: 'CHAMBER', type: 'THREAT', publicName: 'Hallway Ogre', strength: 10, renownReward: 1, lootReward: 3,
    publicText: 'Defeat this Foe to gain 1 Glory and draw 3 Loot. Bad News: Lose 2 Glory, to a minimum of 1.',
    flavorText: 'Too big for the hallway, too proud to turn sideways.',
    tags: [], consequence: { type: 'LOSE_RENOWN', amount: 2, minimum: 1 }, enforcement: 'AUTO'
  },
  {
    id: 'FOE_MIDLOW_RESTLESS_002', deck: 'CHAMBER', type: 'THREAT', publicName: 'Restless Knight', strength: 10, renownReward: 1, lootReward: 3,
    publicText: 'Restless. Defeat this Foe to gain 1 Glory and draw 3 Loot. Bad News: Discard one equipped Gear.',
    flavorText: 'Still defending the realm, though no one is quite sure which realm.',
    tags: ['RESTLESS'], consequence: { type: 'DISCARD_GEAR', target: 'EQUIPPED_GEAR', slot: 'ANY', choice: 'PLAYER' }, enforcement: 'GUIDED'
  },
  {
    id: 'FOE_MID_001', deck: 'CHAMBER', type: 'THREAT', publicName: 'Mirror Knight', strength: 12, renownReward: 1, lootReward: 3,
    publicText: 'This Foe gets +4 strength against Bruisers. Defeat it to gain 1 Glory and draw 3 Loot. Bad News: Discard one equipped Hand Gear.',
    flavorText: 'Very brave, especially when you are.',
    tags: [], specialRules: [{ type: 'BONUS_AGAINST_ROLE', roleMechanicalSlot: 'WARRIOR_EQUIV', amount: 4 }], consequence: { type: 'DISCARD_GEAR', target: 'EQUIPPED_GEAR', slot: 'HAND', choice: 'PLAYER' }, enforcement: 'GUIDED'
  },
  {
    id: 'FOE_MID_002', deck: 'CHAMBER', type: 'THREAT', publicName: 'The Hungry Door', strength: 13, renownReward: 1, lootReward: 3,
    publicText: 'Defeat this Foe to gain 1 Glory and draw 3 Loot. Bad News: Discard your hand.',
    flavorText: 'Technically a door. Practically a mouth with hinges.',
    tags: [], consequence: { type: 'DISCARD_HAND', count: 'ALL' }, enforcement: 'AUTO'
  },
  {
    id: 'FOE_MID_003', deck: 'CHAMBER', type: 'THREAT', publicName: 'Bog Hydra', strength: 14, renownReward: 1, lootReward: 4,
    publicText: 'Defeat this Foe to gain 1 Glory and draw 4 Loot. Bad News: Lose 2 Glory, to a minimum of 1.',
    flavorText: 'Every head has a plan. None of them checked with the others.',
    tags: [], consequence: { type: 'LOSE_RENOWN', amount: 2, minimum: 1 }, enforcement: 'AUTO'
  },
  {
    id: 'FOE_HIGH_002', deck: 'CHAMBER', type: 'THREAT', publicName: 'Paper Crown Dragon', strength: 18, renownReward: 2, lootReward: 5,
    publicText: 'If the active player has 8 or more Glory, this Foe gets +5 strength. Defeat it to gain 2 Glory and draw 5 Loot. Bad News: You are Knocked Out.',
    flavorText: 'The crown is paper. The fire is not.',
    tags: [], specialRules: [{ type: 'BONUS_IF_ACTIVE_RENOWN_AT_LEAST', value: 8, amount: 5 }], consequence: { type: 'KNOCKOUT' }, enforcement: 'GUIDED'
  },
  {
    id: 'FOE_BOSS_001', deck: 'CHAMBER', type: 'THREAT', publicName: 'The Very Large Problem', strength: 20, renownReward: 2, lootReward: 5,
    publicText: 'Defeat this Foe to gain 2 Glory and draw 5 Loot. Bad News: You are Knocked Out.',
    flavorText: 'It is less a monster and more an event with teeth.',
    tags: [], consequence: { type: 'KNOCKOUT' }, enforcement: 'GUIDED'
  },

  // Hexes
  { id: 'HEX_LOSE_GLORY_001', deck: 'CHAMBER', type: 'HEX', publicName: 'Reputation Leak', publicText: 'Lose 1 Glory, to a minimum of 1.', flavorText: 'The dungeon heard your story and made some edits.', timing: ['ON_REVEAL'], target: 'ACTIVE_PLAYER', effects: [{ type: 'LOSE_RENOWN', amount: 1, minimum: 1 }], enforcement: 'AUTO' },
  { id: 'HEX_LOSE_CALLING_001', deck: 'CHAMBER', type: 'HEX', publicName: 'Career Crisis', publicText: 'Lose your Calling. If you do not have a Calling, nothing happens.', flavorText: 'The dungeon appreciates your service and has accepted your resignation.', timing: ['ON_REVEAL'], target: 'ACTIVE_PLAYER', effects: [{ type: 'LOSE_ROLE' }], enforcement: 'AUTO' },
  { id: 'HEX_LOSE_KIN_001', deck: 'CHAMBER', type: 'HEX', publicName: 'Identity Audit', publicText: 'Lose your Kin. If you do not have Kin, nothing happens.', flavorText: 'Please provide three forms of ancestry and one small apology.', timing: ['ON_REVEAL'], target: 'ACTIVE_PLAYER', effects: [{ type: 'LOSE_ORIGIN' }], enforcement: 'AUTO' },
  { id: 'HEX_LOSE_HEAD_GEAR_001', deck: 'CHAMBER', type: 'HEX', publicName: 'Hat Problem', publicText: 'Discard one equipped Head Gear. If you have none, nothing happens.', flavorText: 'Your head remains. The situation around it has changed.', timing: ['ON_REVEAL'], target: 'ACTIVE_PLAYER', effects: [{ type: 'DISCARD_GEAR', target: 'EQUIPPED_GEAR', slot: 'HEAD', choice: 'PLAYER' }], enforcement: 'GUIDED' },
  { id: 'HEX_LOSE_BODY_GEAR_001', deck: 'CHAMBER', type: 'HEX', publicName: 'Wardrobe Malfunction', publicText: 'Discard one equipped Body Gear. If you have none, nothing happens.', flavorText: 'The armor did its best and would like that noted.', timing: ['ON_REVEAL'], target: 'ACTIVE_PLAYER', effects: [{ type: 'DISCARD_GEAR', target: 'EQUIPPED_GEAR', slot: 'BODY', choice: 'PLAYER' }], enforcement: 'GUIDED' },
  { id: 'HEX_LOSE_FOOT_GEAR_001', deck: 'CHAMBER', type: 'HEX', publicName: 'Floor Disagreement', publicText: 'Discard one equipped Foot Gear. If you have none, nothing happens.', flavorText: 'The floor has filed a formal complaint about your footwear.', timing: ['ON_REVEAL'], target: 'ACTIVE_PLAYER', effects: [{ type: 'DISCARD_GEAR', target: 'EQUIPPED_GEAR', slot: 'FEET', choice: 'PLAYER' }], enforcement: 'GUIDED' },
  { id: 'HEX_DISCARD_RANDOM_001', deck: 'CHAMBER', type: 'HEX', publicName: 'Butterfingers', publicText: 'Discard 1 random card from your hand.', flavorText: 'You briefly owned that card. That was nice.', timing: ['ON_REVEAL'], target: 'ACTIVE_PLAYER', effects: [{ type: 'DISCARD_FROM_HAND', count: 1, method: 'RANDOM' }], enforcement: 'AUTO' },
  { id: 'HEX_LOSE_ANY_GEAR_001', deck: 'CHAMBER', type: 'HEX', publicName: 'Inventory Incident', publicText: 'Discard one Gear you have in play.', flavorText: 'Something fell out of somewhere. Nobody is proud of the investigation.', timing: ['ON_REVEAL'], target: 'ACTIVE_PLAYER', effects: [{ type: 'DISCARD_GEAR', target: 'PUBLIC_GEAR', slot: 'ANY', choice: 'PLAYER' }], enforcement: 'GUIDED' },

  // Foe Modifiers
  { id: 'FOE_MOD_PLUS_005_LOOT_001', deck: 'CHAMBER', type: 'THREAT_MODIFIER', publicName: 'Annoyingly Prepared', publicText: 'Play during combat. Attach to a Foe. That Foe gets +5 strength and is worth +1 Loot.', flavorText: 'It brought snacks, maps, and a backup plan with tiny labels.', timing: ['DURING_COMBAT'], target: 'ACTIVE_THREAT', strengthDelta: 5, lootDelta: 1, enforcement: 'AUTO' },
  { id: 'FOE_MOD_PLUS_005_LOOT_002', deck: 'CHAMBER', type: 'THREAT_MODIFIER', publicName: 'Recently Promoted', publicText: 'Play during combat. Attach to a Foe. That Foe gets +5 strength and is worth +1 Loot.', flavorText: 'Nobody knows what the new title means, but it came with a bigger badge.', timing: ['DURING_COMBAT'], target: 'ACTIVE_THREAT', strengthDelta: 5, lootDelta: 1, enforcement: 'AUTO' },
  { id: 'FOE_MOD_PLUS_010_LOOT_002', deck: 'CHAMBER', type: 'THREAT_MODIFIER', publicName: 'Unreasonably Huge', publicText: 'Play during combat. Attach to a Foe. That Foe gets +10 strength and is worth +2 Loot.', flavorText: 'The dungeon insists it was always this size.', timing: ['DURING_COMBAT'], target: 'ACTIVE_THREAT', strengthDelta: 10, lootDelta: 2, enforcement: 'AUTO' },
  { id: 'FOE_MOD_PLUS_010_LOOT_004', deck: 'CHAMBER', type: 'THREAT_MODIFIER', publicName: 'Wearing the Good Armor', publicText: 'Play during combat. Attach to a Foe. That Foe gets +10 strength and is worth +2 Loot.', flavorText: 'Usually saved for weddings, sieges, and difficult Tuesdays.', timing: ['DURING_COMBAT'], target: 'ACTIVE_THREAT', strengthDelta: 10, lootDelta: 2, enforcement: 'AUTO' },
  { id: 'FOE_MOD_MINUS_005_LOOT_MINUS_001', deck: 'CHAMBER', type: 'THREAT_MODIFIER', publicName: 'Very Tired', publicText: 'Play during combat. Attach to a Foe. That Foe gets -5 strength and is worth -1 Loot, to a minimum of 1 Loot.', flavorText: 'It still wants to fight. It would just prefer a chair.', timing: ['DURING_COMBAT'], target: 'ACTIVE_THREAT', strengthDelta: -5, lootDelta: -1, minimumLoot: 1, enforcement: 'AUTO' },
  { id: 'FOE_MOD_PLUS_020_LOOT_004', deck: 'CHAMBER', type: 'THREAT_MODIFIER', publicName: 'Absolutely Too Much', publicText: 'Play during combat. Attach to a Foe. That Foe gets +20 strength and is worth +4 Loot.', flavorText: 'At some point, the dungeon stopped balancing encounters and started expressing itself.', timing: ['DURING_COMBAT'], target: 'ACTIVE_THREAT', strengthDelta: 20, lootDelta: 4, enforcement: 'AUTO' },

  // Chamber Specials
  { id: 'SPECIAL_GAIN_GLORY_001', deck: 'CHAMBER', type: 'SPECIAL', publicName: 'Publicity Stunt', publicText: 'Play on your turn outside combat. Gain 1 Glory. This cannot give you the final winning Glory.', flavorText: 'Not heroic exactly, but everyone did look.', timing: ['OWN_TURN_OUTSIDE_COMBAT'], target: 'SELF', effect: { type: 'GAIN_RENOWN', amount: 1, canWin: false }, enforcement: 'AUTO' },
  { id: 'SPECIAL_EXTRA_CALLING_SLOT_001', deck: 'CHAMBER', type: 'SPECIAL', publicName: 'Double Major', publicText: 'You may have one extra Calling. In this build, resolve the extra Calling slot manually.', flavorText: 'Twice the training. Half the schedule discipline.', timing: ['OWN_TURN_OUTSIDE_COMBAT'], target: 'SELF', effect: { type: 'MANUAL_PROMPT' }, enforcement: 'MANUAL' },
  { id: 'SPECIAL_MANUAL_TABLE_001', deck: 'CHAMBER', type: 'SPECIAL', publicName: 'Local Rule', publicText: 'Resolve this card with the table, then confirm.', flavorText: 'Posted clearly in a room nobody admits entering.', timing: ['MANUAL'], target: 'TABLE', effect: { type: 'MANUAL_PROMPT' }, enforcement: 'MANUAL' }
];

const lootCards = [
  // Gear
  { id: 'GEAR_HEAD_BASIC_001', deck: 'LOOT', type: 'GEAR', publicName: 'Bucket Helm', publicText: '+1 combat bonus. Head Gear.', flavorText: 'Originally a bucket. Promoted during an emergency.', slot: 'HEAD', handsUsed: 0, combatBonus: 1, escapeBonus: 0, scrapValue: 400, junkValue: 400, isHeavy: false, enforcement: 'AUTO' },
  { id: 'GEAR_HEAD_BASIC_002', deck: 'LOOT', type: 'GEAR', publicName: 'Bravery Hat', publicText: '+1 combat bonus. Head Gear.', flavorText: 'Doesn’t make you brave, but it does make hesitation look formal.', slot: 'HEAD', handsUsed: 0, combatBonus: 1, escapeBonus: 0, scrapValue: 400, junkValue: 400, isHeavy: false, enforcement: 'AUTO' },
  { id: 'GEAR_BODY_BASIC_001', deck: 'LOOT', type: 'GEAR', publicName: 'Questionable Armor', publicText: '+2 combat bonus. Body Gear.', flavorText: 'Inspected, approved, and then quietly avoided by the inspector.', slot: 'BODY', handsUsed: 0, combatBonus: 2, escapeBonus: 0, scrapValue: 600, junkValue: 600, isHeavy: false, enforcement: 'AUTO' },
  { id: 'GEAR_BODY_HEAVY_002', deck: 'LOOT', type: 'GEAR', publicName: 'The Big Coat', publicText: '+3 combat bonus. Body Gear. Heavy.', flavorText: 'Has more pockets than answers.', slot: 'BODY', handsUsed: 0, combatBonus: 3, escapeBonus: 0, scrapValue: 800, junkValue: 800, isHeavy: true, enforcement: 'AUTO' },
  { id: 'GEAR_FEET_FLEE_001', deck: 'LOOT', type: 'GEAR', publicName: 'Boots of Leaving', publicText: 'Foot Gear. +1 combat bonus and +1 when you Flee.', flavorText: 'They know the way out and would love to discuss it.', slot: 'FEET', handsUsed: 0, combatBonus: 1, escapeBonus: 1, scrapValue: 400, junkValue: 400, isHeavy: false, enforcement: 'AUTO' },
  { id: 'GEAR_FEET_COMBAT_001', deck: 'LOOT', type: 'GEAR', publicName: 'Boots of Bad Decisions', publicText: '+2 combat bonus. Foot Gear.', flavorText: 'Comfortable, durable, and rarely pointed in the correct direction.', slot: 'FEET', handsUsed: 0, combatBonus: 2, escapeBonus: 0, scrapValue: 500, junkValue: 500, isHeavy: false, enforcement: 'AUTO' },
  { id: 'GEAR_HAND_BASIC_001', deck: 'LOOT', type: 'GEAR', publicName: 'Pointy Stick', publicText: '+2 combat bonus. Uses 1 Hand.', flavorText: 'A classic for a reason, and the reason is “sharp end.”', slot: 'HAND', handsUsed: 1, combatBonus: 2, escapeBonus: 0, scrapValue: 400, junkValue: 400, isHeavy: false, enforcement: 'AUTO' },
  { id: 'GEAR_HAND_BASIC_002', deck: 'LOOT', type: 'GEAR', publicName: 'Management Sword', publicText: '+3 combat bonus. Uses 1 Hand.', flavorText: 'Excellent at cutting through red tape, provided the red tape has a health bar.', slot: 'HAND', handsUsed: 1, combatBonus: 3, escapeBonus: 0, scrapValue: 600, junkValue: 600, isHeavy: false, enforcement: 'AUTO' },
  { id: 'GEAR_HAND_TWO_HAND_001', deck: 'LOOT', type: 'GEAR', publicName: 'Bigger Pointy Stick', publicText: '+4 combat bonus. Uses 2 Hands.', flavorText: 'For when the first pointy stick made some good arguments.', slot: 'HAND', handsUsed: 2, combatBonus: 4, escapeBonus: 0, scrapValue: 800, junkValue: 800, isHeavy: false, enforcement: 'AUTO' },
  { id: 'GEAR_HAND_CUTPURSE_001', deck: 'LOOT', type: 'GEAR', publicName: 'Sneaky Little Knife', publicText: '+3 combat bonus. Uses 1 Hand. Usable only by Cutpurses.', flavorText: 'Small enough to misplace. Sharp enough to become everyone’s business.', slot: 'HAND', handsUsed: 1, combatBonus: 3, escapeBonus: 0, scrapValue: 400, junkValue: 400, usableByCallings: ['CALLING_CUTPURSE'], isHeavy: false, enforcement: 'AUTO' },
  { id: 'GEAR_HAND_GRAVEFRIEND_001', deck: 'LOOT', type: 'GEAR', publicName: 'Holy Bonker', publicText: '+4 combat bonus. Uses 1 Hand. Usable only by Gravefriends.', flavorText: 'Ceremonial, technically. Very persuasive, practically.', slot: 'HAND', handsUsed: 1, combatBonus: 4, escapeBonus: 0, scrapValue: 600, junkValue: 600, usableByCallings: ['CALLING_GRAVEFRIEND'], isHeavy: false, enforcement: 'AUTO' },
  { id: 'GEAR_NO_SLOT_BASIC_001', deck: 'LOOT', type: 'GEAR', publicName: 'Suspicious Cape', publicText: '+1 combat bonus. No slot.', flavorText: 'Billows indoors, which everyone agrees is worth something.', slot: 'NO_SLOT', handsUsed: 0, combatBonus: 1, escapeBonus: 0, scrapValue: 300, junkValue: 300, isHeavy: false, enforcement: 'AUTO' },
  { id: 'GEAR_STATUS_BONUS_001', deck: 'LOOT', type: 'GEAR', publicName: 'Tiny Crown', publicText: '+3 combat bonus. No slot.', flavorText: 'Not official, but surprisingly persuasive.', slot: 'NO_SLOT', handsUsed: 0, combatBonus: 3, escapeBonus: 0, scrapValue: 0, junkValue: 0, isHeavy: false, enforcement: 'AUTO' },
  { id: 'GEAR_EXTRA_HAND_001', deck: 'LOOT', type: 'GEAR', publicName: 'Borrowed Third Hand', publicText: 'You have one extra Hand for equipping Hand Gear.', flavorText: 'Helpful, punctual, and not interested in discussing its past.', slot: 'NO_SLOT', handsUsed: 0, combatBonus: 0, escapeBonus: 0, extraHands: 1, scrapValue: 400, junkValue: 400, isHeavy: false, enforcement: 'AUTO' },
  { id: 'GEAR_HEAVY_ODD_001', deck: 'LOOT', type: 'GEAR', publicName: 'Huge Useless Rock', publicText: '+3 combat bonus. Uses 2 Hands. Heavy.', flavorText: 'Too important to leave behind, for reasons no one has successfully explained.', slot: 'HAND', handsUsed: 2, combatBonus: 3, escapeBonus: 0, scrapValue: 0, junkValue: 0, isHeavy: true, enforcement: 'AUTO' },
  { id: 'GEAR_NO_SLOT_TITLE_001', deck: 'LOOT', type: 'GEAR', publicName: 'Fancy Title', publicText: '+3 combat bonus. No slot.', flavorText: 'The title is ceremonial. The confidence is real.', slot: 'NO_SLOT', handsUsed: 0, combatBonus: 3, escapeBonus: 0, scrapValue: 0, junkValue: 0, isHeavy: false, enforcement: 'AUTO' },

  // Tricks
  { id: 'TRICK_COMBAT_PLAYER_PLUS_003', deck: 'LOOT', type: 'TRICK', publicName: 'Pocket Miracle', publicText: 'Play during combat. The player side gets +3 for this combat.', flavorText: 'Small enough to fit in a pocket. Important enough to pretend you planned it.', timing: ['DURING_COMBAT'], target: 'PLAYER_SIDE', effect: { type: 'MODIFY_COMBAT_TOTAL', side: 'PLAYER', amount: 3 }, scrapValue: 0, junkValue: 0, enforcement: 'AUTO' },
  { id: 'TRICK_COMBAT_PLAYER_PLUS_005', deck: 'LOOT', type: 'TRICK', publicName: 'Helpful Sandwich', publicText: 'Play during combat. The player side gets +5 for this combat.', flavorText: 'Morale improves dramatically when lunch has structural integrity.', timing: ['DURING_COMBAT'], target: 'PLAYER_SIDE', effect: { type: 'MODIFY_COMBAT_TOTAL', side: 'PLAYER', amount: 5 }, scrapValue: 0, junkValue: 0, enforcement: 'AUTO' },
  { id: 'TRICK_COMBAT_FOE_PLUS_003', deck: 'LOOT', type: 'TRICK', publicName: 'Unfortunately Prepared', publicText: 'Play during combat. The Foe side gets +3 for this combat.', flavorText: 'It brought a checklist. Nobody likes that.', timing: ['DURING_COMBAT'], target: 'FOE_SIDE', effect: { type: 'MODIFY_COMBAT_TOTAL', side: 'THREAT', amount: 3 }, scrapValue: 0, junkValue: 0, enforcement: 'AUTO' },
  { id: 'TRICK_COMBAT_FOE_PLUS_005', deck: 'LOOT', type: 'TRICK', publicName: 'Second Health Bar', publicText: 'Play during combat. The Foe side gets +5 for this combat.', flavorText: 'The first health bar was mostly for introductions.', timing: ['DURING_COMBAT'], target: 'FOE_SIDE', effect: { type: 'MODIFY_COMBAT_TOTAL', side: 'THREAT', amount: 5 }, scrapValue: 0, junkValue: 0, enforcement: 'AUTO' },
  { id: 'TRICK_COMBAT_PLAYER_MINUS_003', deck: 'LOOT', type: 'TRICK', publicName: 'Sudden Confidence Problem', publicText: 'Play during combat. The player side gets -3 for this combat.', flavorText: 'A brief reminder that bravery and math are different skills.', timing: ['DURING_COMBAT'], target: 'PLAYER_SIDE', effect: { type: 'MODIFY_COMBAT_TOTAL', side: 'PLAYER', amount: -3 }, scrapValue: 0, junkValue: 0, enforcement: 'AUTO' },
  { id: 'TRICK_COMBAT_FOE_MINUS_003', deck: 'LOOT', type: 'TRICK', publicName: 'Distracting Puddle', publicText: 'Play during combat. The Foe side gets -3 for this combat.', flavorText: 'Not a trap, technically. Just a very persuasive floor.', timing: ['DURING_COMBAT'], target: 'FOE_SIDE', effect: { type: 'MODIFY_COMBAT_TOTAL', side: 'THREAT', amount: -3 }, scrapValue: 0, junkValue: 0, enforcement: 'AUTO' },
  { id: 'TRICK_COMBAT_FOE_MINUS_005', deck: 'LOOT', type: 'TRICK', publicName: 'Loose Stair', publicText: 'Play during combat. The Foe side gets -5 for this combat.', flavorText: 'The dungeon apologizes for the maintenance issue and accepts no responsibility.', timing: ['DURING_COMBAT'], target: 'FOE_SIDE', effect: { type: 'MODIFY_COMBAT_TOTAL', side: 'THREAT', amount: -5 }, scrapValue: 0, junkValue: 0, enforcement: 'AUTO' },
  { id: 'TRICK_COMBAT_EITHER_PLUS_005', deck: 'LOOT', type: 'TRICK', publicName: 'Suspiciously Useful Object', publicText: 'Play during combat. Choose the player side or the Foe side. That side gets +5 for this combat. In this build, resolve the side choice manually if needed.', flavorText: 'Nobody knows what it does until someone confidently points it at a problem.', timing: ['DURING_COMBAT'], target: 'CHOOSE_COMBAT_SIDE', effect: { type: 'MANUAL_PROMPT' }, scrapValue: 0, junkValue: 0, enforcement: 'MANUAL' },
  { id: 'TRICK_FLEE_PLUS_001', deck: 'LOOT', type: 'TRICK', publicName: 'Exit Strategy', publicText: 'Play before you roll to Flee. You get +1 to that Flee roll.', flavorText: 'Written in crayon, but surprisingly actionable.', timing: ['BEFORE_ESCAPE_ROLL'], target: 'SELF', effect: { type: 'MODIFY_ESCAPE_ROLL', amount: 1, duration: 'NEXT_ESCAPE' }, scrapValue: 0, junkValue: 0, enforcement: 'AUTO' },
  { id: 'TRICK_FLEE_REROLL_001', deck: 'LOOT', type: 'TRICK', publicName: 'Try the Other Door', publicText: 'Play after you roll to Flee. Reroll that Flee attempt and use the new result. In this build, resolve manually.', flavorText: 'Sometimes courage is checking whether the first exit had a backup exit.', timing: ['AFTER_ESCAPE_ROLL'], target: 'SELF', effect: { type: 'MANUAL_PROMPT' }, scrapValue: 0, junkValue: 0, enforcement: 'MANUAL' },

  // Loot Specials
  { id: 'SPECIAL_GAIN_GLORY_002', deck: 'LOOT', type: 'SPECIAL', publicName: 'Heroic Misunderstanding', publicText: 'Play on your turn outside combat. Gain 1 Glory. This cannot give you the final winning Glory.', flavorText: 'You meant to help. History has chosen to round up.', timing: ['OWN_TURN_OUTSIDE_COMBAT'], target: 'SELF', effect: { type: 'GAIN_RENOWN', amount: 1, canWin: false }, enforcement: 'AUTO' },
  { id: 'SPECIAL_SELL_GEAR_001', deck: 'LOOT', type: 'SPECIAL', publicName: 'Questionable Marketplace', publicText: 'Play on your turn outside combat. You may sell Gear. For every 1000 Junk Value sold, gain 1 Glory. Selling cannot give you the final winning Glory.', flavorText: 'The prices are fair if nobody asks follow-up questions.', timing: ['OWN_TURN_OUTSIDE_COMBAT'], target: 'SELF', effect: { type: 'SELL_GEAR_FOR_RENOWN', threshold: 1000, canWin: false }, enforcement: 'GUIDED' },
  { id: 'SPECIAL_MODIFY_SALE_VALUE_001', deck: 'LOOT', type: 'SPECIAL', publicName: 'Appraisal Goblin', publicText: 'Play when selling Gear. One Gear card counts as double Junk Value for this sale.', flavorText: 'Squints once, nods twice, invents a number.', timing: ['OWN_TURN_OUTSIDE_COMBAT'], target: 'SELF', effect: { type: 'SELL_GEAR_FOR_RENOWN', threshold: 1000, canWin: false, doubleHighest: true }, enforcement: 'GUIDED' },
  { id: 'SPECIAL_DRAW_LOOT_002', deck: 'LOOT', type: 'SPECIAL', publicName: 'Refresh the Shelf', publicText: 'Play on your turn outside combat. Draw 2 Loot.', flavorText: 'The dungeon restocked while you were making poor choices.', timing: ['OWN_TURN_OUTSIDE_COMBAT'], target: 'SELF', effect: { type: 'DRAW_LOOT', count: 2 }, enforcement: 'AUTO' },
  { id: 'SPECIAL_MANUAL_RULE_BREAK_001', deck: 'LOOT', type: 'SPECIAL', publicName: 'Dungeon Loophole', publicText: 'This card creates a rule exception. Resolve it manually with the table, then confirm.', flavorText: 'A small legal door in a large illegal wall.', timing: ['MANUAL'], target: 'VARIES', effect: { type: 'MANUAL_PROMPT' }, enforcement: 'MANUAL' }
];

module.exports = { chamberCards, lootCards };
