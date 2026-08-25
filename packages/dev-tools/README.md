# `@blockera/dev-tools`

Shared development tooling for Blockera packages and themes:

- Package webpack configs (JS + style entries)
- ESLint `@blockera/*` import resolver
- Modular `theme.json` merge/check CLI
- Block-markup normalize/check/prettier CLI (patterns + templates)
- Shared `git-conventional-commits.yaml` (husky `commit-msg` via `--config`)
- Shared ambient TypeScript types (`types/blockera/`) loaded from host `tsconfig.json` via `tsconfig.base.json`
- Shared `root-configs/` templates written by `project:bootstrap` (`Configure project files`)
- Shared husky pre-commit TypeScript/Flow typecheck (`github/scripts/run-typecheck-pre-commit.sh`)
- Shared Code Lint TypeScript/Flow jobs (`github/scripts/jobs/code-lint/ts.sh`, `flow.sh`)
- Shared Cursor templates (`cursor/`) materialized by `project:bootstrap`
- Host `project:bootstrap` (`js/bootstrap/bootstrap-project.js`)

---

## Why it exists

Consumers must build packages and themes with the same webpack/SVGO/merge rules. Resolving build deps from the **consumer** `process.cwd()` avoids loading a second incompatible webpack from this shared package.

---

## Package layout

```text
packages/dev-tools/
├── cursor/
│   ├── shared/                  # global shared templates (copy first)
│   ├── blockera/                # overlay (.gitkeep until customized)
│   ├── blockera-pro/            # overlay (.gitkeep until customized)
│   ├── blockera-one/            # overlay
│   └── blockera-site-toolkit/   # overlay (.gitkeep until customized)
├── js/
│   ├── index.js                 # Factory: webpack + eslint resolver
│   ├── webpack/                 # packages, styles, SVGO, plugins
│   ├── eslint/import-resolver.js
│   ├── theme-json/              # merge-theme-json CLI
│   ├── block-markup/            # pattern + template normalize CLI + sanitizers
│   ├── typescript/              # shared tsconfig.base.json
│   ├── root-configs/            # write-root-configs CLI
│   ├── sync-config/             # copy-template-dir / copy-template-file
│   └── bootstrap/               # project:bootstrap CLI
├── root-configs/                # host-tree templates (files + folders)
├── types/
│   └── blockera/                # ambient .d.ts for all host repos
├── github/scripts/              # husky pre-commit typecheck, pre-push pin checks
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

### Pre-commit typecheck

After `npx lint-staged`, host `.husky/pre-commit` should call:

```sh
TYPECHECK_SH="$(dirname -- "$0")/../packages/global-packages/packages/dev-tools/github/scripts/run-typecheck-pre-commit.sh"
if [ -f "${TYPECHECK_SH}" ]; then
	bash "${TYPECHECK_SH}"
fi
```

Runs `tsc --noEmit` when `tsconfig.json` exists and `flow status` when `.flowconfig` exists, only if staged files include `.ts`/`.tsx`/`.js`/`.jsx`. Skip with `BLOCKERA_SKIP_TYPECHECK=1`. If the script is missing (older submodule pin), the hook continues.

### Code Lint CI typecheck

Host `.github/workflows/code-lint.yml` matrix should include `suite: ts` and `suite: flow` (both `setup: node`). The workflow already runs:

```sh
bash packages/global-packages/packages/dev-tools/github/scripts/jobs/code-lint/${{ matrix.suite }}.sh
```

- `ts.sh` runs `npm run typecheck` when `tsconfig.json` exists (`BLOCKERA_TYPECHECK_TS_CMD` to override)
- `flow.sh` runs `npm run flow` when `.flowconfig` exists (`BLOCKERA_TYPECHECK_FLOW_CMD` to override)

### Project bootstrap

Host `npm run start` should run `project:bootstrap --watch` (then webpack). Do not use npm lifecycle `prepare` (that stays `husky install`).

```sh
node packages/global-packages/packages/dev-tools/js/bootstrap/bootstrap-project.js --project=<id>
```

`--project` must be one of: `blockera`, `blockera-pro`, `blockera-one`, `blockera-site-toolkit`.

Steps (cwd = host repo root):

1. `Prepare workspace` — remove generated state (`dist/`, `.cache/`, `.cursor/`, Cypress/Playwright reports, coverage, snapshot diffs, test caches). Stdout is one count line; path names go to `.cache/watch-bootstrap.log`.
2. `Configure project files` — write host files. Inner steps: symlink `source-codes` → `BLOCKERA_EXTERNAL_SOURCE_CODES_PATH` from host `.env` (unset, placeholder, or missing path → **fail** with a setup guide; existing `source-codes` is always removed first); wipe `.cursor/` and copy `cursor/shared/` then `cursor/<project>/` (overlay add/overwrite, skip `.gitkeep`); then copy `root-configs/` (mirrors the host tree; each path is its own inner step). Folders (`.cspell/`, `.vscode/`, `.husky/`, `flow/`) overwrite the host folder. `cypress/support/component-index.html` does not wipe the rest of `cypress/`. Husky hook scripts are chmod 0755. `{{PROJECT_ID}}` is replaced with `--project`. Entries with `projects` write only for those `--project` ids (later entries with the same `dest` overwrite). `.gitignore` prepends `.gitignore.<project>` extras when that overlay exists, then the shared section. Shared + overlay: `.editorconfig`, `.env.example`, `.eslintrc.js`, `.gitignore`, `cypress.config.js`, `cypress.env-example.json`, Playwright examples, `.pr-cypress.env-example.json`, `.pr-env.example.json` (`blockera-one` only), `.pr-workflows.example.json`.
   Commit these files (CI / the editor need them). Do not gitignore them. Edit the templates here, then re-run bootstrap.

`.cursor/` and `source-codes/` are gitignored generated paths. Edit templates here, not in the host `.cursor` folder.

`.env.example` should include:

```
BLOCKERA_EXTERNAL_SOURCE_CODES_PATH=/absolute/path/to/shared/source-codes
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

