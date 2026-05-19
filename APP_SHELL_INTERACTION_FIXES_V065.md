# Loot Goblins v0.6.5 — App-Shell Interaction Fixes

This build focuses on interaction fixes and layout pressure discovered during tablet/desktop testing.

## Added

### Dice roll presentation
- Opening Roll and Flee now show a dedicated dice roll moment in the center panel.
- Dice uses the server result, but the client animates the roll landing.
- Roll buttons temporarily show “Rolling...” during the animation.

### Real hand expand/collapse
- Expand now visually opens the hand into a taller drawer.
- Expanded hand switches into a grid so more cards are visible at once.
- Tribute still forces the hand open.

### Desktop/tablet hand scrolling
- Hand rail now supports mouse wheel horizontal scrolling.
- Hand rail supports pointer drag scrolling.
- Added left/right hand scroll buttons for testing and desktop usability.

### False playable hint cleanup
- When it is not your turn and you have no reaction, the hand now says you are waiting instead of implying setup cards can be played.
- Setup/Start Trouble hints are only shown as active instructions when it is actually your turn.

### Over limit vs Tribute copy
- Over hand limit outside Tribute now says `Over Limit`.
- Actual Tribute phase still says `Tribute` / `Tribute Required`.

### Spacing compression
- Mobile top banner, player chips, deck row, and center panels were slightly compressed.
- Hand panel collapsed state is shorter; expanded state is more obviously expanded.

## Not changed
- No gameplay rules were rewritten.
- No new art assets were added.
- The larger app-shell fixed-region rewrite is still a future pass if needed.
