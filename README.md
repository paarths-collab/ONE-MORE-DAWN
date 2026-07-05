# One More Dawn

> A cooperative survival-strategy game for Reddit. Your subreddit manages the
> last city after collapse — everyone wants it to survive, but not everyone
> agrees what kind of city it should become.

Built for **Reddit's Games with a Hook Hackathon** using Devvit Web + Phaser 4.

## Status

**Vertical slice complete** (tag: `vertical-slice`).

- Persistent city state per subreddit, resolved daily
- 6 roles, 4 city actions, one-vote-per-day crisis, council-plan strategy vote
- 90-second seeded expedition mini-game with anti-cheat
- Mod-only admin menu (force-resolve, reset, seed-demo)
- 85 tests: 84 unit + 1 full-loop integration proof

Next plan (in `docs/superpowers/plans/`): factions, laws, raids, polish.

## Stack

| Layer | Tech |
|---|---|
| Platform | Devvit Web (`@devvit/web` 0.13) |
| Game | Phaser 4.2, TypeScript, Vite 8 |
| Server | Hono 4 (serverless) |
| State | Devvit Redis (hashes + sorted sets; no lists) |

## Repo layout

```
src/
  shared/     types · balance · crises · rng · mapgen (used by client + server)
  server/
    game/     resolver · dayLogic · lazyResolve · missionRules · actionRules
    routes/   api (init/role/action/vote/strategy/timeline) · mission · menu
    storage/  store · redisKeys
  client/
    game/
      ui.ts   flat-color UI kit (720×1280 portrait)
      api.ts  fetch wrapper with mock-mode
      scenes/ Boot Preloader Dashboard RoleSelect Actions Vote Mission MissionEnd Timeline

docs/
  superpowers/specs/  design spec
  superpowers/plans/  implementation plans
  build-notes.md      lessons + verified Devvit facts
```

## Development

```bash
npm ci
npm run type-check    # tsc --build
npm run lint          # eslint
npm test              # vitest
npm run build         # vite build → dist/{client,server}
```

## Playtest

Requires a Reddit account, Devvit developer access, and a private test
subreddit you moderate.

```bash
npm run login         # auth Devvit CLI (browser popup)
npx devvit init       # register the app on your account
npm run dev           # devvit playtest
```

## CI

Every push to `main` and `build/**` runs type-check + lint + test + build on
Node 22. See `.github/workflows/ci.yml`. Publishing to Reddit is done manually
via `npm run launch` for the hackathon submission.
