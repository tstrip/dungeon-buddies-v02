# Loot Goblins v0.6.2

## One-for-One Card Parity + Automation Patch

This build uses the v0.6.1 card parity ledger as the build map and moves the playable deck to a full 168-card classic-style density target:

- 95 Chamber cards
- 73 Loot cards
- 168 total live card copies

## Main standard

No live card should require vague manual resolution.

Live cards now resolve as either:

- Automated
- Guided choice -> automated result

If a player choice is needed, the app should ask for the choice and then apply the result.

## Major changes

- Chamber/Loot counts aligned to 95/73.
- Bruiser and Hexhand copy counts adjusted to better mirror source Class density.
- Chamber-only specials such as Lunch Break, Illusion Swap, and Divine Scheduling Conflict moved into the Chamber deck.
- Remaining manual-resolution card entries converted to automated or guided effects.
- Added automated support for many previously parked curse/bad-news effects.
- Added guided/automated support for change Calling / change Kin effects.
- Added additional selectors for Gear discard effects such as Heavy Gear and highest-bonus Gear.
- Added simplified automated handling for source-card weirdness that used to block play.
- Updated health/version label to `0.6.2-one-for-one-automation`.

## Known future polish

Some effects are still simplified digital equivalents rather than perfect physical-table replicas, especially highly social or edge-case cards. They no longer stop the game with manual confirmation, but future versions should refine them individually as playtesting identifies feel issues.
