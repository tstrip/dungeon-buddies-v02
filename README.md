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


---

# Loot Goblins v0.6.2 — One-Use Trick / Potion Hotfix

## Fixed / clarified

Potions and potion-like cards should not behave like equipable Gear.

### Card data
- All `TRICK` cards are now explicitly marked:
  - `oneUse: true`
  - `consumable: true`

### Server guardrails
- `publicCard` now exposes `oneUse` and `consumable`.
- Added `isOneUseConsumable(card)`.
- Equip validation rejects one-use consumables with:
  - “That is a one-use Trick, not equipable Gear.”
- Gear action path rejects any one-use consumable even if a future or stale card somehow has `type: GEAR`.
- Sell/owned-Gear options exclude one-use consumables.

### Client/UI
- Tricks now display more clearly as `Trick · One-use`.
- Trick bottom text now says `One-use Trick`.
- Inspector copy clarifies that one-use cards are not equipable Gear.
- Playable highlighting no longer treats any consumable Gear-like card as equipable.
- Added styling for one-use/consumable notes.

## Rule intent
Potions/one-shots stay in hand until their timing window, then are played once and discarded.
They are not equipped, carried as Gear, or assigned like normal Gear.


---

# Loot Goblins v0.6.3 — Themed State Polish

This build intentionally implements only the requested theming options:

1. In-universe UI concept naming
2. State-specific button treatments using the existing palette
3. Death as a mini-event
4. Absurdly triumphant Victory

No randomized flavor lines, narrator toasts, 0-Glory joke pass, or additional broader copy rewrites were added.

## In-universe naming
- Room language is softened toward Table/Table Code in the entry/lobby UI.
- Lobby status uses Gathering language.
- Start Game becomes Start the Table.
- Copy Invite Link becomes Send Invite.
- Resume Game becomes Return to Table.
- Join as Someone Else becomes Choose Another Stool.

## State-specific button treatments
Existing button colors are now more deliberately mapped:
- Open Chamber / opening roll: warm orange-gold
- Loot the Room: gold-purple
- End Turn: green/ready
- Flee: teal/blue-green
- Tribute confirm: gold/red urgency
- Combat pass: purple/brown
- Sell Gear: subdued brass/brown
- Start the Table: warm orange-gold when ready, dimmed when disabled

## Death mini-event
- Death announcement copy is now GOBLIN DOWN — LOOT THE BODY.
- Mobile death panel now frames death as a mini-event:
  - Loot the Body
  - cards left to loot
  - current looter
  - “Take one card in Glory order. Try not to make eye contact.”
- This is separate from 0 Glory.

## Victory
- Game-over copy now uses VICTORY!
- Winner line says the player reached 10 Glory.
- Victory subcopy: History will exaggerate this.
- First-place final standing gets a warmer victory treatment.

## Not included by request
- No random phase flavor lines
- No narrator toast rewrite
- No 0-Glory comedy pass
- No new assets


---

# Loot Goblins v0.6.4 — Action-First Mobile Flow

This build layers the action-first face-up reveal pass on top of v0.6.3.

## Changed

### Face-up non-Foe reveals
When a non-Foe Chamber card is revealed and added to hand, the center panel now prioritizes the card name and gives direct actions where legal.

Examples:
- Calling / Kin: `Play [Card]` + `View Card`
- Gear: `Equip` / `Carry` + `View Card`
- eligible Special cards: `Play Special` + `View Card`

### No Foe flow
- The No Foe panel is shorter and less paragraph-heavy.
- Card name comes first; “Face-Up Chamber” is secondary context.
- Start Trouble is visually linked to the hand with clearer copy:
  - “Tap a glowing Foe in your hand.”
  - “Foe cards in your hand glow when they can Start Trouble.”

### Top banner
- On the No Foe choice state, the top banner is reduced further into a compact status strip.

### Hand tray
- Cleaner help text.
- Hand limit now distinguishes:
  - `6/6 Full`
  - `7/6 Tribute`
- Slightly more hand-tray breathing room.

