# Tokenloom 30s showcase — source

Rendered with the `kinetic-cut-video` skill from [claude-motion-skills](https://github.com/wmzspace/claude-motion-skills) (MIT, see `LICENSE-claude-motion-skills`).
`engine.js` and `audio_lib.py` come from that repo. `index.html` (shots), `audio.py` (soundtrack) and `storyboard.md` are specific to this video.

To re-render, you need `scripts/build.py` and `scripts/render.mjs` from that repo, plus node with Playwright (Chromium), ffmpeg, and python3 with numpy:

```bash
python3 <skill>/scripts/build.py . stills      # contact sheet
python3 <skill>/scripts/build.py . preview     # 12 fps draft + qa_report.txt
python3 <skill>/scripts/build.py . render      # 1080p60 → out.mp4
```
Fonts: Inter (registered as "Inter 18pt"), Kanit, and JetBrains Mono must be installed locally.
