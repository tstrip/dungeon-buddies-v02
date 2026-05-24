# Loot Goblins v0.7.9.8 — Screen-by-Screen Visual Tightening

## Focus

This pass does not add new mechanics. It tightens the playable screens so the game feels less like stacked UI panels and more like touching table objects.

## Changes

### Open Chamber
- Reworked the Open Chamber action to feel more like a dungeon door:
  - taller door slab
  - darker wood/purple center
  - brass/gold border
  - glowing knob/keyhole treatment
  - shorter copy: “Reveal what’s behind the door”

### No Foe
- Reduced repeated labels.
- Start Trouble and Loot the Room are treated as equal sibling choices.
- No Foe choices use more card-like button objects.

### Combat
- Combat screen now uses a more battlefield-like presentation.
- Scorebar and result pill are visually stronger.
- Bad News is attached more clearly to the fight.
- “Full combat math” was shortened to “Combat math.”

### Flee / Bad News
- Flee screen grouping is cleaner.
- Bad News card is visually separated from the roll and target chip.

### Last Chance Before Tribute
- Reduced rules-engine wording.
- The action card is slimmer.
- Primary action remains “Check Hand Limit.”

### Button hierarchy
- Gold/orange = primary next action
- Purple = magic/reaction/card-use action
- Brown/neutral = secondary/pass/cancel
- Red/pink = danger/Bad News/Tribute/Flee consequence
- Green remains ready/confirmed/success

### Compact card readability
- Mini cards now include a second small subline.
- Special cards try to show useful one-line summaries:
  - Gain Glory
  - Extra Calling slot
  - Extra Kin slot
  - Cancel a Hex
  - Take from discard
- Calling/Kin cards use short rule text as their mini-card summary when possible.

## Still intentionally deferred to v0.8

- Real table background
- Full card art
- final card frames
- animated door
- final announcement skins
- player seat/token art