## Not changed
- No new assets.
- No random flavor-line system.
- No broad gameplay rule rewrite.


---

# Loot Goblins v0.6.5 — App-Shell Interaction Fixes

This build focuses on interaction fixes and layout pressure discovered during tablet/desktop testing.

## Added

### Dice roll presentation
- Opening Roll and Flee now show a dedicated dice roll moment in the center panel.
- Dice uses the server result, but the client animates the roll landing.
- Roll buttons temporarily show “Rolling...” during the animation.

### Real hand expand/collapse
- Expand now visually opens the hand into a taller drawer.
- Expanded hand switches into a grid so more cards are visible at once.
- Tribute still forces the hand open.

### Desktop/tablet hand scrolling
- Hand rail now supports mouse wheel horizontal scrolling.
- Hand rail supports pointer drag scrolling.
- Added left/right hand scroll buttons for testing and desktop usability.

### False playable hint cleanup
- When it is not your turn and you have no reaction, the hand now says you are waiting instead of implying setup cards can be played.
- Setup/Start Trouble hints are only shown as active instructions when it is actually your turn.

### Over limit vs Tribute copy
- Over hand limit outside Tribute now says `Over Limit`.
- Actual Tribute phase still says `Tribute` / `Tribute Required`.

### Spacing compression
- Mobile top banner, player chips, deck row, and center panels were slightly compressed.
- Hand panel collapsed state is shorter; expanded state is more obviously expanded.

## Not changed
- No gameplay rules were rewritten.
- No new art assets were added.
- The larger app-shell fixed-region rewrite is still a future pass if needed.


---

# Loot Goblins v0.6.6 — Hand Drawer + Card Proportion Hotfix

## Fixed

### Expanded hand drawer
- Removed the clunky side-scroll buttons from expanded mode and Tribute mode.
- Expanded hand now uses a vertical internal drawer/grid instead of a broken horizontal scroller.
- Tribute Pick/Inspect buttons remain visible under each card.
- Confirm Tribute stays outside the scroll area so the game is not blocked.
- Collapsed hand still keeps desktop/testing left/right scroll buttons.

### Card-shaped draw/reveal presentation
- Open Chamber action now uses a card-proportion Chamber preview instead of reading like a wide button only.
- Face-up non-Foe reveals now show a real compact card-shaped preview in the center panel.
- The revealed card remains action-first with Play/Equip/Carry/View controls where legal.

### Spacing cleanup
- Tightened the drawer height and scroll area.
- Reduced side-button clutter.
- Tweaked center/hand spacing so the expanded drawer is less awkward.

## Not changed
- No rule changes.
- No new assets.
- Dice roll mechanics were not rewritten in this patch.


---

# Loot Goblins v0.6.7 — Table Clarity + Resolution Flow

This build pushes the full playtest clarity pass in one update.

## Major fixes
- Sell Gear no longer traps the game.
  - No Gear now returns to the current phase without advancing.
  - Sell Gear prompts can be canceled/done with no sale.
- Optional reaction windows keep pass/cancel paths.
- Public card/event reveal layer added in the mobile shell.
  - Played cards, Gear, Hexes, combat events, Bad News, death, and victory get a visible public event card.
- Combat has a side-by-side ledger.
  - Player side: active player, backup, played cards, deltas.
  - Foe side: every Foe and attached modifiers.
- Add Foe from Hand is now surfaced as a combat action.
- Flee screen shows Bad News before rolling.
- Failed Flee announces Bad News explicitly and provides an acknowledgement-style public event.
- Discard piles can be inspected from the deck/discard strip.
- Dice now render as a standard d6 with pips.

## Notes
This is a broad table-hosting clarity pass, not a new asset pass. It focuses on making the game show what happened, what card caused it, and what players need to resolve.


---

# Loot Goblins v0.6.8 — Public Resolution + Combat Clarity

This build is the first half of the larger playtest response plan. It focuses on visibility: players should clearly see what happened, what card caused it, what the Bad News is, and what the combat state currently contains.

