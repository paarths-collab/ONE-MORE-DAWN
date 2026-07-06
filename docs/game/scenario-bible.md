# One More Dawn — Scenario Bible

> **Status:** Living contract. Every number below is copied from real source. Where a
> value is a named constant, the constant is cited inline (e.g. `BALANCE.hunger.deathsPerMissingFood = 0.3`)
> so any reader can `grep` it and confirm the doc has not drifted from code.
>
> **Sources of truth:** `src/shared/balance.ts`, `src/shared/crises.ts`,
> `src/server/game/resolver.ts`, `src/server/game/lazyResolve.ts`,
> `src/server/game/world.ts`, `src/server/game/marked.ts`,
> `src/server/game/actionRules.ts`, `src/server/game/missionRules.ts`,
> `src/server/routes/api.ts`, `src/server/routes/mission.ts`,
> `src/server/routes/menu.ts`.

---

## 1. Purpose

This file is the **single source of truth for what every situation is supposed to do**.
"One More Dawn" is a persistent, asynchronous, multiplayer city-survival game running on
Reddit/Devvit: one shared city per subreddit installation, resolving exactly once per
day at midnight UTC. Between resolutions, players read the city's state and submit small
inputs — pick a role, spend energy on a city action, run one expedition, cast one crisis
vote, back one council plan, tap one free pledge. At dawn the resolver **compresses all of
those inputs, plus passive decay, plus the previous day's crisis vote and faction law, into
a new city state** and writes one timeline entry. This document defines the intended
behavior of each of those situations so the implementation can be verified against it, not
the other way around. If code and this doc disagree, one of them is a bug — and Section 4/5
below flag the specific places where the *real* code is counter-intuitive.

---

## 2. The Pipeline (ASCII)

Everything below happens inside one call to `resolveDay(city, inputs)` in
`src/server/game/resolver.ts`, driven once per UTC day by `runLazyResolution` in
`src/server/game/lazyResolve.ts`.

```
   INPUTS collected across the whole UTC day (Redis day-scoped hashes)
   ┌─────────────────────────────────────────────────────────────────────┐
   │  Current City State (yesterday's snapshot: food/power/med/morale/…)  │
   │  Player City Actions (grow_food · repair_power · treat_sick · guard) │
   │  Mission Loot (totalFood/Medicine/Scrap · totalRuns · injuries)     │
   │  Crisis Vote (per-option tally for city.crisisId)                    │
   │  Council Plan Vote (per-plan tally → unity check)                    │
   │  Faction Influence (action/mission-driven → tomorrow's law)          │
   │  One-Tap Pledges (stand_vigil/share_rations/run_messages/back_council)│
   │  The Marked pledged-resolve counter (vs deterministic daily goal)    │
   └───────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
        ┌──────────────────────────────────────────────────┐
        │                 RESOLVER (resolveDay)             │
        │  1  action + mission production                   │
        │  1b one-tap pledge pressure                       │
        │  2  crisis vote applied (or "moment passed")      │
        │  2b council unity morale bonus                    │
        │  2c The Marked verdict (morale ±)                 │
        │  3  consumption + hunger/power/sickness/morale    │
        │  4  clamp vitals                                  │
        │  4b Red Signal raid (if threat ≥ 100)             │
        │  4c fall check (population ≤ 10 → fallen)         │
        │  5  pick next crisis (alive cities only)          │
        │  5b faction winner → tomorrow's law               │
        │  6  build timeline entry (deltas vs yesterday)    │
        └───────────────────────────────┬──────────────────┘
                                   │
                                   ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │  New City State (day+1, new vitals, status, crisisId, activeLaw)     │
   │  Timeline Entry (headline + events[] + deltas + winningOptionId)     │
   │  Dawn Report (rebuilt at /init from yesterday's timeline + your part) │
   │  Next Crisis (deterministic pick from eligible pool)                 │
   │  Marked Verdict ({ name, saved }) → persisted as savedYesterday      │
   └─────────────────────────────────────────────────────────────────────┘
```

