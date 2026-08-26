# Shared ambient TypeScript types

Ambient / `declare module` declarations for all Blockera host repos live here.

## Location

`packages/global-packages/packages/dev-tools/types/blockera/`

Loaded via `typeRoots` in `packages/dev-tools/js/typescript/tsconfig.base.json`. Do not add a project-root `types/` folder.

## How to edit

- Edit these files only in the **blockera-one** checkout of `packages/global-packages`.
- Other repos (blockera, blockera-pro, blockera-site-toolkit) consume this folder through the submodule. After changing types, bump the submodule in those repos.

## What belongs here

- WordPress package augmentations (`wordpress.d.ts`)
- Asset import shims (`svg.d.ts`, `scss.d.ts`, `css-raw.d.ts`)
- Other ambient modules that do **not** ship with an installed npm package

Do not add stubs for packages that already ship TypeScript types (for example `@dnd-kit/*` or `overlayscrollbars`).