## Public resolution modal
- Replaces the awkward announcement/banner treatment with a centered public resolution modal.
- Major events require local acknowledgement before disappearing.
- Shows event title, detail, relevant icon, and card preview when applicable.
- Applies to played cards, Gear events, combat events, Hexes, Bad News, Flee/roll events, death, victory, and reveal/draw events.

## Combat clarity
- Combat ledger now shows all Foes in combat more clearly.
- Foe entries include STR and Bad News text.
- Each Foe in the mobile ledger has a View Foe button.
- Desktop combat Foe cards also show Bad News directly under the Foe stat ribbon.
- Add Foe announcements now name the Foe, show Bad News, and summarize the combined Foe side.

## Flee / Bad News clarity
- Flee screen now includes a Foe preview with View Foe.
- Bad News is labeled as Bad News if you fail.
- Desktop Flee screen no longer duplicates the same detail line and now surfaces Bad News.

## Opening roll clarity
- Opening roll winner announcement now includes each player roll and states who goes first.

## Discard viewer
- Discard viewer now shows full card details instead of only compact names.
- Each discard entry includes card type, bottom/stat line, and rules text.
- Cards can still be tapped for full inspection.

## Not in this build
- Trade system.
- Backup rescind/cancel flow.
- Full pre-Tribute interaction rewrite.
- Belt/potion card-specific rules fix.

Those belong in the next planned build: v0.6.9 — Interaction Correctness + Trade/Backup/Tribute.


---

# Loot Goblins v0.6.9 — Trade + Backup + Tribute Flow

This build focuses on interaction correctness after the public-resolution clarity pass.

## Included

### Trade system
- Removed direct Give buttons from individual card inspectors.
- Player inspector now surfaces `Trade with [player]` on your turn.
- Trades are offer/accept based:
  - proposer chooses one or more cards to offer
  - recipient accepts or declines
  - proposer can rescind while the offer is pending
  - gifts are possible, but the recipient must still accept

### Backup rescind/cancel
- Fighter can rescind an open Backup request.
- Backup negotiation no longer has to hang if the fighter changes their mind.

### Optional prompt safety
- Optional prompts can be passed/canceled without trapping the game.
- Sell Gear prompts can be canceled/done without selling.
- No-Gear Sell checks return to the same phase and do not advance the turn.

### Use/Sell before Tribute
- The game now routes through a Use Loot / Sell window before checking Tribute.
- Tribute is checked only after the active player finishes that window.

### Potion timing fix
- Potion-Belt of Giant Strength is now a one-use combat Trick instead of equipable Gear.
- It can be used during combat for +3 to a combat side and then discards.

## Notes
- The trade system is intentionally simple: offer cards, accept/decline, rescind. Counteroffers can come later.
- This build does not add new art assets.


---

# Loot Goblins v0.6.10 — Event Priority + Modal Cleanup

This build corrects the over-acknowledgement problem from the public resolution builds.

## Event priority tiers

### Hard modal / acknowledge
These still interrupt because the table needs to understand them:
- combat events
- one-use Tricks / potions / instant combat cards
- Foe added to combat
- Hex resolution
- Bad News / Bad Stuff
- Flee results
- death/body looting
- opening roll result / who goes first
- victory
- backup and trade events

### Soft public event / no acknowledge
These are visible but do not stop play:
- Calling played
- Kin played
- Gear equipped/carried
- routine card draw/reveal
- Glory/tribute/loot phase bookkeeping

### Log only
Low-signal waiting/state updates no longer interrupt.

## Modal cleanup
- Hard events are now centered and wider.
- Text no longer collapses into vertical wrapping.
- Card preview keeps a readable card-like proportion.
- Soft events are compact feed/toast items with optional View button.

## Why
The game should show what happened without making players acknowledge every piece of bookkeeping.


---

# Loot Goblins v0.6.11 — True Modal Overlay Refactor

This build focuses specifically on the public pop-up problem.

## Fixed

