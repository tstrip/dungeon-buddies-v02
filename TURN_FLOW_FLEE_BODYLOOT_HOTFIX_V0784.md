# Loot Goblins v0.7.8.4 — Turn Flow + Flee + Body Loot Hotfix

## Fixes

### Pre-door action flow
Scanned the flow where legal actions are played before Open Chamber. Special cards played in START_TURN now use `STAY` instead of moving to Loot/Tribute/end-turn logic.

This prevents setup-style actions before opening the door from skipping the door and jumping toward end-of-turn.

### Sell multiple Gear
- Inspecting a single Gear no longer tries to sell that one item directly.
- It opens the Sell drawer instead.
- Sell drawer selections are treated as a checklist.
- Inner card taps no longer steal the click and open inspect instead of selecting.
- If a single direct sell is sub-threshold, the server opens the drawer instead of discarding anything.

### Bad News / Flee screen
Rebuilt the Flee/Bad News board so it no longer uses the skinny right rail that made text stack vertically.
The screen now separates:
- roll result
- Foe preview
- target/flee bonus
- full Bad News text

### Knockout / body looting
Body Loot now cycles through living looters until the body pile is empty instead of stopping after each player picks once.
If the dead active player finishes body looting, the game moves toward end-turn instead of trapping the dead player in Use Loot/Post Combat.

## Safety checks
- JS syntax checks pass
- body-loot cycling present
- START_TURN special-card after flow fixed
- Flee clean layout present
