# Factory interior and material routing

## Visual references

- Equipment shapes: the 90 PNG references indexed in `equipment-reference-map.json`.
- Tower arrangement: user photograph `photo_2026-10-18_12-55-12.jpg` (four perspectives and a floor breakdown).
- Existing main processing-building envelope: centre `(-29, 5)`, footprint 17 × 29 m, height 27 m.

The reference establishes a visual arrangement, not surveyed dimensions or a plant P&ID. Machine dimensions, capacity, chemistry residence times, air balance, loads and clearances still require manufacturer/plant engineering data. This is a presentation model, not an engineering or chemical-process solver.

## Tower layout

| Level | Equipment |
| --- | --- |
| Ground | Rotary thermal machine, burner connection, lower feeding and discharge |
| 6 m | Vertical mill/classification, recovery bins, product buffer |
| 12 m | Weighing, gravity receivers, enclosed yellow screw transfer, filter support frame |
| 18 m | Feed bin, cyclone/separator, upper filter bodies |
| 24.5 m service deck | Extraction fans, ductwork and exhaust stacks |

Steel columns, beams, bracing, machine seats, catwalks and alternating stairs remain visible in the equipment cutaway. Open platform centres allow bins and gravity chutes to pass between levels.

## Shared connections

`machinePort` defines the connection position, outward normal, diameter and material class beside each machine's geometry. Connections resolve those ports after positioning and scaling. Changing a machine's pose therefore moves its attachment point with it.

- Trimmed tangent elbows replace interpolated curves that overshoot their joints.
- Reducers and flange collars close diameter changes.
- Gravity connections reject uphill segments.
- Horizontal powder legs have screw drives; vertical lifting legs have enclosed elevator housings and head drives.
- Gas ducts, water pipes and solid-product routes use separate ports. The rotary thermal machine's exhaust enters dust extraction, not a powder-feed screw.
- Internal rotary valves remain open to their parent hopper; unused external service ports receive blind caps.
- Flexible sleeves join the vibrating screen to fixed piping.
- Raw-milling dust and calcined-product dust have separate recovery paths.

No pressure drop, power, flow rate, dust-explosion design or structural-load calculation is implied by the geometry.

## Product transformations