### Hard events now render globally
Hard acknowledge events no longer render inside the board/combat/active table layout. They render into a dedicated top-level `#globalModalRoot` outside the game board.

This prevents:
- left-anchoring inside the table
- clipping by board containers
- weird narrow wrapping
- hand drawer / combat panel competing with the modal

### Hard modal layout cleaned up
Hard events now use:
- fixed viewport overlay
- dimmed backdrop
- centered modal card
- event type pill
- readable headline/detail block
- centered card preview with stable card proportions
- single full-width Acknowledge button

### Soft events stay inline
Routine updates still appear as non-blocking soft events:
- Kin / Calling played
- Gear equipped/carried
- routine reveals/draws/bookkeeping

### Event template groundwork
Hard events now get simple template labels:
- Trick Played
- Foe Added
- Bad News
- Goblin Down
- Victory
- Opening Roll
- Flee Result
- Backup / Trade

## Acceptance goal
A hard public event should look like a true app modal regardless of:
- combat state
- hand expanded/collapsed
- iPhone portrait
- iPad landscape
- desktop/tablet testing


---

# Loot Goblins v0.6.12 — Roll Flow + Soft Popup Timing + Card Timing Fix

## Opening roll flow
- Individual opening rolls no longer create acknowledgement popups.
- Everyone can roll in the same opening roll state.
- Results fill into the shared roll panel.
- Only the final winner result creates a hard acknowledge modal.
- Tie rerolls no longer interrupt with acknowledgement popups.

## Use Loot / Sell before Tribute
- Use Loot / Sell Before Tribute no longer creates a hard acknowledgement moment.
- It remains a normal phase state for the active player and a waiting state for everyone else.

## Check the Pockets timing
- Check the Pockets is now `POST_COMBAT_WIN`.
- It can only be played after the active player wins combat.
- It no longer works during unrelated Use/Sell, turn-start, No Foe, or non-combat windows.

## Soft popups
- Passive events no longer use banner strips.
- Soft events now render as centered/upper-center popup cards in the same visual family as hard modals.
- Soft popups auto-dismiss after a few seconds.
- Hard events still use the global modal overlay and require acknowledgement.

## Examples
Hard modal:
- combat-impacting Tricks / potions
- Foe added
- Bad News
- death
- victory
- opening roll winner

Soft auto-popup:
- Kin played
- Calling played
- Gear equipped/carried
- routine card draw/reveal


---

# Loot Goblins v0.6.13 — Source-First Resolution + Combat Pass Cleanup

## Source-first Hex resolution
Hexes now follow the correct sequence:

1. Reveal/show the Hex card.
2. Let the affected player read it.
3. The affected player taps Resolve Hex.
4. Consequences / choices / cancellation windows happen after the source card is visible.
5. The result resolves normally.

This prevents consequences from firing before players understand the card that caused them.

## Hex reveal state
- Added `HEX_REVEAL` phase.
- Added `pendingHex` state.
- Added `RESOLVE_HEX` action.
- Mobile and desktop now show a Hex Reveal panel with the card and a Resolve Hex button for the affected player.

## Combat pass cleanup
- Tapping Done / Pass Combat no longer creates a public popup or hard acknowledgement.
- Passes now only update the combat pass tracker and event history.
- Combat-impacting cards still use hard source-first public events.

## Rule grammar
The game now better follows: Show the cause, then resolve the effect.


---

# Loot Goblins v0.6.14 — Hex Flow Hotfix

## Fixed

### Hex no longer strands the game in HEX_REVEAL
v0.6.13 introduced source-first Hex resolution, but after some played Hexes resolved it could leave the table in `HEX_REVEAL` with no `pendingHex`, which blocked progression.

This build stores the previous phase before entering `HEX_REVEAL`, then restores it after:
- automatic Hex resolution
- Hex choice prompts
- Wish Ring cancellation
- played Hexes during combat / escape / normal turn flow

### Hex reveal/resolved no longer creates extra hard acknowledgement
Hexes now use the source-first center panel as the main action:
- reveal/show the card
- affected player taps Resolve Hex
- consequence happens
- resolved bookkeeping is soft/no-blocking

