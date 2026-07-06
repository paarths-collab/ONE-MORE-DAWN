# Devpost Submission Draft — One More Dawn

Copy-paste ready. Reflects the current build (Devvit Web + React, Phaser for the
expedition mini-game). Update the video URL and playtest subreddit URL before
submitting.

---

## Tagline (max 200 chars)

A cooperative survival-strategy game where your subreddit keeps the last city alive — one dawn at a time.

---

## Elevator pitch (short paragraph)

One More Dawn is a cooperative survival-strategy game where a subreddit
manages the last city after collapse. Players gather resources, run
dangerous expeditions, vote on moral crises, and compete through internal
factions for influence over the city's laws. Everyone wants the city to
survive — but not everyone agrees what kind of city it should become.

---

## Inspiration

Most Devvit games are mini-games with a Reddit skin — a puzzle you happen
to launch from a post. We wanted the opposite: a game that could only exist
on Reddit, because it uses Reddit's own comment-and-vote culture as the
core mechanic. Frostpunk-style resource pressure, filtered through a
subreddit's daily rhythm, resolved async so nobody has to be online at the
same time.

The design brief was simple: not a mini-game, a subreddit-scale strategy
simulation.

---

## What it does

- One real day is one game day. The city is per-subreddit and persistent —
  every post shows the same city, and one app install becomes many isolated
  cities (one per subreddit).
- **The Marked** — a named survivor or landmark in danger tonight. Anyone can
  save it with **one tap** (no energy needed): the lurker path into the game.
- A daily **crisis vote** with visible tradeoffs and a **council plan** strategy
  vote — one each per player per day, locked once cast.
- Three **energy** points a day on city actions — Grow Food, Repair Power, Treat
  Sick, Guard Wall — or one 90-second **expedition** into the ruins.
- **Six roles** (Scout, Engineer, Medic, Farmer, Guard, Speaker) with matching
  bonuses and a 3-day change cooldown; earned **titles** and contribution rank.
- A **survivor avatar** — chosen name, pronouns, and a pixel look — so every
  masked redditor has a face in the city.
- The **Dawn Report** on the first visit each day: yesterday's city summary plus
  your personal impact. This is the "come back tomorrow" hook.
- A **living skyline** that shifts with the city's mood, **vitals** that flash on
  change, a **danger ambient** that reddens as a raid nears, and synthesized
  **sound** with a mute toggle.
- A **live drama feed**, a permanent **timeline**, and a **World of Cities** map
  ranking participating subreddits against each other.
- **Factions & laws** (Builders / Wardens / Seekers / Hearth) that emerge from
  what players actually do.
- A mod-only admin menu with **force-resolve**, **reset**, and a rich
  **seed-demo** that spins up a judge-ready mid-run city.

---

## How we built it

- **Devvit Web** app running inside Reddit posts (`@devvit/web` 0.13).
- **React 18 + TypeScript + Vite 8** for the whole UI — a mobile-first pixel
  command console (`exactOptionalPropertyTypes: true`, strict throughout). We
  chose React deliberately: this is an async community strategy *dashboard*, and
  DOM stays crisp and battery-light where a canvas would blur and churn.
- **Phaser 4.2** for the one place it earns its keep: the 90-second expedition
  mini-game (seeded, anti-cheat).
- **Self-hosted fonts** (Silkscreen + JetBrains Mono via `@fontsource`), bundled
  same-origin so the pixel aesthetic survives the Devvit webview CSP.
- **Hono 4** for server endpoints under `/api/`.
- **Devvit Redis** for all persistent state — hashes for city and players,
  sorted sets for leaderboards, per-day hash keys for action/vote/pledge
  tallies, and `redis.global` for the cross-subreddit World map. No lists
  (Devvit Redis does not support them).
- **Deterministic seeded map generation** shared between client (render) and
  server (anti-cheat validation) via `src/shared/mapgen.ts` — same seed,
  byte-identical map.
