# Ak Bulut plant — photorealism plan (for Codex)

> **Özet (TR):** Bu dosya, web tabanlı 3D zavod sahnesini "oyun gibi" görünümden
> AutoCAD/3ds Max render kalitesine yaklaştırmak için adım adım iş planıdır.
> Sıra: ışık ve render → malzeme kütüphanesi → araçlar → üretim makineleri ve boru
> hatları → binalar → peyzaj → insanlar → fotogerçekçi "render al" modu.
> Her aşama ayrı commit, her aşamada testler geçmeli ve tablet sürümü çalışmalı.

---

## 0. Context and ground rules

### What the project is
- Vite + React + three.js (r181) single-page app: `src/PlantScene.jsx` builds the
  scene; almost all geometry is procedural, in `src/industrial/*.js`.
- Units are **metres**, Y up. World layout constants live in
  `src/industrial/siteLayout.js`, `trafficLayout.js`, `railLayout.js`. **Do not move
  buildings, roads, the rail, the loading deck or vehicle routes** — the motion tests
  depend on them.
- `src/industrial/kit.js` is the geometry/material toolkit (`box`, `cyl`, `rod`,
  `pipe`, `group`, `material(color,metalness,roughness,opts)` with a cache,
  `k.m.*` shared materials, `k.optimize()` batching, `k.tablet` flag). Static meshes
  are merged/batched after build; anything that moves must be created with the
  `dynamic`/`moving` flag the existing code already uses.
- Tablet build: `VITE_RENDER_PROFILE=tablet` (`npm run dev:tablet`,
  `npm run build:tablet`). Tablet must stay smooth; desktop can be heavy.
- Tests: `npm test` (node:test, currently **95 passing**). They cover vehicle
  footprints, forklift/truck paths, clearances, batching, rail loading heights.
  Keep them green; only change a test when the geometry contract really changes,
  and say why in the commit.

### What already exists (variant A, branch `research/realistic-visuals`)
- `src/industrial/realism.js`
  - `loadSkyEnvironment()` — Poly Haven HDRI `public/env/sky_2k.hdr` as
    `scene.environment` and the day background.
  - `applyPhotographicSurfaces()` — world-space (top-down XZ) projected PBR detail on
    asphalt, concrete/paving, grass and roof sheet (`public/textures/pbr/*`). The
    photo is divided by its measured linear mean (`PHOTO_MEAN`) so each material keeps
    its own colour. Normal maps were removed on purpose (they brightened the ground).
- `src/industrial/renderPipeline.js` — `N8AOPass` (package `n8ao`) on desktop,
  FXAA, OutputPass. Tablet keeps the plain RenderPass.
- `PlantScene.jsx` — sun shadow map 4096 (desktop), day exposure .86,
  hemisphere .3, environment intensity .45.
- The plant is **brand new**: no cracks, rust, moss, stains or heavy wear anywhere.

### Rules for every phase
1. Work on branch `research/realistic-visuals` (or a child branch per phase). One
   phase = one or more focused commits.
2. `npm test` and `npm run build` must pass; run `npm run build:tablet` at the end of
   each phase.
3. Assets: only **CC0** or **CC BY** with attribution. Record every asset in
   `public/ATTRIBUTION.md` (name, author, URL, licence, changes). No vendor CAD
   files, no ripped game assets, no Sketchfab "Standard"/editorial-only licences.
4. Compress all glTF with `@gltf-transform` (already a dev dependency): meshopt or
   Draco, KTX2/WebP textures, texture size ≤ 2K desktop / ≤ 1K tablet. Put the
   conversion script in `scripts/` (see `scripts/prepare-truck.py` as precedent).
5. Keep a **before/after screenshot set** for every phase from fixed cameras
   (section 9) in `docs/realism/phase-N/`.
6. Performance budgets (measure with `renderer.info` and the in-app FPS):
   - Desktop (Apple M1/M2, 1440p): ≥ 50 fps while orbiting, ≤ 1,500 draw calls,
     ≤ 6 M triangles, ≤ 1 GB GPU texture memory.
   - Tablet: ≥ 30 fps, ≤ 600 draw calls, ≤ 1.5 M triangles, ≤ 256 MB textures.
   - Use LODs (`THREE.LOD`) and instancing for anything repeated more than 5 times.
7. Keep every animation hook working (section 4 lists them).

---

## 1. Lighting and render pipeline (finish variant A)

Goal: the light reads like a real midday photo — crisp sun shadows, soft sky fill,
correct contact darkening, no flat grey.

