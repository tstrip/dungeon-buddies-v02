# Loot Goblins v0.7.9.5 — Rejoin + Trade Stability + Wish Ring Preview

## Fixes

### Wish Ring
- Wish Ring reaction now shows the incoming Hex first.
- The target can read/view the Hex before deciding:
  - Cancel with Wish Ring
  - Let It Hit

### Trade runtime fix
- Fixed `isTradeParticipant is not defined`.
- Trade helper functions were accidentally scoped inside the Socket.IO connection callback while trade action handling lived outside that scope.
- Helpers are now module-scope.

### Rejoin stability
- App now auto-resumes from saved session on reconnect.
- Resume sends both playerId and playerName.
- Join Room now reclaims an existing seat when the same goblin name is used in the same room.
- This works even if the room is already full.
- If the room is full and no matching name exists, the error now tells the player to rejoin with the same goblin name.

### Trade + rejoin safety
- Rejoining during an active trade now preserves the trade table.
- If a trade references a missing player, it cancels safely instead of crashing.

## Gameplay/UX thoughts from this pass

- Rejoin must be forgiving because phone calls, tab eviction, and mobile browser memory pressure are normal during playtests.
- Trade should stay as a focused modal state, but it needs emergency recovery: rejoin, cancel, and stale-player safety.
- Wish Ring should always show the danger before asking for the cancel, otherwise the choice is blind and feels unfair.