The **order is load-bearing** and is asserted by comments in `resolver.ts`:
consumption/penalties run **before** clamp; the raid runs **after** clamp (so it acts on
final threat) but **before** the fall check (so a raid's population loss can itself topple
the city); the next crisis and faction law are only chosen for cities that are still
`alive` after the fall check.

---

## 3. Crisis Contract

All six crises live in `src/shared/crises.ts`. Effects below are **verbatim** from the
`effects` objects. A crisis is the *active* one for a day (`city.crisisId`); its options are
voted on that day, and the winning option's effects are applied at the **next** dawn
(resolver §2). Day 0 always starts on `first_light` (`DAY_ZERO_CRISIS_ID` in `balance.ts`).

**Trigger fields** (`isEligible` in `crises.ts`): a crisis is eligible to be picked as
*next* when `city.day + 1 >= minDay` (default `minDay` = none, i.e. always) **and** its
`requires` gates pass against the resolving city. It can never be picked two days in a row
(`crisis.id === city.crisisId` is excluded).

### 3.1 `first_light` — "First Light"
- **Trigger:** always (day-zero default; no `minDay`, no `requires`).
- **a — "Fortify first":** `defense +6, morale -3`
- **b — "Feed everyone":** `food -8, morale +8`
- **c — "Map the ruins":** `threat +4, medicine +3, food +3`

### 3.2 `refugee_convoy` — "The Convoy at the Gate"
- **Trigger:** `minDay: 2` (eligible once `city.day + 1 >= 2`). No `requires`.
- **a — "Let them in":** `population +30, food -20, morale +4`
- **b — "Turn them away":** `morale -10, defense +3`
- **c — "Inspect first":** `population +15, food -8, threat +3`

### 3.3 `blackout_ward` — "Blackout in the Ward"
- **Trigger:** `minDay: 3`. No `requires`.
- **a — "Power the ward":** `medicine +4, power -6, morale +3`
- **b — "Power the wall lights":** `threat -8, morale -4`
- **c — "Ration the charge":** `medicine +2, threat -3, power -3`

### 3.4 `ration_riots` — "Ration Riots"
- **Trigger:** `minDay: 4` **and** `requires: { maxFood: 15 }` (only eligible when
  `city.food <= 15`).
- **a — "Impose strict rationing":** `food +6, morale -12`
- **b — "Open emergency stores":** `food -10, morale +10`
- **c — "Double the guard":** `defense +4, morale -6, threat +2`

### 3.5 `strange_signal` — "A Strange Signal"
- **Trigger:** `minDay: 3`. No `requires`. (Also the fallback crisis when the eligible pool
  is empty and the current crisis is `first_light` — see §7.)
- **a — "Answer it":** `threat +8, morale +5`
- **b — "Jam it":** `power -5, threat -5`
- **c — "Just listen":** `morale -2, medicine +2`

### 3.6 `sickness_spreads` — "The Cough Spreads"
- **Trigger:** `minDay: 4` **and** `requires: { maxMorale: 70 }` (only eligible when
  `city.morale <= 70`).
- **a — "Quarantine the block":** `morale -8, medicine -3, population -2`
- **b — "Spend the medicine":** `medicine -10, morale +6`
- **c — "Work through it":** `population -6, morale -5`

### 3.7 Vote resolution rules
- **Winner** = `winningOption(votes)` in `resolver.ts`: filters options with count > 0,
  sorts by **count descending, then optionId ascending** (`nB - nA || idA.localeCompare(idB)`),
  takes the first. So a tie between `a` and `b` deterministically resolves to `a`.
- **No votes** = no winner → resolver pushes the event `Crisis "…": nobody voted. The moment
  passed unanswered.` and applies **no crisis effect** that day.

---

## 4. Outcome Bands

Bands per vital, using the **real constants**. `[REAL]` marks a value taken verbatim from
`balance.ts` / `world.ts`. Ranges use the exact comparison operators from `resolver.ts`
(e.g. sickness fires on `medicine < threshold`, low power on `power < threshold`).

