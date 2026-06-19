---
name: Nazafa pnpm shell-quote firewall fix
description: shell-quote@1.8.3 is blocked by Replit package firewall; solution is to override to 1.8.4
---

The package `shell-quote@1.8.3` is blocked by Replit's package firewall (403 Forbidden). It is a transitive dependency of `react-devtools-core` (used by Expo dev tooling).

**Fix:** Add override in `pnpm-workspace.yaml`:
```yaml
overrides:
  shell-quote: "1.8.4"
```

**Why:** `shell-quote@1.8.4` is allowed through the firewall. The pnpm virtual store would resolve 1384 packages but fail silently during the linking phase because of this one blocked package. The fix makes install complete successfully.

**How to apply:** If pnpm install fails with ERR_PNPM_FETCH_403 for shell-quote, add the override and run `pnpm install` again (not --frozen-lockfile).
