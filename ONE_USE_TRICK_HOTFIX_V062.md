# Loot Goblins v0.6.2 — One-Use Trick / Potion Hotfix

## Fixed / clarified

Potions and potion-like cards should not behave like equipable Gear.

### Card data
- All `TRICK` cards are now explicitly marked:
  - `oneUse: true`
  - `consumable: true`

### Server guardrails
- `publicCard` now exposes `oneUse` and `consumable`.
- Added `isOneUseConsumable(card)`.
- Equip validation rejects one-use consumables with:
  - “That is a one-use Trick, not equipable Gear.”
- Gear action path rejects any one-use consumable even if a future or stale card somehow has `type: GEAR`.
- Sell/owned-Gear options exclude one-use consumables.

### Client/UI
- Tricks now display more clearly as `Trick · One-use`.
- Trick bottom text now says `One-use Trick`.
- Inspector copy clarifies that one-use cards are not equipable Gear.
- Playable highlighting no longer treats any consumable Gear-like card as equipable.
- Added styling for one-use/consumable notes.

## Rule intent
Potions/one-shots stay in hand until their timing window, then are played once and discarded.
They are not equipped, carried as Gear, or assigned like normal Gear.
