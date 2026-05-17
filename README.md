# Loot Goblins v0.5 — Classic Card Database Rework

A private three-player browser card-table prototype inspired by classic dungeon-crawl backstabbing card games, using original Loot Goblins presentation.

## What changed in v0.5

- Keeps the stable v0.4.3 table/mobile UX base.
- Replaces the provisional starter card list with a much larger classic-style card database.
- Uses original Loot Goblins card names, public rules text, and flavor text.
- Adds mechanical equivalents for:
  - Callings / classic class-style cards
  - Kin / classic race-style cards
  - Foes / monster-style cards
  - Hexes / curse-style cards
  - Foe Modifiers / monster enhancer-style cards
  - Gear / item-style cards
  - Tricks / one-shot combat and Flee cards
  - Specials / rule-breakers and gain-Glory cards
- Supports card copy counts in the deck database.
- Adds Gear restriction enforcement for Callings and Kin where the current engine can handle it.
- Updates Deepborn so it can carry any number of Heavy Gear.

## Still intentionally manual/prototype

Some classic card effects require larger systems and are intentionally marked manual for now:

- Multiple Foes / Wandering Monster equivalents
- Mate-style duplicate Foes
- Cheat-style attachments
- Super Munchkin / Half-Breed-style stacking
- Full death/body-looting flow
- Loaded die / reroll manipulation
- Out to Lunch / Illusion / Transferral-style combat rewrites
- Source-card gender/table-trait restrictions

Those are staged for v0.6 advanced mechanics.

## Deploy

Render settings remain:

```txt
Build Command: npm install --package-lock=false
Start Command: npm start
```

