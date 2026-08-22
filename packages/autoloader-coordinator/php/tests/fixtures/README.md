# Autoloader coordinator wp-env fixtures

Scenario overlays and two fixture plugins used by the **blockera-global-packages** `coordinator-wp-env` job (`.github/workflows/php-unit-tests.yml`).

These tests are **not** part of consumer PHPUnit suites.

## Layout

```text
php/tests/fixtures/
├── run-wp-env-scenario.sh
├── wp-env.json
├── mu-plugins/
├── plugins/
│   ├── plugin-a/
│   └── plugin-b/
└── scenarios/
    ├── plugin-a-newer/
    ├── plugin-b-newer/
    ├── same-version/
    ├── major-version-diff/
    └── patch-version-diff/
```

## Scenarios

| Scenario | Plugin A | Plugin B | Expected winner |
|----------|----------|----------|-----------------|
| `plugin-a-newer` | 2.0.0 | 1.0.0 | plugin-a |
| `plugin-b-newer` | 1.0.0 | 2.0.0 | plugin-b |
| `same-version` | 1.0.0 | 1.0.0 | plugin-a (default) |
| `major-version-diff` | 3.0.0 | 1.0.0 | plugin-a |
| `patch-version-diff` | 1.0.0 | 1.0.1 | plugin-b |

CI copies the scenario `name-utils` files onto the fixture plugins, copies the current coordinator runtime into each plugin, runs `composer install`, then boots wp-env and asserts the winning `blockera/name-utils` version.
