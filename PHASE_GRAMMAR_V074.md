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
