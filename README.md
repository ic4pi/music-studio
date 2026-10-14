# Music Studio

Two browser tools for producers. Everything runs in the browser except the optional AI coach.

| Tab | What it does |
|---|---|
| **MIDI Humanizer** (`/`) | Load `.mid`, `.mp3` or `.wav` (audio is transcribed to MIDI in-browser). Humanize timing, velocity, swing, note length, ghost notes, chord roll and strum. Piano roll shows original vs humanized, A/B playback, export `.mid`. |
| **Mastering Coach** (`/master.html`) | Load audio, describe your music. Measures loudness (BS.1770), spectrum and stereo; maps your description to a genre target; renders a 6-stage chain (HPF, EQ, 3-band comp, saturation, M/S width, limiter); level-matched A/B, 3-style compare, step-by-step teach mode, WAV + recipe export. |

The **AI coach** buttons call `/api/coach`, which sends only measured numbers to an OpenRouter model and returns an explanation plus a "do it by hand in your DAW" lesson.

## Deploy (Vercel)

1. Import the repo into Vercel. No build step.
2. Set `OPENROUTER_API_KEY`.
3. Optional: `MUSIC_COACH_MODEL` (default `anthropic/claude-haiku-4.5`; `anthropic/claude-sonnet-4.5` for richer teaching text).

Without the key everything works except the two coach buttons.

## Develop

```
npm test        # DSP, transcription, MIDI round-trip, and /api/coach checks (no dependencies)
npm run dev     # vercel dev
```

## Limits

- Audio → MIDI covers drums (kick/snare/hat), one bass line and one melody line. Chords are not transcribed. Audio over 3 minutes is rejected (mastering: 6 minutes).
- Genre targets in `GENRES` (`public/master.js`) are starting points, not standards.
- The limiter is a compressor plus safety clip, not a true-peak limiter. WAV export is 16-bit, no dither.
