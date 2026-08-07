# Audio waveform POC

Standalone proof-of-concept for a Box-style MP3 player with a **static peaks** waveform scrubber.

- Web Audio API (`OfflineAudioContext` / `decodeAudioData`) — **no WaveSurfer**
- Vanilla HTML / CSS / JS (ES modules) — **no build step**
- Default track is synthesized in the browser; optional file picker for a real MP3

## Run

From this directory:

```bash
npx --yes serve .
```

Or:

```bash
python3 -m http.server 5173
```

Open the printed localhost URL (ES modules need HTTP, not `file://`).

## Try it

1. Page loads → mock ~20s audio peaks appear.
2. Play / pause, scrub the waveform, adjust volume.
3. Zoom into the track (see below) to inspect detail.
4. Optionally choose a local MP3/WAV via **Try a real audio file**.
5. **Reset to mock audio** restores the synthesized track.

## Zoom

Zoom levels run 1x through 64x. Peaks are **recomputed from the decoded samples** for the
visible window, so zooming reveals real detail instead of stretching the same bars.

| Action | Input |
|--------|-------|
| Zoom in / out | Scroll on the waveform, `+` / `−` keys, or the zoom buttons |
| Reset to 1x | Click the zoom level readout, or press `0` |
| Pan | Horizontal scroll, or `Shift` + `←` / `→` |
| Seek | Click / drag the waveform, or `←` / `→` (step scales with zoom) |

While zoomed, the visible range is shown between the time labels, a playhead line is drawn,
and the window auto-follows playback. Amplitudes stay normalized against the whole track,
so quiet passages still look quiet when zoomed.

## Files

| File | Role |
|------|------|
| `index.html` | Player chrome + picker |
| `styles.css` | Box-like dark 360px controls |
| `waveform.js` | `computePeaks` (range-aware), canvas draw, scrubbing |
| `mockAudio.js` | Synthesize buffer + WAV encode |
| `app.js` | Wiring |

Peak helpers in `waveform.js` are intentionally portable for a later `MP3Viewer` integration.
