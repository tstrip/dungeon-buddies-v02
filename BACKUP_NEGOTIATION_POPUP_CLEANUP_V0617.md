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
