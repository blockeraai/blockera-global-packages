# Change classification

Pick a class **before** a wide search. Depth must match blast radius. Cursor command: `classify-change`.

## Classes

| Class | Meaning | Investigate | Skip |
|-------|---------|-------------|------|
| **LOCAL** | One lib/module, no public contract | That folder + nearest tests | Other products, Gutenberg clones, PHP perf doc |
| **CROSS-MODULE** | Several packages in one repo (e.g. editor JS + PHP StyleDefinition + blocks-core) | Package READMEs + both sides + tests | Other products until a consumer is implied |
| **CROSS-REPOSITORY** | GP public API, Pro overlay, One stamps consuming editor, toolkit using shared HTTP | Active product first; **ask** before a second product | Silent edits in extra repos |
| **ARCHITECTURAL** | Gutenberg adapter contract, autoloader, sparse-checkout, changelog fold, theme.json pipeline | `source-codes/` as required, [../decisions/](../decisions/), CI README pointers | Drive-by refactors |

## How to classify (fast)

- Touches only `extensions/libs/<one>/` + its tests → **LOCAL** (still check `compatibility/` and matching `StyleDefinitions` if CSS/attributes change — that upgrades to **CROSS-MODULE**).
- Touches `packages/editor` JS **and** `php/StyleDefinitions` or `blocks-core` → **CROSS-MODULE**.
- Changes a public export, attribute schema, or Pro `editor-pro/js/extensions/config/` → **CROSS-REPOSITORY** (ask for Pro).
- Changes clone routing, autoloader, Unreleased fold, or submodule layout → **ARCHITECTURAL**.

## Evidence

State the class in the plan (one line). Cite paths. If unsure between LOCAL and CROSS-MODULE, treat as CROSS-MODULE.

Write-root: [../decisions/001-gp-write-root.md](../decisions/001-gp-write-root.md). Style work: [../domains/editor-style-pipeline.md](../domains/editor-style-pipeline.md).
