# Loot Goblins Mobile App UX Build v0.3

This build keeps the approved asset integration and v0.2 mobile compression, then shifts the phone experience further away from “mini desktop board” and toward a fast mobile game HUD.

## What changed in v0.3

### Player power is visible
- Player seats now show `PWR` using current Glory + combat bonus.
- Desktop player strip also includes Power in the stats line.
- This gives players a quick read before starting combat without manually adding Glory + Gear.

### Combat outcome language is clearer
- Added a combat outcome helper that converts raw totals into readable states:
  - Winning by X
  - Losing by X
  - Tied — Foe wins
  - Tied — player wins ties
- Removed vague “ahead by 0” / “winning by 0” style language from the main combat UI.
- Combat banner, combat result, and combat math now use the same outcome language.

### Tribute mode is safer
- Tapping a tribute card now opens the inspector instead of immediately selecting it.
- A separate `Pick` badge selects/removes tribute cards.
- Selected tribute cards now get a strong glow, lift, and `SELECTED` label so players can tell what they chose.

### Mobile action banner is tighter
- Helper text in the top phase/action banner is shortened.
- The extra “To Start Trouble...” helper span no longer consumes a huge right-side block.
- On mobile, phase helper text clamps harder and primary actions are grid-like.

### Mobile stage and hand spacing refined
- Center card size is slightly reduced to avoid being buried under the hand tray.
- Bottom padding is increased to account for the fixed hand drawer.
- Hand tray is a little shorter when collapsed and roomier when expanded.

## What did not change

- Core mechanics were not intentionally rewritten.
- No new art assets were generated.
- Desktop/tablet should remain close to v0.2.

## Feedback target

Test on phone and focus on:

1. Can you see everyone’s usable Power?
2. Does combat outcome language remove ambiguity?
3. Is Tribute selection understandable?
4. Can you inspect Tribute cards before choosing?
5. Is the top action area less overwhelming?
6. Is the center card still too hidden by the hand?
