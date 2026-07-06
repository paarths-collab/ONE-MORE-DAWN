# Build Notes — lessons for agents working in this repo

One lesson per bullet. Update rather than duplicate; delete if proven wrong.

## Environment
- Windows 11, Git Bash for shell tasks. npm scripts with single-quoted globs
  break on Windows — use escaped double quotes (fixed in `lint` script, commit 548efe6).
- `npm run build` emits two PRE-EXISTING rollup warnings (`sourcemapFileNames`,
  `inlineDynamicImports`) — harmless template noise, not caused by your change.
- `npm install` reports 31 audit advisories inherited from the upstream Devvit
  template — out of scope, do not attempt to fix.
- Git warns "LF will be replaced by CRLF" on Windows — cosmetic, ignore.
- Node v24, npm 11. Devvit CLI commands (`devvit login/upload/playtest`,
  `npm run dev`) require Reddit auth owned by the human — never run them.

## Execution protocol (Fable parallel mode)
- Implementer agents working in parallel touch ONLY their listed files and
  NEVER run git commands (no add/commit) — the controller verifies the full
  gate (type-check, lint, test, build) and commits each task separately.
- Run targeted tests while working (`npx vitest run src/path/file.test.ts`);
  the controller runs the full suite at commit time.
- Ground every report claim in a tool result from your session; if unverified,
  say so explicitly.

## Devvit client facts (verified from .d.ts, T9)
- The real `RedisClient` does NOT structurally satisfy our `RedisLike`
  (`SetOptions.expiration` is a `Date`, not seconds; `ZRangeOptions.by` is
  required). Use the typed `redisLike` adapter exported from
  `src/server/routes/api.ts` when constructing `Store` in routes — never cast.
- Lock/NX check: use truthiness on `redis.set(..., {nx: true})`, not `=== 'OK'`.
- `context.userId` is `T2 | undefined`; `reddit.getCurrentUsername()` returns
  `string | undefined`.
- Mission routes: pass `city.threat` to `evaluateMission` — safe within a day
  because threat only changes at resolution, resolution bumps `day`, and
  stale-day tokens are rejected.

## TypeScript gotchas
- The client tsconfig compiles against BUILT shared declarations
  (`dist/types/shared`, via project references). If shared types changed and
  the client check reports phantom missing members, run
  `npx tsc -b tools/tsconfig.shared.json` first (or use `tsc --build`).
- The SERVER tsconfig overrides `exactOptionalPropertyTypes` to false; the
  CLIENT project has it true — client code must not assign `undefined` to
  optional props (build opts objects conditionally).
- The repo compiles with `exactOptionalPropertyTypes: true` (tools/tsconfig.base.json).
  `RequestInit.body` accepts `BodyInit | null` — pass `null`, not `undefined`,
  for a no-body fetch (hit in src/client/game/api.ts).
- eslint has `no-unused-vars` OFF; non-null assertions (`x!`) match repo style.

## Project facts
- Type contract: `src/shared/types.ts` (Task 3, verified). Balance numbers:
  `src/shared/balance.ts` only — no magic numbers elsewhere.
- Redis: Devvit Redis has no lists/sets, no key enumeration; hash fields
  cannot expire (mission tokens are per-token keys with TTL for this reason).
- `src/shared/api.ts` is the template's old counter types — still imported by
  template client scenes until Task 16; do not delete before then.
- Conventions: type aliases over interfaces, named exports, never cast types
  (exception: approved casts inside `src/shared/balance.ts`).
- Scenario variety (W1): CityState.worldSeed (hash of subredditId; 0 = neutral
  'standard' test path) salts mission layout seeds and crisis picks; city
  traits are drawn per (worldSeed, cycle) from BALANCE.traits/traitEffects.
  Keep new variety features data-driven in balance.ts — the Supercell pattern.

## Testing
- Vertical slice integration test lives at
  `src/server/routes/api.integration.test.ts`. It drives the store + pure
  game logic (role → actions → mission → votes → day rollover) end-to-end
  against `makeFakeRedis` — Hono routes are NOT exercised (they need the
  Devvit runtime). Extend this file (do not replace it) when new game flow
  ships, so the slice-alive proof keeps up.

## Multi-subreddit scoping (verified from SDK source, 2026-07-05)
- Devvit Redis is INSTALLATION-scoped: `@devvit/redis/index.js:5` constructs
  the default client with `RedisKeyScope.INSTALLATION`, and every RPC passes
  `scope`. Two subreddit installs of this app CANNOT see each other's keys —
  `city:state` is per-subreddit automatically. Do NOT add `sub:{id}:` key
  prefixes; the platform already partitions harder than app code can.
- One user in many subreddits = separate player profile/energy/faction per
  city, automatically (the `players` hash is per-installation).
- Mission tokens cannot cross subreddits for the same reason.
- Cross-installation features (global leaderboard, "which city survived
  longest") would use `redis.global` (`RedisKeyScope.GLOBAL`) — post-MVP.

## Accepted risks (reviewed 2026-07-05)
- Mission `status`/injury is client-attested — a dishonest client can report
  'escaped' and avoid the injury penalty. Bounded to 1 run/day in a co-op
  game; accepted for the hackathon. Loot AMOUNT is now bounded server-side by
  the physical feasibility check in `evaluateMission` (minMsPerTile).
- `/action` and `/mission/start` watch the whole `players` hash — concurrent
  spends by DIFFERENT users can 409 (client-retriable). Accepted: that watch
  is exactly what prevents double-spend for the same user.