1. **Sun from the HDRI.** Find the brightest pixel direction of `sky_2k.hdr` once
   (script or at load) and place the `DirectionalLight` on that direction so shadows
   match the sky. Colour ~5600 K, intensity tuned with exposure.
2. **Shadows across the whole site.** Replace the single 320 m shadow frustum with
   `CSM` (`three/addons/csm/CSM.js`, 3 cascades desktop, 2 tablet) or a
   camera-fitted frustum that re-fits on camera move. Target: 2–5 cm texel near the
   camera. `shadow.normalBias≈.03`, PCF soft. Remove acne/peter-panning.
3. **AO.** Keep N8AO on desktop; tune per camera distance (radius 1.5–4 m,
   intensity 2–3.5, `distanceFalloff` 1). Add **baked AO** for static buildings on
   tablet (per-vertex AO computed once at load from a few ray samples) so tablets get
   contact shadows too.
4. **Anti-aliasing.** Swap FXAA for `SMAAPass` (desktop) or MSAA where available;
   AO requires the composer path, so test edge quality on roof seams and railings.
5. **Tone and colour.** Keep ACES/AgX (try `AgXToneMapping`), add a mild LUT
   (`LUTPass`) for a neutral architectural-render grade; very subtle bloom only on
   emissive lamps (`UnrealBloomPass`, threshold high). No vignette by default.
6. **Atmosphere.** Replace linear fog with height/aerial-perspective fog (custom fog
   chunk or `FogExp2` plus sky-coloured haze) so far hills fade like a photo.
7. **Night mode.** Keep working: background colour, lamp emissives, lower env.
8. **Glass and metal.** Glass → `MeshPhysicalMaterial` (transmission 0, low
   roughness, env reflections, slight blue tint); polished steel uses env reflections
   (metalness .9, roughness .25–.4). Check that `scene.environment` reaches them.

Acceptance: section-9 camera shots show crisp shadows under trucks, columns and
eaves; no shadow swimming while orbiting; tablet fps within budget.

---

## 2. Material library

Create `src/industrial/materials.js` and route all materials through it (keep
`kit.material()` as the factory so the cache and batching still work).

- Categories, each a PBR set (albedo, roughness, metalness, optional AO/normal):
  painted steel (RAL colours used in the scene), galvanised steel, stainless steel,
  aluminium, rubber, tyre, glass, sandwich-panel cladding (ribbed), trapezoid roof
  sheet, concrete (smooth/brushed), fresh asphalt, kerb stone, paving stone, grass,
  gravel/rail ballast, sand, timber pallet, cardboard/paper bags, plasterboard
  stacks, plastic.
- Mapping: extend `realism.js` projection to **triplanar box mapping** (world XZ/XY/
  ZY by normal) so walls and vertical faces of huge boxes get correct-scale detail,
  not stretched UVs. Keep the "divide by linear mean" trick so colours stay as set.
- Texel density: ~512 px/m for close objects (vehicles, machines), 128–256 px/m for
  ground/roofs. Tile sizes in metres must match real products (e.g. panel rib
  pitch 0.25 m, kerb 1 m, paving 0.6 m).
- New-plant look: clean surfaces, factory paint, crisp edges. At most very light
  dust near the raw-material yard and loader.
- Normal maps: re-introduce only with a correct TBN for projected/triplanar
  sampling, and verify they do not brighten the ground (earlier bug).
- Edge definition: use `RoundedBoxGeometry` (radius 1–3 cm) for visible boxes on
  machines, vehicles and building trims; hard 90° edges look "game-like".

Acceptance: no stretched textures on any wall/ground; a materials preview page or
test scene (`?materials=1`) showing every material on a sphere and a box.

---

## 3. Vehicles (variant B)

Replace procedural vehicles with real models while keeping the motion contracts.

| Vehicle | File today | Keep these hooks |
|---|---|---|
| Articulated truck (TIR) | `trucks.js` (`createTruckBuilder`, `TRUCK_LAYOUT`, `TRUCK_SCALE=.672`) | record `{g, hinge, ws, steering, cargo, updateLights, load}`; trailer pivots at `hinge`; wheels in `ws` with `userData.radius`; cargo pallet slots |
| Forklift | `forklift.js`, motion in `forkliftMotion.js` (`FORKLIFT_LAYOUT`) | `{g, ws, fork, mast, cargo, bagCargo, driver, update}`; mast/fork heights from `pose.height`, `pose.y` (deck height) |
| Locomotive + flat wagons | `rail.js`, `turkmenLocomotive.js`, `railLayout.js` (`scale:.72`, width kept 1:1 for the track gauge, `offsetX:10`) | wagon cargo slots (`RAIL_LAYOUT.cargoXs`, `deckHeight`), `railWheels`, train group moved by `train.position.x` |
| Incoming raw-material train | `rail.js`, `arrivalTrain.js` | `ARRIVAL_CAR_OFFSETS` spacing, wheel spin |
| Cars | `parkedCars.js` (`CAR_SCALE=.8`), `serviceTraffic.js` | `carRig.wheels`, steering pivots, wheelbase constant |
| Quarry hauler, loader, excavator | `quarryVehicles.js`, `quarryLayout.js` | bucket/boom poses used by tests |

