# Loot Goblins Face-Up Open Door Fix v0.5.3

This build fixes a missing-feeling core turn mechanic in the mobile app shell.

## Why

When a player opens the Chamber, the card should be drawn face-up for everyone. If it is a Foe, combat begins. If it is a Hex, it resolves against the opener. If it is any other Chamber card, everyone should still see it, then it goes to the opener's hand and the player chooses Start Trouble or Loot the Room.

The server already handled much of this mechanically, but the v0.5 mobile shell jumped straight to the No Foe choice screen, so non-Foe reveals could feel invisible.

## Changed

### Server copy
- Non-Foe/non-Hex Open Chamber results now announce as `Face-Up Chamber Revealed`.
- The movement label now says `Face-Up Chamber → Hand`.
- The log explicitly says the card was revealed face-up and added to hand.

### Mobile center panel
- No Foe state now shows the opened face-up Chamber card above the next choices.
- Hex reveals show as resolved before the next choices.
- Non-Foe Chamber cards show:
  - card type sigil
  - card name
  - reveal explanation
  - View button
  - reminder that the card may be played from hand before choosing next move

### Desktop/tablet
- The default center stage now prioritizes `state.revealCard` before older table notice cards.

## Not changed

- Loot the Room still draws a hidden Chamber card into hand.
- Starting hand size was not changed in this patch.
