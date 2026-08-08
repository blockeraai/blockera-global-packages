# `@blockera/editor`

Principal Gutenberg extension layer for Blockera.

Stores, hooks, controls integration, block extensions, style engine, editor plugins, breakpoints, preview, tabs, slots, shortcuts, zoom, and command-bar support — for both JS editor UI and PHP style/persistence.

---

## Why it exists

Blockera deeply extends the block editor. This package is the shared “editor core” that feature packages and the main `@blockera/blockera` entry build on, instead of each feature patching Gutenberg ad hoc.

---

## Package layout

```text
packages/editor/
├── js/
│   ├── index.js
│   ├── components/ hooks/ extensions/
│   ├── style-engine/
│   ├── editor/                    # Breakpoints, canvas, plugins, …
│   ├── observer/
│   ├── command-bar/ preview-mode/ scrollbar/
│   ├── shortcuts/ slots/ tabs/ zoom/
│   └── ...
├── php/
│   ├── StyleEngine.php
│   ├── StyleDefinitions/
│   ├── EditorPersistenceStore.php
│   ├── helpers.php
│   └── ...
├── package.json                   # @blockera/editor
└── composer.json                  # blockera/editor
```

| Side | Package name | Entry |
|------|----------------|-------|
| JS | `@blockera/editor` | `js/index.js` |
| PHP | `blockera/editor` | PSR-4 `Blockera\Editor\` + `php/helpers.php` |

---

## JS API (high level)

```js
import {
	bootstrapEditor,
	bootstrapTabs,
	bootstrapPreviewMode,
	bootstrapZoom,
	bootstrapShortcuts,
	bootstrapScrollbar,
	bootstrapSlots,
	bootstrapCommandBar,
	registerBlockeraEditorInternalPlugins,
	unstableBootstrapServerSideBreakpointDefinitions,
	isBaseBreakpoint,
	getBaseBreakpoint,
	applyHooks,
	withBlockSettings,
	extensionsStore,
	CssGenerator,
} from '@blockera/editor';

bootstrapEditor();
```

Major surfaces:

| Area | Examples |
|------|----------|
| Bootstrap | `bootstrapEditor`, `bootstrapTabs`, `bootstrapPreviewMode`, `bootstrapZoom`, … |
| Breakpoints | `isBaseBreakpoint`, `getBaseBreakpoint`, `BreakpointsSettings`, `setupCanvasSettings` |
| Extensions | `applyHooks`, `withBlockSettings`, `defineGlobalProps`, `blockeraExtensionsBootstrap`, style/extension classes |
| Style engine | `CssGenerator`, `getCompatibleBlockCssSelector`, style components / media hooks |
| Base | store, hooks, components, `Observer` |

Several submodule imports **auto-register** editor plugins. Command-bar and some utils are export-only — follow existing bootstrap call sites.

---

## PHP API (high level)

| Symbol | Role |
|--------|------|
| `StyleEngine` | Server-side style generation |
| `StyleDefinitions\*` | Background, border, typography, spacing, transforms, filters, layout, … |
| `StyleDefinitionsProvider` | Registers definitions |
| `EditorPersistenceStore` | Persistence |
| `TemplatePreview` / `PreviewButton` | Preview UX |
| `TabLocking` / `BulkActions` | Editor UX helpers |
| Breakpoint / CSS selector helpers | Autoloaded from `helpers.php` |

---

## Agent rules

- Call dedicated bootstrap functions **once**; preserve startup order used by `@blockera/blockera`.
- Treat `unstableBootstrapServerSideBreakpointDefinitions` as internal/unstable.
- Prefer public extension points (`applyHooks`, extension classes, style definitions) over DOM hacks or private Gutenberg patches.
- When researching Gutenberg behavior, use `source-code-block-editor/` first (Blockera plugin convention).

---

## Related packages

- `@blockera/blockera` — application entry
- `@blockera/controls`, `@blockera/data`, `@blockera/classnames`, `@blockera/utils`
- `@blockera/blocks-core`, `@blockera/features-core`, `@blockera/global-styles-ui`
- `@blockera/storage` — tabs/zoom/cache client persistence
