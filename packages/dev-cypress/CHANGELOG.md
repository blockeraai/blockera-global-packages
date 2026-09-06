## Unreleased

### Development Notes

- Cypress `createPostWithRenderDebug` sets window render-count flags before
  editor boot so production-bundle e2e can snapshot component commit deltas.

## [4.0.0] - 2026-09-01

### Development Notes
- Rename Cypress helper `selectBlock` to `selectBlockByListView` and always
  expand List View before selecting a block.

## [3.0.0] - 2026-08-31

### Added
- Add Cypress helpers to target the unique frontend block.

### Changed
- Assert cleared global styles do not rehydrate from theme.json.

### Fixed
- Query welcome guide against the top document.
- Map spec failure stacks with inline source maps.

## [2.0.0] - 2026-08-26

### Improvements
- Site Editor Templates Cypress helpers assert `blockera-builder` and literal `p=/` paths.

## 1.0.2 (2025-04-12)

### Improvements
- Added new selector for the block inserter button to ensure compatibility with the latest WordPress version.

## 1.0.1 (2025-03-29)

### Improvements
- Improve Cypress utility functions to work faster and more reliably.

### Fixed
- E2E tests.

## 1.0.0 (2024-12-08)
