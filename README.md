# Loot Goblins v0.4

A private three-player browser card-table prototype.

## What changed in v0.4

- Renamed the public game language to **Loot Goblins**.
- Added the v0.4 starter card database.
- Added original rules text and flavor text to cards.
- Added Foe / Hex / Calling / Kin / Gear / Trick / Foe Modifier / Special terminology.
- Added visible card flavor text in hand, table, and inspector views.
- Added basic Gear selling prompt for Junk Value → Glory.
- Added basic Knockout and will-not-pursue handling.
- Kept the simple one-service architecture: Node + Express + Socket.IO + plain browser JS.

## Render settings

Build Command:

```txt
npm install --package-lock=false
```

Start Command:

```txt
npm start
```

## Notes

This is still a prototype. Some complex cards are intentionally manual-resolution cards so the table can keep playing while the engine grows.
