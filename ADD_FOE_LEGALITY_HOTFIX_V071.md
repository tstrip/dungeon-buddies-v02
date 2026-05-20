# Loot Goblins v0.7.1 — Add-Foe Legality + Combat Spacing Hotfix

## Fixed

### Add Foe no longer appears just because you have a Foe in hand
The combat action button was incorrectly checking only for any Foe card in hand.

Correct rule:
- Foes cannot join combat by themselves.
- You need the enabling card, currently `Unexpected Company`.
- The button now only appears as `Use Unexpected Company to Add Foe` when that card is in hand, legally playable, and you also have a Foe to add.

### Server safety
The direct `ADD_FOE_FROM_HAND` action now rejects with:

> Play Unexpected Company to add a Foe from your hand.

The real path is playing the card whose effect creates the add-Foe picker.

## UX polish

- Hand hint now explains: `Foes in hand need Unexpected Company before they can join combat.`
- Over-limit hand state outside Tribute now says `Tribute Later` instead of yelling `Over Limit`.
- Combat action buttons are tighter and use a two-column layout on wider screens.
- Combat spacing around scores, ledger, actions, pass row, and math details has been tightened.

## Why

This prevents the game from implying illegal moves and keeps combat from getting vertically bloated.
