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
