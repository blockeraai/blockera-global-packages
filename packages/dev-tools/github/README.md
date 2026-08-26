# Shared GitHub CI for Blockera consumers

Small shared scripts and setup actions for repos that use this monorepo as a
sparse submodule at `packages/global-packages`.

**Shared scripts have no product styles.** Consumers pass scan roots, package
filters, and other knobs via `with:` / `env:` / CLI flags. Generic defaults
(e.g. scan `packages` + `tests`) are runner conventions, not plugin/pro/theme
presets.

This repository also runs its own PHPUnit workflow (`.github/workflows/php-unit-tests.yml`)
for shared-package tests that must not live in consumer suites (currently
`packages/autoloader-coordinator/php/tests` and `packages/products/php/tests`).

## Consumer keeps

1. **Thin workflows** — triggers, concurrency, repository guard
2. **Bootstrap action** — `.github/actions/ensure-global-packages/` (via `sync-consumer-bootstrap.sh`); required before the submodule tree exists
3. **Call shared actions/jobs** — under `packages/global-packages/packages/dev-tools/github/`

Typical job steps:

```yaml
- uses: actions/checkout@v5
  with:
      token: ${{ secrets.BLOCKERABOT_PAT }}
- name: Ensure global-packages submodule
  uses: ./.github/actions/ensure-global-packages
- uses: ./packages/global-packages/packages/dev-tools/github/actions/setup-node
# or setup-php / update-assets / other shared actions…
```

## Layout

```
github/
  actions/
    setup-node/              # after ensure
    setup-php/               # after ensure
    update-assets/           # WordPress.org asset/readme update
    jest-unit-tests/
    pr-workflow-gate/        # .pr-workflows.json allowedActions filter
    bundle-size/         # path gate + setup + prepare + report + title
    create-demo-attachments/  # zip + playground comment
    performance-benchmark/    # setup + server-timing/editor suites
    plugin-check/             # PCP: setup + zip extract + wordpress/plugin-check-action
    php-security-check/       # Symfony security-checker + cache
    virus-total/              # setup + zip + crazy-max/ghaction-virustotal
    wp-tested-up-to-update/   # AlecRust/wp-tut-updater-action wrapper
    build-plugin-zip/         # setup + zip + upload-artifact (release build job)
    generate-build-plugin-zip/ # generate+run bin zip builder only
    build-plugin-zip-tests/   # setup + zip + stage fixtures + Cypress build E2E
  scripts/
    jobs/code-lint/      # js.sh | css.sh | php.sh
    jobs/bundle-size/    # paths.default | should-run.sh | prepare.sh | comment-title.sh | truncate-comment-body.js
    jobs/check-debugging-code/  # run.sh
    jobs/check-pr-config-files/ # run.sh
    jobs/remove-pr-config-files/ # run.sh
    jobs/pr-workflows/          # should-run.sh (allowedActions gate)
    jobs/create-demo-attachments/ # build/publish/encode/comment/cleanup
    jobs/cypress-components-tests/ # run.sh
    jobs/cypress-e2e-tests/      # detect | run | prepare.sh
    jobs/performance-benchmark/  # setup.sh | run-*.sh | stop.sh
    jobs/php-snapshots/          # compute-previous-wordpress-version.sh | run.sh
    jobs/php-unit-tests/         # run.sh
    jobs/playwright-e2e-tests/   # detect-categories.sh | run.sh | collect-baselines.sh
    jobs/plugin-check/           # prepare-build.sh
    jobs/sync-global-packages-submodule/  # resolve | run-bump | commit | open-pr
    jobs/upload-release-to-plugin-repo/   # compute-release-branch.sh | publish-to-svn.sh (plugin + theme SVN via BLOCKERA_UPLOAD_SVN_LAYOUT)
    jobs/upload-release-to-blockeraai/    # publish.sh (Pro → Blockera AI)
    jobs/build-plugin-zip/                # version bump / notes / revert helpers
    jobs/build-plugin-zip-tests/          # find-specs | prepare-build-env | run-e2e
    ensure-*.sh / bump-*.sh / retry-*.sh   # used in-place from toolkit
    actions/ensure-global-packages/         # source for consumer bootstrap action
    setup-wp-env.js
    download-artifact.sh / create-wp-env.js       # merge wp-env-configs + .pr-env.json
    list-test-categories.js / list-visual-snapshot-batches.js
    lib/                     # walk-files, list-test-categories, retry.sh, package-match
    sync-consumer-bootstrap.sh
  workflows/             # Blockera-base templates
```

Consumer has **no** `.github/scripts/`. The only consumer-local bootstrap is
`.github/actions/ensure-global-packages/` (chicken-and-egg: the submodule is not
available until ensure runs). Everything else is invoked from
`packages/global-packages/packages/dev-tools/github/…`.

## Local wp-env (`setup-wp-env.js`)

Used by consumer `npm run env:start` (local only). Copies
`.github/wp-env-configs/<name>.json` → `.wp-env.json`. No-op when `CI` is set.

| Env (host `.env`) | Default |
| --- | --- |
| `WP_ENV_CONFIG` | `development` (file: `.github/wp-env-configs/development.json`) |
| `WP_ENV_PORT` | unset — wp-env default `8888`; set unique values when multiple local envs run on one machine |
| `WP_ENV_TESTS_PORT` | unset — wp-env default `8889` |

Example (host `.env`, local only):

```env
WP_ENV_PORT=8890
WP_ENV_TESTS_PORT=8891
```


