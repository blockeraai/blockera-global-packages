# commit

You are in chat and we made changes into the codebase in this chat and we want to commit them.

## Update from origin (required before any commit)

In **every** git repo you will commit (product parent **and** `packages/global-packages` when that tree has diffs), **pull first**, then changelog/stage/commit. Do this so local work lands on current `origin` and you do **not** create merge commits.

1. `git fetch origin`
2. If HEAD is **detached** (typical sparse submodule): attach a branch before pulling — `master` when the pin is on `origin/master`; otherwise the existing mirror branch that contains HEAD. Carry the dirty this-chat files across (`git switch` / `git checkout` without discarding). If checkout would clobber this-chat work, **stop**.
3. `git pull --ff-only` (or `git merge --ff-only @{u}` after fetch).
4. If `--ff-only` fails because the branch **diverged** (local commits not on origin): `git pull --rebase` (still no merge commit). If rebase/ff fails (conflicts, dirty overlap), **stop** and report. Do **not** `git pull` without `--ff-only`/`--rebase` (that creates merge commits).
5. Do **not** stash this-chat files to force a pull unless the user asked.

Run this **once per repo** immediately before the first commit in that repo (after fetch/pull succeeds, then changelog + commit). Do not pull between micro-commits in the same repo once you are up to date and creating new local commits.

## Changelog and README (before staging)

Follow `packages/global-packages/packages/dev-tools/ai/workflows/changelog-and-readme.md` (standalone GP: `packages/dev-tools/ai/workflows/changelog-and-readme.md`).

- Append `## Unreleased` bullets on each **package** `CHANGELOG.md` whose source changed, **except** skips in `changelog-and-readme.md` (chore/style/ci; **never** Pro unlock / license-gate how-to). Pick the `###` heading by **audience**: end-user → Features / Improvements / Bug Fixes; tests → Automated Tests; internals → **Development Notes**, never Features.
- Update that package’s README only if the public contract changed.
- Do not fold versions, bump package versions, or edit product-root `CHANGELOG.md` / `changelog.txt`.

## What to commit

- Commit **only** changes made in **this chat**. Ignore unrelated dirty files.
- **Micro commits are required** (next section). Do not squash the chat into one mixed commit.

## Micro commits (required)

**Multiple commits are the default.** One commit is allowed **only** when every this-chat file is one inseparable change (same user-facing outcome; cannot land alone). If you would need “and” in the subject to cover two topics, split.

Do this **before the first `git add`**:

1. List this-chat paths (`git status` / `git diff`).
2. Group them into **changesets** (independent topics), for example:
   - Separate user prompts or features in this chat
   - Separate packages or layers (editor vs CI vs Cursor commands)
   - Runtime / product code vs agent docs vs generated files
   - Implementation vs tests (see **Separate test commits**)
3. Write a one-line plan: `1) … 2) …` (changeset + paths). Then commit **in that order**.
4. For each group: stage **only** those files, conventional subject **for that group**, `git commit`. Repeat. Never `git add -A` / `git add .` for this chat.
5. **Changelog:** Unreleased bullets for **this group only** in the same commit as that group’s source. Do not put later groups’ notes in an earlier commit. Add bullets as you go (or edit `CHANGELOG.md` so each commit’s hunk matches that changeset).
6. A user- or chat-supplied **single** subject applies to **one** group (the one it describes). Write new subjects for the other groups. Do not fold groups because only one message was given.

`commit-and-sync` uses this same split **per repo**, then **one push** after that repo’s micro commits succeed.

## Separate test commits

If this chat created or updated tests **and** implementation, never mix them in one commit. Pair them so the test commit clearly covers the change:

1. Commit the implementation first (`feat` / `fix` / `refactor` / …).
2. Then commit the related tests in a **separate** commit using type `test:` (not `tests:`).
3. If the chat has multiple unrelated features, pair each one: impl A → test A, then impl B → test B.
4. Test-only chats: one (or more unrelated) `test:` commit(s) — no empty implementation commit.
5. Implementation-only chats: no test commit.

Treat **all** test kinds as test files (unit, integration, e2e, Playwright, Cypress, PHPUnit, snapshots, visual fixtures, and helpers/mocks/fixtures under `test/`, `tests/`, `__tests__/`, `*.spec.*`, `*.test.*`, `*Test.php`).

Apply this pairing in **every repo this command commits** (parent Blockera and `packages/global-packages`).

## Commit message

Allowed conventional commit types and changelog rules live in the shared global-packages config (not a root YAML):

`packages/dev-tools/git-conventional-commits.yaml` (consumers: `packages/global-packages/packages/dev-tools/git-conventional-commits.yaml`)

Husky `commit-msg` validates against that file via `--config`. Use only types listed there when writing subjects.

1. If the chat already has a final commit subject and message → use them for the **matching changeset only** and commit that group immediately (still split other groups).
2. If the user sent a subject/message → use that for the matching group only; commit immediately; split the rest.
3. Otherwise → generate a conventional subject/message **per group** and **commit each immediately** (no confirmation / wait for accept).
4. If impl and tests must be paired (see **Separate test commits**), still split: use the provided/generated subject for the implementation commit, then write a `test:` subject for the covering test commit. Do not fold tests into the implementation commit just because only one message was supplied.

Follow the repo’s conventional commit style (types from the shared YAML above) and the usual git commit safety protocol (no force, no amend unless rules allow, no secrets, HEREDOC for messages, etc.).

## `packages/global-packages` submodule

Shared packages live in the `packages/global-packages` git submodule (`blockeraai/blockera-global-packages`).

When this chat touched files under `packages/global-packages/` (sparse checkout inside a product):

1. Treat that folder as the GP git repo. Commit **there** (`git -C packages/global-packages …`). Do **not** copy the same diffs into a standalone `blockera-global-packages` checkout to commit them.
2. Pull that repo first (section above), including detaching → branch if needed.
3. Use **Micro commits** inside the submodule (group by changeset; never one mixed GP commit for unrelated topics).
4. **Do not push** the submodule; the user pushes manually (`commit-and-sync` pushes).
5. **Do not** stage or commit the parent-repo gitlink / submodule SHA bump for `packages/global-packages`. CI (`sync-global-packages-submodule`) updates the parent pin after the submodule is pushed.

## Mixed parent + submodule changes

If the chat changed both parent Blockera files and `packages/global-packages`:

1. Pull + commit submodule changes first (`git -C packages/global-packages`).
2. Pull the parent, then commit parent-repo changes, **excluding** any `packages/global-packages` gitlink change.

## Parent-only changes

If only parent Blockera paths changed (outside the submodule), commit in the parent repo as usual. Still never include an incidental submodule pointer update unless the user explicitly asks to bump the pin (they normally should not).

## Push and other repos

This command does **not** push and does **not** bump consumer pins. For commit + push + `submodule:bump` across GP and consumers, use `commit-and-sync`.
