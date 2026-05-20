# Loot Goblins v0.6.15 — Legal Inspector Actions Hotfix

## Fixed

When a player inspected a public card that they did not own, the inspector could still show action buttons such as:
- Hex Host
- Hex Player
- Play Special
- Equip / Carry

This was especially confusing when viewing a Hex that had been played on another player.

## New rule

The card inspector only shows action buttons if the viewer actually owns that specific card instance in a legal zone.

If the viewer is only seeing the card because it was revealed, played publicly, discarded, attached, or shown in an event, the inspector now says:

> You are viewing this card publicly. Only the player who owns the card, or the player currently prompted to resolve it, can use it.

## Also tightened

- Reaction action buttons require owning the specific reaction card.
- Playability calculations now require ownership.
- POST_COMBAT_WIN Specials are no longer treated as generic own-turn Specials in the inspector.