- **Lazy day resolver** under an NX lock — no cron. The first request after
  midnight UTC resolves the previous day.
- **Optimistic-concurrency** energy spend and vote lock-in via watch/multi/exec.
- **416 tests** including a full-loop integration proof and property tests that
  drive the store and pure game logic end-to-end.

---

## Challenges we ran into

**Devvit transaction semantics were quietly wrong in our first pass.**
`tx.exec()` is typed `Promise<any[]>` and never returns null — the conflict
signal is a caught throw or an empty result array, not a null return. Our
original `exec() === null` guard was dead code; conflicts were being
silently ignored. Discovered by reading the actual
`@devvit/redis/RedisClient.js` sources and fixed with a shared
`execOrConflict` helper used across every atomic write path.

**Async multiplayer without websockets.** Devvit Web doesn't support them
and the runtime is request/response only. We made the resolver the ONLY
writer of state transitions, lazy-triggered on any request, gated by a
short-TTL NX lock so two concurrent visitors can't fork the day.

**Anti-cheat in a shared-map mini-game.** The client sends crate IDs, not
raw loot. The server regenerates the map from the token seed and prices
everything server-side. The mission token is consumed atomically via
watch/multi/del to prevent parallel-request double-banking.

**Crisis-picker orbit collapse.** Our first picker was a linear stride
`(day * 7 + cycle * 13) % pool.length`. Under the no-repeat rule, it
degenerated to a 3-crisis loop within a week — a subreddit would see the
same three crises forever. Replaced with a seeded PRNG so consecutive days
decorrelate. Now covered by a "no short-orbit lock-in" regression test.

**Balance that scales with subreddit size.** Initial constants worked for
3–5 players but any larger subreddit had zero scarcity, because drains
were population-linear while production was player-linear. Retuned to add
per-active-player drain terms so a 20-player subreddit still faces real
food and power pressure.

---

## Accomplishments that we're proud of

- A complete, polished game — not a slice — CI-green with **416 automated
  tests**, including a full-loop end-to-end proof (role → actions → mission →
  votes → day rollover) and property tests.
- A React UI that reads like a *place*: a living skyline, a one-tap pledge, a
  Dawn Report, and a survivor you build yourself — all crisp on mobile.
- Reddit-native hook that doesn't feel bolted on: factions form from what people
  actually do, laws come from the leading faction, and the whole subreddit shares
  the consequences.
- Deterministic, replayable resolver — retries can't fork reality.
- Ships CSP-clean: fonts self-hosted, no external requests, no inline scripts.

---

## What we learned

- Reddit's async pattern is a design constraint that becomes a design
  feature. Players return tomorrow to see collective consequences, which
  is more compelling than any "one-more-turn" solo loop.
- Adversarial audits catch what unit tests miss. Our review pass surfaced
  the dead conflict check, the orbit-collapsing crisis picker, and a
  scarcity-vanishing balance issue — none of which had a failing test
  until we wrote one.
- Devvit's platform is closer to "serverless + shared kv" than a game
  runtime. Once you accept that, the design ideas that survive are the
  ones that lean into async and shared state.

---

## What's next for One More Dawn

- Comment-write integration for scout reports and council rallies — turn in-game
  events into first-class Reddit threads (today we bridge to comments with a
  one-tap "copy scout report").
- A cohesive custom icon set to replace the remaining emoji.
- Marked portrait art with saved/lost states.
- City-vs-city Olympics season mode on top of the World map.
- Larger crisis pool and richer law effects.

---

## Built With

Devvit, Devvit Web, Devvit Redis, **React**, Phaser 4, TypeScript, Hono, Vite,
`@fontsource`, Node.js 22.

---

## Try it out

- [GitHub repo](https://github.com/paarths-collab/reddit-game)
- Playtest link: [TBD — subreddit URL after publishing]
- Demo video: [TBD]

---

## Video pitch (2 min)

See `docs/submission/video-script.md` in the repo for the shot list and
narration.
