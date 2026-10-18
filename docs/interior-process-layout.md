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

Verification in this change is limited to source/syntax review. The application test suite, browser runtime and visual comparison were not run, following the user's preference to test personally.
