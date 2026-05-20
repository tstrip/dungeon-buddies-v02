# Loot Goblins v0.7.8.2 — No Foe + Gear Choice Hotfix

## Fixes

### No Foe choice tiles
Start Trouble and Loot the Room now render as equal action buttons:
- same width
- same height
- same shape
- same highlight level
- both read as buttons
- Loot the Room no longer balloons into a huge uneven panel

### Gear choice prompt
The Gear discard prompt now sends the payload the server expects:
- single Gear discard sends `cardId`
- Gear-value payment sends `cardIds`
- Gear-value payment checks selected Junk value before enabling Pay Gear

### Server support
The server now has a proper `DISCARD_GEAR_VALUE` handler:
- validates selected Gear
- checks total Junk value
- discards selected Gear
- continues the prompt flow

This should fix the “Choose a valid Gear card” trap from the Hex Gear-loss screen.
