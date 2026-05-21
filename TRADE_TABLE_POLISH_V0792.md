# Loot Goblins v0.7.9.2 — Trade Table Polish

## Focus

This pass tightens the new Trade Table added in v0.7.9.

## Changes

### Trade table clarity
- Better Ready / Editing / Confirmed pills.
- Clearer participant status text.
- Observer view says two goblins are bargaining without revealing the deal.
- Cancel button language is shorter.

### Trade drawer improvements
- Drawer now explains the offer state more clearly.
- Shows how many cards the other player is offering.
- Adds a Clear button when your offer has cards.
- Ready button now says Ready Offer.

### Trade flow safety
- Offer changes now track who changed the deal and reset Ready/Confirm states.
- Trade actions update trade timestamps.
- New `TRADE_CLEAR_OFFER` action clears your offer without canceling the trade.

### Trade gain splash
- Cards received from trade now show as `Trade Complete`.
- Splash says `You received...` instead of generic `You gained...`.
- Trade gain splash gets a slightly different celebratory treatment.

## Still intentionally private

Observers do not see card names in the trade. They only see that a deal is happening/completed.
