# refactor-github-ci

Keep `packages/dev-tools/github/` a **single source of truth**: one implementation, **no product styles**, **no hardcoded consumer `packages/global-packages/` prefix**. Behavior varies only through consumer `env:` / `with:` / CLI flags.

**Do the work.** Review is a required pass (before and after), not a narrative report.

Run when this chat **adds or edits** GitHub workflows, shared workflows, `create-wp-env`, job scripts, or actions — including **new** consumer `.github/workflows/` files and **new** files under `packages/dev-tools/github/` — or before committing those files.

Canonical policy: `packages/dev-tools/github/README.md` — *Shared scripts have no product styles.* Path layouts: `packages/dev-tools/ai/workflows/dev-tools-paths.md` (consumers: prefix those paths with `packages/global-packages/`).

## Scope

Follow `.cursor/rules/product-scope.mdc`. Shared GitHub CI lives in **global-packages**:

- Standalone origin: `packages/dev-tools/github/`
- Inside a product: `packages/global-packages/packages/dev-tools/github/`

(`scripts/`, `scripts/jobs/`, `scripts/lib/`, `actions/`, template `workflows/`)

Work on:

1. Files generated/edited in the **current Cursor chat** in that tree **or** the active product `.github/workflows/` / `.github/actions/`.
2. The **current git changeset** for those paths (ignore unrelated dirty files). Standalone GP: `git` at repo root. Product session: `git -C packages/global-packages` for shared files, parent `git` for consumer `.github/`.
3. **One hop**: callers of a changed script (consumer thin workflows under the **active product** `.github/workflows/`) only to confirm they pass knobs rather than relying on hardcoded product logic **or** a single checkout path.

Do **not** expand into a repo-wide CI rewrite unless the user names extra files. Do **not** mass-replace existing consumer-path defaults in unrelated scripts in the same turn.

Consumer product workflows (blockera / blockera-pro / blockera-one / blockera-site-toolkit `.github/workflows/`) **may** hardcode the consumer `packages/global-packages/packages/dev-tools/github/…` path and product env. That is the consumer layer. Do not move product identity into shared scripts. Do not edit another product’s workflow until the user agrees.

Edit command templates in `packages/dev-tools/cursor/` (this file), not generated host `.cursor/`.

## New workflow (required)

When **adding** a workflow:

1. Prefer a **thin consumer** `.github/workflows/*.yml` that calls existing shared actions/jobs. Copy structure from a sibling workflow in the **active product**, not a product-named fork of a shared script.
2. If shared logic is missing, add **one** parameterized script/action under `packages/dev-tools/github/` (write-root: ADR 001). Document knobs in the file header and `github/README.md`.
3. Do not invent a second copy of an existing job (`prepare-pro.sh`, per-product workflow that inlines the shared script).
4. Then run the same hardcoded checklists as a refactor (product styles **and** shared paths).

## What “configurable” means

Shared code chooses behavior from knobs the consumer sets:

| Knob | Where |
| --- | --- |
| `env:` / `BLOCKERA_*` | job `env`, workflow `env`, script `process.env` / `$VAR` |
| `with:` | composite action inputs |
| CLI flags | `node script.js --flag` / positional args documented in the file header |
| `BLOCKERA_DEV_TOOLS_ROOT` | override for `scripts/lib/resolve-dev-tools-root.sh` |

Generic **runner conventions** as defaults are OK (`packages` + `tests` scan, fallback config `base`) **if** a consumer can override them. Last-resort GitHub owner/repo/slug defaults are OK **only** when `BLOCKERA_WP_ENV_COMPANION_*` / `DEFAULT_PLUGIN` / equivalent env still wins.

## Constraints

- Prefer env / `with:` / flags over new files. Do not add `prepare-pro.sh` / `list-*-theme.js` product recipes.
- Keep public action input names and documented env names unless this chat already contracted a rename (then list old → new under **Consumer knob**).
- Backward-compatible defaults (`append`, empty filters, `false` opt-ins) unless this chat’s contract already changed them.
- Do not commit (the `commit` command does that).
- If the active product’s thin workflow must set a new knob for the change to work, **stop and ask** before editing that product. Name the env and the workflow file.

