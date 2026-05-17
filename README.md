# Loot Goblins v0.4.3 — Layout Containment + Table Visualization Repair

A private three-player browser card-table prototype. This version keeps the v0.4.1 classic rules repair and focuses on making the game readable from the player perspective on iPhone and iPad.

## What changed

- Removed the chat UI so the table gets more space.
- Reworked the game screen toward a mobile card-game layout.
- Compact player strip instead of giant stacked player cards.
- Main table now visualizes the current moment instead of relying on the log.
- Fixed global horizontal overflow so the whole app should no longer pan sideways.
- Added visible Chamber Deck, Chamber discard, Loot Deck, and Loot discard piles.
- Added a movement banner so draws/reveals/discards show as table movement instead of only as log text.
- Combat shows a pass tracker for every player.
- Flee shows a visual dice stage with raw roll, bonus, final result, and success/failure.
- Hand cards are compact glance cards. Tap a card to open the full inspector with rules, flavor, and legal actions.
- Event History is collapsed and secondary.

## Render settings

Build Command:

```txt
npm install --package-lock=false
```

Start Command:

```txt
npm start
```

## Notes

This is still not the accurate full card-list rework. That should come next as v0.5 using the clearer English card sheets as the mechanical source of truth.
