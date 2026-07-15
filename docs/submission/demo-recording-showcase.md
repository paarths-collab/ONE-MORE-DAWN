# Demo Recording Showcase

This branch contains a localhost-only, deterministic 70-second guided story reel. It
uses the real Three.js city, raid cinematic, reconstruction, puzzle, Dawn Report,
music, and sound systems. It does not change the production Devvit experience.

## Start

```bash
npm run demo:record
```

Open `http://127.0.0.1:4670/?showcase=1` at 1280×720 or 1920×1080. The reel
begins as soon as the city has loaded. Browsers may require the first tap before
they allow audio; the aggressive raid track starts automatically once permitted.

## Story sequence

| Time | Scene | What the viewer learns |
|---:|---|---|
| 0–6s | The first camp | One subreddit shares one city and one consequence loop. |
| 6–16s | The city rises | Accepted actions fill a communal build meter and create permanent houses. |
| 16–24s | Shield reserve | Accepted actions feed the reserve; daily challenges charge one of six panels. |
| 24–37s | Raid at the gate | Fireballs hit exact dome panels; weak panels can be pierced. |
| 37–44s | Consequences | Lost souls, a damaged named home, and the rebuild queue remain. |
| 44–51s | Rebuild together | Community labor restores the neighbor's house without changing ownership. |
| 51–61s | Daily puzzle | The real conduit board is solved tile-by-tile and awards +3 standing. |
| 61–70s | One more dawn | The Dawn Report records the shared consequence and personal impact. |

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
