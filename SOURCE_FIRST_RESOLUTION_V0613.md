# Loot Goblins v0.6.13 — Source-First Resolution + Combat Pass Cleanup

## Source-first Hex resolution
Hexes now follow the correct sequence:

1. Reveal/show the Hex card.
2. Let the affected player read it.
3. The affected player taps Resolve Hex.
4. Consequences / choices / cancellation windows happen after the source card is visible.
5. The result resolves normally.

This prevents consequences from firing before players understand the card that caused them.

## Hex reveal state
- Added `HEX_REVEAL` phase.
- Added `pendingHex` state.
- Added `RESOLVE_HEX` action.
- Mobile and desktop now show a Hex Reveal panel with the card and a Resolve Hex button for the affected player.

## Combat pass cleanup
- Tapping Done / Pass Combat no longer creates a public popup or hard acknowledgement.
- Passes now only update the combat pass tracker and event history.
- Combat-impacting cards still use hard source-first public events.

## Rule grammar
The game now better follows: Show the cause, then resolve the effect.
