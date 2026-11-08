# White front facade and front-facing sunlight

Requested on 2026-10-21: make the production building's front white and move the sun to the front of the factory.

The processing envelope now uses clean off-white `#f4f5f3`. The HDR sky is rotated horizontally so its sun reaches the -X facade and +Z entrances. Background, environment reflections and the shadow-casting directional light share that rotation; the HDR sun's elevation is preserved. No exposure, geometry, layout, route, tree or display-quality settings changed.

Validation:

- All 105 tests passed, including the new sun orientation/elevation regression.
- Production and standalone tablet builds passed.
- Desktop day/night transitions checked; no browser console errors.
- `before.jpg` and `after.jpg`: the same overview zoom, showing the previously shaded front and the newly sunlit white facade.
- `night.jpg`: night-mode visual check with the same facade material.

These are visual regression captures, not a new performance benchmark.
