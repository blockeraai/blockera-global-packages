## Unreleased

### Automated Tests
- Preset variables view-mode specs assert the full “N variables” label
  (site editor includes theme and default; the picker lists ten colors),
  reset user Global Styles in the picker, and wait for the MU taxonomy leaf.
- Cover resolving theme palette rows from a flat `palette` list and from
  numeric `palette[]` keys.

### Improvements
- Global Styles color, duplicate, and preset edits no longer walk the
  inspector DOM looking for canvas iframe remounts. The watcher stays on
  the canvas.

### Development Notes
- Theme palette row resolution reuses the origin-list coerce helper so MU
  `palette[]` numeric keys are included with `palette.theme`.
- Iframe preset CSS observer prefers `.edit-site-visual-editor` /
  `.editor-visual-editor` / skeleton content over the full interface
  skeleton, and checks `addedNodes` without spreading or `querySelector`.

## [4.0.0] - 2026-09-12

### Improvements

- Global Styles variables (colors, fonts, shadows, filters, and the rest)
  stay smoother while you edit. Theme and default lists stay put, extra CSS
  variables update only when a preset actually changes, and row headers
  follow the value as you type.
- Typing in a variable editor no longer saves on every keystroke. The value
  saves when you leave the field or close the editor.
- Naming a new custom variable no longer saves Global Styles on every
  letter. The name is saved when you close the editor. The variable id
  still updates as you type so the picker can find the new row.

### Bug Fixes

- Opening Color variables no longer crashes the editor.
- Duplicating a custom variable (or a nested shadow or filter layer) keeps
  the editor open so the upgrade prompt can still appear.
- Closing a nested shadow or filter layer (Escape or the close control)
  saves the value you typed, instead of leaving it unsaved.
- Leaving a nested transition (or similar) field with Escape saves the
  typed value to Global Styles before the editor closes.
- Editing a nested transform layer (for example Move-X) and pressing Escape
  saves the items array on the theme variable.
- Editing a nested text shadow layer (blur) and pressing Escape saves the
  CSS shadow string on the theme variable.
- Editing a nested box shadow layer (offset) and pressing Escape saves the
  CSS shadow string on the theme variable.
- Editing a nested filter layer (blur) and pressing Escape saves the items
  array on the theme variable.
- Theme.json transform, text-shadow, box-shadow, and filter lists
  (`presets[]`) still appear under Theme variables when WordPress has not
  keyed them as `presets.theme`.
- Closing a new custom preset (Escape or the close control) finishes the
  create step so the row is no longer marked as still being created.
- Closing a new custom variable keeps the name you typed, so the picker
  can still find it.
- Adding a custom variable in Global Styles keeps the create editor open.
- Editing a spacing (or other) preset size and pressing Escape keeps the
  new size instead of reverting to the previous value.
- Changing a nested filter layer type (for example blur to drop-shadow)
  keeps the layer editor open.

### Development Notes

- Live preset row headers accept React `ElementType` so TypeScript accepts
  repeater header components.
- Variable screens: save later while typing, keep unchanged lists stable,
  skip extra CSS rebuilds, and keep inner editors attached.
- In-flight create rows overlay from the repeater store for every creating-step
  preset group, not only index-keyed lists.
- Adding a creating-step row still persists theme.json so picker and Global
  Styles lists keep the new row.
- Creating-step name and id write the repeater store in the variable picker
  only; Global Styles keeps those drafts in the header until close.
- Header draft patches that do not change stored fields skip subscriber notify.
- Ending create merges header name/id drafts into the persist payload so
  Global Styles can skip per-keystroke store writes without losing the typed slug.

### Development Notes
- Target WordPress 7.1 Global Styles DOM classes only
  (`global-styles-ui-*` / `editor-global-styles-sidebar*`). Pre-7.1
  `edit-site-global-styles-*` selectors are no longer used.

### Automated Tests

- Cover WordPress 7.1 Global Styles panel selectors only.
- Switch the block inspector with `switchBlockTab` instead of clicking
  `styles-view` directly.
- Rename global-styles e2e specs to `.gs.e2e.cy.js`.
- Overlay keeps an in-flight create row when theme.json has not persisted it yet.
- Header draft store skips notify when a patch does not change stored fields.
- Closing a creating-step row persists header name/id drafts with staged fields.
- Variable editors: typing does not save until leave or close; color, shadow,
  and filter keep their pickers attached.
- Creating a custom border variable does not persist on each name keystroke.
- Escape persist from a name-only hook does not overwrite a sibling size
  (or other field) persist.
- Nested layer persist echo keeps an open filter (or similar) editor open.

## [3.0.0] - 2026-09-05

### Automated Tests
- Drop manual `-N` suffixes from Cypress e2e spec filenames; CI shards
  categories by registered test count.

## [2.0.0] - 2026-08-31

### Fixed
- Remove duplicate code.

## [1.1.0] - 2026-08-26