## Code lint

```yaml
steps:
    - uses: actions/checkout@v5
      with:
          token: ${{ secrets.BLOCKERABOT_PAT }}
    - uses: ./.github/actions/ensure-global-packages
    - if: matrix.setup == 'node'
      uses: ./packages/global-packages/packages/dev-tools/github/actions/setup-node
    - if: matrix.setup == 'php'
      uses: ./packages/global-packages/packages/dev-tools/github/actions/setup-php
    - run: bash packages/global-packages/packages/dev-tools/github/scripts/jobs/code-lint/${{ matrix.suite }}.sh
```

| Env | Default |
| --- | --- |
| `BLOCKERA_LINT_JS_CMD` | `npm run lint:js` |
| `BLOCKERA_LINT_CSS_CMD` | `npm run lint:css` |
| `BLOCKERA_SCSS_ROOT` | `./packages` |
| `BLOCKERA_SCSS_GLOB` | `*.scss` |
| `BLOCKERA_PHPCS_CMD` | `phpcs --report-full --report-checkstyle=./.cache/phpcs-report.xml --standard=phpcs.xml` |
| `BLOCKERA_PHPCS_REPORT` | `./.cache/phpcs-report.xml` |
| `BLOCKERA_COMPOSER_POLICY_LABEL` | `code-lint/php` (log prefix for setup-php composer checks) |

## Setup PHP

Strips `wp-cli/wp-cli-bundle` from composer files **before** `platform.php` is overridden,
then runs `ramsey/composer-install` (wp-env images ship WP-CLI globally). Uses
`composer remove --no-install` so `composer.json` and `composer.lock` stay in sync;
do not jq-prune the lock (that orphans transitive packages such as `composer/composer`).

Jobs that run after `setup-php` can call
`scripts/lib/verify-setup-php-composer-policy.sh` to assert wp-cli is absent and the
lock still matches `composer.json`.

| Input | Default |
| --- | --- |
| `php-version` | `7.4` |
| `composer-options` | empty |

## PHP unit tests

Reuses `php-snapshots/compute-previous-wordpress-version.sh` for optional previous-WP matrix rows.

| Env | Default (Blockera base) |
| --- | --- |
| `BLOCKERA_PHP_UNIT_PHP_VERSION` | matrix PHP |
| `BLOCKERA_PHP_UNIT_TEST_CMD` | `npm run test:unit:php` |
| `BLOCKERA_PHP_UNIT_MIN_TESTS` | `54` |
| `BLOCKERA_PHP_UNIT_SKIP_IF_NO_TESTS` | `false` |

## PHP snapshots

| Env | Default (Blockera base) |
| --- | --- |
| `BLOCKERA_PHP_SNAPSHOTS_PHP_VERSION` | matrix PHP (e.g. `8.2`) |
| `BLOCKERA_PHP_SNAPSHOTS_TEST_CMD` | `npm run test:snapshots:php` |
| `BLOCKERA_PHP_SNAPSHOTS_FIXTURES_DIR` | `tests/fixtures` |
| `BLOCKERA_PHP_SNAPSHOTS_ON_EMPTY` | `fail` (`skip` for theme-style empty suites) |

## Performance benchmark

Matrix stays in the consumer workflow; suite logic lives in
`actions/performance-benchmark` + `scripts/jobs/performance-benchmark/*`.

| Env / input | Default (Blockera base) |
| --- | --- |
| `suite` | `server-timing` \| `editor` |
| `baseline` | `core` \| `master` |
| `BLOCKERA_PERF_WP_ENV_CONFIG` | `.github/wp-env-configs/performance.json` |
| `BLOCKERA_PERF_*_CMD` | paths under `performance/scripts/` / `tests/performance/` |
| `BLOCKERA_PERF_SCRIPTS_DIR` | `packages/global-packages/packages/dev-tools/github/performance/scripts` |
| scenarios / results | consumer `.github/performance/{scenarios,editor-scenarios}.json` + `results/` |

## Build plugin zip tests

PHP matrix: build product zip → stage Cypress fixtures under `build/<slug>/` →
run `*.build.e2e.cy.js` against wp-env.

Staging is one script (`prepare-build-env.sh`). Consumers pass dest/path/wp-env
knobs — there are no `prepare-pro` / `prepare-theme` / `prepare-toolkit` recipes.

```yaml
# Theme-style example
env:
    BLOCKERA_BUILD_ZIP_TESTS_SPECS_ROOTS: ./packages
    BLOCKERA_BUILD_ZIP_TESTS_SPECS_PATH: '*-one*'
```

```yaml
# Pro-style example
env:
    GITHUB_TOKEN: ${{ secrets.BLOCKERABOT_PAT }}
    BLOCKERA_BUILD_ZIP_TESTS_USE_CREATE_WP_ENV: 'true'
    BLOCKERA_BUILD_ZIP_TESTS_WP_ENV_CATEGORY: general
    BLOCKERA_WP_ENV_FALLBACK_CONFIG: general
    BLOCKERA_WP_ENV_DEFAULT_PLUGIN: https://github.com/blockeraai/blockera/tree/master
    BLOCKERA_BUILD_ZIP_TESTS_SPECS_ROOTS: ./packages
    BLOCKERA_BUILD_ZIP_TESTS_SPECS_PATH: '*-pro*'
    BLOCKERA_BUILD_ZIP_TESTS_SPECS_DEST: packages/blockera-pro/tests
```

