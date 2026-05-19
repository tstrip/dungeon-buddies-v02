# Loot Goblins v0.6.4 — Action-First Mobile Flow

This build layers the action-first face-up reveal pass on top of v0.6.3.

## Changed

### Face-up non-Foe reveals
When a non-Foe Chamber card is revealed and added to hand, the center panel now prioritizes the card name and gives direct actions where legal.

Examples:
- Calling / Kin: `Play [Card]` + `View Card`
- Gear: `Equip` / `Carry` + `View Card`
- eligible Special cards: `Play Special` + `View Card`

### No Foe flow
- The No Foe panel is shorter and less paragraph-heavy.
- Card name comes first; “Face-Up Chamber” is secondary context.
- Start Trouble is visually linked to the hand with clearer copy:
  - “Tap a glowing Foe in your hand.”
  - “Foe cards in your hand glow when they can Start Trouble.”

### Top banner
- On the No Foe choice state, the top banner is reduced further into a compact status strip.

### Hand tray
- Cleaner help text.
- Hand limit now distinguishes:
  - `6/6 Full`
  - `7/6 Tribute`
- Slightly more hand-tray breathing room.

## Not changed
- No new assets.
- No random flavor-line system.
- No broad gameplay rule rewrite.
