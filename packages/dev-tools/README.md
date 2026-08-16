# `@blockera/dev-tools`

Shared development tooling for Blockera packages and themes:

- Package webpack configs (JS + style entries)
- ESLint `@blockera/*` import resolver
- Modular `theme.json` merge/check CLI
- Block patterns normalize/check CLI
- Shared `git-conventional-commits.yaml` (husky `commit-msg` via `--config`)
- Shared ambient TypeScript types (`types/blockera/`) loaded from host `tsconfig.json` via `tsconfig.base.json`
- Shared Flow templates (`flow/`) written to the host `.flowconfig` by `project:bootstrap`
- Shared `.cspell/` and `.vscode/` templates written by `project:bootstrap` `sync-config`
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
│   ├── patterns/                # normalize-patterns CLI
│   ├── typescript/              # shared tsconfig.base.json
│   ├── flow/                    # write-flowconfig CLI
│   ├── cspell/                  # write-cspell CLI
│   ├── vscode/                  # write-vscode CLI
│   ├── sync-config/             # copy-template-dir helper
│   └── bootstrap/               # project:bootstrap CLI
├── cspell/
│   └── words.txt                # host .cspell/words.txt
├── vscode/
│   ├── settings.json
│   ├── extensions.json
│   └── tasks.json
├── flow/
│   ├── flowconfig.base          # shared Flow ignore + name mappers
│   ├── overlays/                # per-host extras (optional)
│   ├── TypeScriptModule.js.flow
│   └── WebpackAsset.js.flow
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
bash "$(dirname -- "$0")/../packages/global-packages/packages/dev-tools/github/scripts/run-typecheck-pre-commit.sh"
```

Runs `tsc --noEmit` when `tsconfig.json` exists and `flow status` when `.flowconfig` exists, only if staged files include `.ts`/`.tsx`/`.js`/`.jsx`. Skip with `BLOCKERA_SKIP_TYPECHECK=1`.

### Code Lint CI typecheck

Host `.github/workflows/code-lint.yml` matrix should include `suite: ts` and `suite: flow` (both `setup: node`). The workflow already runs:

```sh
bash packages/global-packages/packages/dev-tools/github/scripts/jobs/code-lint/${{ matrix.suite }}.sh
```

- `ts.sh` runs `npm run typecheck` when `tsconfig.json` exists (`BLOCKERA_TYPECHECK_TS_CMD` to override)
- `flow.sh` runs `npm run flow` when `.flowconfig` exists (`BLOCKERA_TYPECHECK_FLOW_CMD` to override)

### Project bootstrap

Host `npm run start` should run `project:bootstrap` first. Do not use npm lifecycle `prepare` (that stays `husky install`).

```sh
node packages/global-packages/packages/dev-tools/js/bootstrap/bootstrap-project.js --project=<id>
```

`--project` must be one of: `blockera`, `blockera-pro`, `blockera-one`, `blockera-site-toolkit`.

Steps (cwd = host repo root):

1. Remove `dist/`
2. Wipe `.cursor/`, copy `cursor/shared/`, then copy `cursor/<project>/` (overlay add/overwrite). Skip `.gitkeep`.
3. Symlink `source-codes` → `BLOCKERA_EXTERNAL_SOURCE_CODES_PATH` from host `.env`. Unset, placeholder, or missing path → **fail** with a setup guide. Existing `source-codes` (dir or symlink) is always removed first.
4. `sync-config` — write host config files from shared templates. Inner steps:
   - `.flowconfig` from `flow/flowconfig.base` + `flow/overlays/<project>`.
   - `flow/` stubs (`TypeScriptModule.js.flow`, `WebpackAsset.js.flow`).
   - `.cspell/` from `cspell/words.txt` (overwrites the host folder).
   - `.vscode/` from `vscode/` (overwrites the host folder).
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
- Ambient TypeScript declarations belong in `types/blockera/`. Edit them only from the blockera-one global-packages checkout; never recreate a host-repo `types/` folder.
- Flow templates belong in `dev-tools/flow/`. Never hand-edit the host `.flowconfig` or `flow/` stubs; run `project:bootstrap` and commit the generated files.
- `.cspell/` and `.vscode/` templates belong in `dev-tools/cspell/` and `dev-tools/vscode/`. Never hand-edit the host copies; run `project:bootstrap` and commit the generated folders.

---

## Related packages

- All runtime `@blockera/*` packages (build consumers)
- Themes such as Blockera One (`theme-config/` + patterns)
- `@blockera/dev-jest` — unit test config companion