Steps
1. Source models (CC0/CC BY): e.g. Poly Haven, Sketchfab (CC0/CC-BY filter),
   Kenney (CC0), Khronos samples. The existing MAN cab scan
   (`public/models/man-tractor-cab*.glb`, CC BY, see `public/models/ATTRIBUTION.txt`)
   stays; add a matching curtain-sider trailer.
2. For each model write a conversion script: scale to metres, orient +X forward,
   origin at the rear axle centre on the ground (as the procedural ones), split wheels
   into separate nodes `wheel_FL/FR/RL/RR…`, steering knuckles, forklift mast/carriage
   nodes. Three LODs (high/medium/low) + tablet variant.
3. Wrap the glTF in the **same builder API** so `logistics.js`, `journeyMotion.js`
   and tests do not change. Fallback to the procedural model if loading fails.
4. Re-measure footprints; if a real model is longer/wider, update
   `TRUCK_LAYOUT`/`FORKLIFT_LAYOUT` and the footprint helpers, then run the traffic
   tests (`src/traffic.test.js`, `src/journey.test.js`).
5. Paint: clearcoat car paint (`MeshPhysicalMaterial.clearcoat`), real tyre
   rubber, chrome only where real.

Acceptance: close-up of truck, forklift, locomotive, wagon and car reads as a real
product; all motion tests pass; tablet within budget (use the low LOD on tablet).

---

## 4. Production equipment and pipelines

Files: `archiveEquipment.js`, `equipmentModels.js`, `interiorEquipment.js`,
`processBuildingEquipment.js`, `palletizingCell.js`, `oldHallDetails.js`,
`equipmentConnections.js` (ports and `roundedConnection` pipes),
`conveyorTransfer.js`, `materialFlow.js`.

1. **Pipes and ducts** (`equipmentConnections.js`):
   - Real pipe anatomy: straight runs + standard elbows (1.5D radius), weld beads,
     flanges with bolt circles at every machine port and every ~6 m, gaskets,
     reducers where radii change, pipe shoes and supports to steel or racks every
     3–6 m, hangers from ceiling beams.
   - Colour by medium (keep one table, e.g. ISO 14726 / plant standard): dry powder
     (gypsum/stucco) light grey, air blue, water green, hot gas aluminium-clad
     insulation, dust extraction grey; flow-direction arrows and medium labels.
   - Insulated lines: aluminium jacket with overlap seams and bands.
   - Pipe racks and cable trays along walls/ceiling, connected, not floating.
2. **Machines**: for each machine type (hoppers, silos, screw conveyors, bucket
   elevators, mills, mixers, cyclones, filters, fans, bag fillers, palletiser,
   board line rollers/dryer/cutter) raise fidelity: rounded sheet-metal edges,
   stiffening ribs, bolted access doors, nameplates, motors with fins and terminal
   boxes, gearboxes, guards, ladders/platforms with toe-boards and grating texture,
   anchor bolts on concrete plinths. Factory paint RAL colours, galvanised grating.
   Optionally replace hero machines with CC-licensed industrial models if quality is
   higher and licence allows.
3. **Conveyors**: belt with texture and idlers every 1.2 m, return rollers, side
   guards, emergency pull-cord, drive drum with motor.
4. Keep every `machinePort` name, position and direction so pipe routing and tests
   remain valid. Use instancing for bolts, rollers, grating panels.

Acceptance: an interior close-up (section 9 cameras 6–7) reads like an engineering
render: every pipe ends at a flange, is supported, and has a medium colour.

---

## 5. Buildings

Files: `site.js`, `processingBuildings.js`, `gypsumReceivingHall.js`,
`oldCampus*.js`, `oldGardenPavilion.js`, `newFactoryEntrance.js`,
`productionEntrance.js`, `newFrontCourt.js`, `oldEntrance.js`.

