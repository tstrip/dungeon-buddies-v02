# Loot Goblins App-First Mobile Shell v0.4.1 — Hotfix

This hotfix addresses two issues found in the first v0.4 test pass.

## Fixed

### Starting hand size
- Starting hand changed from 4 Chamber + 4 Loot to 2 Chamber + 2 Loot, for 4 total starting cards.
- Opening Roll announcement/log now reflects 2 Chamber + 2 Loot.

### End Turn action visibility
- End Turn now appears before Sell Gear during END_TURN.
- Added a client-side safety fallback so critical legal actions like END_TURN, DONE_POST_COMBAT, and OPEN_CHAMBER are injected if the phase button builder ever misses them.
- Mobile action buttons now wrap/grid instead of hiding overflow off-screen.

## Still needs design iteration

v0.4.1 is a hotfix, not a final app-first UX pass. The v0.4 shell is structurally promising but visually rough and still needs refinement around spacing, state-panel height, and the hand/toolbelt relationship.
