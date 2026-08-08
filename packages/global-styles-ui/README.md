# `@blockera/global-styles-ui`

Site Editor UI for Blockera theme.json / global-style presets.

Covers colors, typography, spacing, borders, shadows, transforms, filters, transitions, custom preset variations, and panel navigation overrides.

---

## Why it exists

WordPress global styles UI is not enough for Blockera’s extended preset domains. This package provides the React/TS UI, hooks, and panel-override helpers the editor mounts into the Site Editor.

---

## Package layout

```text
packages/global-styles-ui/
├── js/
│   ├── index.ts                 # Main entry (side effect: panel override styles)
│   ├── colors/ typography/ spacing/ borders/ ...
│   ├── panel-override/          # Also exported as subpaths
│   ├── theme-json-plain-preset/
│   └── ...
├── php/
│   └── functions.php            # Package marker only (no API)
├── package.json                 # @blockera/global-styles-ui
└── composer.json                # blockera/global-styles-ui
```

| Side | Package name | Entry |
|------|----------------|-------|
| JS | `@blockera/global-styles-ui` | `js/index.ts` (+ subpath exports) |
| PHP | `blockera/global-styles-ui` | Marker file only |

### Subpath exports

| Subpath | Purpose |
|---------|---------|
| `@blockera/global-styles-ui` | Main UI + hooks |
| `…/panel-override` | Panel override entry |
| `…/panel-override/selectors` | Selector helpers |
| `…/panel-override/navigator-back-button` | Navigator back button |
| `…/panel-override/override-classes` | Override class utilities |

---

## JS API (high level)

```js
import {
	SpacingPresetContent,
	FontSizesPresetContent,
	useGlobalStylesContext,
	useGlobalSetting,
	useGlobalStyle,
	createGlobalStylesPanelHandler,
	navigateToGlobalStylesPath,
} from '@blockera/global-styles-ui';
```

Major surfaces:

- Panel UI: `Borders`, `Filters`, `Spacing`, `Transforms`, `Transitions`, `TextShadows`, `BorderRadius`
- Preset content bodies: spacing, font sizes, line heights, color/gradient, border, shadow, filter, transform, transition, width-size
- Context/hooks: `useGlobalStylesContext`, `useGlobalSetting`, `useGlobalStyle`, `PresetVariationsContext`, `usePresetVariationsStorage`
- theme.json plain-preset state/normalization helpers
- Missing-variable preset recreation helpers
- Panel override / navigation utilities

---

## Agent rules

- Importing the root entry loads panel-override styles as a **side effect**.
- Prefer exported wrapper/selector APIs over hard-coded DOM selectors against WordPress global-styles internals (upgrade risk).
- Depends on `@blockera/env` for experimental gating where used.
- PHP has no library API — do not invent server exports here.

---

## Related packages

- `@blockera/editor` (global styles panel integration)
- `@blockera/data`, `@blockera/env`, `@blockera/controls`, `@blockera/icons`
