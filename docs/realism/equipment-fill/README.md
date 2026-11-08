# Connected equipment infill

Requested on 2026-10-21: make the two processing interiors visibly fuller with connected illustrative equipment.

Added 22 machines using the existing procedural models and connection network:

- Main building: one central buffer silo and weighing hopper, plus two stacks of silo, weighing hopper, rotary valve and mixer (10 machines).
- Rear building: four horizontal water tanks with circulating pumps, and four extraction fans above the filters (12 machines).

All new equipment connects through actual machine ports. Powder returns use powered lifts; water circuits have supply and circulation returns; each fan has an extraction inlet and stack outlet. The existing animation lifecycle controls all new moving parts. Support frames, control cabinets, gauges and colour-coded water pipes complete the groups. These additions are marked illustrative and do not claim new CAD/photo provenance. No new assets or dependencies were added.

Validation:

- Building envelopes, machine separation, service access, complete circuits, and run/pause checks pass.
- Full-revolution checks confirm rotating equipment clears assembled process pipes.
- All 105 tests pass with these changes applied to the starting revision `8743bed` in a separate temporary source copy.
- Normal and standalone tablet builds pass in the shared working directory.
- Both interiors inspected in the desktop browser; no console errors. `before-main.jpg` / `after-main.jpg` use the same camera preset. `after-rear.jpg` shows the rear equipment.

The shared directory also contains concurrent edits to `palletizingCell.js`, `processPlan.js` and `production.js`, outside this change. At validation time those edits caused the operator-clearance test to fail near the packing cabinet at (-6.6, 0, -33.9). They were preserved and excluded only from the temporary source copy used for the independent 105-test check.

Building footprints, original machine positions, roads, rail, vehicle routes, trees, lighting and display resolution were not changed by this infill. No new frame-rate benchmark is claimed.