```yaml
# Toolkit-style example
env:
    BLOCKERA_BUILD_ZIP_TESTS_SPECS_ROOTS: ./packages
    BLOCKERA_BUILD_ZIP_TESTS_SPECS_PATH: '*toolkit*'
    BLOCKERA_BUILD_ZIP_TESTS_SPECS_DEST: packages/site-toolkit/js/test
    BLOCKERA_BUILD_ZIP_TESTS_CYPRESS_SPEC_PATTERN: packages/**/*toolkit*.build.e2e.cy.js,packages/site-toolkit/**/*.build.e2e.cy.js
```

| Input / env | Default (Blockera base) |
| --- | --- |
| `php-version` | matrix PHP |
| `zip-file` / `build-dir` | `blockera.zip` / `./build/blockera` |
| `skip-if-no-specs` | `false` (`true` for empty suites) |
| `BLOCKERA_BUILD_ZIP_TESTS_SPECS_ROOTS` | `./packages/global-packages/packages` (find-specs default: `.`) |
| `BLOCKERA_BUILD_ZIP_TESTS_SPECS_PATH` | empty (any path) |
| `BLOCKERA_BUILD_ZIP_TESTS_SPECS_DEST` | `packages/global-packages/packages/blockera/tests` |
| `BLOCKERA_BUILD_ZIP_TESTS_CYPRESS_SPEC_PATTERN` | `packages/**/*.build.e2e.cy.js` |
| `BLOCKERA_BUILD_ZIP_TESTS_USE_CREATE_WP_ENV` | `false` |
| `BLOCKERA_BUILD_ZIP_TESTS_PREPARE_CMD` | empty (optional extra hook after default staging) |
| `BLOCKERA_BUILD_ZIP_TESTS_START_CMD` | `bash packages/global-packages/packages/dev-tools/github/scripts/retry-wp-env-start.sh` |

## Build plugin zip (release)

Multi-job release flow: compute next branch → bump version → build zip artifact →
revert on failure → draft GitHub release. Job graph / `if:` stay in the consumer
workflow; bash lives under `scripts/jobs/build-plugin-zip/`.

| Env | Default (Blockera base) |
| --- | --- |
| `BLOCKERA_BUILD_ZIP_MAIN_FILE` | `blockera.php` |
| `BLOCKERA_BUILD_ZIP_MILESTONE_PREFIX` | `Blockera` |
| `artifact-name` / `zip-file` (action) | `blockera` / `./blockera.zip` |

Release bump runs `jobs/build-plugin-zip/update-changelogs.sh`, which calls the
consumer `npm run update:changelogs`.

**Source of truth is package `CHANGELOG.md`.** Every consumer package file
starts with an empty `## Unreleased` inbox. Authors append bullets there
(Keep a Changelog headings: Added, Fixed, …). Do not add dated or version
headings in feature PRs.

The **global-packages repository** (not a consumer product) also runs
`.github/workflows/update-changelogs.yml` on merge to `master`. That GP-only
job folds Unreleased into `## [x.y.z] - date`, drops the inbox, and bumps
only packages that changed since the previous merge (`--semver`, `--from`,
`--to` on `update-master-package-changelogs`). It is not the zip
`update:changelogs` command.

**GP fold happens on submodule bump**, not on product zip:

1. Consumer sync/bump pins global-packages.
2. If Unreleased has entries and the pin is a branch tip, bump folds them into
   `## [YYYY-MM-DD]` (same-day suffix if needed), commits
   `chore(changelog): fold Unreleased`, and pushes that SHA.
3. Product zip diffs each GP `CHANGELOG.md` between the previous and new
   gitlink. It takes ### bodies from the **previous pin’s top version
   heading (exclusive)** through the **current pin’s newest heading**.
   Consumer `packages/*/CHANGELOG.md` still contribute Unreleased diffs.
   The zip **fails** if a pinned GP file still has Unreleased *bullets*
   (missing Unreleased is OK).
4. Zip writes product root `CHANGELOG.md` / `changelog.txt` and folds
   **consumer** Unreleased into `## [product-version] - date`.

Set `BLOCKERA_CHANGELOG_FOLD_ON_BUMP=0` to skip the bump-time fold (zip will
still refuse a dirty GP Unreleased). `BLOCKERA_CHANGELOG_REQUIRE_FOLDED_GP=0`
disables the zip guard (tests only).

Each consumer only sees notes inside **its** pin window.

```yaml
# Theme-style example
env:
    BLOCKERA_CHANGELOG_CONSUMER_GLOBS: |
        packages/blockera-one/CHANGELOG.md
        packages/blockera-admin-one/CHANGELOG.md
```

| Env | Default |
| --- | --- |
| `BLOCKERA_CHANGELOG_GP_PATH` | `packages/global-packages` |
| `BLOCKERA_CHANGELOG_GP_FROM` / `BLOCKERA_CHANGELOG_GP_TO` | gitlink at last release ref … `HEAD` |
| `BLOCKERA_CHANGELOG_FROM_REF` / `BLOCKERA_CHANGELOG_TO_REF` | last `origin/release/*` or `v$OLD_VERSION` … `HEAD` |
| `BLOCKERA_CHANGELOG_PREVIOUS_VERSION` | set from `OLD_VERSION` in the zip job |
| `BLOCKERA_CHANGELOG_CONSUMER_GLOBS` | `packages/*/CHANGELOG.md` (required) |
| `BLOCKERA_CHANGELOG_ROOT_MD` | `CHANGELOG.md` |
| `BLOCKERA_CHANGELOG_FILE` | `changelog.txt` |
| `BLOCKERA_CHANGELOG_REQUIRE_FOLDED_GP` | `1` |
| `BLOCKERA_CHANGELOG_FOLD_ON_BUMP` | `1` (bump script) |

