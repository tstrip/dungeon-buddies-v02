# Loot Goblins Visual Integration Build v0.1

This build wires the approved Loot Goblins asset kit into the current app without doing a deep mechanics rewrite.

## What changed

### Brand
- Added approved Logo Lockup to entry/resume/lobby screens.
- Added approved Lobby Splash Badge to the lobby.
- Updated visible version label to `Loot Goblins v0.1`.

### Deck identity
- Added approved Chamber/Loot card backs to the entry hero props.
- Added approved Chamber/Loot deck stack props to deck zones.
- Added approved Chamber/Loot discard pile props to discard zones.

### Core UI icons
- Added approved raster icons for:
  - Glory
  - Junk
  - Strength / Combat
  - Loot
  - Flee
  - Die / Roll
  - Death
  - Backup
  - Hex
  - Chamber
  - Discard
  - Trade / Give

### Card type icons
- Added approved 64px card-type sigils for:
  - Foe
  - Hex
  - Gear
  - Trick
  - Modifier
  - Calling
  - Kin
  - Special

### UI integration
- Replaced inline placeholder SVG icons with approved image assets.
- Added real card-type sigils to card corners, compact hand cards, card art placeholders, and announcement icons.
- Added icon hints to common action buttons such as Open Chamber, Loot the Room, Sell Gear, and Roll.
- Changed visible “Foe Modifier” label to the broader “Modifier” terminology where the client labels cards.

## What did not change

- Core game mechanics were intentionally left mostly intact.
- No final tavern table surface was generated.
- No final button art system was generated.
- No final announcement-card art system was generated.
- No final player seat/nameplate art system was generated.

Those layout-dependent assets should be designed after testing this v0.1 visual integration build.

## Asset location

Approved assets are installed at:

```txt
public/assets/loot-goblins/
```

Subfolders:
- `brand`
- `deck`
- `core-icons`
- `card-type-icons`

## Run locally

```bash
npm install
npm start
```

Then open the local server URL shown by Node, typically:

```txt
http://localhost:3000
```

## Feedback target

This build is meant to answer:

> Does the app feel like Loot Goblins when you click around?

Focus feedback on:
- brand/lobby feel
- deck zone readability
- card type icon readability
- core icon usage
- whether the current app layout can support the next art pass
