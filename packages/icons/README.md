# `@blockera/icons`

Icon assets, libraries, normalization, SVG preparation, and indexed search for Blockera UI.

Libraries include WordPress/Dashicons, Untitled UI, Blockera UI, Cursor, and related sets — with mirrored PHP access for server rendering.

---

## Why it exists

Controls, the icon feature, and global-styles UI need a single way to resolve icons by library/id, prepare SVG for storage, and search indexes without each feature shipping its own icon pack.

---

## Package layout

```text
packages/icons/
├── js/
│   ├── index.js
│   ├── icon.js icon-library.js icon-search.js
│   ├── library-{ui,wp,untitledui,blockera,cursor}/
│   └── ...                     # Generated search JSON
├── php/
│   └── IconsManager.php
├── package.json                # @blockera/icons
└── composer.json               # blockera/icons
```

| Side | Package name | Entry |
|------|----------------|-------|
| JS | `@blockera/icons` | `js/index.js` |
| PHP | `blockera/icons` | PSR-4 `Blockera\Icons\` |

---

## JS API

```js
import {
	Icon,
	getIcon,
	isValidIcon,
	createStandardIconObject,
	getIconLibrary,
	getIconLibraryIcons,
	iconSearch,
	prepareIconSearchQuery,
	prepareIconSvgForStorage,
	extractSvgMarkup,
} from '@blockera/icons';

const results = iconSearch( 'arrow' );
```

| Group | Examples |
|-------|----------|
| Lookup | `Icon`, `getIcon`, `isValidIcon`, `createStandardIconObject` |
| Libraries | `isValidIconLibrary`, `getIconLibrary`, `getIconLibraryIcons`, `getIconLibrarySearchData` |
| Search | `iconSearch`, `prepareIconSearchQuery` |
| SVG | `isStrokeIconLibrary`, `prepareIconSvgForStorage`, `extractSvgMarkup`, `getIconKebabId` |
| Registries | `IconLibrariesList`, `NativeIconLibrariesList` |

---

## PHP API

`Blockera\Icons\IconsManager` methods mirror JS:

`isValidIconLibrary`, `getIconLibrary`, `getIconLibraryIcons`, `getIcon`, `createStandardIconObject`.

- WP library returns Dashicons markup.
- Non-WP libraries read SVG files from disk.

---

## Agent rules

- Do **not** hand-edit generated search-index JSON — regenerate via the package’s tooling/process.
- Keep JS and PHP icon object shapes in sync (`createStandardIconObject`).
- Prefer this package over inlining SVG strings in controls/features.

---

## Related packages

- `@blockera/controls`, `@blockera/feature-icon` (`packages/features-library/icon`)
- `@blockera/global-styles-ui`, `@blockera/editor`