## Update WordPress.org assets

```yaml
- uses: ./packages/global-packages/packages/dev-tools/github/actions/update-assets
  with:
      svn-username: ${{ secrets.SVN_USERNAME }}
      svn-password: ${{ secrets.SVN_PASSWORD }}
```

Wraps `10up/action-wordpress-plugin-asset-update@stable`.

## WP "Tested up to" update

Weekly schedule + `workflow_dispatch`. Wraps `AlecRust/wp-tut-updater-action`.

| Input | Default (Blockera base) |
| --- | --- |
| `file-paths` | `blockera.php` |
| `github-token` | required (`GITHUB_TOKEN` or PAT) |

## VirusTotal scan

```yaml
steps:
    - uses: actions/checkout@v5
      with:
          token: ${{ secrets.BLOCKERABOT_PAT }}
    - uses: ./.github/actions/ensure-global-packages
    - uses: ./packages/global-packages/packages/dev-tools/github/actions/virus-total
      with:
          vt-api-key: ${{ secrets.VT_API_KEY }}
```

| Input | Default (Blockera base) |
| --- | --- |
| `files` | `./blockera.zip` + `./` |
| `composer-options` | `--no-dev -o --apcu-autoloader -a` |

Reuses `create-demo-attachments/build-zip.sh` for the product zip.

## Upload release to WordPress.org SVN (plugin or theme)

Triggered on `release: published`. Computes `release/x.y.z`, then publishes the
release zip asset. Same job scripts serve both layouts; the consumer sets
`BLOCKERA_UPLOAD_SVN_LAYOUT`.

**Plugin layout** (`plugin`, default): checkout trunk, replace contents, commit,
copy to `tags/{version}/`, update `readme.txt` Stable tag. Environment
`wp.org plugin`. Template: `workflows/upload-release-to-plugin-repo.yml`.

**Theme layout** (`theme`): `svn import` the unzipped tree to
`{repo}/{version}/` (WordPress.org theme SVN has no trunk/tags). Environment
`wp.org theme`. Template: `workflows/upload-release-to-theme-repo.yml`.

```yaml
# Theme-style example
env:
    BLOCKERA_UPLOAD_SVN_LAYOUT: theme
    BLOCKERA_UPLOAD_SVN_REPO_URL: 'https://themes.svn.wordpress.org/THEME-SLUG'
    BLOCKERA_UPLOAD_ZIP_NAME: theme.zip
```

| Env | Default |
| --- | --- |
| `BLOCKERA_UPLOAD_SVN_LAYOUT` | `plugin` |
| `BLOCKERA_UPLOAD_SVN_REPO_URL` | plugin layout last-resort: `https://plugins.svn.wordpress.org/blockera`; **required** for theme layout |
| `BLOCKERA_UPLOAD_PLUGIN_REPO_URL` | alias for SVN root (legacy) |
| `BLOCKERA_UPLOAD_ZIP_NAME` | `blockera.zip` |
| `BLOCKERA_UPLOAD_UNWRAP_SINGLE_DIR` | `true` for theme, `false` for plugin |
| `SVN_USERNAME` / `SVN_PASSWORD` | required secrets |
| `PLUGIN_URL` / `BLOCKERA_UPLOAD_ASSET_URL` / `VERSION` | from the GitHub release event |

## Upload release to Blockera AI (Pro)

Triggered on `release: published` (non-prerelease with assets). Reuses
`upload-release-to-plugin-repo/compute-release-branch.sh`, then
`upload-release-to-blockeraai/publish.sh` downloads the zip and POSTs multipart
to the Blockera AI endpoint. See template `workflows/upload-release-to-blockeraai.yml`.

| Env | Default (Pro) |
| --- | --- |
| `BLOCKERA_UPLOAD_BLOCKERAAI_ZIP` | `blockera-pro.zip` |
| `BLOCKERA_UPLOAD_BLOCKERAAI_FILENAME_FIELD` | `./my-downloads/<zip>` |
| `PLUGIN_URL` / `PLUGIN_VERSION` / `GH_TOKEN` | from the GitHub release event |
| `RELEASE_ENDPOINT` / `BLOCKERAAI_PRODUCT_ID` / `RELEASE_*` / `BLOCKERABOT_API_KEY` | required secrets |

## Sync global-packages submodule

Consumer bootstrap: `.github/actions/ensure-global-packages/` (synced via
`sync-consumer-bootstrap.sh`). Job scripts run from the toolkit (stashed across
target-branch checkout when the feature branch may not have the latest pin yet).

| Toolkit script | Role |
| --- | --- |
| `jobs/sync-global-packages-submodule/resolve-targets.sh` | dispatch/schedule/manual → source/target/mode |
| `jobs/sync-global-packages-submodule/run-bump.sh` | git user + `bump-global-packages-submodule.sh` (folds GP Unreleased on branch tips) |
| `jobs/sync-global-packages-submodule/commit-bump.sh` | commit staged gitlink |
| `jobs/sync-global-packages-submodule/open-or-update-pr.sh` | force-push PR branch + `gh pr` |

