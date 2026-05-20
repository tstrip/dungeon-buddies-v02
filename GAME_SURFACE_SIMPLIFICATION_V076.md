# Loot Goblins v0.7.6 — Game Surface Simplification + Combat Board Pass

This build responds to the core usability issue from v0.7.5: the app was trustworthy, but too instructional and too repetitive.

## Main changes

### Slim status strip
The big persistent top banner has been reduced into a compact status strip.

Removed from the top banner:
- repeated Who Acts / Next block
- long phase explanation
- duplicated action buttons

The top area now gives a quick phase/status read while the center table carries the gameplay.

### Center guidance reduced
The mobile center panels no longer show the Who Acts / Next guidance block by default.

The screen should now communicate through:
- title
- card/art
- scoreboard/result
- legal buttons
- hand drawer mode

### Compact combat board
Combat was the biggest usability problem, so it now uses a more centralized battle-board layout.

Combat now prioritizes:
- current result
- player vs Foe totals
- visible Foe card previews
- Bad News
- combat modifiers as badges
- compact status chip
- action rail
- pass row
- Full Combat Math tucked behind details

The detailed ledger is no longer always visible in the main combat flow.

### Hand drawer de-emphasis during combat
The combat hand remains useful, but the live combat board has more visual priority.

## Design principle

The previous build said:
"Here is what is happening, who acts, what happens next, and the same thing again."

This build aims for:
"Here is the card. Here is the danger. Here are your buttons."
