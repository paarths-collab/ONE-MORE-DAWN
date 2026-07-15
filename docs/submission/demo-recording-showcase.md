# Demo Recording Showcase

This branch contains a localhost-only, deterministic 88-second guided story reel. It
uses the real Three.js city, raid cinematic, reconstruction, puzzle, Dawn Report,
music, and sound systems. It does not change the production Devvit experience.

## Start

```bash
npm run demo:record
```

Open `http://127.0.0.1:4670/?showcase=1` at 1920×1080. It opens paused on a
clean Camp frame: no HUD, caption, director, cursor prompt, or browser UI should
be in a cinematic screenshot. Use `?scene=<key>` to load a specific deterministic
capture state. Add `&autoplay=1` only when recording a continuous rehearsal.

## Story sequence

| Time | Scene | What the viewer learns |
|---:|---|---|
| 0–4s | Title | One More Dawn and Enter the City. |
| 4–10s | Camp | A shared city begins with nothing. |
| 10–17s | Role | The real six-role picker selects Guard. |
| 17–25s | First contribution | Labor moves; a permanent house appears. |
| 25–33s | Growth | The city rises through its real unlock sequence. |
| 33–43s | Community choices | Crisis, Council, The Marked, and Reddit discussion. |
| 43–48s | Raid warning | The city prepares its six dome panels. |
| 48–59s | Dome breach | Fireballs hit the dome before the breach result appears. |
| 59–68s | Rebuild | A damaged named home becomes shared labor, then stands again. |
| 68–77s | Daily puzzle | The real conduit board is solved tile-by-tile and awards +3 standing. |
| 77–83s | Dawn Report | The city records what was built, lost, and saved. |
| 83–88s | End card | A recording-only launch card closes the reel. |

## Capture controls

- `Space`: play or pause
- `Left` / `Right`: previous or next scene
- `Home`: restart
- `R`: replay from the beginning
- `C`: hide or restore the cursor
- `D`: reveal or hide the recording controls
- `H`: hide or restore the director caption layer

When the controls are visible, choose `0.5×`, `1×`, or `2×` playback, or jump
straight to any named state. The controls and caption layer remain hidden by
default, so only the Three.js scene is captured.

## Scene URLs

- `?showcase=1&scene=camp`
- `?showcase=1&scene=roles`
- `?showcase=1&scene=contribute`
- `?showcase=1&scene=growth`
- `?showcase=1&scene=decide`
- `?showcase=1&scene=warning`
- `?showcase=1&scene=raid`
- `?showcase=1&scene=rebuild`
- `?showcase=1&scene=puzzle`
- `?showcase=1&scene=dawn`
- `?showcase=1&scene=end`

`opening` and `end` are capture-only title-card states. Do not use them over
gameplay footage. The main video should cut between clean cinematic city frames
and short recordings of the real product UI.

The capture starts with no director strip or lower-third, so the city stays
unobstructed. Press `D` only while setting up a shot, then press `H` to hide
the controls and captions again before recording.

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
