# Blockera global packages

Canonical monorepo of shared Blockera packages under `packages/`.

Prefer each package’s own `README.md` for API details, usage, and AI-agent notes.

---

## How this repo is organized

| Kind | Examples |
|------|----------|
| Runtime JS/PHP libraries | `editor`, `controls`, `data`, `utils`, … |
| Application entries (side-effect boots) | `blockera`, `blockera-admin`, `plugin-compatibility` |
| Feature packages | `features-core`, `features-library/icon` |
| Dev tooling | `dev-jest`, `dev-cypress`, `dev-playwright`, `dev-phpunit`, `dev-tools` |
| Infrastructure | `autoloader-coordinator`, `http`, `exceptions` |
| Stubs / containers | `blocks-library`, `features-library` (root) |

Root npm package: `@blockera/global-packages` (private). Packages are referenced with `file:packages/...` — this is **not** an npm `workspaces` monorepo.

Node `>=20.19.0`, npm `>=10`. PHP `>=7.4` for Composer tooling.

---

## Documented packages

| Package | Path | Summary |
|---------|------|---------|
| [`blockera/autoloader-coordinator`](./packages/autoloader-coordinator/README.md) | `packages/autoloader-coordinator` | Coordinates shared Composer autoload across products (PHP-only). |
| [`@blockera/blockera`](./packages/blockera/README.md) | `packages/blockera` | Main editor application bootstrap entry (side effects). |
| [`@blockera/blockera-admin`](./packages/blockera-admin/README.md) | `packages/blockera-admin` | WP admin settings/dashboard app. |
| [`@blockera/blocks-core`](./packages/blocks-core/README.md) | `packages/blocks-core` | Core/Woo/third-party block extension definitions. |
| [`blocks-library`](./packages/blocks-library/README.md) | `packages/blocks-library` | **Stub** placeholder for future block libraries. |
| [`@blockera/bootstrap`](./packages/bootstrap/README.md) | `packages/bootstrap` | JS `initializer()` + PHP application/container foundation. |
| [`@blockera/classnames`](./packages/classnames/README.md) | `packages/classnames` | Prefixed CSS classname generators. |
| [`@blockera/controls`](./packages/controls/README.md) | `packages/controls` | Shared React control components + control store. |
| [`@blockera/data`](./packages/data/README.md) | `packages/data` | Entities, variables, dynamic values, theme.json tokens store. |
| [`@blockera/data-editor`](./packages/data-editor/README.md) | `packages/data-editor` | Tokenized path get/update helpers (JS + PHP). |
| [`@blockera/dev-cypress`](./packages/dev-cypress/README.md) | `packages/dev-cypress` | Cypress helpers, support, plugins, CT webpack. |
| [`@blockera/dev-jest`](./packages/dev-jest/README.md) | `packages/dev-jest` | Shared Jest config, transforms, mocks. |
| [`@blockera/dev-phpunit`](./packages/dev-phpunit/README.md) | `packages/dev-phpunit` | PHPUnit bootstrap, `AppTestCase`, snapshot drivers. |
| [`@blockera/dev-playwright`](./packages/dev-playwright/README.md) | `packages/dev-playwright` | Playwright utils + global setup (prefer subpath imports). |
| [`@blockera/dev-tools`](./packages/dev-tools/README.md) | `packages/dev-tools` | Webpack, ESLint resolver, theme.json & patterns CLIs. |
| [`@blockera/editor`](./packages/editor/README.md) | `packages/editor` | Gutenberg extension layer (stores, style engine, plugins). |
| [`@blockera/env`](./packages/env/README.md) | `packages/env` | Experimental config path reader (not secrets). |
| [`@blockera/exceptions`](./packages/exceptions/README.md) | `packages/exceptions` | Shared PHP `BaseException`. |
| [`@blockera/features-core`](./packages/features-core/README.md) | `packages/features-core` | Feature registry / lifecycle (JS + PHP). |
| [`features-library`](./packages/features-library/README.md) | `packages/features-library` | Feature package container (**root is stub**). |
| [`@blockera/feature-icon`](./packages/features-library/icon/README.md) | `packages/features-library/icon` | Icon feature implementation. |
| [`@blockera/global-styles-ui`](./packages/global-styles-ui/README.md) | `packages/global-styles-ui` | Site Editor global styles / preset UI (TS). |
| [`blockera/http`](./packages/http/README.md) | `packages/http` | PHP REST routes + `RestController` (no JS API). |
| [`@blockera/icons`](./packages/icons/README.md) | `packages/icons` | Icon libraries, search, SVG preparation. |
| [`@blockera/plugin-compatibility`](./packages/plugin-compatibility/README.md) | `packages/plugin-compatibility` | Free/Pro version compatibility gate + admin UI. |
| [`@blockera/storage`](./packages/storage/README.md) | `packages/storage` | Site/user-scoped `localStorage` / `sessionStorage`. **Do not use native browser storage.** |
| [`@blockera/telemetry`](./packages/telemetry/README.md) | `packages/telemetry` | Opt-in telemetry, jobs, bug reporter. |
| [`@blockera/utils`](./packages/utils/README.md) | `packages/utils` | Shared JS/PHP utilities. |
| [`@blockera/wordpress`](./packages/wordpress/README.md) | `packages/wordpress` | WP admin UI + server integrations (assets, render, media). |

---

## Conventions for AI agents & contributors

1. **Read the package README** before changing public APIs or inventing parallel helpers.
2. **Side-effect entries** (`blockera`, `blockera-admin`, `plugin-compatibility`, some editor submodules) must not be imported as utility libraries or executed twice.
3. Prefer **public exports** and existing bootstrap/filter/provider hooks over private deep imports or Gutenberg DOM hacks.
4. Keep **JS ↔ PHP contracts** in sync (storage key format, icon objects, SVG codecs, experimental paths).
5. For editor/Gutenberg research in the main plugin, use `source-code-block-editor/` / `source-code-wordpress/` per Blockera development rules.
6. After changing a synced package, run the folder-sync process so consumers stay aligned.

---

## Adding or updating docs

When documenting a package for agents/developers:

1. Put the full guide in `packages/<name>/README.md` (follow `@blockera/storage` as the quality bar).
2. Add or update the one-line row in the table above.
3. Call out stubs, missing entry files, and unstable (`unstable*`) APIs explicitly.
