# Loot Goblins v0.6.10 — Event Priority + Modal Cleanup

This build corrects the over-acknowledgement problem from the public resolution builds.

## Event priority tiers

### Hard modal / acknowledge
These still interrupt because the table needs to understand them:
- combat events
- one-use Tricks / potions / instant combat cards
- Foe added to combat
- Hex resolution
- Bad News / Bad Stuff
- Flee results
- death/body looting
- opening roll result / who goes first
- victory
- backup and trade events

### Soft public event / no acknowledge
These are visible but do not stop play:
- Calling played
- Kin played
- Gear equipped/carried
- routine card draw/reveal
- Glory/tribute/loot phase bookkeeping

### Log only
Low-signal waiting/state updates no longer interrupt.

## Modal cleanup
- Hard events are now centered and wider.
- Text no longer collapses into vertical wrapping.
- Card preview keeps a readable card-like proportion.
- Soft events are compact feed/toast items with optional View button.

## Why
The game should show what happened without making players acknowledge every piece of bookkeeping.
