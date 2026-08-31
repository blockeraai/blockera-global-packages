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
