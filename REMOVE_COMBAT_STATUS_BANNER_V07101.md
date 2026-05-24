# Loot Goblins v0.7.10.1 — Remove Combat Status Banner

## Hotfix

Removed the redundant combat status banner/dock copy that displayed things like:

- “Tied — Foe wins”
- “Everyone ready”
- “Waiting”

The combat board already shows the outcome clearly. The extra strip made the screen feel cluttered and app-y.

## Behavior now

- No outcome/status banner is shown under the combat board.
- The quick combat dock only appears when **you personally have an action available**.
- The dock only contains quick action buttons, not fight-status text.
- If you are passed or waiting on others, the dock disappears.
