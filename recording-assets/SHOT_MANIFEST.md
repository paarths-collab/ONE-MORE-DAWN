# One More Dawn Recording Manifest

All assets are captured locally from `?showcase=1`. The fixtures are deterministic
recording data, never a claim that other subreddits or Reddit comments are live.
Use a 1920×1080 viewport, hide controls with `H`, and hide the cursor with `C`.

## Clean PNG Frames

| File | Scene key | UI | Cursor | Pair | Description |
|---|---|---:|---:|---|---|
| `01_empty_camp_clean.png` | `camp` | no | no | 01 → 02 | Empty Camp, central fire, open terrain. |
| `02_early_settlement_clean.png` | `contribute` | no | no | 01 → 02 | First Shelter progress and early houses. |
| `03_growing_city_clean.png` | `growth` | no | no | 03 → 04 | Mid-growth settlement. |
| `04_developed_city_dome_clean.png` | `warning` | no | no | 03 → 04 | Fully developed city and active dome. |
| `05_raid_before_intact_dome.png` | `warning` | no | no | 05 → 06 | Intact dome before the raid. |
| `06_raid_aftermath_damaged_city.png` | `raid` | no | no | 05 → 06 | Breached dome, smoke, and one damaged home. |
| `07_destroyed_homes_clean.png` | `rebuild` | no | no | 07 → 08 | Damaged neighborhood before shared labor completes. |
| `08_rebuilt_city_sunrise_clean.png` | `dawn` | no | no | 07 → 08 | Restored city at sunrise. |

## Real UI Clips

| Files | Scene key | Seconds | UI | Cursor | What to record |
|---|---|---:|---:|---:|---|
| `09_splash_enter_city.mp4` | production splash | 3–4 | yes | yes | Real splash, Enter City, and transition. |
| `10_role_selection_overview.mp4`, `11_select_engineer_role.mp4` | `roles` | 4, 3 | yes | yes | Six real roles, then Engineer selected. |
| `12_daily_actions_ui.mp4`, `13_add_labor_action.mp4`, `14_first_player_house.mp4` | `contribute` | 3, 4, 4 | yes | yes | Actions, Add Labor, and first-house confirmation. |
| `15_city_growth_progression.mp4` | `growth` | 6–8 | no | no | Camp through developed city. |
| `16_crisis_vote.mp4`, `17_council_strategy.mp4`, `18_marked_pledge.mp4`, `19_chatter_hub.mp4` | `decide` | 4, 3, 4, 4 | yes | yes | Real choice controls and existing Chatter content. |
| `20_raid_countdown_warning.mp4` | `warning` | 4–5 | yes | no | Raid watch and dome readiness. |
| `21_dome_first_impact.mp4`, `22_dome_breached.mp4`, `23_housing_impact.mp4` | `raid` | 3, 4, 3–4 | no | no | Projectile, dome ripple, breach, then house impact. |
| `24_raid_aftermath_ui.mp4`, `25_destroyed_owned_house.mp4`, `26_shared_rebuild_labor.mp4`, `27_house_rebuild_normal.mp4`, `27_house_rebuild_2x.mp4` | `rebuild` | 3, 3, 4, 5–6, 3 | yes/no | no | Aftermath, owner identity, labor, then rebuild at normal/2×. |
| `28_daily_puzzle_opening.mp4`, `29_puzzle_solving.mp4`, `30_puzzle_completed.mp4` | `puzzle` | 3, 5–6, 4 | yes | yes | Real grid, intentional rotations, and `+3 STANDING`. |
| `31_dawn_report_open.mp4`, `32_dawn_report_results.mp4` | `dawn` | 2, 5 | yes | yes | Report open and deterministic result lines. |
| `33_world_view.mp4`, `34_leaderboard.mp4` | `dawn` | 2–3, 2–3 | yes | yes | Clearly local showcase World/TOP snapshots. |
| `35_final_city_hero.mp4` | `dawn` | 5 | no | no | Restored sunrise city. |
| `36_final_end_card.mp4` | `end` | 4 | no | no | Recording-branch-only final card. |

## Known Limits

- The capture director supplies local deterministic state. It does not replace
  production APIs or prove real Reddit persistence.
- Use actual gameplay recordings for roles, decisions, puzzle, report, and
  Chatter. Do not submit a real Chatter post outside the private test subreddit.
- Use the clean frame pairs only as external image-to-video references. Do not
  place AI-generated footage inside the game or label it as live gameplay.