| Env | Default |
| --- | --- |
| `BLOCKERA_SYNC_GP_DEFAULT_BRANCH` | `master` |
| `BLOCKERA_SYNC_GP_PR_BRANCH` | `chore/bump-global-packages` |
| `BLOCKERA_SYNC_GP_PR_LABEL` | `dependencies` (created if missing; skipped if create fails). Empty disables labeling. |

## Plugin check (PCP + PHP security)

```yaml
steps:
    - uses: actions/checkout@v5
      with:
          token: ${{ secrets.BLOCKERABOT_PAT }}
    - uses: ./.github/actions/ensure-global-packages
    - uses: ./packages/global-packages/packages/dev-tools/github/actions/plugin-check
      with:
          repo-token: ${{ secrets.BLOCKERABOT_PAT }}
    # second job:
    - uses: ./packages/global-packages/packages/dev-tools/github/actions/php-security-check
```

| Input / env | Default (Blockera base) |
| --- | --- |
| `zip-file` / `BLOCKERA_PLUGIN_CHECK_ZIP` | `blockera.zip` |
| `build-dir` / `BLOCKERA_PLUGIN_CHECK_BUILD_DIR` | `./build/blockera` |
| `categories` | general, security, performance, plugin_repo, accessibility |
| `exclude-directories` / `exclude-checks` | empty (Pro sets these) |

## Playwright E2E tests

Two-job flow: detect categories (expands `block-screenshots` batches) → matrix
`run.sh` → `collect-baselines.sh` → upload-artifact. Consumer keeps
`VISUAL_SNAPSHOT_BATCH_SIZE` and the artifact step.

Discovery uses `list-test-categories.js --suffix ply.js`. Pass filters on the
job env — the shared scripts do not know product names.

```yaml
env:
    BLOCKERA_PLAYWRIGHT_PACKAGE_SUFFIX: -one
    BLOCKERA_PLAYWRIGHT_PACKAGE_PREFIX: blockera-one-
    BLOCKERA_PLAYWRIGHT_EXCLUDE_FILES: tests/visual.block-screenshots.ply.js
    BLOCKERA_PLAYWRIGHT_MU_PLUGIN_PREFIX: wp-content/themes/blockera-one/
```

| Env | Default |
| --- | --- |
| `BLOCKERA_PLAYWRIGHT_CATEGORY` | required on matrix job |
| `BLOCKERA_PLAYWRIGHT_LIST_CATEGORIES_CMD` | `node …/list-test-categories.js --suffix ply.js --env-prefix BLOCKERA_PLAYWRIGHT` |
| `BLOCKERA_PLAYWRIGHT_VISUAL_BATCHES_CMD` | `node …/list-visual-snapshot-batches.js` |
| `BLOCKERA_PLAYWRIGHT_PR_ENV_FILE` | `.pr-playwright.env.json` |
| `BLOCKERA_PLAYWRIGHT_MU_PLUGIN_PREFIX` | `wp-content/plugins/blockera/` |
| `BLOCKERA_PLAYWRIGHT_PACKAGE_SUFFIX` / `_PREFIX` | empty (all packages) |
| `BLOCKERA_PLAYWRIGHT_EXCLUDE_FILES` | empty |
| `VISUAL_SNAPSHOT_BATCH_SIZE` | set on workflow `env:` (e.g. `15`) |

Also: `SCAN_ROOTS`, `GENERAL_CATEGORY`, `EXCLUDE_CATEGORIES`.

## Cypress E2E tests

Two-job flow: detect categories → matrix `run.sh` per category.

Discovery uses `list-test-categories.js --suffix e2e.cy.js`. Consumers pass
their own scan/package/pattern env — there is no product-style switch.

```yaml
# Theme-style example
env:
    BLOCKERA_E2E_SCAN_ROOTS: packages
    BLOCKERA_E2E_PACKAGE_SUFFIX: -one
    BLOCKERA_E2E_PACKAGE_PREFIX: blockera-one-
    BLOCKERA_E2E_PACKAGE_GLOB: 'packages/**-one(-**|)/**'
    BLOCKERA_E2E_USE_CREATE_WP_ENV: 'true'
    BLOCKERA_E2E_CI_ENV: 'true'
    BLOCKERA_WP_ENV_PR_PLUGIN_CATEGORIES: companion-plugin
    BLOCKERA_WP_ENV_STRIP_DOT_PLUGINS: 'true'
    BLOCKERA_WP_ENV_DEFAULT_THEME: '.'
    BLOCKERA_WP_ENV_FREE_EXTRACT_DIR: .github/cache/blockera
    BLOCKERA_WP_ENV_DEFAULT_PLUGIN: https://github.com/blockeraai/blockera/tree/master
    BLOCKERA_WP_ENV_DEFAULT_PLUGIN_CATEGORIES: companion-plugin
```

```yaml
# Pro-style example
env:
    BLOCKERA_E2E_SCAN_ROOTS: packages
    BLOCKERA_E2E_PACKAGE_SUFFIX: -pro
    BLOCKERA_E2E_PACKAGE_PREFIX: blockera-pro-
    BLOCKERA_E2E_GENERAL_PACKAGES: validator,guard,console
    BLOCKERA_E2E_GENERAL_CATEGORY: general
    BLOCKERA_E2E_EXCLUDE_CATEGORIES: 'plugin-compatibility*'
    BLOCKERA_E2E_PACKAGE_GLOB: 'packages/**-pro(-**|)/**'
    BLOCKERA_E2E_USE_CREATE_WP_ENV: 'true'
    BLOCKERA_E2E_WRITE_CYPRESS_ENV: 'true'
    BLOCKERA_E2E_CI_ENV: 'true'
    BLOCKERA_WP_ENV_FALLBACK_CONFIG: general
    BLOCKERA_WP_ENV_DEFAULT_PLUGIN: https://github.com/blockeraai/blockera/tree/master
```