Hard acknowledgements remain for actual major consequences, choices, cancellations, Bad News, death, victory, etc.

## Why
A Hex should be shown before consequences resolve, but it should not require two separate acknowledge steps or trap the phase afterward.


---

# Loot Goblins v0.6.15 — Legal Inspector Actions Hotfix

## Fixed

When a player inspected a public card that they did not own, the inspector could still show action buttons such as:
- Hex Host
- Hex Player
- Play Special
- Equip / Carry

This was especially confusing when viewing a Hex that had been played on another player.

## New rule

The card inspector only shows action buttons if the viewer actually owns that specific card instance in a legal zone.

If the viewer is only seeing the card because it was revealed, played publicly, discarded, attached, or shown in an event, the inspector now says:

> You are viewing this card publicly. Only the player who owns the card, or the player currently prompted to resolve it, can use it.

## Also tightened

- Reaction action buttons require owning the specific reaction card.
- Playability calculations now require ownership.
- POST_COMBAT_WIN Specials are no longer treated as generic own-turn Specials in the inspector.


---

# Loot Goblins v0.6.16 — Soft Popup Fit + Fine-Tooth UX Polish

## Fixed clear issue from screenshot

The passive soft popup could render like a giant parchment/card panel, drift to the right side of the screen, and cover too much of the play area.

Soft popups are now forced into a compact global toast layout:
- fixed viewport positioning
- left/right safe margins
- no offscreen right clipping
- no giant parchment/card body
- compact icon + title + detail + optional View button
- small timer bar
- auto-dismisses after 3 seconds

## Observer copy polish

When another player reveals a non-Foe card, the center panel no longer says:
- "Added to your hand"
- "Choose whether to use it now..."

It now says:
- "Added to [player]'s hand"
- "[player] may play it now or choose a move."

## Inspector legality remains from v0.6.15

Publicly viewed cards still do not show action buttons unless the viewer owns that exact card instance.

## Usability/fun polish direction

This pass keeps the source-first clarity work, but makes passive updates feel like game-like popups instead of web banners or giant cards.


---

# Loot Goblins v0.6.17 — Backup Negotiation Popup Cleanup

## Fixed

Backup negotiations were creating too many acknowledgement interruptions:
1. request Backup
2. offer a deal
3. accept/resolve

Only the final moment actually changes combat math, so only that moment should interrupt the table.

## New Backup popup rule

### No popup / no acknowledgement
- Backup requested
- Backup deal offered
- Backup request rescinded
- Backup declined

These are visible through the combat/backup negotiation panel and event history.

### Hard acknowledgement remains
- Backup Deal Locked / accepted

This is the moment a helper actually joins combat and affects the fight, so it still gets a public acknowledgement.

## Safety net

Client event tiering now treats Backup events as hard only when the event is a final locked/accepted deal.


---

# Loot Goblins v0.7 — Playtest Hardening + Host Language Pass

This is a stability/experience pass, not a new mechanics pass.

## Focus

The app should feel more like a confident table host:
- tell players what happened
- show who acts next
- show what options matter
- avoid internal software language

## Changes

### Host-language polish
- Expanded friendly phase names.
- Removed raw/internal fallback language from the top banner.
- Replaced generic fallback text with clearer table-host copy.

### Hand limit clarity
- Over-limit is less alarming when it is not currently your Tribute phase.
- Non-active players now see `Tribute Later` rather than a red emergency-style state.
- Tribute phase still clearly says `Tribute Required`.

### Combat clarity
- Added a compact "What now?" host note to the combat stage.
- Combat now reinforces whether players are winning, losing, need help, or are waiting for passes.
- The existing full combat math detail remains available.

### Better contextual labels
- Revealed Foe buttons now say `View Foe`.
- Hex buttons now say `Read Hex`.
- Tribute copy better explains inspect-then-pick behavior.

### Loot phase copy
- Use Loot / Sell Before Tribute now more clearly says the active player can use legal cards before the hand-limit check.
- Observer copy has more personality and less generic waiting text.

