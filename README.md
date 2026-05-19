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


---

# Loot Goblins Mobile App UX v0.3.1 — Tribute Hotfix

This is a hotfix on top of v0.3.

## Fixed

### Tribute selection
- Tribute mode now uses a dedicated tribute card shell.
- Every tribute card has two visible controls:
  - `Inspect`
  - `Pick` / `✓ Picked`
- Tapping the card still opens inspection.
- Pick controls are no longer tiny top-corner overlays that can be missed or clipped.
- Selected cards now get a clear green highlight and SELECTED label.
- The hand toggle becomes a disabled `Tribute` badge while tribute is required, so it no longer looks like the only available action.

## Still true from v0.3
- Player seats show PWR.
- Combat result language is clearer.
- The broader Dicero-style/app-first mobile overhaul has not been fully done yet. v0.3/v0.3.1 are incremental HUD and interaction passes on the current table-based layout.


---

# Loot Goblins App-First Mobile Shell v0.4

This build is the first real step away from a compressed tabletop view and toward a phone-native game HUD.

## Core change

On mobile, `renderActiveTable()` now uses a dedicated app-first shell instead of the full table frame.

Desktop/tablet still use the existing table layout.

## Mobile shell structure

1. Compact top phase/action HUD
2. Player HUD row
3. Compact deck count strip
4. State-based center panel
5. Bottom hand/toolbelt drawer

## New mobile state panels

The center panel now changes based on the phase:

- Reveal / current card
- Combat
- Tribute
- Flee
- Opening roll
- Prompt
- Waiting
- Game over

## Combat panel

Combat now prioritizes:
- player side total
- foe side total
- clear result text
- “Need +X to win”
- primary foe summary
- pass status
- collapsible combat math

## Tribute panel

Tribute is now treated as its own mobile state:
- selected count is shown in the center panel
- hand drawer still contains Inspect/Pick controls from v0.3.1
- selected cards still highlight clearly

## Deck strip

Decks are now utility chips on mobile rather than table columns.

## Not done yet

This does not create new art assets or a final polished mobile visual identity. It is a structural app-shell pass.

Future v0.5 candidates:
- action-first card inspector
- playable-card sorting/highlighting in hand
- dedicated backup negotiation screen
- dedicated body-loot/death screen
- final mobile button system
- final mobile background/table art


---

# Loot Goblins App-First Mobile Shell v0.4.1 — Hotfix

This hotfix addresses two issues found in the first v0.4 test pass.

## Fixed

### Starting hand size
- Starting hand changed from 4 Chamber + 4 Loot to 2 Chamber + 2 Loot, for 4 total starting cards.
- Opening Roll announcement/log now reflects 2 Chamber + 2 Loot.

### End Turn action visibility
- End Turn now appears before Sell Gear during END_TURN.
- Added a client-side safety fallback so critical legal actions like END_TURN, DONE_POST_COMBAT, and OPEN_CHAMBER are injected if the phase button builder ever misses them.
- Mobile action buttons now wrap/grid instead of hiding overflow off-screen.

## Still needs design iteration

v0.4.1 is a hotfix, not a final app-first UX pass. The v0.4 shell is structurally promising but visually rough and still needs refinement around spacing, state-panel height, and the hand/toolbelt relationship.


---

# Loot Goblins Magical Mobile Play Shell v0.5

v0.5 is the first refinement pass after the rough v0.4 app-first shell.

## Goal

Preserve the charm and toy-like goblin board-game identity from the earlier asset builds while keeping the mobile-native, state-based playstyle introduced in v0.4.

## Major changes

### Adaptive center panels
Mobile state panels now use size classes:
- small: start turn, no-Foe choice, end turn, waiting
- medium: reveal, tribute, opening roll, prompts
- large: combat and flee

This should reduce the giant empty “Current State” feeling from v0.4.

### Better player-perspective states
Added dedicated mobile panels for:
- Start Turn
- No Foe / Choose Move
- Post Combat
- End Turn

These avoid misleading “Waiting on J” copy when it is actually your turn.

### Magic restored without full table clutter
The mobile shell now has more of the tavern-table feel through:
- subtle felt/table backing
- brass/gold framing
- purple glow
- icon-bearing state headers
- smaller, warmer player/deck chips

### Combat remains app-first
Combat keeps the v0.4 app-first structure:
- player side
- foe side
- losing/winning/tied status
- need +X to win
- foe summary
- pass status
- collapsible combat math

### Hand/toolbelt refinement
- During combat/reactions, playable cards are sorted to the front.
- Playable cards glow more clearly.
- Non-playable cards are dimmed.
- A small “playable cards now” label appears during combat/reaction windows.

## Not done yet

This is still not the final mobile UX. Future passes should focus on:
- action-first card inspector
- better backup negotiation screen
- body-loot/death screen
- more intentional hand expansion behavior
- final mobile visual art/background/buttons after structure is stable


---

# Loot Goblins Center Action Mobile Controls v0.5.1

This build keeps the v0.5 Magical Mobile Play Shell, but moves mobile primary actions into the center state panel.

## Why

v0.5 made the center state panel feel like the real play surface. The old top banner still contained the actual buttons, which created a mismatch: the center looked tappable, but players had to go back up to act.