```yaml
# Toolkit-style example
env:
    BLOCKERA_E2E_SCAN_ROOTS: packages/site-toolkit
    BLOCKERA_E2E_FILE_PATTERN: '\.toolkit(\.[a-z0-9-]+)?\.e2e\.cy\.js$'
    BLOCKERA_E2E_CATEGORY_MODE: last-segment
    BLOCKERA_E2E_GENERAL_CATEGORY: none
    BLOCKERA_E2E_PACKAGE_GLOB: packages/site-toolkit/**
```

| Env | Default |
| --- | --- |
| `BLOCKERA_E2E_CATEGORY` | required on matrix job |
| `BLOCKERA_E2E_PACKAGE_GLOB` | empty (`packages` + `tests`) |
| `BLOCKERA_E2E_GENERAL_CATEGORY` | `general-1` (`none` disables) |
| `BLOCKERA_E2E_LIST_CATEGORIES_CMD` | `list-test-categories.js --suffix e2e.cy.js --env-prefix BLOCKERA_E2E` |
| `BLOCKERA_E2E_USE_CREATE_WP_ENV` | `false` (also runs when `.pr-env.json` exists) |
| `BLOCKERA_E2E_WRITE_CYPRESS_ENV` | `false` |
| `BLOCKERA_E2E_CI_ENV` | `false` |
| `BLOCKERA_E2E_PRE_TEST_CMD` | empty (runs before category specs; when `.pr-cypress.env.json` exists, `run.sh` sets `BLOCKERA_CYPRESS_IGNORE_PR_FILTER=true` for that invocation so `--spec` is not blocked by the PR filter) |
| `BLOCKERA_E2E_PR_ENV_FILE` | `.pr-cypress.env.json` |
| `BLOCKERA_CYPRESS_IGNORE_PR_FILTER` | unset (`true` skips loading `.pr-cypress.env.json` in Cypress config; set automatically during `BLOCKERA_E2E_PRE_TEST_CMD`) |
| `BLOCKERA_E2E_WP_ENV_START_CMD` | `bash packages/global-packages/packages/dev-tools/github/scripts/retry-wp-env-start.sh` |
| `BLOCKERA_E2E_COMPOSER_INSTALL` | `true` |
| `BLOCKERA_E2E_BUILD_CMD` / `_TEST_CMD` / `_STOP_CMD` | `npm run build` / `test:e2e` / `env:stop` |

Discovery env: `SCAN_ROOTS`, `PACKAGE_SUFFIX` / `PACKAGE_PREFIX`,
`GENERAL_PACKAGES`, `EXCLUDE_CATEGORIES`, `EXCLUDE_FILES`, `FILE_PATTERN`,
`CATEGORY_MODE` (`dot-prefix` \| `last-segment`).

`.pr-env.json` (PR-only) is merged onto `.github/wp-env-configs/{category}.json`
by `create-wp-env.js`. Scalars replace, `config` / `lifecycleScripts`
shallow-merge, and `plugins` / `themes` concatenate. Restrict overlay plugins
with `BLOCKERA_WP_ENV_PR_PLUGIN_CATEGORIES`. Add a companion plugin source with
`BLOCKERA_WP_ENV_DEFAULT_PLUGIN`. Optional third CLI arg `pluginDownloadUrl`
pins that companion: default `BLOCKERA_WP_ENV_PLUGIN_URL_MODE=append`; set
`replace` to drop other companion sources (same GitHub owner/repo as
`DEFAULT_PLUGIN` / `COMPANION_OWNER`+`COMPANION_REPO`, extract dir, or
wordpress.org slug) so wp-env does not mount two copies of the companion.

## Cypress component tests

```yaml
steps:
    - uses: actions/checkout@v5
      with:
          token: ${{ secrets.BLOCKERABOT_PAT }}
    - uses: ./.github/actions/ensure-global-packages
    - uses: ./packages/global-packages/packages/dev-tools/github/actions/setup-node
    - run: bash packages/global-packages/packages/dev-tools/github/scripts/jobs/cypress-components-tests/run.sh
```

| Env | Default (Blockera base) |
| --- | --- |
| `BLOCKERA_CT_INSTALL_CMD` | `npx cypress install` |
| `BLOCKERA_CT_COMPOSER_INSTALL` | `true` |
| `BLOCKERA_CT_COMPOSER_CMD` | `composer install --no-dev -o --apcu-autoloader -a` |
| `BLOCKERA_CT_BUILD` | `true` |
| `BLOCKERA_CT_BUILD_CMD` | `npm run build` |
| `BLOCKERA_CT_TEST_CMD` | `npm run test:ct` |
| `BLOCKERA_CT_SKIP_IF_NO_SPECS` | `false` |
| `BLOCKERA_CT_SPECS_ROOTS` / `_SPECS_NAME` | used when skip-if-no-specs is enabled |

## Check debugging code

```yaml
steps:
    - uses: actions/checkout@v5
      with:
          token: ${{ secrets.BLOCKERABOT_PAT }}
    - uses: ./.github/actions/ensure-global-packages
    - run: bash packages/global-packages/packages/dev-tools/github/scripts/jobs/check-debugging-code/run.sh
```

