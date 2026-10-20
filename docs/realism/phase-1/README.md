# Phase 1 — lighting and render foundation

Implemented: HDR-derived sun direction; texel-snapped camera-fitted shadows; five-ray static vertex AO on tablet; SMAA on desktop and MSAA + FXAA on tablet; neutral generated LUT; night-only high-threshold bloom; exponential aerial haze; reflective shared physical glass; environment/texture disposal; offline HDR and attribution embedding.

Existing tree and truck geometry now has distance detail levels; desktop scan texture capped at 2K WebP and tablet at 1K. No site, traffic, rail, deck, or vehicle footprint constants changed.

## Checks

- Original 95 tests + 4 lighting/AO/memory regression tests: pass.
- `npm run build`: pass.
- `npm run build:tablet`: pass (baseline failed on ATTRIBUTION.md).
- Browser: no WebGL shader errors in day views. Eight fixed before/after cameras for both profiles.

## Measurements and acceptance

1280 × 720 CSS viewport in the Codex in-app browser. Counts include all render passes and shadows. FPS is a short static-camera sample, not a certified M1/M2 1440p orbit or physical-tablet benchmark. Texture storage is an estimate including render targets, depth and multisampling; it is not driver-reported VRAM. Initial baseline FPS labels can span camera transitions; triangle/draw counts were sampled after the named camera rendered. After measurements reset the sample window at each camera.

| Profile | Camera | FPS | Triangles | Draws | Texture MiB (est.) |
|---|---:|---:|---:|---:|---:|
| desktop | 1 | 32 | 8,074,005 | 490 | 364.4 |
| desktop | 2 | 57 | 6,227,490 | 187 | 364.4 |
| desktop | 3 | 54 | 6,765,442 | 198 | 364.4 |
| desktop | 4 | 61 | 3,872,169 | 192 | 364.4 |
| desktop | 5 | 56 | 1,160,830 | 114 | 364.4 |
| desktop | 6 | 48 | 7,964,025 | 218 | 364.4 |
| desktop | 7 | 39 | 8,908,456 | 233 | 364.4 |
| desktop | 8 | 59 | 4,451,211 | 152 | 364.4 |
| tablet | 1 | 60 | 1,819,912 | 242 | 257.0 |
| tablet | 2 | 61 | 564,779 | 80 | 257.0 |
| tablet | 3 | 61 | 813,661 | 96 | 257.0 |
| tablet | 4 | 61 | 415,826 | 84 | 257.0 |
| tablet | 5 | 61 | 162,141 | 25 | 257.0 |
| tablet | 6 | 61 | 538,768 | 51 | 257.0 |
| tablet | 7 | 61 | 1,405,055 | 107 | 257.0 |
| tablet | 8 | 61 | 464,974 | 57 | 257.0 |

**Performance acceptance remains open:** some wide/interior views exceed the requested triangle and FPS budgets. These results must not be represented as passing the plan’s hardware acceptance. Tablet architectural shadows are cached; moving objects retain the existing no-shadow policy. The static AO bake deliberately excludes movable/cutaway assemblies so hidden roofs cannot leave baked shadows.

Normal maps remain disabled. Exact near-view shadow footprint is 2.34 cm at 4096 or 4.69 cm at 2048; overview coverage necessarily uses larger texels. The camera fit follows the orbit target and covers the plant views; it is not a whole-world shadow guarantee at horizon-facing angles.
