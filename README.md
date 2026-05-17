# Dungeon Buddies v0.2 — Mechanics Skeleton

A mechanics-first, original-presentation browser card game for 3 remote players.

This version intentionally avoids React/Vite/build tooling. It is a single Node + Express + Socket.IO web app with static browser files. That makes it much easier to deploy on Render for a private friend game.

## What this version is

- 3-player room-code multiplayer
- Private hands
- Public player boards
- Chamber and Loot decks
- Open Chamber / Start Trouble / Search Room loop
- Threat combat
- Backup/help
- Sabotage and combat modifiers
- Escape rolls and consequences
- Gear/equipment slots
- Role and Origin mechanical placeholders
- Tribute hand limit
- Win condition: reach 10 Renown by defeating a Threat
- Chat + action log

## What this version is not

- It is not affiliated with, licensed by, or using assets/text from Munchkin or Steve Jackson Games.
- It does not copy official card names, official card text, official art, logos, or trade dress.
- It is not a full base-deck parity build yet. This is the mechanics skeleton.

## Local run

```bash
npm install
npm start
```

Then open:

```txt
http://localhost:3000
```

Open three tabs/devices, create a room, join with the room code, and start the game.

## Render deployment

Use a Render **Web Service**.

Settings:

```txt
Runtime: Node
Build Command: npm install
Start Command: npm start
```

Environment variables:

```txt
NODE_ENV=production
```

The server binds automatically to Render's `PORT`.

## Netlify

Do not deploy this full app to Netlify by itself. Netlify is frontend-only unless paired with a separate backend. This version is easiest as a single Render web service.

## Gameplay notes

- Final Renown must come from winning combat.
- Tie goes to Threat unless the active player has the Bruiser role.
- Default hand limit is 5. Deepborn increases it by 1.
- Gear can be equipped outside combat during your own turn.
- Sabotage cards can be played during combat.
- Combat resolves when all connected players pass.
- Deals for Backup are intentionally logged socially rather than fully enforced.
