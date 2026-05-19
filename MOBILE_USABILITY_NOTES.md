# Loot Goblins Mobile Usability Build v0.2

This build keeps the approved visual asset integration from v0.1, then focuses on phone playability.

## What changed in v0.2

### Mobile hierarchy
- The phone layout is now more compressed so the app feels playable instead of poster-like.
- Phase/action status remains prominent.
- Table center is still the focus, but the surrounding decorative structure is reduced on phone.

### Duplicate announcements
- The duplicated "last event" panel inside the table center is hidden on phone.
- The top announcement banner remains the main recent-event surface.

### Player seats
- Mobile table seats are more compact.
- Always-visible player info is reduced to the most important pieces: name, active state, Glory, and statuses.
- Calling/Kin/Gear/Flee detail remains available through player inspection instead of always consuming table space.

### Deck zones
- Side deck columns are hidden on phone.
- A compact mobile deck strip now shows Chamber Deck, Chamber Discard, Loot Deck, and Loot Discard.
- Desktop/tablet keeps the larger table deck columns.

### Hand tray
- The hand is now a bottom drawer on phone.
- It defaults to a compact tray and can be expanded/collapsed.
- Tribute mode forces the hand open so required decisions are easier.
- Expanded hand cards are larger and easier to tap.

## What did not change

- Core mechanics were not intentionally rewritten.
- No new table/button/announcement art assets were generated.
- Desktop layout was kept closer to v0.1.

## Feedback target

Test on phone and focus on:

1. Can you understand whose turn it is?
2. Can you tell what the current table card/event is?
3. Can you tell deck/discard counts without the side columns?
4. Is the hand drawer easier to use?
5. Are cards easier to tap/inspect?
6. Does anything important disappear too aggressively on phone?

The next step after this should be either:
- another usability pass if the phone layout still fights the player, or
- the layout-dependent art phase for table/buttons/announcement cards if this feels playable.