> **World-map bands** (`worldStatus` in `world.ts`) are a *separate, coarser* classification
> used only for the cross-subreddit map. Precedence: `fallen` > `under_raid` > `strained` >
> `thriving` > `holding`. `strained` = **any** vital at/below its floor
> (`BALANCE.world.strained` `[REAL]` = `{ food: 10, power: 15, medicine: 3, morale: 20 }`).
> `thriving` = **all** vitals at/above floor **and** `threat <= 40`
> (`BALANCE.world.thriving` `[REAL]` = `{ food: 40, power: 50, medicine: 10, morale: 65, maxThreat: 40 }`).
> `under_raid` = `threat + 6 >= 100` (raid imminent within one passive day).

### Food (`0 … 300`, cap `BALANCE.scaling.foodStoreCap = 300` `[REAL]`)
| Band | Range | What the game does |
|---|---|---|
| **Starving** | consumed food pushes stock `< 0` | Hunger: `deaths = ceil(missingFood * 0.3)` `[REAL BALANCE.hunger.deathsPerMissingFood]`, `morale -8` `[REAL BALANCE.hunger.moralePenalty]`, food clamped to 0. |
| **Strained** | `food <= 10` | World map tags city `strained` `[REAL BALANCE.world.strained.food]`. `ration_riots` becomes eligible at `food <= 15`. |
| **Stable** | `11 … 39` | Normal consumption only. |
| **Thriving floor** | `food >= 40` | Contributes to world `thriving` tag `[REAL BALANCE.world.thriving.food]`. |

### Power (`0 … 100`, clamped percentage)
| Band | Range | What the game does |
|---|---|---|
| **Dark** | `power < 25` | `morale -4` `[REAL BALANCE.lowPowerThreshold=25, lowPowerMoralePenalty=4]`; dashboard shows low-power flicker ("The lights flicker…"). |
| **Strained** | `power <= 15` | World map tags `strained` `[REAL BALANCE.world.strained.power]`. |
| **Stable** | `25 … 49` | Passive decay only (`-3` `[REAL BALANCE.passivePowerDecay]` per day, before player drain). |
| **Thriving floor** | `power >= 50` | Contributes to world `thriving` tag `[REAL BALANCE.world.thriving.power]`. |

### Medicine (`0 … 120`, cap `BALANCE.scaling.medicineStoreCap = 120` `[REAL]`)
| Band | Range | What the game does |
|---|---|---|
| **Outbreak (no meds)** | `medicine < 2` | Sickness: `population -2` `[REAL BALANCE.sickness.deathsIfNone]` (no medicine to spend). |
| **Sick** | `2 <= medicine < 10` | Sickness: `medicine -2/day` `[REAL BALANCE.sickness.threshold=10, medicineCostPerDay=2]`. |
| **Strained** | `medicine <= 3` | World map tags `strained` `[REAL BALANCE.world.strained.medicine]`. |
| **Healthy** | `medicine >= 10` | Below-threshold penalty does not fire; still pays `-2/day` upkeep. |

### Morale (`0 … 100`, clamped percentage)
| Band | Range | What the game does |
|---|---|---|
| **Collapse** | `morale < 15` | Desertion: `population -3` `[REAL BALANCE.morale.collapseThreshold=15, desertersPerDay=3]`. |
| **Strained** | `morale <= 20` | World map tags `strained` `[REAL BALANCE.world.strained.morale]`. |
| **Holding** | `21 … 64` | No morale-driven population loss. |
| **Thriving floor** | `morale >= 65` | Contributes to world `thriving` tag `[REAL BALANCE.world.thriving.morale]`. |