| Env | Default |
| --- | --- |
| `BLOCKERA_DEBUG_CHECK_IGNORE_MARKER` | `@debug-ignore` |
| `BLOCKERA_DEBUG_CHECK_PHP_PATTERN` | `die(`, `var_dump(`, `print_r(`, `error_log(`, `wp_die(`, `exit(` |
| `BLOCKERA_DEBUG_CHECK_JS_PATTERN` | `console.*`, `debugger`, `alert(` |
| `BLOCKERA_DEBUG_CHECK_TEST_PATTERN` | `.skip(`, `.only(` |
| `BLOCKERA_DEBUG_CHECK_SKIP_PATHS` | `test/`, `.github/`, `bin/`, `dev-tools/github/`, `dev-phpunit/` (tests scan: same minus `test/`) |
| `BLOCKERA_DEBUG_CHECK_SKIP_PHP` / `_JS` / `_TESTS` | `false` |

`find` also prunes `node_modules/`, `vendor/`, `source-codes/`, `dist/`, `coverage/`, `Scratch/`, `.patch/`, and `.git/`.

## Create demo attachments

Builds the product zip, publishes it to the `ci-artifacts` prerelease, and posts
the Playground demo PR comment.

```yaml
steps:
    - uses: actions/checkout@v5
      with:
          token: ${{ secrets.BLOCKERABOT_PAT }}
    - uses: ./.github/actions/ensure-global-packages
    - uses: ./packages/global-packages/packages/dev-tools/github/actions/setup-node
    - uses: ./packages/global-packages/packages/dev-tools/github/actions/setup-php
      with:
          composer-options: '--no-dev -o --apcu-autoloader -a'
    - uses: ./packages/global-packages/packages/dev-tools/github/actions/create-demo-attachments
      with:
          repo-token: ${{ secrets.BLOCKERABOT_PAT }}
          github-token: ${{ github.token }}
          pr-number: ${{ github.event.pull_request.number }}
          head-sha: ${{ github.event.pull_request.head.sha }}
          run-id: ${{ github.run_id }}-${{ github.run_attempt }}
          main-file-suffix: '-${{ github.event.pull_request.number }}'
```

| Override | Default (Blockera base) |
| --- | --- |
| `slug` / `BLOCKERA_DEMO_SLUG` | `blockera` |
| `zip-file` / `BLOCKERA_DEMO_ZIP` | `blockera.zip` |
| `main-file-suffix` | empty (workflow passes `-{PR}`) |
| `BLOCKERA_DEMO_PLAYGROUND_JSON` | `.github-playground.json` |
| `BLOCKERA_DEMO_PR_PLAYGROUND_JSON` | `.pr-github-playground.json` |
| `BLOCKERA_DEMO_BOT_LOGIN` | `blockerabot` |
| cleanup `BLOCKERA_DEMO_SLUG` | same slug for asset deletion |

## Check PR config files

Fails when leftover PR-only config files are present. Defaults cover every
known type (plus `.pr-*` for new names) and skip example templates
(`*.env-example*` / `*.example.*` / `*-example*` / `*.example.json`):

- `.pr-workflows.json`
- `.pr-cypress.env.json`
- `.pr-playwright.env.json`
- `.pr-env.json`
- `.pr-sync-env.json`
- `.pr-github-playground.json`

```yaml
steps:
    - uses: actions/checkout@v5
      with:
          token: ${{ secrets.BLOCKERABOT_PAT }}
    - uses: ./.github/actions/ensure-global-packages
    - run: bash packages/global-packages/packages/dev-tools/github/scripts/jobs/check-pr-config-files/run.sh
```

| Env | Default |
| --- | --- |
| `BLOCKERA_PR_CONFIG_NAME` | `.pr-*` plus the known live filenames (space-separated `find -name` patterns) |
| `BLOCKERA_PR_CONFIG_EXCLUDE_NAMES` | `*.env-example* *.example.* *-example* *.example.json` |
| `BLOCKERA_PR_CONFIG_ROOT` | `.` |

## Remove PR config files

Push-to-master cleanup: delete leftover PR-only config files, commit, and push.
Shares the same `BLOCKERA_PR_CONFIG_NAME` / `_EXCLUDE_NAMES` / `_ROOT` as the check job
(`github/scripts/lib/pr-config-files.sh`).

| Env | Default |
| --- | --- |
| `BLOCKERA_PR_CONFIG_GIT_NAME` | `blockerabot` |
| `BLOCKERA_PR_CONFIG_GIT_EMAIL` | `blockeraai+githubbot@gmail.com` |
| `BLOCKERA_PR_CONFIG_COMMIT_MSG` | `chore: remove PR config files` |
| `BLOCKERA_PR_CONFIG_PUSH_BRANCH` | `master` |

Pro (`.pr-env.json` only): same job script with overrides — see template
`workflows/remove-pr-env-json.yml`:

```yaml
env:
    BLOCKERA_PR_CONFIG_NAME: .pr-env.json
    BLOCKERA_PR_CONFIG_COMMIT_MSG: 'chore: remove .pr-env.json redundant file'
```

## PR workflow filter

Limit which GitHub Actions workflows run on a pull request by adding
`.pr-workflows.json` at the repository root (copy from
`.pr-workflows.example.json` via `project:bootstrap`).

```json
{
    "allowedActions": [
        "code-lint.yml",
        "jest-unit-tests.yml",
        "php-unit-tests.yml"
    ]
}
```