### Block-markup CLI

Tokenized defaults live in `js/block-markup/base-config.js` (prettier / sanitize / localize). Products add `.block-markup.config.js` at the product root (`textDomain`, dirs, sparse token overrides). Unset `patternsDirs` / `templatesDirs` means that product has no patterns / templates.

`localize.skipStamps` (default stamp id `meta-separator`) skips i18n wrapping for inner HTML of those Gutenberg blocks. Matching uses `metadata.blockeraOne.stamp` and the same grammar as theme stamps: skip list entries may be the id (`meta-separator`), `role/id` (`container/meta-separator`), or a full `role/id:variant`. Inner text is not inspected — custom glyphs in child themes stay untranslated. Existing `esc_html_e` inside a skipped stamp is unwrapped on the next localize pass. Add ids in the product `.block-markup.config.js` (`stamps` replaces the base list). Set `enabled: false` to wrap them.

Prettier post-process flags (all `true` in the base config; set `false` in the product file to skip a pass):

```js
prettier: {
  enabled: true,
  skipWhenMarkupHasPhp: true,
  indentGutenbergComments: true,
  collapseTextOnlyTags: true,
  quoteJsonHtmlAttributes: true, // data-wp-context="{ "id": "x" }" → single quotes
  indentSvgElements: true, // format svg / path trees
  wrapMixedInlineParents: true, // wrap <a> text + svg; align </a>
  breakFormControlTags: true, // img /><button → button on its own line
},
```

```bash
node packages/dev-tools/js/block-markup/normalize-block-markup-cli.js --check
node packages/dev-tools/js/block-markup/normalize-block-markup-cli.js --prettier-only
```

Supports `--check`, `--prettier-only`, `--force`, `--debug`, `--quiet`, `--text-domain`, `--uri-php`.

Host scripts: `block-markup:normalize`, `block-markup:check`, `block-markup:prettier`.

PHPUnit HTML snapshots (`HtmlDriver`) pipe actual markup through `prettify-stdin.js` before compare/update. wp-env `tests-wordpress` has no Node, so `ensure-wp-env-node.js` drops a Linux binary at `<product>/.cache/wp-env-node`.

Templates (`templatesDirs`) run prettier + sanitize only. Disable a sanitizer token from the product file:

```js
sanitize: {
  blocks: {
    'core/query': {
      attrs: { queryId: { enabled: false } },
      // or enabled: false — every core/query sanitizer
    },
  },
},
```

---

## Agent rules

- Always resolve webpack/eslint deps from the consuming project — never assume this package’s `node_modules`.
- Do not commit generated `theme.json` drift; run `--check` in CI.
- Keep style-entry generation exclusions for `dev-*` packages.
- Ambient TypeScript declarations belong in `types/blockera/`. Edit them only from the blockera-one global-packages checkout; never recreate a host-repo `types/` folder.
- Host config templates belong in `dev-tools/root-configs/` (including `.flowconfig` and `flow/` stubs). Never hand-edit the host copies; run `project:bootstrap` and commit the generated files.

---

## Related packages

- All runtime `@blockera/*` packages (build consumers)
- Themes such as Blockera One (`theme-config/` + patterns)
- `@blockera/dev-jest` — unit test config companion
