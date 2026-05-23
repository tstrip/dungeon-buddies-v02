# Loot Goblins v0.7.9.4.1 — Render Port Bind Hotfix

## Fix

Render reported: `Port scan timeout reached, no open ports detected`.

This hotfix changes the server bind from:

```js
server.listen(PORT, () => ...)
```

to:

```js
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => ...)
```

That explicitly binds the web service to `0.0.0.0` and the Render-provided `PORT`.

## Added

- `/healthz` plain-text health route
- `/ready` JSON readiness route
- updated `/health` version string

## No gameplay/UI changes

This is only a deploy/runtime hotfix on top of v0.7.9.4.
