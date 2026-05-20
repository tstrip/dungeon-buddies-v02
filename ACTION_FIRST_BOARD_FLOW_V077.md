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
