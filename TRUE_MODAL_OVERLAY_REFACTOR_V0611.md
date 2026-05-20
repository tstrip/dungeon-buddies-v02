# Loot Goblins v0.6.11 — True Modal Overlay Refactor

This build focuses specifically on the public pop-up problem.

## Fixed

### Hard events now render globally
Hard acknowledge events no longer render inside the board/combat/active table layout. They render into a dedicated top-level `#globalModalRoot` outside the game board.

This prevents:
- left-anchoring inside the table
- clipping by board containers
- weird narrow wrapping
- hand drawer / combat panel competing with the modal

### Hard modal layout cleaned up
Hard events now use:
- fixed viewport overlay
- dimmed backdrop
- centered modal card
- event type pill
- readable headline/detail block
- centered card preview with stable card proportions
- single full-width Acknowledge button

### Soft events stay inline
Routine updates still appear as non-blocking soft events:
- Kin / Calling played
- Gear equipped/carried
- routine reveals/draws/bookkeeping

### Event template groundwork
Hard events now get simple template labels:
- Trick Played
- Foe Added
- Bad News
- Goblin Down
- Victory
- Opening Roll
- Flee Result
- Backup / Trade

## Acceptance goal
A hard public event should look like a true app modal regardless of:
- combat state
- hand expanded/collapsed
- iPhone portrait
- iPad landscape
- desktop/tablet testing
