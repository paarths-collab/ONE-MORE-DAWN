# Launch Video — Recording Guide (showcase branch)

> **Branch:** `codex/demo-launch-showcase`. **NEVER merge or deploy this branch.**
> It only enriches the local dev harness (`vite.dev3d.config.mjs`) with deterministic
> fixtures for a clean recording. The Devvit production build (`vite.config.ts` + the
> real server) never sees these flags. The final submission proof of real Redis
> persistence and real multiplayer must still be captured from the actual Devvit
> playtest — the showcase is for rehearsal and clean B-roll only. Do **not** narrate
> the scripted villagers as real Reddit users.

## What the showcase state gives you

Launching the harness with `MOCK_SHOWCASE=1` boots the game into a rich, camera-ready state:

- A **built-up township** (Shelter + Farm + Watchtower, pop 168, calm) so the city looks worth saving.
- The **first land district (Outer Fields) already claimed** — the city boots visibly expanded as one connected landmass, not a floating island.
- **River Ward one pledge from unlocking** (255/260) so an on-camera pledge grows the city live.
- **12 Coins** and a **house already decorated** (Crimson Banner + Garden Plot + Slate Roof equipped), with the **Hearth Lantern (3) and Dawn-Gold Trim (12) left to buy on camera**.
- The **World map** with two real-looking cities (your city + a rival).
- The **Dawn Report** teaser on first open (the return-tomorrow hook).

Add `MOCK_SHOWCASE_RAID=1` for a second clip: the **Red Signal armed** — red RAID WATCH ("RAID AT NEXT DAWN"), the raid music track, and the raid warning cue.

## Launch commands

From the repo root, on the `codex/demo-launch-showcase` branch:

```bash
# Clip A — the main showcase (city, shop, land, world, dawn report)
MOCK_API=1 MOCK_SHOWCASE=1 node node_modules/vite/bin/vite.js \
  --config vite.dev3d.config.mjs --host 127.0.0.1 --port 4630 --strictPort
# then open http://127.0.0.1:4630/ in Chrome

# Clip B — the raid-warning shot (record separately)
MOCK_API=1 MOCK_SHOWCASE=1 MOCK_SHOWCASE_RAID=1 node node_modules/vite/bin/vite.js \
  --config vite.dev3d.config.mjs --host 127.0.0.1 --port 4631 --strictPort
# then open http://127.0.0.1:4631/
```

On Windows PowerShell, set the env vars first:
```powershell
$env:MOCK_API=1; $env:MOCK_SHOWCASE=1
node node_modules/vite/bin/vite.js --config vite.dev3d.config.mjs --host 127.0.0.1 --port 4630 --strictPort
```

Verify both states boot cleanly before recording:
```bash
node tools/showcase-smoke.mjs
```

## Recording tips

- Record desktop at **1920×1080** for the main cut; grab one short **phone-landscape** clip for the mobile beat.
- On first open, the advisor primer appears — click through it (or let it finish) before rolling, so the stage is clean.
- Turn music **on** (⚙ settings → MUSIC ON) after the first click so the crossfade is audible; keep it low under narration. SFX stay audible.
- Move the cursor deliberately; pause a beat on each payoff (the lantern appearing, the district unlocking).

## Storyboard (target 55–65s)

| Time | Shot | On-screen proof | How to trigger |
| --- | --- | --- | --- |
| 0–5s | Feed splash → enter the city | Kingdom art, name, immediate hook | Open the splash, click ENTER THE CITY |
| 5–12s | Slow pan across the 3D township + your house | Shared city + your decorated house (banner, garden, slate roof) | Drag to pan; the city already shows the claimed Outer Fields district |
| 12–19s | Take one daily action | `+1 🪙` float, action confirm, "lands at next dawn" | Hotbar → GROW FOOD |
| 19–30s | Open SHOP → HOUSE → buy + equip Hearth Lantern | Real Coin debit (12→9), OWNED→EQUIPPED | SHOP tab → HOUSE → Hearth Lantern `3 🪙` → EQUIP |
| 30–36s | Fly camera to your house | The lantern now glows on your actual house | Pan/zoom to your highlighted house |
| 36–46s | SHOP → EXPAND → pledge to River Ward | Fund bar 255→260, **THE CITY GROWS** banner, new terrain band appears | EXPAND → MAX → PLEDGE 🪙 → watch the district unlock |
| 46–52s | Crisis vote + council + The Marked | Reddit-scale collective decisions, community % | LIVE tab → vote, back a plan, pledge for Mira |
| 52–58s | Raid warning → the wall decides | Red RAID WATCH, then the full attack: night falls, ⚔ RAID AT THE GATE, WALL HELD / BREACHED | Clip B (`MOCK_SHOWCASE_RAID=1`) for the warning; **in the demo-mode harness** (plain, no `MOCK_API`) run `window.__omdDemo.raidNow()` in the console to fire the full 9s attack live on camera (raiders storm the gate, then the wall holds if DEFENSE ≥ 40 else breaches with −8 souls) |
| 58–65s | WORLD view — two subreddit-cities | Multiple subreddits, one city each, ranked | MAP → WORLD |

## Editing checklist

- Open on the splash; end on the WORLD map (community/aspiration note).
- Keep every cut tight; no dead air, no setup fumbling (that's what the deterministic state is for).
- Overlay one line of text on the land-unlock beat: "the whole subreddit funds the city's growth."
- Final upload: unlisted/public link, then paste into the Devpost `Demo video` field (replaces the `TBD`).
- Capture the **real-runtime proof** (a few frames of the live Devvit playtest with a second real account) as a short insert or a still — that is the only part the showcase harness cannot stand in for.
