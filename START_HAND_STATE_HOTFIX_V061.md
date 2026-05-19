# Loot Goblins v0.6.1 — Start Hand + State Delineation Hotfix

## Fixed

### Starting hand restored
- Start game now deals 8 cards again:
  - 4 Chamber
  - 4 Loot
- Opening roll announcement/log updated to match.

## Clarified big game states

### Death / body looting
- Death announcement now uses a dedicated `death` kind.
- Mobile now shows a dedicated **Goblin Down** state panel when body looting is active.
- Body looting panel shows:
  - fallen goblin
  - cards left to loot
  - current looter / whether you must choose
  - reminder that looting proceeds in Glory order
- Dead player chips get a **DOWN** badge.

### Victory
- Game-over panel is now larger and more celebratory.
- Victory copy now calls out **10 Glory reached**.
- Final standings are shown in the mobile game-over panel.
- Victory announcements use clearer `Victory — 10 Glory!` language.

### 0 Glory
- Added support for clearer zero-Glory delineation if a player reaches 0 Glory.
- Mobile player chips can show **0 GLORY**.
- A compact alert appears if any living player is at 0 Glory.
- Zero-Glory announcements use a dedicated `zero-glory` kind.

## Note
Current card data still contains several minimum-1 Glory-loss effects. This hotfix adds the UI/state support for 0 Glory, but it does not rewrite every card’s printed rule text.
