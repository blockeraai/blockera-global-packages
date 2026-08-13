# Shared GitHub CI for Blockera consumers

Small shared scripts and setup actions for repos that use this monorepo as a
sparse submodule at `packages/global-packages`.

**Base consumer = Blockera plugin.** Shared defaults match Blockera. Other
consumers keep thin workflows and override only what differs (`with:` / `env:`).

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
    jobs/bundle-size/    # paths.default | should-run.sh | prepare.sh | comment-title.sh
    jobs/check-debugging-code/  # run.sh
    jobs/check-pr-config-files/ # run.sh
    jobs/remove-pr-config-files/ # run.sh
    jobs/create-demo-attachments/ # build/publish/encode/comment/cleanup
    jobs/cypress-components-tests/ # run.sh
    jobs/cypress-e2e-tests/      # detect | run | prepare-pro.sh | prepare-theme.sh
    jobs/performance-benchmark/  # setup.sh | run-*.sh | stop.sh
    jobs/php-snapshots/          # compute-previous-wordpress-version.sh | run.sh
    jobs/php-unit-tests/         # run.sh
    jobs/playwright-e2e-tests/   # detect-categories.sh | run.sh | collect-baselines.sh
    jobs/plugin-check/           # prepare-build.sh
    jobs/sync-global-packages-submodule/  # resolve | run-bump | commit | open-pr
    jobs/upload-release-to-plugin-repo/   # compute-release-branch.sh | publish-to-svn.sh
    jobs/upload-release-to-blockeraai/    # publish.sh (Pro → Blockera AI)
    jobs/build-plugin-zip/                # version bump / notes / revert helpers
    jobs/build-plugin-zip-tests/          # find-specs | prepare-build-env | prepare-pro | run-e2e
    ensure-*.sh / bump-*.sh / retry-*.sh   # used in-place from toolkit
    actions/ensure-global-packages/         # source for consumer bootstrap action
    setup-wp-env.js
    download-artifact.sh / create-wp-env.js       # merge wp-env-configs + .pr-env.json
    list-*-categories.js / list-*-categories-pro.js / list-visual-snapshot-batches.js
    sync-consumer-bootstrap.sh
  workflows/             # Blockera-base templates
```

Consumer has **no** `.github/scripts/`. The only consumer-local bootstrap is
`.github/actions/ensure-global-packages/` (chicken-and-egg: the submodule is not
available until ensure runs). Everything else is invoked from
`packages/global-packages/packages/dev-tools/github/…`.


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

| Input / env | Default (Blockera base) |
| --- | --- |
| `php-version` | matrix PHP |
| `zip-file` / `build-dir` | `blockera.zip` / `./build/blockera` |
| `skip-if-no-specs` | `false` (`true` for Pro-style empty suites) |
| `BLOCKERA_BUILD_ZIP_TESTS_PRODUCT_STYLE` | `plugin` (`pro` → `prepare-pro.sh` + free Blockera via `create-wp-env.js`; `theme` → `prepare-theme.sh` for blockera-one) |
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

## Upload release to WordPress.org plugin repo

Triggered on `release: published`. Computes `release/x.y.z`, then publishes the
release zip asset to SVN trunk + tag (environment `wp.org plugin`).

| Env | Default (Blockera base) |
| --- | --- |
| `BLOCKERA_UPLOAD_PLUGIN_REPO_URL` | `https://plugins.svn.wordpress.org/blockera` |
| `BLOCKERA_UPLOAD_ZIP_NAME` | `blockera.zip` |
| `SVN_USERNAME` / `SVN_PASSWORD` | required secrets |
| `PLUGIN_URL` / `VERSION` | from the GitHub release event |

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
| `jobs/sync-global-packages-submodule/run-bump.sh` | git user + `bump-global-packages-submodule.sh` |
| `jobs/sync-global-packages-submodule/commit-bump.sh` | commit staged gitlink |
| `jobs/sync-global-packages-submodule/open-or-update-pr.sh` | force-push PR branch + `gh pr` |

| Env | Default |
| --- | --- |
| `BLOCKERA_SYNC_GP_DEFAULT_BRANCH` | `master` |
| `BLOCKERA_SYNC_GP_PR_BRANCH` | `chore/bump-global-packages` |
| `BLOCKERA_SYNC_GP_PR_LABEL` | `dependencies` |

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

