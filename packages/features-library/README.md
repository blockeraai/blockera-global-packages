# `features-library`

Container for Blockera **feature packages**.

The root of this directory is a **placeholder** (security `index.php` only). Installable features live in nested folders.

---

## Status

| Path | Status |
|------|--------|
| `packages/features-library/` | Stub / namespace container — not an npm or Composer package |
| `packages/features-library/icon/` | Real package: `@blockera/feature-icon` / `blockera/feature-icon` |

---

## Agent rules

- Do **not** import or autoload the root `features-library` path.
- Add new features as nested packages with their own `package.json` / `composer.json` / README.
- Register features through `@blockera/features-core` (`FeaturesManager` + JS feature IDs).

---

## Related packages

- [`icon/README.md`](./icon/README.md) — Icon feature
- [`../features-core/README.md`](../features-core/README.md) — Feature lifecycle framework
