# TV presentation with stable resolution

Normal browser launches now use the full desktop geometry, N8AO and 4096-pixel shadows without requiring `?hq`. Only the explicitly built tablet package uses the lighter profile. TV presentation ignores a previously saved Eco preference and hides the settings buttons/popover. Normal scene navigation remains available.

Removed the TABLET/FPS meter, numbered review-camera panel, Orbit button and review simulation override. Old `?review=1&perf=1` URLs no longer display those controls.

The blur came from the viewport pixel budget combined with automatic frame-rate scaling. Scene resolution now follows display density, clamped to 1–2×, independently of zoom, frame rate, profile and viewport area. The regression test was updated because the old area-based reduction is intentionally removed.

Validation on 2026-10-21:

- All 104 tests passed; production and standalone tablet builds passed.
- At 1280 × 720 CSS pixels, drawing size increased from 885 × 498 to 2560 × 1440 and remained stable after zooming in/out and continued rendering.
- Browser viewport checks: native 1920 × 1080 and 3840 × 2160 drawing sizes at 1×; changing the 4K camera retained 3840 × 2160.
- TV page: zero settings buttons, meter elements and review navigation panels, even through the old diagnostic URL. No WebGL console errors.
- Site/route constants and restored tree geometry are unchanged.

`before.jpg` records the previous diagnostic screen; `tv-1080p.jpg` records the final TV profile with no settings/diagnostic overlays. These are interaction checks, not identical-camera performance comparisons or physical-TV certification. Earlier reduced-resolution performance/memory samples do not describe the new native-resolution settings.