Each `allowedActions` entry is a workflow **filename** under
`.github/workflows/`. Workflows not listed are skipped on `pull_request`
(the gate job succeeds; downstream jobs are skipped). When the file is
absent, all workflows run. Non-PR events (`workflow_dispatch`, `push`,
`schedule`, `release`, …) always run.

Toolkit workflow templates include a `pr-workflow-gate` job that runs
`ensure-global-packages`, then calls
`packages/global-packages/packages/dev-tools/github/actions/pr-workflow-gate`.
Set `BLOCKERA_GLOBAL_PACKAGES_TOKEN` on the gate job (same PAT as checkout).

```yaml
    pr-workflow-gate:
        env:
            BLOCKERA_GLOBAL_PACKAGES_TOKEN: ${{ secrets.BLOCKERABOT_PAT }}
        steps:
            - uses: actions/checkout@v5
              with:
                  token: ${{ secrets.BLOCKERABOT_PAT }}
            - uses: ./.github/actions/ensure-global-packages
            - id: gate
              uses: ./packages/global-packages/packages/dev-tools/github/actions/pr-workflow-gate
              with:
                  workflow-file: php-unit-tests.yml
```

| Env | Default |
| --- | --- |
| `BLOCKERA_PR_WORKFLOWS_FILE` | `.pr-workflows.json` |
| `BLOCKERA_PR_WORKFLOW_FILE` | set per workflow template (`workflow-file` input) |
| `BLOCKERA_PR_WORKFLOWS_FORCE` | `false` (always run when `true`) |

`.pr-workflows.json` is a PR-only file — remove it before merge (caught by
Check PR config files). `.pr-workflows.example.json` is the committed template.

Available toolkit workflow filenames:

`release-plugin-tests.yml`, `release-plugin.yml`, `bundle-size.yml`,
`check-debugging-code.yml`, `check-pr-config-files.yml`, `code-lint.yml`,
`create-demo-attachments.yml`, `cypress-components-tests.yml`,
`cypress-e2e-tests.yml`, `jest-unit-tests.yml`, `performance-benchmark.yml`,
`php-snapshots.yml`, `php-unit-tests.yml`, `playwright-e2e-tests.yml`,
`plugin-check.yml`, `remove-pr-config-files.yml`, `remove-pr-env-json.yml`,
`sync-global-packages-submodule.yml`, `upload-release-to-blockeraai.yml`,
`upload-release-to-plugin-repo.yml`, `upload-release-to-theme-repo.yml`,
`virus-total.yml`,
`wp-tested-up-to-update.yml`

## Bundle size

PR path filters cannot live outside workflow YAML in GitHub, so the toolkit
stores them in `scripts/jobs/bundle-size/paths.default` and gates the job via
`should-run.sh` (no `on.pull_request.paths` in the consumer workflow).

The size comment must stay under GitHub's 65536-character limit. The report
still includes every matched file; `comment-title.sh` truncates the markdown
(keeping totals, changed rows, and the `compressed-size-action` marker) and
posts or updates the PR comment. The workflow log keeps the full table.

Blockera workflow:

```yaml
steps:
    - uses: actions/checkout@v5
      with:
          token: ${{ secrets.BLOCKERABOT_PAT }}
          fetch-depth: 0
    - uses: ./.github/actions/ensure-global-packages
    - uses: ./packages/global-packages/packages/dev-tools/github/actions/bundle-size
      with:
          repo-token: ${{ secrets.BLOCKERABOT_PAT }}
```

Other consumers override only what differs:

```yaml
- uses: ./packages/global-packages/packages/dev-tools/github/actions/bundle-size
  with:
      repo-token: ${{ secrets.BLOCKERABOT_PAT }}
      pattern: '{dist/**/*.min.js,dist/**/*.min.css,blockera-one.zip,…}'
  env:
      BLOCKERA_BUNDLE_SIZE_PATHS: |
          **.js
          blockera-one.zip
          .github/workflows/bundle-size.yml
      BLOCKERA_BUNDLE_SIZE_BUILD_CMD: '…'
```

| Override | Default (Blockera base) |
| --- | --- |
| `paths.default` / `BLOCKERA_BUNDLE_SIZE_PATHS` / `_PATHS_FILE` | Blockera PR path list |
| `force` / `BLOCKERA_BUNDLE_SIZE_FORCE` | `false` (always run on `workflow_dispatch`) |
| `pattern` / `BLOCKERA_BUNDLE_SIZE_PATTERN` | dist min assets + `blockera.zip` + packages php/json/svg |
| `comment-title` / `BLOCKERA_BUNDLE_SIZE_COMMENT_TITLE` | `# 📦 Bundle Size Report` |
| `BLOCKERA_BUNDLE_SIZE_COMPOSER_OPTS` | `--no-dev -o --apcu-autoloader -a` |
| `BLOCKERA_BUNDLE_SIZE_BUILD_CMD` | auto plugin/theme zip generator |
| `BLOCKERA_BUNDLE_SIZE_SKIP_COMPOSER` / `SKIP_BUILD` | `false` |

## Bootstrap sync

```bash
bash packages/global-packages/packages/dev-tools/github/scripts/sync-consumer-bootstrap.sh
```

Syncs the consumer-local bootstrap action that must exist before the submodule
is available:

- `.github/actions/ensure-global-packages/`

## Why not reusable workflows from the submodule?

GitHub cannot `uses:` a reusable workflow from a path inside a submodule checkout.
Shared logic is bash scripts + composite actions; each consumer keeps its own
`.github/workflows/*.yml` triggers.
