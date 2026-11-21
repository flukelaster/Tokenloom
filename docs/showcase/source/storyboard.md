# Tokenloom · DS Forge — 30s how-to showcase (storyboard)

## Brief (brief.py seed 4207) and how each axis lands on this subject

| Axis | Drawn | Used | Why |
|---|---|---|---|
| Art style | Minimal monochrome | Kept as discipline: navy ink + one blue accent per shot. Full-frame colour breaks use the product's own palette: violet (Propstar, SM radius, 183 variants), amber (FULL radius), green (10/10 quality gate) | Matches the product UI; the breaks were added after QA flagged a single hue |
| Palette | Low-saturation earth | **Overridden** → product's own tokens: ink #090C16, paper #F4F4F6, primary #2563EB, dark-mode primary #60A5FA, Propstar #8A38F5 / #7B61FF, Figma selection #0D99FF, redline #F24822 | The video sells a design-token tool; its identity *is* those tokens. Earth tones would read as another brand, and the user asked for "fun" |
| Type | Ultra-bold sans | Inter Black (Latin), Kanit Black (Thai), JetBrains Mono (code/labels) | Inter + Thai fallback is literally the plugin's default font preset |
| Rhythm | Fast–slow breathing | Kept: 2/3/4/5-beat shots, half-beat strobe inside S07 and 1-beat strobe in S10 | |
| BPM | 110 half-time | Kept (B = 0.5455 s, 55 beats = 30.0 s) | |
| Music | Ambient bed + impacts | **Partly overridden**: ambient pad only in intro/outro; body is playful pentatonic pluck + half-time groove + UI ticks | User asked for สนุก (fun) |
| Mode | Pentatonic | A major pentatonic, I–vi–IV–V (A, F#m, D, E) | Bright, playful |
| Camera | Locked-off + hard cut | Kept; plus slow drift as secondary motion | |
| Transitions | Zoom-through | Fabric → title (S02→S03), Generate button → blue flood (S09→S10) | |
| Post | Clean, no CA | caBase 0, caHit 0, flash .12 | UI must stay crisp |
| Copy tone | Speak in numbers | 1 color → 113 variables, 21 pages, 15 components, 183 variants, 3 tiers, 2 modes, 10/10, 0 network | Numbers from `fixtures/canonical-shadcn-summary.json` (current working tree) |
| Opening | Black + sound first | Pluck + sub on black, thread whips in at 0.27 s | |
| Ending | Timecode to zero | "network requests 3-2-1-0" → the 0 becomes the "o" of Tokenloom; timecode counts 00:30 → 00:00 | `networkAccess: ["none"]` |
| Decoration | Engineering annotation | Figma redlines (#F24822 measurement + label pill) and Figma selection boxes (#0D99FF handles) | Native to the subject: it's a Figma tool |

## Motifs (subject-specific)
1. **Thread / loom (main line)** — Tokenloom weaves tokens; a thread opens the film, weaves into fabric, becomes the VARIABLE_ALIAS links, connects diff rows, and the end wordmark.
2. Color dot → OKLCH 11-step ramp (50…950)
3. Figma menus: Plugins › Development › Import plugin from manifest…
4. Library catalog cards with ✓ Ready / ◆ Beta badges (text names only, no third-party logos)
5. Corner radius presets NONE / SM / LG / FULL
6. Namespace input + EN / TH docs toggle (Button ↔ ปุ่ม)
7. "Generate design system" button + footer counts
8. 3 tiers: Primitives → Semantic → Component
9. Light / Dark modes (#2563EB vs #60A5FA)
10. Propstar 2D matrix: violet dashed brackets, Size × State
11. Three-way diff: baseline / live Figma / next → Keep · Replace · Skip
12. 10-category quality gate (tokens, bindings, themes, components, docs, pages, idempotency, contrast, fonts, license)
13. Figma redlines + selection handles (decoration)
14. Product app icon (gradient square + sparkle)

## Shot table (B = 60/110 s)

| # | Beats | Time | Picture | Motif | Technique | Composition | Text entrance | Value / hue | Copy | Into next |
|---|---|---|---|---|---|---|---|---|---|---|
| 01 | 3 | 0.00–1.64 | Black; thread whips across, a blue dot lands, warp threads drop | thread, dot | new: `thr` glow thread + spring dot + ripple | centre object, text below | per-letter drop | dark / blue | "1 color in." | warp threads → fabric |
| 02 | 3 | 1.64–3.27 | Woven fabric fills frame, counter 1→113, then zoom-through | thread/fabric | new: `weave` over/under | full-bleed + giant number | counter roll | dark, multi-blue | "113 variables out." | zoom through fabric |
| 03 | 5 | 3.27–6.00 | App icon + "Tokenloom" wordmark woven from alternating strips; redline measures it; chips | loom, icon, redline | new: strip-weave mask | centred, big whitespace | woven strips + tracking | dark | Tokenloom / DS Forge | hard cut |
| 04 | 4 | 6.00–8.18 | Figma menus cascade, cursor clicks Import, manifest.json chip + toast | Figma menu | new: `menu`, `cursor`, keyframed path | left text / right UI | mask wipe | dark surface | "Import manifest.json" / นำเข้าปลั๊กอิน | hard cut |
| 05 | 5 | 8.18–10.91 | 4 library cards flip in, selection hops on beats, lands on shadcn/ui with selection handles | catalog, selection | new: card flip + `selBox` | header top + 2×2 grid | slide-up | dark, green badges | "Pick a library" / เลือกไลบรารี | dot carries over |
| 06 | 4 | 10.91–13.09 | Hex typed, dot explodes into 11-step ramp; Light/Dark tags | dot → ramp | new: swatch explosion | top/bottom split | typed | dark + bright ramp | "#2563EB" | hard cut |
| 07 | 2 | 13.09–14.18 | Radius strobe: NONE / SM / LG / FULL, full-frame paper / violet / blue / amber | radius preset | new: radius spring strobe | full-frame, cropped outline word | slam | **paper / violet / blue / amber** | Corner radius | hard cut |
| 08 | 3 | 14.18–15.82 | Form: namespace "Acme" typed, EN→TH toggle; giant Button flips to ปุ่ม | scope, bilingual | new: segmented + flip | left form / right word | typed + flip | dark | "Scope & output" | hard cut |
| 09 | 2 | 15.82–16.91 | Cursor clicks Generate; button zooms through to fill frame | generate button | new: zoom-through | centred | — | dark → **blue flood** | "Generate design system" | match: blue fills frame |
| 10 | 4 | 16.91–19.09 | **Climax**: one number per beat, giant & cropped, over moving threads | counts | new: number strobe | full-bleed cropped | slam | **blue / deep / violet / blue** (breaks system) | 21 pages · 15 components · 183 variants · 113 variables | hard cut |
| 11 | 4 | 19.09–21.27 | 3 tier cards on a diagonal, alias threads draw; change propagates as a pulse | 3 tiers, thread | new: alias thread + pulse | diagonal | slide | dark, blue→violet | "3 tiers." | hard cut |
| 12 | 3 | 21.27–22.91 | Split screen wipe: Light vs Dark of the same UI | modes | new: split divider | vertical split | slam + slide | **half paper / half ink** | "Light / Dark" | hard cut |
| 13 | 4 | 22.91–25.09 | Propstar matrix on paper: violet brackets draw, 12 buttons pop, trailing icon toggles | Propstar | new: bracket draw + cell pop | grid | pop | **paper**, violet | "Button · Propstar 2D Matrix" | hard cut |
| 14 | 3 | 25.09–26.73 | baseline / live / next columns threaded together, merge into one with statuses | 3-way diff, thread | new: column merge | triptych → single column | slide | dark, green/blue/amber | "Day 2. Update safely." | hard cut |
| 15 | 2 | 26.73–27.82 | 10 categories tick, counter 0→10/10 | quality gate | new: chip grid tick | centred stack | counter | dark, green | "10/10" | hard cut |
| 16 | 4 | 27.82–30.00 | network requests 3-2-1-0 → 0 becomes the "o" in Tokenloom; repo URL; timecode → 00:00 | network none, loom | new: digit-to-letter morph | centred, whitespace | countdown + typed | dark | Tokenloom · github.com/flukelaster/Tokenloom | fade out |

Durations: 3,3,5,4,5,4,2,3,2,4,4,3,4,3,2,4 beats = 55. S07 is cut as 4 half-beat shots and S10 as 4 one-beat shots (22 shots in all). Brightest moments: S07, S10, S12, S13.

## Reuse of FX.*
None of the `FX.*` recipes are used. Every shot is drawn with new helpers (`thr`, `weave`, `menu`, `cursor`, `selBox`, `redline`, `card`, ramp explosion, `tier`, split, matrix, diff merge) built from `drawOn / stg / word / T / layer` primitives. No `FX.star`, and no third-party logos (library names as text only).

## Reskin test (storyboard stage)
Swap "Tokenloom" for an unrelated subject (say a coffee brand): S01 (color dot → token) would hold weakly. S02 (variables counter) fails, and so does every step from S03 through S16, because they all depend on Figma menus, tokens, ramps, radius presets, modes, Propstar, the diff or the quality gate. That leaves 1/16 shots generic, under the 1/3 limit.

## QA iterations
1. First preview: 4 distinct shot lengths, static stretches in 01/03/12/13, and every shot on one hue (~224°).
   - Cut the strobes as real shots.
   - Added late events: a light sweep, a divider drag and a hopping selection box.
   - Added the product's violet, amber and green as full-frame moments.
2. Second preview: 03 and 11 still read as static, because their motion was small-area. Fixed with a wider sweep, violet card flashes, bigger bursts and the headline recolouring.
3. Third preview: no warnings. Audio transients present at all 23 cuts and hits.
4. Full-res review of the encode:
   - The end-card light sweep ghosted on kerned letters. It is now drawn per glyph.
   - The `docs.locale` label is replaced with the real key, `config.locale`.
   - A made-up "H 40" spec label became "Hug".
   - Added `pnpm install && pnpm build` to the Import shot, since `dist/` is git-ignored.
   - The Generate sparkle no longer rotates; at 45° it read as "✕".

Reskin test was done at storyboard stage only; the final cut was checked by eye against the motif list.
