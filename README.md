# Loot Goblins v0.4.1 — Classic Rules Repair

A private three-player browser card-table prototype.

This update keeps the v0.4 card database, but repairs the rules skeleton toward classic Munchkin-style flow:

- Classic starting hand: 4 Chamber + 4 Loot.
- Classic turn wording: Open Chamber, Start Trouble / Loot the Room, Tribute.
- Loot the Room draws a hidden Chamber card.
- Added a serialized Flee state so the frontend can actually show who must roll.
- Added a reusable d6 Flee roll foundation: raw roll + Flee bonus = final result, success on 5+.
- Added a visible Roll to Flee button for the current fleeing player.
- Added Flee result display in the table zone.
- Added support for before-Flee Tricks such as Exit Strategy.
- Added guided hand-discard prompts for Bad News that requires player choice.
- Loosened Hex timing toward classic rules: Hexes in hand can be played broadly, with the active player as default target for now.

## Deploy settings

Build command:

```bash
npm install --package-lock=false
```

Start command:

```bash
npm start
```

## Notes

This is still not the full accurate card rework. The uploaded English card sheets should be used for the next larger pass, likely v0.5.
