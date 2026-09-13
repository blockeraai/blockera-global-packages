## Unreleased

### Automated Tests
- Preset variables summary-row helpers wait for the picker summary slot
  instead of matching the first fallback row, and assert the full
  “N variables” count label.
- `openGlobalStylesPanel` closes the left inserter via the secondary-sidebar
  toggle and does not require the pane to unmount.
- `activateMoreSettingsItem` force-clicks so a covering dock does not steal
  the More Size Settings click.
- `assertColorControlValue` requeries the color control on each retry so
  inner-block and state switches that remount `color-label` do not fail
  with a detached Cypress subject.
- `maybeOpenBlockStylesTab` queries document `body` outside `.within()`
  so `getByAriaLabel('Add New Background')` still works inside an inspector
  panel scope.
- `getParentContainer` and `getByAriaLabel` open the block Styles tab for
  Clipping and Add New Background when that inspector tab exists, so
  functionality specs still find those controls while Settings is default.
- `switchBlockTab` prefers tabs inside the settings overlay and force-clicks
  by default so a covered Gutenberg tab does not steal the click.
- `openGlobalStylesPanel` closes the left dock first so the inserter
  search is unmounted and Global Styles search is the first field.

### Development Notes
- `setColorControlValue` scrolls the control into view, commits the CSS
  field with a DOM blur, and waits until the labeled color control or the
  minimal color swatch (Border) shows the new value. Hex comparison
  ignores a leading `#` and surrounding whitespace.
- Add `switchBlockTab` Cypress command (`styles` | `settings`) for the block
  inspector tabs. Skips the click when that tab is already active.
- Variable picker and companion helpers use `switchBlockTab`. Drop
  `ensureBlockeraStylesViewOpen`.
- `openGlobalStylesPanel` force-clicks the header Styles pin
  (`.interface-pinned-items`), not a complementary-area close toggle that
  shares `aria-controls="edit-site:global-styles"`.
- Add `openSettingsSidebar` Cypress helper for Blockera's right-dock settings
  toggle, with fallback to Gutenberg's document sidebar pin.
- Close the block inserter via Blockera's secondary sidebar toggle when the
  left dock is open.

## [5.0.0] - 2026-09-12

### Automated Tests

- Hex color fields commit by closing the picker instead of blurring the
  input (that fails when React replaces the field).
- Site Editor helpers can open Global Styles variable screens with render
  counting on: colors, spacing, text shadows, transforms, and line heights.
- Borders Global Styles helper accepts the same render counting option.
- Navigation “Add page” clicks the canvas Page List overlay on WordPress
  7.1 when List View has no appender.
- Navigation submenu inner add inserts a child link when WordPress 7.1
  hides the canvas appender.
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
