# Loot Goblins App-First Mobile Shell v0.4

This build is the first real step away from a compressed tabletop view and toward a phone-native game HUD.

## Core change

On mobile, `renderActiveTable()` now uses a dedicated app-first shell instead of the full table frame.

Desktop/tablet still use the existing table layout.

## Mobile shell structure

1. Compact top phase/action HUD
2. Player HUD row
3. Compact deck count strip
4. State-based center panel
5. Bottom hand/toolbelt drawer

## New mobile state panels

The center panel now changes based on the phase:

- Reveal / current card
- Combat
- Tribute
- Flee
- Opening roll
- Prompt
- Waiting
- Game over

## Combat panel

Combat now prioritizes:
- player side total
- foe side total
- clear result text
- “Need +X to win”
- primary foe summary
- pass status
- collapsible combat math

## Tribute panel

Tribute is now treated as its own mobile state:
- selected count is shown in the center panel
- hand drawer still contains Inspect/Pick controls from v0.3.1
- selected cards still highlight clearly

## Deck strip

Decks are now utility chips on mobile rather than table columns.

## Not done yet

This does not create new art assets or a final polished mobile visual identity. It is a structural app-shell pass.

Future v0.5 candidates:
- action-first card inspector
- playable-card sorting/highlighting in hand
- dedicated backup negotiation screen
- dedicated body-loot/death screen
- final mobile button system
- final mobile background/table art
