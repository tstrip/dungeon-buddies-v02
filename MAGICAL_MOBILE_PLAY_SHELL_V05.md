# Loot Goblins Magical Mobile Play Shell v0.5

v0.5 is the first refinement pass after the rough v0.4 app-first shell.

## Goal

Preserve the charm and toy-like goblin board-game identity from the earlier asset builds while keeping the mobile-native, state-based playstyle introduced in v0.4.

## Major changes

### Adaptive center panels
Mobile state panels now use size classes:
- small: start turn, no-Foe choice, end turn, waiting
- medium: reveal, tribute, opening roll, prompts
- large: combat and flee

This should reduce the giant empty “Current State” feeling from v0.4.

### Better player-perspective states
Added dedicated mobile panels for:
- Start Turn
- No Foe / Choose Move
- Post Combat
- End Turn

These avoid misleading “Waiting on J” copy when it is actually your turn.

### Magic restored without full table clutter
The mobile shell now has more of the tavern-table feel through:
- subtle felt/table backing
- brass/gold framing
- purple glow
- icon-bearing state headers
- smaller, warmer player/deck chips

### Combat remains app-first
Combat keeps the v0.4 app-first structure:
- player side
- foe side
- losing/winning/tied status
- need +X to win
- foe summary
- pass status
- collapsible combat math

### Hand/toolbelt refinement
- During combat/reactions, playable cards are sorted to the front.
- Playable cards glow more clearly.
- Non-playable cards are dimmed.
- A small “playable cards now” label appears during combat/reaction windows.

## Not done yet

This is still not the final mobile UX. Future passes should focus on:
- action-first card inspector
- better backup negotiation screen
- body-loot/death screen
- more intentional hand expansion behavior
- final mobile visual art/background/buttons after structure is stable
