# `@blockera/dev-tools`

Shared development tooling for Blockera packages and themes:

- Package webpack configs (JS + style entries)
- ESLint `@blockera/*` import resolver
- Modular `theme.json` merge/check CLI
- Block patterns normalize/check CLI
- Shared `git-conventional-commits.yaml` (husky `commit-msg` via `--config`)

---

## Why it exists

Consumers must build packages and themes with the same webpack/SVGO/merge rules. Resolving build deps from the **consumer** `process.cwd()` avoids loading a second incompatible webpack from this shared package.

---

## Package layout

```text
packages/dev-tools/
├── js/
│   ├── index.js                 # Factory: webpack + eslint resolver
│   ├── webpack/                 # packages, styles, SVGO, plugins
│   ├── eslint/import-resolver.js
│   ├── theme-json/              # merge-theme-json CLI
│   └── patterns/                # normalize-patterns CLI
├── php/
│   └── functions.php            # Composer placeholder
├── git-conventional-commits.yaml # Shared conventional-commit types
├── package.json                 # @blockera/dev-tools
└── composer.json                # blockera/dev-tools
```

### Conventional commits

Source of truth: `git-conventional-commits.yaml` in this package.

Consumers should point husky at it (no root copy):

```sh
node_modules/git-conventional-commits/cli.js commit-msg-hook \
	--config packages/global-packages/packages/dev-tools/git-conventional-commits.yaml \
	"$1"
```

---

## JS API

```js
const createDevTools = require( '@blockera/dev-tools' );

const {
	packagesWebpackConfig,
	packagesStylesWebpackConfig,
	eslintImportResolver,
} = createDevTools();
```

### Webpack

`packagesWebpackConfig` / `packagesStylesWebpackConfig` are `(env, argv) => config` factories.

- Resolve tooling from consumer root (`argv.projectRoot` / `process.cwd()`)
- Emit build outputs in the **consumer**, not this package
- Dev packages’ SCSS is excluded from generated package style entries by design

### Theme JSON CLI

```bash
node packages/dev-tools/js/theme-json/merge-theme-json.js --check
```

`theme-config/` is the source of truth; generated `theme.json` must be checked for drift. Exports include build/merge/check/sort helpers.

### Patterns CLI

```bash
node packages/dev-tools/js/patterns/normalize-patterns-cli.js --check
```

Supports `--check`, `--force`, `--debug`, `--quiet`, `--text-domain`, `--uri-php`.

---

## Agent rules

- Always resolve webpack/eslint deps from the consuming project — never assume this package’s `node_modules`.
- Do not commit generated `theme.json` drift; run `--check` in CI.
- Keep style-entry generation exclusions for `dev-*` packages.

---

## Related packages

- All runtime `@blockera/*` packages (build consumers)
- Themes such as Blockera One (`theme-config/` + patterns)
- `@blockera/dev-jest` — unit test config companion