### Threat (`0 … 100`, clamped percentage)
| Band | Range | What the game does |
|---|---|---|
| **Calm** | `threat <= 40` | Within world-map `thriving` ceiling `[REAL BALANCE.world.thriving.maxThreat=40]`; also the value threat resets to after a raid (`BALANCE.raid.postRaidThreat=40` `[REAL]`). |
| **Rising** | `41 … 93` | Passive `+6/day` `[REAL BALANCE.passiveThreatRise]` plus mission/player drain; guard actions push it down `-5` each `[REAL BALANCE.actionEffects.guard_wall.threat]`. |
| **Raid imminent** | `threat + 6 >= 100` | World map tags `under_raid`; `/init` sets `raidLikely=true`. |
| **Red Signal** | `threat >= 100` | Raid fires at dawn `[REAL BALANCE.raid.triggerThreshold=100]` — see §4-raid below. |

### Population (whole count)
| Band | Range | What the game does |
|---|---|---|
| **Fallen** | `population <= 10` | City status → `fallen` `[REAL BALANCE.fall.populationThreshold=10]`; no further advancement (§6). |
| **Critical** | `11 … ~40` | Every penalty (hunger/sickness/desertion/raid) risks crossing the fall line. |
| **Stable** | `> 40` | Start population is `120` `[REAL BALANCE.start.population]`. |

### Raid detail (resolver §4b, `BALANCE.raid` `[REAL]`)
When `threat >= 100` after clamp: `foodLoss 20`, `powerLoss 15`, `moraleLoss 15`,
`populationLoss 8`, and `threat` resets to `40`. Each **guard_wall** action taken that day
dampens *every* loss by `3` (`guardDampenPerAction`), floored at 0 per loss. The raid's
population loss is applied **before** the fall check, so a raid can directly fell the city.

---

## 5. Player Input Rules