### New Features
- Added `@blockera/global-styles-ui`, a dedicated package for managing theme.json preset variables in the WordPress Site Editor global styles sidebar.
- Added global styles panel takeovers for **Colors**, **Typography**, and **Shadows**, replacing native WordPress preset navigation with Blockera variable editors while keeping WordPress navigator compatibility (pre– and post–WP 7.0 class hooks).
- Added preset variable editors for **color palette**, **linear gradients**, **radial gradients**, **spacing**, **font sizes**, **borders**, **border radius**, **box shadows**, **text shadows**, **filters**, **transforms**, **transitions**, and **width & height** sizes, each supporting theme, default, and custom `theme.json` origins where applicable.
- Added **color shade variations**: define shade ramps on palette colors, with accordion editors, swatch stacks in preset openers, and shade rows in the variable picker.
- Added **preset taxonomy** UI: tree-style grouping for theme, default, and custom preset origins with shared name, slug, description, and visibility controls.
- Added **Typography** hub in global styles: font size variables moved under `typography/font-sizes`, with a dedicated navigation screen for typography presets.
- Added **line height variables** editor under `typography/line-heights`, following the font size preset pattern (`typography.lineHeights` in `theme.json`) and wiring the block editor line height control to the variable picker.
- Added **variable picker preset panels**: export `*PresetContent` bodies so `@blockera/controls` can embed global-styles editors inside the block variable picker without circular imports.
- Added **fallback preset catalog** in the variable picker for read-only theme/layout tokens (for example content and wide width sizes) alongside editable custom presets.
- Added **preset row canvas preview**: hover or click a preset row in global styles to preview typography, spacing, color, shadow, border, and effect values on the style book canvas.
- Added **missing variable recreate**: restore deleted custom presets from a missing variable binding via the variable picker unlink flow.
- Added **plain theme.json preset merged state** helpers for resolving preset slugs and scalar values from merged editor features (shared with `@blockera/data` and `@blockera/controls`).
- Added **preset variables view mode** toolbar for switching how origin groups are displayed on variable screens.
- Added **read-only global styles preset mode** when the current user lacks permission to edit global styles (repeaters and edit popovers respect `canEditGlobalStyles`).

### Improvements
- Renamed global styles copy from “presets” to “variables” across color, gradient, spacing, typography, border, and effects screens for consistency with Blockera variable terminology.
- Shared **SharedPresetControls** for preset name, slug, description, visibility, and ID change consent across all preset editors.
- Enabled **creatingStep** flow on preset repeaters so new variables open in an edit popover immediately after add.
- Improved preset delete and reset dialogs with origin-aware copy (theme, default, and custom layers).
- Improved variable picker integration: search filters preset rows, custom add seeds from the current control value or search text, and deleting the active picker row unlinks the bound feature.
- Improved color preset openers with padded swatch/gradient previews, shade strip markers for base vs edited steps, and shorter description labels with an info tooltip.
- Improved spacing preset preview with a dashed width measure and hatch pattern styling.
- Improved border and border-radius preset editors to use Blockera `BorderControl` and `InputControl` with link toggles hidden in the preset context.
- Improved effects preset editors (filter, transform, transition) with value addons disabled where inappropriate for global preset rows.
- Improved panel override cleanup styles so typography font size and line height inspector screens hide native WordPress chrome correctly.

### Bug Fixes
- Fixed typography **line height variables** screen not appearing after navigation by extending preset cleanup CSS to support multiple inspector-active classes (`blockera-font-size-preset-inspector-active` and `blockera-line-height-preset-inspector-active`).
- Fixed typography panel override not clearing when using the navigator back button.
- Fixed default WordPress preset groups duplicating theme presets in the variable picker when the theme layer already supplies variables.
- Fixed preset repeaters inside the variable picker re-rendering and losing focus during create, rename, and slug edit flows.
- Fixed color variable linking to persist live `var()` references when binding palette variables as values.
- Fixed shade accordion headers showing redundant hex values inside the variable picker.
- Fixed variable picker shade strip rows not receiving selection state.
- Fixed border preset `BorderControl` menu opening downward and clipping inside popovers.
- Fixed gradient preset name field losing focus and custom gradient slugs not preserving visibility flags.
- Fixed preset popover width and scroll issues on long variable names and variation layouts.

### Automated Tests
- Added Cypress E2E coverage for global styles **color palette**, **linear gradient**, **radial gradient**, **spacing**, **font size**, **border**, **border radius**, **box shadow**, **text shadow**, **filter**, **transform**, and **transition** preset variables (theme merge, UI display, and persistence).
- Added Cypress E2E for the **typography** global styles panel (override class, hub navigation, font size and **line height** variables screens, cleanup/inspector-active DOM, custom preset groups, and back navigation).
- Added shared Cypress helper `openGlobalStylesLineHeightsVariablesScreen` for typography → line height variables navigation in global styles E2E specs.
- Added Cypress E2E for **preset taxonomy** smoke flows, rename deferral, variable descriptions, variations, read-only permission mode, and variable picker search.
- Added Cypress E2E for **color shade variations** in the palette editor and variable picker (shade strip selection and flat-theme picker scenarios).
- Added Cypress E2E for **missing variable recreate** and **clear-on-delete** variable picker selection behavior.
- Added unit tests for preset repeater value utils, missing-variable recreate builders, variable picker custom-add seeding, and panel override cleanup screen helpers.
