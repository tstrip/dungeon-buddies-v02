# Loot Goblins v0.6.12 — Roll Flow + Soft Popup Timing + Card Timing Fix

## Opening roll flow
- Individual opening rolls no longer create acknowledgement popups.
- Everyone can roll in the same opening roll state.
- Results fill into the shared roll panel.
- Only the final winner result creates a hard acknowledge modal.
- Tie rerolls no longer interrupt with acknowledgement popups.

## Use Loot / Sell before Tribute
- Use Loot / Sell Before Tribute no longer creates a hard acknowledgement moment.
- It remains a normal phase state for the active player and a waiting state for everyone else.

## Check the Pockets timing
- Check the Pockets is now `POST_COMBAT_WIN`.
- It can only be played after the active player wins combat.
- It no longer works during unrelated Use/Sell, turn-start, No Foe, or non-combat windows.

## Soft popups
- Passive events no longer use banner strips.
- Soft events now render as centered/upper-center popup cards in the same visual family as hard modals.
- Soft popups auto-dismiss after a few seconds.
- Hard events still use the global modal overlay and require acknowledgement.

## Examples
Hard modal:
- combat-impacting Tricks / potions
- Foe added
- Bad News
- death
- victory
- opening roll winner

Soft auto-popup:
- Kin played
- Calling played
- Gear equipped/carried
- routine card draw/reveal
