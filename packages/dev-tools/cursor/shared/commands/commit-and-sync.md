# commit-and-sync

Commit this chat’s changes with Cursor command `commit` (`commit.md`), then **push**, and **sync** consumer `packages/global-packages` pins when shared packages changed.

Use this when the changeset should be on remotes (GP and/or consumers). For a local-only commit in one repo, use `commit`.

Invoking this command **is** scope to touch every Blockera product repo listed below that needs a pin bump or that already has this-chat files. Do not wait to re-ask `product-scope` for those bumps/pushes.

## Repos (discover, do not hardcode user paths)

Resolve git tops that exist in the **workspace**:

| Id | Remote / folder clues |
| --- | --- |
| `blockera-global-packages` | `blockeraai/blockera-global-packages` (standalone origin) |
| `blockera` | `blockeraai/blockera` |
| `blockera-pro` | `blockeraai/blockera-pro` |
| `blockera-one` | `blockeraai/blockera-one` |
| `blockera-site-toolkit` | `blockeraai/blockera-site-toolkit` |

Skip a row if that checkout is missing. Do **not** include `blockera-pull-watch` or other site plugins unless the user named them.

GP write-root: [ADR 001](../../../ai/decisions/001-gp-write-root.md). Commit GP in **one** checkout only. If this chat edited shared packages under a product’s **`packages/global-packages/`** sparse tree, that is the GP repo — `git -C <product>/packages/global-packages`. Do **not** replay those diffs into standalone `blockera-global-packages` to commit. Use standalone origin only when that checkout is where the files were edited. Never dual-commit the same GP files in two working trees.

## Safety (never skip)

Same as `commit.md`: no `git config` edits, no `--no-verify`, no `--no-gpg-sign`, no force push, no amend unless `commit.md` / user git rules allow, no secrets, HEREDOC messages, conventional types from `packages/dev-tools/git-conventional-commits.yaml`.

**Stop** the remaining pipeline if any required pull, commit, or push fails. Report what already landed. Do not bump consumers off a SHA that is not on GP `origin`.

Do **not** create merge commits. Pull with `--ff-only` (or `--rebase` only if already diverged). Never plain `git pull`.

## Pull then commit (every repo)

Before the first commit in a repo, follow **`commit.md` → Update from origin**. That includes:

- Product parent (before host commits **and** before `submodule:bump`, which itself commits)
- Sparse GP: `git -C packages/global-packages` (detached HEAD → branch, then `pull --ff-only`)
- Standalone GP origin, when that is the write-root

If `pull --ff-only` / rebase cannot proceed, stop that repo. Do not skip pull because the tree is dirty with this-chat files.

## Per-repo commit = `commit.md`

For every repository you commit (GP submodule repo and/or product parent):

1. Open and follow **`commit.md` in full**, including **Micro commits (required)** (changelog audience, this-chat files only, changeset groups, separate `test:` commits, message rules, mixed parent/submodule order). Do not replace that split with one push-sized commit.
2. **Override only these `commit.md` lines** when running **this** command:
   - After **all** micro commits in a repo succeed, **you must `git push origin HEAD` once** (or the branch’s upstream). Do not push after every micro commit unless a later step in this command needs that SHA on origin (GP must be fully pushed before consumer `submodule:bump`).
   - Consumer **gitlink** updates are **not** done by hand. They are done only via `npm run submodule:bump` (step B). Do not `git add packages/global-packages` yourself.

Ignore unrelated dirty files in every repo.

## Pipeline (run in order)

### A) Shared packages (if this chat has GP diffs)

1. Choose the GP git dir: sparse `packages/global-packages` if that working tree has this-chat diffs; else standalone origin if that is where you edited.
2. Pull that repo (`commit.md` Update from origin).
3. `commit.md` **inside that same git dir** (`git -C packages/global-packages` when sparse), including required micro commits by changeset.
4. Confirm those commits exist (`git status` / `git log`).
5. **Push GP** from **that** repo **once** after **all** GP micro commits (`git push origin HEAD` or the branch you attached). Confirm `HEAD` is on `origin`.
6. Record `GP_SHA` (full hash of the tip).

If this chat has **no** GP diffs, skip A. Do not bump consumers in B.

If GP was committed in an earlier step of **this same invocation** but push was forgotten, push before B.

### B) Pin every consumer (only after A pushed)

When A produced a new `GP_SHA` on origin, update **all** discovered consumers (not only the active product):

1. In that product **parent** repo: pull (`commit.md` Update from origin) **before** bump.
2. From that product root: `npm run submodule:bump -- <GP_SHA>`  
   (script lives under that clone’s `packages/global-packages/packages/dev-tools/github/scripts/bump-global-packages-submodule.sh`; it stages the gitlink and **commits** locally).
3. If the bump reports `changed=false` / already at SHA, continue.
4. If the GP range includes `packages/dev-tools/cursor/` or `packages/dev-tools/root-configs/`, run `npm run project:bootstrap` in that product. If generated host files change, commit them with `commit.md` (usually `chore:` / internals changelog **Development Notes** only if a package changelog applies — generated `.cursor/` often has no package CHANGELOG).
5. Do **not** `npm install` / `composer install`.

Do not bump consumers when A was skipped.

### C) Consumer host changesets (product files outside the submodule)

For each consumer that has **this-chat** parent files (plugin/theme host packages, `.ai/`, product tests, etc.):

1. Pull that parent if you have not already in B (`commit.md` Update from origin).
2. `commit.md` in that parent repo.
3. Exclude `packages/global-packages` gitlink (already handled in B). Exclude submodule internals (handled in A).

A consumer may have **only** a bump commit (B), **only** host commits (C), or both.

### D) Push consumers

After **all** commits for a consumer succeed, `git push origin HEAD` for that repo.

Push every consumer that is ahead of origin because of B and/or C. Do not leave bump commits local.

Order: all commits in a repo first, then push that repo. You may push consumers in parallel only after each one’s commits finished.

## Accuracy checks (required before you stop)

| Check | Pass |
| --- | --- |
| GP | If A ran: `HEAD` is on `origin`; working tree clean for this-chat GP files |
| Consumers | If B ran: `git rev-parse HEAD:packages/global-packages` equals `GP_SHA` |
| Host | This-chat product files committed; unrelated dirt left unstaged |
| Push | Every repo this invocation committed is not “ahead of origin” |

## Output (required)

One short table: repo id → local commit(s) (**each** micro SHA, not one blob) → pushed `yes` + remote tip SHA (or `skipped` + why).

If something failed, the table still lists completed rows, then the failure.

## Do not

- Push before the corresponding commit exists.
- Bump from a local-only GP SHA.
- Copy sparse-checkout GP diffs into standalone origin (or another consumer’s submodule) in order to commit.
- Hand-edit another product’s GP tree to “copy” the pin.
- Force push, skip hooks, or commit secrets.
- Invent `npx` / raw git submodule recipes when `npm run submodule:bump` exists.
