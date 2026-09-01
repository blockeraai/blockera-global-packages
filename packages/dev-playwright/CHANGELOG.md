## [3.0.0] - 2026-09-01

### Fixed

- Hide the in-canvas breakpoint/zoom header before editor visual screenshots so device chrome is not captured.
- Size the editor canvas iframe to the block tree, disable its transition, and paint an opaque canvas background before screenshots so breakpoint previews are not clipped and do not show parent chrome at the footer.

## [2.0.0] - 2026-08-31

### Added
- Add createPostViaPhp for skip-editor visual fixtures.
- Introduce the stopPendingFrameLoads.

### Changed
- Cover which network requests block screenshot waits.
- Revert "fix(dev-playwright): abort hung canvas frame loads before teardown".

### Fixed
- Code editor to visual editor switch!.
- Take visual screenshots with Playwright viewport again.
- Resize the browser window when emulating editor viewport.
- Keep CDP viewport override attached for editor screenshots.
- Keep frontend visual screenshots on Playwright viewport.
- Stop visual screenshots from waiting on blob canvas load.
- Stop hung canvas loads from the parent frame.
- Abort hung canvas frame loads before teardown.
- Stop waiting on canvas iframe load after code editor.

## 1.0.0 (2025-01-XX)

### Added
- Initial release of Playwright e2e testing utilities
- Test fixtures for WordPress editor
- Helper utilities for common editor operations
- Global setup configuration for WordPress authentication
