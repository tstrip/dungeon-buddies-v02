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
