# Phase 2 — material library and restored trees

The shared material factory now provides 22 clean PBR recipes, metre-scale triplanar mapping on horizontal and vertical faces, shared albedo/roughness textures, reflective physical glass, and small rounded edges on eligible machine/vehicle/trim boxes. `?materials=1` previews every recipe on a sphere and a one-metre box. Uniform metalness uses scalar parameters; projected normal maps remain disabled until a correct TBN is implemented. No cracks, rust or stains are introduced.

The user's visual correction takes priority over tree LOD optimization: `vegetation.js` is restored exactly to variant A (`c8c4cad`). The full irregular branches and needle sprays remain at every distance in each profile. Cone substitutes and their LOD switching are removed. Spatial instancing remains; tree positions and clearance rules are unchanged. The existing truck scan still has distance detail levels.

The render path also avoids redundant shadow updates during N8AO transparency passes, bounds render-target resolution on large displays, and adapts resolution on both profiles. Subpixel fasteners/rim beads receive lighting but skip shadow casting. Structural posts and tyre silhouettes retain shadows. These changes reduce some rendering costs but do not satisfy the full performance budget.

## Validation

- `npm test`: 104 passed, zero failures (all original 95 plus 9 regression tests).
- `npm run build`: passed.
- `npm run build:tablet`: passed; one HTML, 16.5 MiB, 33 embedded assets.
- Built standalone tablet page rendered through a local HTTP server with embedded HDR and cab; day/night controls worked. This is not a physical-device or airplane-mode certification.
- Browser checks: no WebGL shader errors across the desktop/tablet fixed views, day/night views, or all 22 material previews.
- `siteLayout.js`, `trafficLayout.js`, `railLayout.js`: unchanged from variant A. Existing footprint and animation tests pass.
- The batching test now derives expected vertex/index counts from the source geometry, because default eligible boxes have bevels rather than six flat faces. It still verifies merging both geometries and their bounds.

## Evidence

`before/` preserves the phase-1 result, including its now-rejected simplified tree LODs. `after/` contains the restored trees and final material/render changes from the same eight cameras in both profiles, plus night and standalone-tablet screenshots. `materials/` contains all 22 previews. Raw final counters are in `after/metrics.json`.

Measurements: 1280 × 720 CSS viewport, Codex in-app browser, ANGLE Metal on Apple M5 Pro. Static review cameras freeze the simulation and wait two one-second sample windows after each camera change. GPU counts include all passes and shadows. Rendering adapted to approximately 0.70× desktop and 0.69–0.74× tablet resolution; these are not native-1440p measurements. Texture storage includes estimated render targets/depth/MSAA; it is not driver-reported VRAM. Short FPS samples vary with load.

| Profile | Camera | FPS | Triangles | Draws | Texture MiB (estimated) |
|---|---:|---:|---:|---:|---:|
| desktop | 1 | 18 | 21,279,502 | 581 | 297.4 |
| desktop | 2 | 43 | 5,544,593 | 251 | 297.4 |
| desktop | 3 | 31 | 9,321,373 | 246 | 297.4 |
| desktop | 4 | 58 | 3,862,432 | 246 | 297.4 |
| desktop | 5 | 60 | 1,427,357 | 147 | 297.4 |
| desktop | 6 | 38 | 9,546,500 | 236 | 297.4 |
| desktop | 7 | 25 | 8,099,605 | 263 | 297.4 |
| desktop | 8 | 46 | 7,932,798 | 197 | 297.4 |
| tablet | 1 | 29 | 3,369,780 | 310 | 188.3 |
| tablet | 2 | 60 | 764,573 | 109 | 188.3 |
| tablet | 3 | 60 | 1,054,719 | 130 | 188.3 |
| tablet | 4 | 60 | 442,040 | 109 | 188.3 |
| tablet | 5 | 60 | 155,011 | 36 | 195.3 |
| tablet | 6 | 60 | 669,134 | 73 | 195.3 |
| tablet | 7 | 42 | 1,659,651 | 148 | 195.3 |
| tablet | 8 | 60 | 560,696 | 80 | 195.3 |

**Acceptance is incomplete.** Several desktop views exceed 6 M triangles and fall below 50 FPS; tablet views 1 and 7 exceed 1.5 M triangles, and view 1 falls below 30 FPS. Draw counts and estimated texture storage fit the limits in these samples. Restoring the original trees increases the wide-view load substantially. Do not reintroduce cone substitutes to meet budgets. Further optimization must preserve the approved tree silhouette, and still needs M1/M2 1440p orbit and real-tablet measurements.

Phase-1 limits also remain: tablet moving assemblies retain the existing no-shadow policy; the static AO bake excludes movable/cutaway assemblies; fitted shadow coverage follows plant views rather than guaranteeing every horizon-facing view. Phases 3–8 are not implemented by this change.
