# `@blockera/wordpress`

WordPress-specific admin UI components and server-side integrations for Blockera.

Assets loading, admin menus, block rendering pipeline, patterns, SVG uploads, and outbound HTTP (`Sender`).

---

## Why it exists

Pure editor packages should not own CMS concerns. This package isolates WordPress admin/frontend lifecycle code (menus, media, render_block, patterns) and shared admin React chrome.

---

## Package layout

```text
packages/wordpress/
├── js/
│   └── admin/
│       ├── components/          # Header, Sidebar, Tabs, …
│       ├── context/             # SettingsContext
│       └── helpers/
├── php/
│   ├── Admin/ Media/ Patterns/ RenderBlock/
│   ├── AssetsLoader.php Sender.php
│   └── functions.php
├── package.json                 # @blockera/wordpress
└── composer.json                # blockera/wordpress
```

| Side | Package name | Entry |
|------|----------------|-------|
| JS | `@blockera/wordpress` | `js/index.js` |
| PHP | `blockera/wordpress` | PSR-4 `Blockera\WordPress\` + `php/functions.php` |

---

## JS API

```js
import {
	SettingsContext,
	Header,
	Sidebar,
	Tabs,
	Update,
	Promote,
	AdminFeatureWrapper,
} from '@blockera/wordpress';
```

Admin helpers are also re-exported through the package root.

---

## PHP API (high level)

| Symbol | Role |
|--------|------|
| `AssetsLoader` | Script/style loading |
| `Sender` | Outbound HTTP requests |
| `Admin\Menu\Factory` | Admin menus |
| `Media\SvgUpload` | SVG upload handling |
| `Patterns\DirectoryRegistrar` | Pattern directories |
| `RenderBlock\*` (`Setup`, `Render`, `SavePost`, `ContentCleanup`, `QueryLoopContext`) | Server render pipeline |
| Global helpers in `functions.php` | WP utility functions |

---

## Agent rules

- Use only inside a loaded WordPress admin/frontend lifecycle.
- Server rendering and media classes register or alter WP behavior — do not instantiate casually in shared non-WP code.
- Prefer this package for admin chrome instead of duplicating Header/Sidebar in feature packages.

---

## Related packages

- `@blockera/blockera`, `@blockera/blockera-admin`, `@blockera/bootstrap`
- `@blockera/classnames`, `@blockera/controls`, `@blockera/http`
