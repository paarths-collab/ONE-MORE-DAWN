# Demo Recording Showcase

This branch contains a localhost-only, deterministic 85-second guided story reel. It
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
| 0–8s | The first camp | One subreddit shares one city and one consequence loop. |
| 8–20s | The city rises | Accepted actions fill a communal build meter and create permanent houses. |
| 20–30s | Shield reserve | Accepted actions feed the reserve; daily challenges charge one of six panels. |
| 30–45s | Raid at the gate | Fireballs hit exact dome panels; weak panels can be pierced. |
| 45–54s | Consequences | Lost souls, a damaged named home, and the rebuild queue remain. |
| 54–63s | Rebuild together | Community labor restores the neighbor's house without changing ownership. |
| 63–75s | Daily puzzle | The real conduit board is solved tile-by-tile and awards +3 standing. |
| 75–85s | One more dawn | The Dawn Report records the shared consequence and personal impact. |

## Director controls

- `Space`: play or pause
- `Left` / `Right`: previous or next scene
- `Home`: restart
- `D`: reveal or hide the director controls

The recording starts with no director strip, so the city stays unobstructed.
Press `D` only when you need the on-screen edit controls; the cinematic
lower-third remains.

## Recording notes

- Capture the game viewport only, not browser chrome.
- Keep system scaling at 100% so text and the Three.js frame stay crisp.
- Record at 60 fps when available.
- Let the sequence run once before the final take so every GLB and audio file is cached.
- Do not present this localhost reel as a separate game mode. It is an edited,
  deterministic view of features that exist in the submitted build.
- Do not describe the puzzle as a shield repair. The daily puzzle reconnects a
  district and awards standing; accepted actions and completed daily challenges
  reinforce the dome.
