# Dungeon Buddies v0.3 — Digital Table Rebuild

Dungeon Buddies is a private three-player browser card-table prototype for remote play. This v0.3 build is intentionally simple: Node + Express + Socket.IO + plain HTML/CSS/JS. There is no React, no Vite, and no frontend build step.

## What changed in v0.3

- Separate entry, resume, lobby, and gameplay screens
- Rejoin/resume support using browser localStorage
- Offline seats are preserved instead of deleted immediately
- Clearer phase banner and primary action prompt
- More table-like card zones: deck/discard area, reveal zone, combat zone, player tableau, and hand
- Portrait card framework with type/title/art placeholder/text/stats
- Your hand is a horizontal card row with legal-card highlighting
- Card inspector with legal actions only
- Visible toast errors instead of silent failures
- Combat mode with player side vs threat side, totals, modifiers, passes, and backup
- Carried vs equipped Gear zones on the server
- Gear slot validation: Head, Body, Feet, Hands, No-slot, Heavy Gear limit
- Basic Tribute enforcement
- Final Renown still must come from combat

## Important scope note

This is still a mechanics/table UX prototype, not the full translated base deck. It uses original placeholder card names and text. The goal of v0.3 is to make the table readable, resumable, and testable before a full card-by-card parity pass.

## Local run

```bash
npm install --package-lock=false
npm start
```

Then open:

```text
http://localhost:3000
```

## Render deployment

Create a Render **Web Service** from this repo.

Recommended settings:

```text
Runtime: Node
Build Command: npm install --package-lock=false
Start Command: npm start
Instance Type: Free
```

The app will be available at your Render URL. First load on the free tier may take 30–60 seconds after sleeping.

## iPad/iPhone testing

Open the Render URL in Safari. Create a room, copy/share the invite link, and join from two other devices/tabs. If a player refreshes, the app should offer to resume the saved seat.

## First smoke test checklist

1. Create a room
2. Join with 3 players
3. Start game
4. Refresh one player and verify Resume works
5. Active player opens Chamber
6. If no Threat appears, choose Search Room or Start Trouble
7. Equip/carry Gear from your hand during your own turn
8. During combat, play Tricks/Threat Modifiers and pass
9. Lose combat and roll Escape
10. Trigger Tribute if over hand limit

## Known limitations

- Full source-equivalent deck parity is not implemented yet
- Some weird/special effects use manual prompts or placeholder behavior
- Multi-Threat combat is structured for later but not fully implemented
- Trade flow is not implemented yet
- Art is placeholder only
- Social deals for Backup are logged but not enforced
