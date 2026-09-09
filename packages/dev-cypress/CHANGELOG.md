## Unreleased

### Automated Tests

- Hex color fields commit by closing the picker instead of blurring the
  input (that fails when React replaces the field).
- Site Editor helpers can open Global Styles variable screens with render
  counting on: colors, spacing, text shadows, transforms, and line heights.
- `savePage` waits for the multi-entity save panel, and `redirectToFrontPage`
  reuses the last post preview URL after a Site Editor Global Styles visit.
- `savePage` always finishes with a visible save snackbar, including after
  a Site Editor Global Styles visit where WordPress does not render one.
- `savePage` in the post editor waits until the post is saved, so a reload
  still has canvas blocks.
- `getIframeBody` waits until the editor canvas document has blocks, so
  specs that reload the post editor still find canvas content.

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
