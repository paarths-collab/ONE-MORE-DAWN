# Documentation Guide

Use the documents below according to their purpose. This prevents early plans
and audit snapshots from being mistaken for the current game.

## Current, player-facing sources of truth

- [`../README.md`](../README.md) explains the game, how a subreddit gets a city,
  the player journey, the judge tour, and local development.
- [`V1_SCOPE.md`](V1_SCOPE.md) is the frozen V1 feature contract. It defines what
  is included, deliberately hidden, or deferred.
- [`submission/devpost.md`](submission/devpost.md) is the copy-paste Devpost
  submission.
- [`submission/video-script.md`](submission/video-script.md) is the current
  short demo-video plan.
- [`audit/private-subreddit-v1-smoke.md`](audit/private-subreddit-v1-smoke.md)
  is the human-only real-Reddit release gate.

## Engineering references

- [`game/scenario-bible.md`](game/scenario-bible.md) and
  [`game/scenario-matrix.md`](game/scenario-matrix.md) preserve detailed
  engineering scenarios from prior iterations. Validate any implementation claim
  against the current source and `V1_SCOPE.md` before using it in player copy.
- [`ATTRIBUTION.md`](ATTRIBUTION.md) records the assets actually shipped.
- [`audit/`](audit/) contains time-stamped audit evidence and accepted risks. It
  is not marketing copy.

## Historical design records

Files under [`superpowers/`](superpowers/) and the older design/asset briefs are
kept for design provenance. They may describe prototypes, proposed systems, or
removed Phaser work. They are not launch commitments. The current implementation
is Three.js + React, and the live V1 surface has no playable expedition or
scavenge minigame.