`BALANCE.dailyEnergy = 3` `[REAL]`. Energy resets when the city day advances
(`resetPlayerForDay` in `dayLogic.ts`, applied on the player's first touch each day).
Injury reduces the day's budget by `1` (`BALANCE.injuryEnergyPenalty`) while
`injuredUntilDay >= cityDay` (`effectiveEnergy`).

| Input | Who / when | Per day | Energy | Feeds daily aggregate | Invalid cases (error) |
|---|---|---|---|---|---|
| **Role pick** (`POST /role`) | Any logged-in player | First pick free; re-pick after **3-day cooldown** `[REAL BALANCE.roleChangeCooldownDays]` | 0 | `players` hash (`role`, `roleChangedDay`) | Not logged in → 401. No city → 409. Unknown role → 400. Re-pick before cooldown → 400 `"You can change roles in N days."` |
| **City action** (`POST /action`: grow_food/repair_power/treat_sick/guard_wall) | Player with a role | Up to **effectiveEnergy** total actions+missions (3, or 2 if injured) | 1 each | `day:{d}:actions` (+ `day:{d}:userActions`, faction influence, role rep) | Not logged in → 401. City not `alive` → 409. Bad/unknown action → 400. No role → 400 `"Choose a role before acting."` No energy → 400. Concurrent energy write conflict → 409 `"Busy — try again"`. |
| **Mission start** (`POST /mission/start`) | Player (any/no role) | **1 expedition per day** hard cap, *and* costs energy | 1 | Marks `mission` in `day:{d}:userActions`; `mission_started` counter | City not `alive` → 409. No energy → 400. Already ran today → 400 `"One expedition per day…"`. Conflict → 409. |
| **Mission complete** (`POST /mission/complete`) | The player who started it | Consumes exactly one token | 0 (energy spent at start) | `day:{d}:missions` (totalRuns/Food/Medicine/Scrap/injuries), Seekers influence | See §5.1 — server re-simulates and rejects any invalid/spoofed/expired/reused token. |
| **Crisis vote** (`POST /vote`) | Any logged-in player | **1 vote per day** (`day:{d}:voters` lock) | 0 | `day:{d}:votes` (optionId tally) | City not `alive` → 409. Unknown option → 400. Already voted → 409 `"You already voted today."` |
| **Council plan vote** (`POST /strategy`) | Any logged-in player | **1 per day** (`day:{d}:strategyVoters` lock) | 0 | `day:{d}:strategyPlan` (planId tally) | City not `alive` → 409. Unknown plan → 400. Already backed a plan → 409 `"You already backed a plan today."` |
| **One-tap pledge** (`POST /pledge`: stand_vigil/share_rations/run_messages/back_council) | Any logged-in player (the lurker path) | **1 pledge per day** (`day:{d}:pledgers` lock) | **0 — never touches the energy budget** | `day:{d}:marked` (`pledged += 5` `[REAL pledgePerTap]`, per-kind tap count) | City not `alive` → 409. Bad kind → 400. No profile → 409. Already pledged → 409 `"You already pledged today."` |
| **Admin force-resolve** (`POST /menu/force-resolve`) | Mod menu action | Once per invocation | n/a | Resolves current `city.day` immediately (see §5.2) | No city → toast "No city yet". City `fallen` → toast "Reset to start a new cycle." |
| **Admin reset** (`POST /menu/reset`) | Mod menu action | Once per invocation | n/a | Wipes city + day-scoped keys, starts new cycle | None — always succeeds; increments cycle. |

### 5.1 Mission anti-cheat (`evaluateMission` in `missionRules.ts`)
The client submits only crate IDs; the server regenerates the map from the token's
`layoutSeed`, prices crates from `lootSeed`, and computes loot itself. A completion is
**rejected** (each returns `{ ok: false }` → 400/404/409) when:
- token already `consumed` → "Mission already submitted."
- `token.userId !== userId` → "Not your mission." (spoofed identity)
- `token.day !== cityDay` → "This mission belongs to a day that has passed." (stale)
- `now > expiresAtServerMs` → "Mission expired." (TTL `BALANCE.mission.tokenTtlMs = 10min` `[REAL]`)
- more crates claimed than the route allows → "Too many crates claimed."
- run faster than `airSeconds + completionGraceMs` implies too-slow, or slower than
  physically feasible (`minFeasibleMs`, `minMsPerTile = 100` `[REAL]`) → rejected.
- duplicate crate IDs → "Duplicate crates claimed."
- any unknown crate ID → "Unknown crate: …" (spoofed loot)
- run under `minPlausibleDurationMs = 5000` `[REAL]` → "Implausible completion time."

Token **reuse** is additionally blocked at the transaction layer: `/complete` watches the
token key and `del`s it inside the multi; a parallel duplicate loses the watch and gets
409 "Mission already submitted." Failed runs (`status !== 'escaped'`) keep **half** the loot
(`failLootKeepRatio = 0.5` `[REAL]`, floored) and set injury for `injuryDays = 1`.

### 5.2 Admin force-resolve caveat `[FINDING]`
`force-resolve` (`menu.ts`) builds `DayInputs` with **`roleCounts: {}` and
`activeUserCount: 0`** hardcoded. Consequences vs. the natural midnight path
(`lazyResolve.ts`, which computes both from Redis):
- **No speaker morale tick** (roleCounts empty → `roleCounts.speaker ?? 0` = 0).
- **No active-player scarcity scaling** (activeUserCount 0 → no extra food/power/threat drain).
- It still reads real crisis votes, missions, pledges, faction influence, and marked pledged.
This is intentional for a manual "push the day" button but means a mod-forced dawn is
slightly gentler than an organic one. Documented so QA does not treat it as a bug.

---

## 6. City State Machine

The **persisted** `CityState.status` is only `'alive' | 'fallen'` (see `types.ts`). There is
no stored `resolving`/`resolved` state — those are transient/derived:

```
              first /init or /village on a fresh install
                                │
                                ▼
                        ┌───────────────┐
   (new cycle on reset) │    alive      │◄──────────────┐
   ───────────────────► │  (active_day) │               │
                        └───────┬───────┘               │
             midnight UTC rollover, NX lock acquired    │
                                │                        │
                                ▼                        │
                    resolveDay() runs (transient         │
                    "resolving:true" returned to any     │
                    concurrent caller that lost the lock)│
                                │                        │
                 ┌──────────────┴───────────────┐        │
        population > 10                 population ≤ 10   │
                 │                              │         │
                 ▼                              ▼         │
        status stays 'alive' ───────────►  status='fallen'
        (day+1, next crisis picked)             │
        loop back to alive ─────────────────────┘         │
                                                          │
                            mod /menu/reset (any state) ──┘
                            → newCityState(cycle+1): day=1, status='alive'
```

**Transition triggers (real code):**
- **create:** `runLazyResolution` sees no city → `newCityState(1, worldSeed)`, status `alive`,
  `lastResolvedDate = today`.
- **advance (alive → alive):** UTC date rolled over **and** `status === 'alive'` **and**
  `lastResolvedDate !== today` → resolve **one** day, `day+1`, pick next crisis, set law.
- **resolving (transient):** a concurrent request that fails the `NX` lock gets
  `{ resolving: true }` and the *current* (unadvanced) city; it is not a persisted state.
- **fall (alive → fallen):** after clamp+raid, `population <= 10` → `status = 'fallen'`.
  The resolver does **not** pick a next crisis or law for a fallen city.
- **fallen is terminal:** `runLazyResolution` early-returns for `status !== 'alive'`; days
  never advance again. `/action`, `/vote`, `/strategy`, `/pledge`, `/mission/*` all 409 with
  "The city is beyond saving."
- **reset (any → new alive):** mod `/menu/reset` deletes `city:state`, timeline, history,
  players, leaderboards, marked outcomes, and every `day:{1..lastDay+1}:*` key, then writes
  `newCityState(cycle+1)` — `day=1`, `cycle+1`, fresh trait roll from `worldSeed`.

---

## 7. Follow-up / Continuity

"Things continue" because the resolver is a **pure compression function**: it takes
yesterday's `CityState` plus the day's aggregated inputs and returns exactly one new
`CityState`, one `TimelineEntry`, and one Marked verdict. Nothing about the day's individual
players survives into the next day's math except through those aggregates and the persisted
city vitals — which is what makes the game replayable and the resolver deterministic
(same city + same inputs → same result, so a retried resolution under the lock can never
fork reality).

Continuity mechanics that are **implemented**:
- **Timeline record.** Each dawn appends one `TimelineEntry` (`day`, `headline`, `events[]`,
  `deltas` vs yesterday, `crisisId`, `winningOptionId`). `/init` rebuilds the personalized
  **Dawn Report** from yesterday's entry plus the caller's own recorded actions.
- **Deterministic next crisis.** `pickNextCrisis(city)` filters `CRISES` by `isEligible`
  (minDay + requires, excluding the current crisis), then seeds `makeRng` with
  `(day * 2654435761) ^ (cycle * 40503) ^ worldSeed` and picks one. Same state → same next
  crisis, and different installations (different `worldSeed`) see different sequences. If the
  eligible pool is **empty**, it falls back to `strange_signal` (or `first_light` if the
  current crisis was already `strange_signal`).
- **Deterministic Marked.** `pickMarked(worldSeed, cycle, day, activePlayers)` (`marked.ts`)
  is pure; the goal is `min(200, 10 + ceil(activePlayers * 4))`
  `[REAL BALANCE.marked.goalMax/goalBase/goalPerActivePlayer]` where `activePlayers` is
  **yesterday's** action-taker count (frozen all day, so `/init` shows exactly the goal the
  dawn resolver judges). Consecutive days never mark the same objective.
- **Carried law.** Yesterday's winning faction sets tomorrow's law
  (`lawLifespanDays = 1` `[REAL]`); with no faction activity, an unexpired law carries,
  otherwise it clears.

**Not yet implemented (PROPOSED):** branching follow-up chains keyed on a `city.flags`
bag — e.g. "you turned the convoy away on day 3, so a hostile-scavengers crisis becomes
eligible on day 6". The current `CityState` has **no `flags` field** and crisis eligibility
depends only on `minDay` + `requires` (which read live vitals, not history). Any doc or
design note describing stateful branching narrative should be marked *proposed / future
extension* until a `city.flags` mechanism actually lands.