## What this does not do yet

- No new cards.
- No new art assets.
- No major rules rewrite.
- No server-driven per-card legal action list yet.

## Next best future direction

Move toward server-authored legal card actions so the client never guesses which buttons should appear.


---

# Loot Goblins v0.7.1 — Add-Foe Legality + Combat Spacing Hotfix

## Fixed

### Add Foe no longer appears just because you have a Foe in hand
The combat action button was incorrectly checking only for any Foe card in hand.

Correct rule:
- Foes cannot join combat by themselves.
- You need the enabling card, currently `Unexpected Company`.
- The button now only appears as `Use Unexpected Company to Add Foe` when that card is in hand, legally playable, and you also have a Foe to add.

### Server safety
The direct `ADD_FOE_FROM_HAND` action now rejects with:

> Play Unexpected Company to add a Foe from your hand.

The real path is playing the card whose effect creates the add-Foe picker.

## UX polish

- Hand hint now explains: `Foes in hand need Unexpected Company before they can join combat.`
- Over-limit hand state outside Tribute now says `Tribute Later` instead of yelling `Over Limit`.
- Combat action buttons are tighter and use a two-column layout on wider screens.
- Combat spacing around scores, ledger, actions, pass row, and math details has been tightened.

## Why

This prevents the game from implying illegal moves and keeps combat from getting vertically bloated.


---

# Loot Goblins v0.7.2 — Server-Driven Legal Actions

This build moves card action button authority toward the server.

## What changed

### Server-authored hand card actions
The server now sends legal actions for each card in the viewer's hand:
- label
- action type
- payload
- style
- reason

The client no longer has to guess most inspector buttons.

### Inspector uses server actions
The full card inspector now renders server-approved card actions instead of recreating card legality locally.

### Hand glow uses server actions
Cards glow as playable only when the server says they have at least one legal action.

### Face-up reveal buttons use server actions
If a face-up card is also in your hand, the reveal panel pulls from that hand card's server-authored legal actions.

### Public card safety
Publicly viewed cards still show no actions unless the viewer owns that exact card instance.

## Legal action areas covered

This pass covers:
- Calling / Kin play
- Gear equip / carry / sell / Little Helper assignment
- Start Trouble
- Restless Foes
- combat Tricks
- Foe modifiers
- Hex targeting
- Specials
- Unexpected Company
- Flee Tricks
- reaction cards

## Why this matters

The client should not decide what is legal. The app should only show buttons the rules engine says are legal.

This reduces bugs like:
- Add Foe appearing at the wrong time
- public cards showing use buttons
- post-combat cards glowing too early
- cards having inspector actions that the server would reject

## Still future work

Top-level phase buttons and some prompt flows still have their own UI logic. The next hardening step is to expand this same server-authority model to all combat/phase/prompt actions.


---

# Loot Goblins v0.7.3 — Event Priority Audit

This build makes event interruption rules explicit instead of relying on text guessing.

## New event metadata

Announcements now include:

- `priority`: `hard`, `soft`, or `log`
- `category`: event category such as combat, hex, card, backup, turn
- `audience`: currently defaults to `all`, with support for actor/affected/system use later
- `requiresAck`: true/false

The client now respects this metadata first. Text-based detection remains only as a legacy fallback.

## Hard events

These are table-stopping moments:
- combat-changing cards
- Foe added / combat state changes
- Backup deal locked
- Flee result / Bad News
- death / zero Glory / victory
- opening roll complete
- Hex blocked/canceled or Hex choice prompts

## Soft events

These are visible but non-blocking:
- Calling / Kin played
- Gear equipped/carried
- routine card gained/drawn
- routine Hex reveal/resolved bookkeeping
- Glory/Tribute/effect updates that do not demand a table stop

## Log-only events

These do not create popups:
- Use Loot / Sell before Tribute bookkeeping
- pass/done buffing
- waiting states
- Backup negotiation setup/offers/declines before the deal is locked
- routine phase movement

