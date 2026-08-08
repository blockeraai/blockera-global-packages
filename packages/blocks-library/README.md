# `blocks-library`

Placeholder directory for future Blockera block-library packages.

---

## Status

**Stub.** Contains only a security `index.php`. There is no `package.json` or `composer.json`.

Do not import, require, or autoload this path.

---

## Where block work actually lives

| Need | Package |
|------|---------|
| Core / Woo / third-party block extensions | [`@blockera/blocks-core`](../blocks-core/README.md) |
| Editor extension layer | [`@blockera/editor`](../editor/README.md) |
| Product features (e.g. Icon) | [`features-library`](../features-library/README.md) |

---

## Agent rules

- If you need to add block compatibility, use `blocks-core` (or a new nested package under this folder with its own manifests) — not this stub root.
- When promoting this from a stub, add `package.json`, `composer.json`, and replace this README with a real API guide.
