# Loot Goblins v0.5.7

Backup deal and table compression pass.

## Highlights
- Adds a real Backup negotiation flow before a helper joins combat.
- Fighter can propose a Loot split: free help, specific Loot count, or all Loot.
- Helper must accept the locked deal before joining combat.
- Combat rewards now split Loot based on the locked Backup deal.
- Glory/level reward still stays with the original fighter by default, preserving classic rules. Brightkin/Elf-style helper Glory remains a special exception.
- Shrinks deck/discard stacks so they function as table props.
- Enlarges the table center and trims repeated header information.
- Makes hand cards more compact.
- Shows Calling and Kin directly on player seats without tapping.

## Render
Build command: `npm install --package-lock=false`
Start command: `npm start`


## v0.5.7 note

Adds clearer directional, face-down card-shaped movement cues from decks/hand/discards toward the table center and back to hand/discard zones.
