# Loot Goblins Center Action Mobile Controls v0.5.1

This build keeps the v0.5 Magical Mobile Play Shell, but moves mobile primary actions into the center state panel.

## Why

v0.5 made the center state panel feel like the real play surface. The old top banner still contained the actual buttons, which created a mismatch: the center looked tappable, but players had to go back up to act.

## Changed

### Mobile action ownership
- The center state panel now owns primary mobile actions.
- The top banner is reduced to a compact status strip on mobile.
- Desktop/tablet behavior remains closer to the previous layout.

### Center actions added for
- Open Chamber
- Loot the Room
- Sell Gear
- End Turn
- Done with Loot → Tribute
- Roll d6
- Combat actions / Backup / Done — No More Plays
- Flee actions
- Tribute Confirm

### Interaction hookups
- Center-panel `data-action` buttons now emit normal actions.
- Center-panel combat buttons use the existing combat handler.
- Center Tribute Confirm uses the existing tribute confirmation flow.

## Still next
- Prompt-specific center actions need a deeper pass.
- Card inspector should become action-first.
- Backup negotiation probably deserves its own dedicated mobile state.