## Workflow

### 1) Discover + review (required)

- Diff shared github + any consumer workflow this chat touches.
- Open each target file plus `github/README.md` (consumer contract).
- Record hardcoded **product styles** and hardcoded **consumer-only paths** (checklists below) **before** rewriting. That list is the backlog.

### 2) Implement in place

For each smell (and any duplication the changeset introduced):

1. Replace product switches and hardcoded identity with consumer env / `with:` / flags. Add a knob if missing.
2. In **shared** files, replace a baked-in `packages/global-packages/packages/dev-tools/…` default with `GITHUB_ACTION_PATH` / script directory / `resolve-dev-tools-root.sh` / `BLOCKERA_DEV_TOOLS_ROOT`. Do not leave origin-only `packages/dev-tools/` as the sole default either.
3. Derive from an existing knob when possible (e.g. GitHub owner/repo from `BLOCKERA_WP_ENV_DEFAULT_PLUGIN`, then URL / companion env).
4. Collapse duplicate per-product scripts into one parameterized script; delete the product-named copies only if nothing in this changeset still calls them.
5. Document every new or changed knob in:
   - the script/action **file header** (required / optional / default)
   - `packages/dev-tools/github/README.md` (consumer table or example `env:`)
6. Use generic log/comment language (“companion plugin”, not one product’s fatal or slug).

### 3) Re-review (required)

Re-read the diff. Hunt both checklists. If anything product-specific **or** a hardcoded shared path remains in shared code, fix it or list it under **Skipped**.

### 4) Stop and write the output below

## Review checklist — product styles (fail these in shared github code)

- Product switches: `productStyle === 'pro'|'theme'|'plugin'|'toolkit'`, `prepare-pro.sh` / `list-*-pro.js` recipes, `if (project === 'blockera-pro')`.
- Control-flow on product ids: `blockera-pro`, `blockera-one`, `blockera-site-toolkit`, `blockera` as **the** companion, except in README **examples**.
- Hardcoded companion identity used as logic: `blockeraai/blockera`, wordpress.org `plugin/blockera.`, extract dir `blockera-free` / `blockera` as the only path, package globs `*-pro*` / `*-one*` / `*toolkit*` baked into a shared script with no env.
- Comments or log lines that assume one product’s fatal (`blockera_init`, “Blockera Free zip”) instead of a generic companion plugin.
- New behavior that **appends** a second copy of the same companion without an opt-in mode (consumers must be able to `replace` vs `append`).

## Review checklist — shared paths (fail these in shared `packages/dev-tools/`)

- Default or literal `packages/global-packages/packages/dev-tools/` with no resolver / env / `GITHUB_ACTION_PATH` / `dirname`.
- Default or literal origin-only `packages/dev-tools/` that would break on a consumer.
- Cursor/agent docs that mention only one of the two layouts.

Allowed:

- `BLOCKERA_` env prefix (shared namespace).
- README examples that show Pro / theme / toolkit **env blocks** and consumer `uses: ./packages/global-packages/…`.
- Thin consumer workflows setting those env vars and the long consumer path.
- `root-configs/` files copied to the product root (they run outside this package).

## Output (required, and only this)

**Reviewed** — one bullet per smell found before the change (file + what was product-specific or a hardcoded shared path). Omit if none.

**Changed** — one bullet per shared or consumer workflow file you added or edited.

**Consumer knob** — env / `with:` / flag to set, and which product workflow would set it (do not edit that workflow unless the user already expanded scope).

**Skipped** — unsafe or cross-product fix not applied (omit if none).

**Summary** — still single-source-of-truth? (yes/no) + both layouts? (yes/no) + risk (Low/Med/High).

**Commit** — two copyable blocks:

- Subject: conventional type from `packages/dev-tools/git-conventional-commits.yaml` (`ci` / `docs` / `refactor` as appropriate; consumers: prefix `packages/global-packages/`)
- Message: short bullet list

If the tree is already clean, say so in one line under Changed, still fill Summary and Commit, and do not invent edits.
