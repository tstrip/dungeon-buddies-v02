# Loot Goblins v0.7.9 — Original Asset Kit Pass

This build implements the first reusable Loot Goblins visual asset kit while preserving the locked classic-style card engine.

## Highlights

- Added a CSS-built Loot Goblins goblin crest for the splash/lobby screens.
- Replaced letter/emoji-style card marks with original inline SVG sigils.
- Added reusable sigils for Foe, Hex, Gear, Trick, Foe Modifier, Calling, Kin, Special, Chamber, Loot, Discard, Glory, Junk, Strength, Flee, die, prompt, backup, and turn states.
- Reworked Chamber and Loot card backs into distinct original designs.
- Improved deck/discard piles with original sigils and stronger physical table-prop styling.
- Updated full-size cards, compact hand cards, announcements, and deck piles to use the same icon language.
- Preserved the locked 168-card parity target and rules-lock checks.

## Verification

- `/health` reports `0.7.9-original-asset-kit`.
- `/parity` should report 95 Chamber / 73 Loot / 168 total cards.
- `/rules-lock` should report a clean mechanics-lock candidate.

## Next visual milestone

Next should be the expanded card-frame/table-prop pass, followed by the card-art preparation system.


---

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


---

# Loot Goblins Mobile Usability Build v0.2

This build keeps the approved visual asset integration from v0.1, then focuses on phone playability.

## What changed in v0.2

### Mobile hierarchy
- The phone layout is now more compressed so the app feels playable instead of poster-like.
- Phase/action status remains prominent.
- Table center is still the focus, but the surrounding decorative structure is reduced on phone.

### Duplicate announcements
- The duplicated "last event" panel inside the table center is hidden on phone.
- The top announcement banner remains the main recent-event surface.

### Player seats
- Mobile table seats are more compact.
- Always-visible player info is reduced to the most important pieces: name, active state, Glory, and statuses.
- Calling/Kin/Gear/Flee detail remains available through player inspection instead of always consuming table space.

### Deck zones
- Side deck columns are hidden on phone.
- A compact mobile deck strip now shows Chamber Deck, Chamber Discard, Loot Deck, and Loot Discard.
- Desktop/tablet keeps the larger table deck columns.

### Hand tray
- The hand is now a bottom drawer on phone.
- It defaults to a compact tray and can be expanded/collapsed.
- Tribute mode forces the hand open so required decisions are easier.
- Expanded hand cards are larger and easier to tap.

## What did not change

- Core mechanics were not intentionally rewritten.
- No new table/button/announcement art assets were generated.
- Desktop layout was kept closer to v0.1.

## Feedback target

Test on phone and focus on:

1. Can you understand whose turn it is?
2. Can you tell what the current table card/event is?
3. Can you tell deck/discard counts without the side columns?
4. Is the hand drawer easier to use?
5. Are cards easier to tap/inspect?
6. Does anything important disappear too aggressively on phone?

The next step after this should be either:
- another usability pass if the phone layout still fights the player, or
- the layout-dependent art phase for table/buttons/announcement cards if this feels playable.


---

# Loot Goblins Mobile App UX Build v0.3

This build keeps the approved asset integration and v0.2 mobile compression, then shifts the phone experience further away from “mini desktop board” and toward a fast mobile game HUD.

## What changed in v0.3

### Player power is visible
- Player seats now show `PWR` using current Glory + combat bonus.
- Desktop player strip also includes Power in the stats line.
- This gives players a quick read before starting combat without manually adding Glory + Gear.

### Combat outcome language is clearer
- Added a combat outcome helper that converts raw totals into readable states:
  - Winning by X
  - Losing by X
  - Tied — Foe wins
  - Tied — player wins ties
- Removed vague “ahead by 0” / “winning by 0” style language from the main combat UI.
- Combat banner, combat result, and combat math now use the same outcome language.

### Tribute mode is safer
- Tapping a tribute card now opens the inspector instead of immediately selecting it.
- A separate `Pick` badge selects/removes tribute cards.
- Selected tribute cards now get a strong glow, lift, and `SELECTED` label so players can tell what they chose.

### Mobile action banner is tighter
- Helper text in the top phase/action banner is shortened.
- The extra “To Start Trouble...” helper span no longer consumes a huge right-side block.
- On mobile, phase helper text clamps harder and primary actions are grid-like.

### Mobile stage and hand spacing refined
- Center card size is slightly reduced to avoid being buried under the hand tray.
- Bottom padding is increased to account for the fixed hand drawer.
- Hand tray is a little shorter when collapsed and roomier when expanded.

## What did not change

- Core mechanics were not intentionally rewritten.
- No new art assets were generated.
- Desktop/tablet should remain close to v0.2.

## Feedback target

Test on phone and focus on:

1. Can you see everyone’s usable Power?
2. Does combat outcome language remove ambiguity?
3. Is Tribute selection understandable?
4. Can you inspect Tribute cards before choosing?
5. Is the top action area less overwhelming?
6. Is the center card still too hidden by the hand?
