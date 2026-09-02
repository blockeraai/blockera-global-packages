# classify-change

Classify the current task before a wide codebase search. Follow `packages/dev-tools/ai/workflows/change-classification.md` (consumers: `packages/global-packages/packages/dev-tools/ai/workflows/change-classification.md`).

1. Choose **LOCAL**, **CROSS-MODULE**, **CROSS-REPOSITORY**, or **ARCHITECTURAL**.
2. Reply with one line: class + why (paths).
3. Load only the knowledge that class needs (package README, editor style pipeline, Pro ask, `source-codes/`).
4. Do not run Gutenberg clone research for LOCAL chores. Do not edit a second product until the user agrees.
5. GitHub workflow / `packages/dev-tools/github/` work: follow command `refactor-github-ci` (add and refactor). Shared paths: `packages/dev-tools/ai/workflows/dev-tools-paths.md`.

Style/extension tasks: `packages/dev-tools/ai/domains/editor-style-pipeline.md`. Inner blocks / states: `packages/dev-tools/ai/domains/inner-blocks-and-block-states.md`. Paid overlay: `packages/dev-tools/ai/domains/free-vs-pro.md`.

GP write root: `packages/dev-tools/ai/decisions/001-gp-write-root.md`. Changelog fold: `packages/dev-tools/ai/decisions/002-changelog-fold.md`.