## Changed

### Mobile action ownership
- The center state panel now owns primary mobile actions.
- The top banner is reduced to a compact status strip on mobile.
- Desktop/tablet behavior remains closer to the previous layout.

### Center actions added for
- Open Chamber
- Loot the Room
- Sell Gear
- End Turn
- Done with Loot → Tribute
- Roll d6
- Combat actions / Backup / Done — No More Plays
- Flee actions
- Tribute Confirm

### Interaction hookups
- Center-panel `data-action` buttons now emit normal actions.
- Center-panel combat buttons use the existing combat handler.
- Center Tribute Confirm uses the existing tribute confirmation flow.

## Still next
- Prompt-specific center actions need a deeper pass.
- Card inspector should become action-first.
- Backup negotiation probably deserves its own dedicated mobile state.


---

# Loot Goblins Mobile Interaction Polish v0.5.2

This is a finer-comb mobile usability pass on top of v0.5.1.

## Changed

### Top banner de-emphasized
- Mobile top banner is smaller and more status-strip-like.
- Center panel remains the primary action surface.

### Active player clarity
- Added TURN / YOUR TURN badge to active player chip.
- Strengthened active chip glow.

### Center action clarity
- Start Turn no longer duplicates Open Chamber as both a big card and a primary button.
- The Chamber choice card is the primary Open Chamber action.
- No Foe state no longer duplicates Loot the Room as both a big card and a primary button.
- The Loot the Room card is the primary action when it is your move.
- Sell Gear remains as a secondary action.

### Perspective-aware waiting copy
- Waiting players see observer copy such as “J may Start Trouble” instead of direct “Tap a Foe.”
- Disabled option cards look more observational.

### Hand/toolbelt refinement
- Removed duplicate “Bottom Tray / Your Hand / Your Hand” feel.
- Hand now shows Cards / Combat Toolkit / Over Limit / Tribute Required depending on state.
- Over-limit hand count is louder.
- Phase-specific playable hints:
  - setup cards before Open Chamber
  - Foe/start-trouble hint in No Foe
  - playable cards in Combat/Reaction windows
- Added subtle hand edge fades so clipped cards look more intentional.

### Deck strip tightened
- Deck chip labels are shorter and count-forward.

## Still next
- Card inspector should become action-first.
- Backup negotiation deserves a dedicated mobile state.
- Tribute/over-limit can still become more dramatic.
- Full asset pass can wait until the interaction model is stable.


---

# Loot Goblins Face-Up Open Door Fix v0.5.3

This build fixes a missing-feeling core turn mechanic in the mobile app shell.

## Why

When a player opens the Chamber, the card should be drawn face-up for everyone. If it is a Foe, combat begins. If it is a Hex, it resolves against the opener. If it is any other Chamber card, everyone should still see it, then it goes to the opener's hand and the player chooses Start Trouble or Loot the Room.

The server already handled much of this mechanically, but the v0.5 mobile shell jumped straight to the No Foe choice screen, so non-Foe reveals could feel invisible.

## Changed

### Server copy
- Non-Foe/non-Hex Open Chamber results now announce as `Face-Up Chamber Revealed`.
- The movement label now says `Face-Up Chamber → Hand`.
- The log explicitly says the card was revealed face-up and added to hand.

### Mobile center panel
- No Foe state now shows the opened face-up Chamber card above the next choices.
- Hex reveals show as resolved before the next choices.
- Non-Foe Chamber cards show:
  - card type sigil
  - card name
  - reveal explanation
  - View button
  - reminder that the card may be played from hand before choosing next move

### Desktop/tablet
- The default center stage now prioritizes `state.revealCard` before older table notice cards.

## Not changed

- Loot the Room still draws a hidden Chamber card into hand.
- Starting hand size was not changed in this patch.


---

# Loot Goblins Tavern Entry Revamp v0.6

This build redesigns the pre-game entry surfaces: main splash/create-join, resume, and lobby.

## What changed

### Main splash / Tavern Entry
- Reworked the page from a poster-like branded form into a mobile game entry card.
- Smaller logo treatment.
- Clean horizontal goblin flavor stamp replacing the broken vertical badge.
- Name field is shared by create/join.
- Create and Join are now themed table choices:
  - Start a New Table
  - Join a Table
- Card back assets are used as section icons rather than floating decoration.

### Resume screen
- Rebuilt as a saved-table card.
- Shows room, player, and saved-session status clearly.
- Primary action is Resume Game.
- Join as Someone Else remains secondary.

### Lobby screen
- Rebuilt as a tavern table waiting room.
- Shows room code and copy-code button.
- Adds a three-seat table module:
  - occupied seats
  - you/host labels
  - empty stool states
- Status copy now changes based on player count.
- Start Game button only becomes useful at 3 players and for the host.
- Copy Invite Link remains as secondary action.

### General
- Pre-game pages now share a cleaner tavern entry system.
- Reduced oversized branding and dead space.
- Entry flow should feel more like approaching a goblin tavern table and less like a branded web form.

## Not changed
- Gameplay mobile shell was not rebuilt in this pass.
- No new generated art assets were added.
- No server-side lobby capacity/rules were changed beyond version metadata.


---

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
