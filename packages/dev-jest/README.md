# `@blockera/dev-jest`

Shared Jest configuration, setup scripts, transformers, and mocks for Blockera JavaScript unit tests.

> Older README text mentioning Storybook was incorrect — this package is Jest-only.

---

## Why it exists

All Blockera packages need the same Jest/WordPress preset, asset transforms, and compatibility mocks. Centralizing the config avoids each package inventing divergent test setups.

---

## Package layout

```text
packages/dev-jest/
├── js/
│   ├── jest.config.js           # Primary public artifact
│   ├── setup-text-encoding.js
│   ├── setup-jsdom-css.js
│   ├── transformers/            # assets, SVG, CSS, raw CSS
│   └── __mocks__/               # WP theme, SVG, Bootstrap breakpoints, …
└── package.json                 # @blockera/dev-jest (no Composer)
```

> `main: "js/index.js"` may be missing — consume via the config path, not the package root.

---

## Usage

From the monorepo / consumer root (example):

```bash
wp-scripts test-unit-js --config packages/dev-jest/js/jest.config.js
```

Root scripts typically expose `test:js`, `test:js:watch`, and `test:js:coverage`.

Config highlights:

- `@wordpress/jest-preset-default`
- Tests under `packages/**` matching `test/**/*.spec.js` or `tests/**/*.spec.js`
- Maps `@blockera/experimental-config`
- Ignores `source-code-block-editor` and `source-code-wordpress` trees
- Compatibility mappings for WordPress theme ESM and `uuid` CJS

---

## Agent rules

- Keep test files in the expected `test/` or `tests/` `*.spec.js` patterns.
- Do not remove source-tree ignores for Gutenberg/WordPress source mirrors.
- Add a dedicated transformer/mock only when generic asset/CSS handling is insufficient.
- Preserve `uuid` / theme ESM workarounds unless you verify Jest still resolves them.

---

## Related packages

- `@blockera/dev-tools` — ESLint import resolver / webpack for packages
- `@blockera/dev-cypress`, `@blockera/dev-playwright` — E2E counterparts
