# Demo Recording Showcase

This branch contains a localhost-only, deterministic 50-second story reel. It
uses the real Three.js city, raid cinematic, reconstruction, puzzle, Dawn Report,
music, and sound systems. It does not change the production Devvit experience.

## Start

```bash
npm run demo:record
```

Open `http://127.0.0.1:4670/?showcase=1` at 1280×720 or 1920×1080. Press
**START DEMO** once; that user gesture enables music and sound.

## Story sequence

| Time | Scene | What the viewer learns |
|---:|---|---|
| 0–4s | The first camp | Every subreddit starts with one shared settlement. |
| 4–11s | The city rises | Contributions raise civic buildings and one house per Redditor. |
| 11–16s | Shield reserve | Daily participation charges six defensive shield segments. |
| 16–26s | Raid at the gate | Fireballs hit the dome; weak segments can be pierced. |
| 26–31s | Consequences | Lost souls, a damaged named home, and the rebuild queue remain. |
| 31–36s | Rebuild together | Community labor restores the neighbor's house without changing ownership. |
| 36–43s | Daily puzzle | Reconnecting the circuit restores the weakest shield segment. |
| 43–50s | One more dawn | The Dawn Report records the shared consequence and personal impact. |

## Director controls

- `Space`: play or pause
- `Left` / `Right`: previous or next scene
- `Home`: restart
- `D`: toggle clean capture mode

The top director strip also provides the same controls. Use the final round
button to hide that strip before recording; the cinematic lower-third remains.

## Recording notes

- Capture the game viewport only, not browser chrome.
- Keep system scaling at 100% so text and the Three.js frame stay crisp.
- Record at 60 fps when available.
- Let the sequence run once before the final take so every GLB and audio file is cached.
- Do not present this localhost reel as a separate game mode. It is an edited,
  deterministic view of features that exist in the submitted build.