The represented gypsum-board sequence follows the [Gypsum Association's manufacturing description](https://gypsum.org/making-gypsum-board/): prepare and calcine gypsum, mix with water/additives, form between paper liners, allow setting, cut to length, then dry and finish.

The intended material states are:

1. Raw gypsum: calcium sulfate dihydrate.
2. Calcined stucco: hemihydrate. Idealized reaction: `CaSO4·2H2O + heat → CaSO4·½H2O + 1½H2O(vapour)`.
3. Slurry after metered water addition, followed by rehydration/setting to dihydrate.
4. Set, damp board at the cutter.
5. Dry board after the dryer. Drying removes excess free water; it is not a second depicted calcination step.
6. Ceiling finishing: dry blank → longitudinal slit/crosscut → perforation → inspection → packing receiver.

Dry construction mixtures remain on their separate dry dosing, mixing and bagging circuit. Water feeds only the wet board mixer. Recipes, conversion percentages and production rates are not inferred from pictures.

## Motion

- A supported continuous web precedes the board cutter; discrete boards begin with their trailing edge at the cut plane.
- Discrete conveyors use bounded acceleration and braking, stop at transfer centres and wait for cutting/perforation.
- Tool strokes use the same arrival/dwell schedule as products. Perforations appear only after the press stroke, and the punch positions match the visible hole pattern.
- Ceiling finishing and its return packing conveyor share one product route, with no independent duplicate stream at the packing end.
- A blocked packing receiver stops the upstream board conveyors. Stopped products remain visible and resume from the same pose.
- Material is hidden inside sealed raw-material ducts and crusher housings. Direction arrows are explanatory overlays shown only in line view.
- Exposed falling stones follow `y = y0 − ½gt²`, with impact height bounding the visible fall.

Motion timings are compressed for presentation. This is not a validated mass/energy balance, collision solver or factory control system.

### GP-001 board palletizing

- The receiver portal is open to the robot; the independent oscillating vacuum head and the prefilled dummy stacks were removed.
- A terminal photoeye stops the sheet on a complete roller bed. The same sheet remains visible through approach, vacuum dwell, lift, transport and contact with the pallet.
- Shoulder, elbow, base yaw and a compensated wrist use fixed link lengths. The six vacuum cups remain horizontal and aligned with the sheet surface.
- Vertical pickup precedes horizontal travel. The route exits the portal's open side before turning, keeping the board clear of the front post. Quintic moves ease velocity and acceleration to zero at each stop.
- Conveyor admission, visible drives and receiver occupancy share one clock. Further sheets queue until the robot clears the receiver; a paused or stopped GP cell freezes its current pose and load.
- Each supported placement adds exactly one 30 mm visual layer. The pallet holds 24 sheets and then waits for collection, without silently deleting stock or inventing an empty replacement pallet.
- Equipment preview starts with sheets already on the line. In normal sequence playback the robot waits for the first actual arrival.

These are geometric/kinematic constraints for the visualization, not a calculation of vacuum capacity, motor torque or machine safety.

## Viewing

Open `http://127.0.0.1:5178/?area=process&equipment=dosing` for the multi-level tower, or choose **Enjamlar → Köp gatly önümçilik binasy**. The other equipment views still show ceiling finishing, bagging, utilities and packing.

Open `http://127.0.0.1:5178/?area=process&equipment=robot` to view the GP-001 receiver, articulated robot and filling pallet together.

## Physics and chemistry model — 20 October 2026

`src/industrial/processPhysics.js` supplies the material calculations and motion
parameters used by the visible equipment. Archive renders identify mechanisms,
not manufacturer models or nameplate ratings. All operating values below are
**illustrative assumptions**, not measured Akbulut settings.

### Research basis

- [Gypsum Association manufacturing sequence](https://gypsum.org/making-gypsum-board/):
  calcination precedes water addition; hydration/setting precedes cutting; the
  board dryer removes free moisture. This establishes the order of operations.
- [Gypsum Association industry brochure, page 5](https://www.gypsum.org/wp-content/uploads/2011/11/Industry_Brochure_5-18-10_Final.pdf):
  describes approximately 177 °C calcination and loss of three quarters of the
  crystal water. It is a general description, not this plant's temperature rating.
- [Grenzebach calcining systems](https://www.grenzebach.com/en/markets/building-materials/gypsum/plaster/calcining-systems-grenzebach/):
  technology, residence time and operating conditions depend on raw material and
  product; a downstream drum cooler controls stucco temperature. Consequently,
  heater, cooler and board-dryer air temperatures are separate model variables.
- [KWS conveyor engineering calculations](https://www.kwsmfg.com/engineering-guides/shaftless-screw-conveyor/calculations/):
  screw throughput depends on diameter, pitch, loading, inclination and speed.
  A picture alone cannot establish throughput or motor power; no inferred
  nameplate capacity is displayed.

### Assumed parameters

| Quantity | Model setting | Interpretation |
| --- | --- | --- |
| Initial calciner / cooled stucco / dryer air | 160 / 55 / 160 °C | Warm operating plant, not a cold start |
| Calcination lower gate | 140 °C | Simplified threshold, not a kinetic fit |
| Calcination reaction heat | 450 kJ/kg raw gypsum | Assumed, excludes plant losses and sensible heating |
| Board stucco / added water | 18 kg / 11.7 kg | Per-core parcel; paper/additives excluded |
| Setting time / hydration heat | 240 s / 120 kJ/kg stucco | Assumed reaction duration and exotherm |
| Evaporation energy | 2400 kJ/kg water | Approximate latent heat in the modeled temperature range |
| Parcel heat capacity / heat transfer | 1.4 kJ/(kg·K) / 0.35 kW/K | Lumped parcel model |
| Residual free water criterion | 0.5% of hydrated solids | Illustrative release gate, not a product specification |
| Thermal time compression | 90 physical seconds per animation second | Applied to heating, setting and drying, not shaft RPM |
| Main drum / ring-pinion teeth | 1 RPM / 80:18 | Pinion rotates oppositely at exactly 80/18 of drum rate |
| Jaw eccentric / throw | 180 RPM / 18 mm | Moving jaw follows the same shaft phase as its flywheels |
| Archive screws | 30 RPM | Illustrative low-speed powder conveying |
| Main mixing pan | 18 RPM | Illustrative paddle-shaft speed |
| Visible screen vibration | 12 Hz / 1.5 mm amplitude | Small supported vibration, not centimetre-scale jumps |
| Board / ceiling / bag conveyor speed | 1.8 / 1.1 / 0.65 m/s | Existing presentation route rates; not claimed production capacity |
| Filled bag | 25 kg | Separate dry mixture; no water addition/rehydration |

### Enforced behavior

- Calcination conserves dihydrate, remaining dihydrate, hemihydrate and released
  steam. Zero feed or zero reaction energy cannot create stucco. The per-board
  precursor is recorded as gypsum input and calcination vapour.
- Hydration is limited by available mixing water. Chemically bound water and
  free water are distinct; the dryer never subtracts bound water or gypsum.
  Each parcel conserves incoming gypsum plus added water against remaining
  product plus both steam streams. Drying spends supplied heat on warming and
  evaporation, with a product-temperature limit separate from dryer air.
- Set, damp boards enter the actual dryer span. A wet leading board stops the
  common conveyor inside the exit mouth; drying continues while supported, and
  transport resumes when the moisture gate passes. The robot rejects wet boards.
- Equipment inspection begins with declared work in progress. Already-cut boards
  have completed setting on the supported upstream web; preview parcels are
  initialized from their position and prior dryer residence. New parcels retain
  their own water and temperature state throughout travel and stops.
- Heat failure cools equipment continuously and inhibits fresh wet/dry production.
  The pause control freezes all calculations. Safety stops hold transported goods;
  ordinary motor starts have bounded ramps and integrated, continuous shaft phase.
- Drum supports use tangential contact and opposite surface speed. Belt drive
  couplings use `omega = v/r`; straight-run drives share their product clock.
  Gates and dampers move to a working position rather than perpetually oscillating.

This remains a teaching/presentation model: no whole-plant silo inventory,
pressure/air balance, calibrated reaction kinetics, motor torque, dust capture,
structural calculation or control-system validation is implied. Calcite remains
on the dry grinding/filler circuit; it is not converted into gypsum. The optional
**Nusga fizika** readout distinguishes assumed temperatures and parcel water from
live plant telemetry.

### Verification

`npm test` covers mass and water conservation, energy-limited dehydration,
water-limited setting, bound-water preservation, frame-rate-independent motor
ramps, heat loss/restart, supported wet-board holding/release and pause behavior,
along with the existing geometry and logistics regressions. `npm run build:server`
produces the existing `/zawod/` deployment bundle; deployment remains manual.