- Walls: sandwich panels with visible vertical joints every 1 m and fastener rows;
  base plinth in concrete; corner trims; gutters and downpipes; louvres; roller
  doors with real slat profile; personnel doors with frames and handles.
- Windows: mullions, frame depth, glass reflection, interior darkness (or a simple
  interior cubemap), sills.
- Roofs: trapezoid sheet profile (geometry or triplanar normal), ridge caps,
  skylight strips, solar panels with frames and cell texture.
- Signage: keep text, make letters extruded/brushed metal where they are on facades.
- New-plant finish: clean paint, sharp edges.

---

## 6. Landscape and site

- Grass: higher-quality grass albedo + subtle colour variation; mowed stripes in
  front of offices; optional instanced grass tufts near camera (desktop only).
- Trees and shrubs: replace low-poly cones/blobs in `vegetation.js` with instanced
  CC0 tree models (2–3 species, LODs + impostors far away). Keep `isClear()` and
  planting rules (tests check crowns vs roads).
- Rail: proper rail profile, sleepers with texture, ballast gravel texture, rail
  clips; level crossing panels.
- Kerbs, sidewalks, road markings: thermoplastic paint texture, crisp edges, kerb
  stone joints every 1 m.
- Terrain beyond the fence: sand/dirt PBR with large-scale variation; distant hills
  with aerial perspective.
- Weighbridge (`weighbridge.js`): steel deck texture, load-cell covers, cable ducts.

---

## 7. People

`workers.js` builds stylised workers (scale .81). Options:
- Keep procedural but improve proportions, clothing folds via normal map, PPE
  (helmet, hi-vis vest with reflective stripes, boots).
- Or use licensed rigged humans (check licence: Mixamo assets have usage limits;
  prefer CC0/CC BY sources) with simple walk/idle clips; keep walk routes in
  `pedestrianMotion.js` / `campusLife.js`.

---

## 8. Photoreal still renders (variant D)

Add a **"Render photo"** button (desktop only):
1. Freeze animation, hide UI labels.
2. Render the current view with `three-gpu-pathtracer` (WebGL path tracer) using the
   same scene, HDRI and materials; progressive samples until a target (e.g. 1,000
   spp) or time limit; optional denoiser (OIDN WASM or the library's denoise pass).
3. Output 3840×2160 PNG download; show progress; cancel button.
4. Materials must be path-tracer compatible (Standard/Physical); procedural shader
   patches (`onBeforeCompile` in `realism.js`) are not supported by the path tracer —
   bake the projected textures into proper UVs or provide a path-tracer variant.

Acceptance: a 4K still of each section-9 camera that looks like an
architectural render; app returns to interactive mode afterwards.

(Variant C — AI image/video from these stills, e.g. Higgsfield — is outside the
code base; it uses the stills from this phase as input.)

---

## 9. Verification

Fixed review cameras (world coordinates; add them as presets behind `?review=1`
and a dev-only helper, never ship a global debug hook):

| # | Target (x,z) | Camera position | What it checks |
|---|---|---|---|
| 1 | (-60,-20) | (-170, 90, 90) | whole new plant, lighting, AO |
| 2 | (20,-46) | (2, 22, -68) | loading deck, wagons, forklift |
| 3 | (-139,-2) | (-165, 16, -16) | main gate, signage, kerbs |
| 4 | (64,-43) | (50, 6, -55) | truck close-up |
| 5 | (92.5,-21) | (80, 14, -11) | weighbridge |
| 6 | production interior (roofs hidden) | (-52,30,-27) top view | machines and pipes |
| 7 | process tower base | (-40, 8, 0) | pipe flanges/supports |
| 8 | old campus (-29,-124.5) | (-50, 25, -100) | old buildings, landscape |

For each phase: screenshots of all 8 views, before/after pairs in
`docs/realism/phase-N/`, `renderer.info` numbers (calls, triangles, textures) for
desktop and tablet, and the test/build results in the commit message.

---

## 10. Suggested order and size

| Phase | Work | Rough effort |
|---|---|---|
| 1 | Lighting/render pipeline | 1–2 days |
| 2 | Material library + triplanar | 2–3 days |
| 3 | Vehicles (B) | 3–5 days |
| 4 | Equipment + pipes | 5–8 days |
| 5 | Buildings | 3–4 days |
| 6 | Landscape | 2–3 days |
| 7 | People | 1–2 days |
| 8 | Path-traced stills (D) | 2–3 days |

Do phases 1–2 first; they lift every later phase. Ask the owner before adding any
paid asset or any asset with a licence other than CC0/CC BY.
