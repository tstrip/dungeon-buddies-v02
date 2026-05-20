# Loot Goblins v0.7 — Playtest Hardening + Host Language Pass

This is a stability/experience pass, not a new mechanics pass.

## Focus

The app should feel more like a confident table host:
- tell players what happened
- show who acts next
- show what options matter
- avoid internal software language

## Changes

### Host-language polish
- Expanded friendly phase names.
- Removed raw/internal fallback language from the top banner.
- Replaced generic fallback text with clearer table-host copy.

### Hand limit clarity
- Over-limit is less alarming when it is not currently your Tribute phase.
- Non-active players now see `Tribute Later` rather than a red emergency-style state.
- Tribute phase still clearly says `Tribute Required`.

### Combat clarity
- Added a compact "What now?" host note to the combat stage.
- Combat now reinforces whether players are winning, losing, need help, or are waiting for passes.
- The existing full combat math detail remains available.

### Better contextual labels
- Revealed Foe buttons now say `View Foe`.
- Hex buttons now say `Read Hex`.
- Tribute copy better explains inspect-then-pick behavior.

### Loot phase copy
- Use Loot / Sell Before Tribute now more clearly says the active player can use legal cards before the hand-limit check.
- Observer copy has more personality and less generic waiting text.

## What this does not do yet

- No new cards.
- No new art assets.
- No major rules rewrite.
- No server-driven per-card legal action list yet.

## Next best future direction

Move toward server-authored legal card actions so the client never guesses which buttons should appear.
