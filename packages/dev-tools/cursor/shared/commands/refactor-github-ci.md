# refactor-github-ci

Refactor shared `packages/dev-tools/github/` so it stays a **single source of truth**: one implementation, **no product styles**, behavior varies only through consumer `env:` / `with:` / CLI flags.

**Do the refactor.** Review is a required pass (before and after), not a narrative report.

Run when this chat edited that tree, when the user asks to refactor / clean / de-product GitHub CI, shared workflows, `create-wp-env`, job scripts, or actions — or before committing those files.

Canonical policy: `packages/global-packages/packages/dev-tools/github/README.md` — *Shared scripts have no product styles.*

## Scope

Follow `.cursor/rules/product-scope.mdc`. Shared GitHub CI lives in the **global-packages submodule**:

`packages/global-packages/packages/dev-tools/github/`

(`scripts/`, `scripts/jobs/`, `scripts/lib/`, `actions/`, template `workflows/`)

Work on:

1. Files generated/edited in the **current Cursor chat** in that tree.
2. The **current git changeset** in the submodule for those paths (ignore unrelated dirty files).
3. **One hop**: callers of a changed script (consumer thin workflows under the **active product** `.github/workflows/`) only to confirm they pass knobs rather than relying on hardcoded product logic.

Do **not** expand into a repo-wide CI rewrite unless the user names extra files.

Consumer product workflows (blockera / blockera-pro / blockera-one / blockera-site-toolkit `.github/workflows/`) **may** hardcode product env. That is the consumer layer. Do not move product identity into shared scripts. Do not edit another product’s workflow until the user agrees.

Edit command templates in `packages/global-packages/packages/dev-tools/cursor/` (this file), not generated host `.cursor/`.

## What “configurable” means

Shared code chooses behavior from knobs the consumer sets:

| Knob | Where |
| --- | --- |
| `env:` / `BLOCKERA_*` | job `env`, workflow `env`, script `process.env` / `$VAR` |
| `with:` | composite action inputs |
| CLI flags | `node script.js --flag` / positional args documented in the file header |

Generic **runner conventions** as defaults are OK (`packages` + `tests` scan, fallback config `base`) **if** a consumer can override them. Last-resort GitHub owner/repo/slug defaults are OK **only** when `BLOCKERA_WP_ENV_COMPANION_*` / `DEFAULT_PLUGIN` / equivalent env still wins.

## Constraints

- Prefer env / `with:` / flags over new files. Do not add `prepare-pro.sh` / `list-*-theme.js` product recipes.
- Keep public action input names and documented env names unless this chat already contracted a rename (then list old → new under **Consumer knob**).
- Backward-compatible defaults (`append`, empty filters, `false` opt-ins) unless this chat’s contract already changed them.
- Do not commit (the `commit` command does that).
- If the active product’s thin workflow must set a new knob for the refactor to work, **stop and ask** before editing that product. Name the env and the workflow file.

## Workflow

### 1) Discover + review (required)

- `git -C packages/global-packages status` and `git -C packages/global-packages diff` for `packages/dev-tools/github/`.
- Open each target file plus `github/README.md` (consumer contract).
- Record hardcoded product styles (checklist below) **before** rewriting. That list is the refactor backlog.

### 2) Refactor in place

For each smell (and any duplication the changeset introduced):

1. Replace product switches and hardcoded identity with consumer env / `with:` / flags. Add a knob if missing.
2. Derive from an existing knob when possible (e.g. GitHub owner/repo from `BLOCKERA_WP_ENV_DEFAULT_PLUGIN`, then URL / companion env).
3. Collapse duplicate per-product scripts into one parameterized script; delete the product-named copies only if nothing in this changeset still calls them.
4. Document every new or changed knob in:
   - the script/action **file header** (required / optional / default)
   - `packages/dev-tools/github/README.md` (consumer table or example `env:`)
5. Use generic log/comment language (“companion plugin”, not one product’s fatal or slug).

### 3) Re-review (required)

Re-read the diff. Hunt the same hardcoded checklist. If anything product-specific remains in shared code, fix it or list it under **Skipped**.

### 4) Stop and write the output below

## Review checklist (fail these in shared github code)

- Product switches: `productStyle === 'pro'|'theme'|'plugin'|'toolkit'`, `prepare-pro.sh` / `list-*-pro.js` recipes, `if (project === 'blockera-pro')`.
- Control-flow on product ids: `blockera-pro`, `blockera-one`, `blockera-site-toolkit`, `blockera` as **the** companion, except in README **examples**.
- Hardcoded companion identity used as logic: `blockeraai/blockera`, wordpress.org `plugin/blockera.`, extract dir `blockera-free` / `blockera` as the only path, package globs `*-pro*` / `*-one*` / `*toolkit*` baked into a shared script with no env.
- Comments or log lines that assume one product’s fatal (`blockera_init`, “Blockera Free zip”) instead of a generic companion plugin.
- New behavior that **appends** a second copy of the same companion without an opt-in mode (consumers must be able to `replace` vs `append`).

Allowed:

- `BLOCKERA_` env prefix (shared namespace).
- README examples that show Pro / theme / toolkit **env blocks**.
- Thin consumer workflows setting those env vars.

## Output (required, and only this)

**Reviewed** — one bullet per smell found before the refactor (file + what was product-specific). Omit if none.

**Refactored** — one bullet per shared file you changed.

**Consumer knob** — env / `with:` / flag to set, and which product workflow would set it (do not edit that workflow unless the user already expanded scope).

**Skipped** — unsafe or cross-product fix not applied (omit if none).

**Summary** — still single-source-of-truth? (yes/no) + risk (Low/Med/High).

**Commit** — two copyable blocks:

- Subject: conventional type from `packages/global-packages/packages/dev-tools/git-conventional-commits.yaml` (`ci` / `docs` / `refactor` as appropriate)
- Message: short bullet list

If the tree is already clean, say so in one line under Refactored, still fill Summary and Commit, and do not invent edits.
