# `@blockera/features-core`

Shared feature lifecycle framework for Blockera.

Owns the feature registry, editor-side feature store/hooks, and server-side registration/boot process that feature packages plug into.

---

## Why it exists

Product features (e.g. Icon) need a consistent contract:

1. PHP: implement `FeatureInterface`, register via `FeaturesManager`
2. JS: bootstrap server-provided feature IDs into `blockera/features` store
3. Wire style-engine filters and editor hooks once

Without this core, each feature would invent its own registration path.

---

## Package layout

```text
packages/features-core/
├── src/
│   ├── index.js                 # JS entry (note: src/, not js/)
│   ├── features.js              # Known feature IDs
│   ├── Js/                      # store, hooks, components, use-block-features
│   ├── FeaturesManager.php
│   ├── helpers.php
│   ├── contracts/traits/
│   └── index.php                # Security marker only
├── package.json                 # @blockera/features-core
└── composer.json                # blockera/features-core
```

| Side | Package name | Entry |
|------|----------------|-------|
| JS | `@blockera/features-core` | `src/index.js` |
| PHP | `blockera/features-core` | PSR-4 `Blockera\Features\Core\` → `src/` + `src/helpers.php` |

---

## JS API

```js
import {
	unstableBootstrapServerSideFeatures,
	bootstrapEditorStyleEngineFilters,
	featuresApplyHooks,
	ExtensionSlotFill,
	useBlockFeatures,
} from '@blockera/features-core';
```

| Export | Role |
|--------|------|
| `unstableBootstrapServerSideFeatures(features)` | Register supported server IDs in `blockera/features` store |
| `bootstrapEditorStyleEngineFilters()` | Attach feature style generators to editor style engine |
| `featuresApplyHooks()` | Install editor feature filters |
| `ExtensionSlotFill`, `useBlockFeatures` | Feature UI integration |
| Feature types | Re-exported types/modules |

JS only accepts IDs present in `features.js`; unknown server IDs are ignored.

---

## PHP API

```php
$manager
	->registerFeatures( blockera_features_list( BLOCKERA_PATH ) )
	->bootFeatures();
```

| Symbol | Role |
|--------|------|
| `FeaturesManager` | `registerFeatures()`, `bootFeatures()`, `getFeature()`, `getRegisteredFeatures()` |
| `blockera_features_list( $project_root )` | Loads `config/features.php` (request-cached) |
| `blockera_enqueue_features_editor_styles()` | Feature editor styles |
| `FeatureInterface` + traits | Extension contract |

---

## Agent rules

- Keep JS feature identifiers, PHP `config/features.php`, and registered feature class instances aligned.
- Treat `unstableBootstrapServerSideFeatures` as unstable; follow existing boot call sites.
- New features belong under `packages/features-library/<feature>/` and register through this core — do not bypass the manager.

---

## Related packages

- `@blockera/feature-icon` (`packages/features-library/icon`)
- `@blockera/editor`, `@blockera/data`, `@blockera/bootstrap`, `@blockera/blockera`
