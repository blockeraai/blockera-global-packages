## Unreleased

### Development Notes

- Window-flag render counters (`__BLOCKERA_RENDER_DEBUG__` and the BlockBase
  legacy key) let Cypress e2e count component commits in the production
  bundle without a new webpack env. Unset flags stay a no-op.

### Automated Tests

- Shared render tracker is a no-op without the window flag; BlockBase legacy
  flag does not enable InputControl counts.

## [2.0.0] - 2026-09-01

### Changed
- Update flex layout assertions for new keys.

## [1.4.0] - 2026-09-01

### New Features

- Added `useEditorMode` to read Gutenberg visual vs code (`text`) editor mode from `core/editor`.

### Bug Fixes

- `useEditorMode` selects `core/editor` by store name instead of importing `@wordpress/editor`, so Cypress specs that load `@blockera/utils` no longer fail on Gutenberg private-API unlock.

## [1.3.0] - 2026-08-26

### New Features
- Added new helper functions to improve plugin functionality.

### Bug Fixes
- Unused repeater attributes now reset to Gutenberg's registered default (`{ value: {} }`) instead of PHP's empty array (`{ value: [] }`), so they are omitted from saved block markup.

### Improvements
- Site Editor SPA URLs keep `/` and `:` literal in the query string (`p` and custom params), including the address bar on first load.
- Length values used in block styles (for example borders and shadows) are normalized more reliably when saved data uses shorthand decimals or omits a unit; the `normalizeCssLengthValue` helper also accepts an optional default unit (defaults to `px`, or use an empty string to keep numbers unitless).

## 1.2.1 (2025-06-10)

### Improvements
- Enhanced URL utilities with more robust domain extraction and parameter parsing capabilities.

## 1.2.0 (2025-04-27)

### New Features
- Added `getSortedObject` helper to sort objects by `priority` property.

## 1.1.0 (2025-03-15)

### New Features
- Add `Shift` key to increase/decrease value by 10x in `Input` and `Spacing` fields.

### Improvements
- Improve the input fields to change value by dragging the mouse after a 5 pixel threshold is reached.

## 1.0.0 (2024-12-08)

### New Features

- Added modifySelectorPos() method to the utilities object.

### Automated Tests:

- Added full PHPUnit tests for the Blockera\Utils\Utils class.
