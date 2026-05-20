# Loot Goblins v0.6.14 — Hex Flow Hotfix

## Fixed

### Hex no longer strands the game in HEX_REVEAL
v0.6.13 introduced source-first Hex resolution, but after some played Hexes resolved it could leave the table in `HEX_REVEAL` with no `pendingHex`, which blocked progression.

This build stores the previous phase before entering `HEX_REVEAL`, then restores it after:
- automatic Hex resolution
- Hex choice prompts
- Wish Ring cancellation
- played Hexes during combat / escape / normal turn flow

### Hex reveal/resolved no longer creates extra hard acknowledgement
Hexes now use the source-first center panel as the main action:
- reveal/show the card
- affected player taps Resolve Hex
- consequence happens
- resolved bookkeeping is soft/no-blocking

Hard acknowledgements remain for actual major consequences, choices, cancellations, Bad News, death, victory, etc.

## Why
A Hex should be shown before consequences resolve, but it should not require two separate acknowledge steps or trap the phase afterward.