## Why this matters

The game should not interrupt players based on fragile text matching. The server now tells the client exactly how each table event should behave.

## Next best step

v0.7.4 should focus on phase grammar: every phase should clearly answer who acts, what they can do, and what happens next.


---

# Loot Goblins v0.7.4 — Phase Grammar Pass

This build makes the app act more like a confident table host.

## New phase grammar system

The client now centralizes player-facing phase copy through `phaseGrammar()`, which describes:

- title
- main copy
- who needs to act
- what happens next
- urgency/waiting state
- primary buttons

## What changed

### Top banner
The top banner now includes a compact phase grammar strip:

- Who acts
- Next

This reduces mystery states and makes waiting more understandable.

### Mobile center panel
Mobile stage panels now include a compact host guidance box with:

- Who acts
- Next

This applies across:
- Opening Roll
- Start Turn
- Hex Reveal
- No Foe / Choose Move
- Combat
- Flee
- Use Loot
- Tribute
- End Turn
- Body Loot
- Prompts
- Reactions

### Prompt priority
Mobile now prioritizes active prompts/reactions/body-loot before generic phase panels, so decision states do not get buried behind normal phase UI.

### Reaction stage
Added a dedicated mobile Reaction Window stage so Wish Ring / Loaded Die / Flee reactions feel like table states rather than hidden banner actions.

### Safer fallback states
Fallback copy now tells players who is acting and what should happen next instead of using vague software language.

## Goal

Every screen should answer:

1. What is happening?
2. Who acts?
3. What can they do?
4. What happens next?


---

# Loot Goblins v0.7.5 — Hand + Decision Drawer Upgrade

This build makes the bottom hand drawer adapt to the current job instead of always acting like a generic hand tray.

## New drawer modes

- Normal Hand
- Combat Cards
- Tribute Required
- Sell Gear
- Trade Offer
- Trade Review
- Add Foe to Combat
- Discard / Lose Card prompts
- Body Loot
- Reaction Window

## What changed

### Mode-specific headers
The drawer now changes its title, eyebrow, and hint based on what the player is being asked to do.

Examples:
- Combat Cards — "Play, interfere, or pass"
- Sell Gear — "Choose Gear to cash in"
- Trade Offer — "Choose cards to offer"
- Tribute Required — "Pick excess cards"

### Decision drawer content
When the player is resolving a card-choice prompt, the drawer now shows the relevant decision cards directly in the hand area.

Supported decision flows:
- sell selected Gear
- choose cards to offer in trade
- accept/decline trade review
- choose Foe for Unexpected Company
- choose discard cards
- choose Gear to lose
- loot the body
- reaction window actions

### Sticky decision controls
Sell, trade, discard, and review flows now have sticky confirm/cancel controls in the drawer.

### Less generic copy
The drawer no longer asks players to mentally translate whether they are browsing, selling, trading, tributing, discarding, or reacting.

## Why this matters

The hand drawer is where most player decisions happen. It now behaves more like a context-aware tool instead of one generic card shelf.


---

# Loot Goblins v0.7.6 — Game Surface Simplification + Combat Board Pass

This build responds to the core usability issue from v0.7.5: the app was trustworthy, but too instructional and too repetitive.

## Main changes

### Slim status strip
The big persistent top banner has been reduced into a compact status strip.

Removed from the top banner:
- repeated Who Acts / Next block
- long phase explanation
- duplicated action buttons

The top area now gives a quick phase/status read while the center table carries the gameplay.

### Center guidance reduced
The mobile center panels no longer show the Who Acts / Next guidance block by default.

The screen should now communicate through:
- title
- card/art
- scoreboard/result
- legal buttons
- hand drawer mode

### Compact combat board
Combat was the biggest usability problem, so it now uses a more centralized battle-board layout.

Combat now prioritizes:
- current result
- player vs Foe totals
- visible Foe card previews
- Bad News
- combat modifiers as badges
- compact status chip
- action rail
- pass row
- Full Combat Math tucked behind details

