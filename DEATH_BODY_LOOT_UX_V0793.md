# Loot Goblins v0.7.9.3 — Death + Body Loot UX

## Focus

This pass makes knockout/body-looting feel like a clear game event instead of a weird state machine.

## Changes

### Knockout presentation
- Body Loot stage now says who is knocked out.
- If you are the knocked-out player, the screen explicitly says:
  - you are down
  - other goblins are looting you
  - you return on your next turn with a fresh hand

### Body Loot board
- Shows how many cards are left in the body pile.
- Shows body pile progress: looted / original count.
- Shows the current looter.
- Shows the full looting order.
- Shows a small history of who already took a card.

### Body Loot drawer
- Current looter gets a clearer “Pick One Card” drawer.
- Body Loot choices now say “Loot” instead of generic “Take card.”
- Looted card still goes to the looter privately and triggers a private Body Loot splash.

### Server metadata
- `bodyLoot` now serializes:
  - originalCount
  - lootedCount
  - victimIsYou
  - order
  - history
  - tieRolls
- Body Loot per-card announcements are now soft/minor instead of hard table-stopping events.

## Still intentional

Observers do not see exact body-pile card identities. The current looter sees the choices.