| Env | Default (Blockera base) |
| --- | --- |
| `BLOCKERA_PLAYWRIGHT_CATEGORY` | required on matrix job |
| `BLOCKERA_PLAYWRIGHT_PRODUCT_STYLE` | `plugin` (`theme` for blockera-one path filters) |
| `BLOCKERA_PLAYWRIGHT_LIST_CATEGORIES_CMD` | `node packages/global-packages/packages/dev-tools/github/scripts/list-playwright-test-categories.js` |
| `BLOCKERA_PLAYWRIGHT_VISUAL_BATCHES_CMD` | `node packages/global-packages/packages/dev-tools/github/scripts/list-visual-snapshot-batches.js` |
| `BLOCKERA_PLAYWRIGHT_PR_ENV_FILE` | `.pr-playwright.env.json` |
| `BLOCKERA_PLAYWRIGHT_MU_PLUGIN_PREFIX` | `wp-content/plugins/blockera/` |
| `VISUAL_SNAPSHOT_BATCH_SIZE` | set on workflow `env:` (e.g. `15`) |

## Cypress E2E tests

Two-job flow: detect categories → matrix `run.sh` per category.

| Env | Default (Blockera base) |
| --- | --- |
| `BLOCKERA_E2E_CATEGORY` | required on matrix job |
| `BLOCKERA_E2E_PRODUCT_STYLE` | `plugin` (`theme` / `pro` for package globs) |
| `BLOCKERA_E2E_PACKAGE_GLOB` | empty (style defaults: theme `**-one`, pro `**-pro`) |
| `BLOCKERA_E2E_GENERAL_CATEGORY` | `general-1` (Pro: `general`) |
| `BLOCKERA_E2E_LIST_CATEGORIES_CMD` | `list-e2e-test-categories.js` (Pro: `list-e2e-test-categories-pro.js`) |
| `BLOCKERA_E2E_PREPARE_CMD` | empty (copies wp-env config, or merges `.pr-env.json` via `create-wp-env.js`; Pro: `prepare-pro.sh`; theme: `prepare-theme.sh`) |
| `BLOCKERA_E2E_PRE_TEST_CMD` | empty (Pro: license activation spec) |
| `BLOCKERA_E2E_PR_ENV_FILE` | `.pr-cypress.env.json` |
| `BLOCKERA_E2E_WP_ENV_START_CMD` | `bash packages/global-packages/packages/dev-tools/github/scripts/retry-wp-env-start.sh` |
| `BLOCKERA_E2E_COMPOSER_INSTALL` | `true` |
| `BLOCKERA_E2E_BUILD_CMD` / `_TEST_CMD` / `_STOP_CMD` | `npm run build` / `test:e2e` / `env:stop` |

`.pr-env.json` (PR-only; see `.pr-env.example.json` on Pro/theme) is merged onto
`.github/wp-env-configs/{category}.json` by `create-wp-env.js`. Scalars replace,
`config` / `lifecycleScripts` shallow-merge, and `plugins` / `themes` concatenate.
Theme applies `.pr-env.json` plugins only to the `companion-plugin` category so
other theme suites stay plugin-free. Pro always merges plugins and defaults the
free Blockera source to `blockeraai/blockera@master` when none is provided.

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

Fails when leftover `.pr-*` files are present (except example templates:
`*.env-example*` / `*.example.*` / `*-example*`).

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
| `BLOCKERA_PR_CONFIG_NAME` | `.pr-*` |
| `BLOCKERA_PR_CONFIG_EXCLUDE_NAMES` | `*.env-example* *.example.* *-example*` |
| `BLOCKERA_PR_CONFIG_ROOT` | `.` |

## Remove PR config files

Push-to-master cleanup: delete leftover `.pr-*` files, commit, and push.
Shares the same `BLOCKERA_PR_CONFIG_NAME` / `_EXCLUDE_NAMES` / `_ROOT` as the check job.

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

## Bundle size

PR path filters cannot live outside workflow YAML in GitHub, so the toolkit
stores them in `scripts/jobs/bundle-size/paths.default` and gates the job via
`should-run.sh` (no `on.pull_request.paths` in the consumer workflow).

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

## Why not reusable workflows from the submodule?

GitHub cannot `uses:` a reusable workflow from a path inside a submodule checkout.
Shared logic is bash scripts + composite actions; each consumer keeps its own
`.github/workflows/*.yml` triggers.