The detailed ledger is no longer always visible in the main combat flow.

### Hand drawer de-emphasis during combat
The combat hand remains useful, but the live combat board has more visual priority.

## Design principle

The previous build said:
"Here is what is happening, who acts, what happens next, and the same thing again."

This build aims for:
"Here is the card. Here is the danger. Here are your buttons."


---

# Loot Goblins v0.7.7 — Action-First Board Flow + Combat Cleanup

## Focus

This build responds to the latest usability feedback:

- persistent banner still explained too much
- Open Chamber tile felt awkward
- No Foe / Choose Move repeated itself too much
- Start Trouble and Loot the Room did not feel like equal next-move options
- combat was still leaning on explanatory text instead of board/action structure
- Bad News needed full, specific text

## Changes

### Ultra-minimal status strip
The top banner now only shows the current phase/title. No repeated subtitles or instructional copy.

### Open Chamber redesign
The Open Chamber action is now a single large door/deck tile:
- stronger physical door-card feel
- clearer tap target
- less awkward gradient/card composition
- simplified copy: Open Chamber / Reveal top Chamber

### No Foe action-first cleanup
- removed repeated "Choose your move" stacking
- Start Trouble and Loot the Room are now matched action tiles
- Start Trouble is functional:
  - if exactly one legal Foe is playable, it starts trouble directly
  - if multiple are available, it scrolls/focuses the hand
  - if none are available, it communicates that no playable Foe is in hand
- Loot the Room no longer visually dominates Start Trouble
- Sell Gear remains tertiary

### Combat cleanup
- removed the instructional status chip under Bad News
- combat actions now carry more of the explanatory burden
- pass button is now "Pass Combat"
- passed state is now "Passed — Waiting"
- combat stage title/subtitle duplication reduced

### Bad News specificity
Combat now prefers full Bad News text from the Foe public text, especially text after "Bad News:".
This avoids shorthand like "lose head or glory" and shows clearer rules such as:
"lose Head Gear, or lose 1 Glory if you have none."

## Design principle

Instead of:
"Here is an explanation, then a button."

The screen should feel like:
"Here is the card. Here is the danger. Here are your options."


---

# Loot Goblins v0.7.8.1 — Streamlined Table Language Hotfix

## What this fixes

v0.7.8 accidentally truncated the front-end app file while replacing the old prompt panel. That removed key functions such as the hand renderer, which caused the board to load mostly blank.

This build rebuilds the update from the stable v0.7.7 base and applies the v0.7.8 work safely.

## Kept from v0.7.8

- Player-facing language cleanup:
  - "Resolve Hex" → "Take the Hit"
  - "Prompt pending" → choice/waiting language
  - "Bad News resolves" → "Bad News happens"
- Sell Gear drawer scroll fix
- Private card-gain splash for hidden Chamber/Loot reward/private draws
- Public vs private draw handling

## Safety checks

- app.js is no longer truncated
- renderHand remains present
- renderActiveTable remains present
- renderPrompt is safely replaced only as a small hidden bridge
- JS syntax checks pass


---

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


---

# Loot Goblins v0.7.8.3 — Action Banner + Sell Threshold + Helper Hotfix

## Fixes

### Temporary action banner
Soft banners now show a short effect summary from the card text instead of only saying the card type like "Special" or "Calling."

### Selling Gear
Selling now requires enough selected Junk to actually gain Glory.

- Sell button stays disabled until selected Gear totals at least 1000 Junk.
- Server also refuses sub-threshold sales before discarding anything.
- This prevents selling one 400-Junk item, losing it, then being told it was not enough.

### Bruiser / discard prompts
Generic card-choice prompts now scroll like the Sell/Junk drawer. This covers Bruiser discard, Backstab discard, and other large owned-card choice prompts.

### Dismiss the Helper
Player-choice prompts now render as actual player tiles instead of fake blank cards.

### Little Helper sacrifice safety
Sacrificing Little Helper while Fleeing now clears the Flee/reaction flags before advancing, reducing the chance of a stuck escape state.
