# Loot Goblins Tavern Entry Revamp v0.6

This build redesigns the pre-game entry surfaces: main splash/create-join, resume, and lobby.

## What changed

### Main splash / Tavern Entry
- Reworked the page from a poster-like branded form into a mobile game entry card.
- Smaller logo treatment.
- Clean horizontal goblin flavor stamp replacing the broken vertical badge.
- Name field is shared by create/join.
- Create and Join are now themed table choices:
  - Start a New Table
  - Join a Table
- Card back assets are used as section icons rather than floating decoration.

### Resume screen
- Rebuilt as a saved-table card.
- Shows room, player, and saved-session status clearly.
- Primary action is Resume Game.
- Join as Someone Else remains secondary.

### Lobby screen
- Rebuilt as a tavern table waiting room.
- Shows room code and copy-code button.
- Adds a three-seat table module:
  - occupied seats
  - you/host labels
  - empty stool states
- Status copy now changes based on player count.
- Start Game button only becomes useful at 3 players and for the host.
- Copy Invite Link remains as secondary action.

### General
- Pre-game pages now share a cleaner tavern entry system.
- Reduced oversized branding and dead space.
- Entry flow should feel more like approaching a goblin tavern table and less like a branded web form.

## Not changed
- Gameplay mobile shell was not rebuilt in this pass.
- No new generated art assets were added.
- No server-side lobby capacity/rules were changed beyond version metadata.
