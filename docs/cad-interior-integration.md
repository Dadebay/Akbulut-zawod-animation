# Handoff CAD interior integration — 2026-10-25

The existing project was checkpointed and pushed before integration:
`bf041e4` on `research/realistic-visuals` (129 passing tests).

## Comparison and placement decision

| Area | Existing Ak Bulut project | Supplied handoff | Integration |
| --- | --- | --- | --- |
| Site and buildings | Current exterior dimensions, three roof bays, old/new campuses | Independent, much larger CAD coordinates | Keep current architecture and site |
| Process interiors | Floors, stairs, connected illustrative equipment | Native equipment surfaces and coded occurrences | Fit individual CAD shapes into existing equipment envelopes |
| Production | Animated board feed, two ceiling lines, packing and process simulation | CAD geometry viewer and separate monitoring applications | Keep current production mechanics and simulation |
| Navigation | WASD, Shift, trackpad, doors and collision | Separate CAD orbit viewer | Keep current walkthrough; reserve fitted CAD collision envelopes |
| Asset identity | Existing application IDs and simulation | CAD codes, some ambiguous/duplicate inventory matches | Store source IDs separately; no new live equipment/SCADA claims |

The user selected placement in the existing rooms/floors, rather than shrinking
entire CAD assemblies. The railway-side third production bay stays empty.
The old campus interiors and both campuses' architecture/navigation remain in place.

## Imported equipment

`public/models/cad-interiors.glb` contains 12 reusable CAD templates. They are
installed at 56 compatible locations: silos, hoppers, weighing hoppers, pulse and
silo-top filters, cyclones, fans, elevators, a hammer mill, dry mixers and a burner.
Source codes, object IDs, original dimensions and source hashes are recorded in
`src/industrial/cadInteriorCatalog.json` and in the GLB's node extras.

Wet/pan mixers, twin-roll feed, cooling drums, screws, valves, conveyors, ceiling
tools and palletizing keep their existing mechanisms. Support frames, discharge
valves, ports and connection endpoints remain fixed. Short flange-aligned adapters
connect the fitted skins to the current pipe circuits. Placement uses uniform
scaling and a quarter-turn when useful, never independent axis stretching.

The handoff's `mapping-source/assets/geometry-packed.bin` has torn curved surfaces
in several silos/hoppers. A triangle-coordinate comparison confirmed that the
damage already existed in that preview; it was not an import/indexing error.
The shipped library therefore uses **full-resolution surfaces from the original
`source-cad/FabrikaGenelMontaj.dwfx`**, extracted with the handoff's W3D shell
exporter and simplified with meshoptimizer. No preview-repair solids are fabricated.

The final compressed library is about 1.8 MiB. Its 12 templates are shared between
instances. A second, scoped batching pass draws the CAD skins and adapters in two
additional batches. The local Meshopt decoder is bundled with the application;
there is no CDN/runtime dependency. The standalone build embeds the GLB too.

## Runtime behavior

`prepareCadInteriors` runs before walk collision collection and static batching.
Original bodies remain visible until the entire library is validated and fitted.
A failed or cancelled load leaves those originals available. Dynamic visibility
owners ensure the original bodies disappear from GPU batches when CAD arrives,
and imported bodies disappear with the production cutaway. Late loads are disposed
after unmount; the kit owns installed geometry/material disposal.

These are adapted CAD reference shapes, not surveyed as-built placement. Reusing
one source shape at multiple locations does not identify those locations as the
source inventory asset. Existing statuses and animations are still illustrative.

## Rebuilding the library

Normal `npm run build` uses the checked-in GLB and needs no CAD tools.
To regenerate it, extract `mapping-source/` and `source-cad/FabrikaGenelMontaj.dwfx`
from the supplied handoff. Unzip the DWFX and locate its `.w3d` entry.

1. Build the supplied `mapping-source/historical-tools/export_mesh.cpp` with the
   Autodesk DWF Toolkit W3D reader. Run it on the `.w3d` to obtain `events.jsonl`
   and `shells.bin`. Successful extraction has status 6, 5,582,753 segments,
   108,601 shells, 45,258,744 vertices and 193,803,548 face values.
2. Extract selected occurrences using Python with NumPy:

   ```sh
   python3 scripts/extract-native-cad.py \
     --mapping /path/to/mapping-source/MAPPING.json \
     --events /path/to/events.jsonl --shells /path/to/shells.bin \
     --dwfx /path/to/FabrikaGenelMontaj.dwfx --out /path/to/native-library
   ```

3. Produce the runtime library and provenance catalog:

   ```sh
   node scripts/import-cad-interiors.mjs /path/to/mapping-source /path/to/native-library
   ```

The extraction used the W3D reader sources in [kveretennicov/dwf-toolkit](https://github.com/kveretennicov/dwf-toolkit) with
`DWFTK_STATIC`, `DWFCORE_STATIC`, `DWFTK_READ_ONLY`, `DWFCORE_READ_ONLY` and
`DISABLE_STREAM_JPEG` defined. The direct build links the `B*.cpp` reader files,
`w3dtk/utility/*.cpp`, `dwfcore/Exception.cpp` and zlib. Apple Silicon needs its
little-endian architecture recognized in `BStream.h`, `BByteStream.h`,
`BOpcodeHandler.h` and `BEdgeBreakerCommon.cpp`; the old macOS core's GCC-private
`bits/stl_algobase.h` include is replaced with standard `<algorithm>`.
The toolkit and large intermediate exports are not runtime dependencies or
committed project files.

## Validation

Tests load the actual compressed GLB and check source identity/dimensions, intact
silo surfaces with radial ray tests, placement and adapter envelopes, collision
coverage, empty-bay clearance, unchanged production mechanisms, async fallback,
cancellation, and visibility through both batching passes. The full-campus walk
test now includes CAD collision envelopes and verifies entrances and stairs.

Verified: all 134 tests pass; production and standalone builds succeed. Both the
development page and the standalone HTML load all 56 CAD placements. The local
trackpad walkthrough moves about 4.3 metres during a one-second key hold. Re-running
the native extraction script produces an identical geometry SHA-256.
