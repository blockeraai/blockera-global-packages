# Product dependencies and scripts

Work in the **active product** root (`product-scope.mdc`). When this file is used from a consumer submodule, that product is the host repo, not a nested package.

## Dependencies

`node_modules/` and Composer `vendor/` are already installed before the user prompts.

Do **not**:

- `npm install`, `npm ci`, `yarn`, `pnpm`
- `composer install`, `composer update`, `composer require`
- Add or bump `package.json` / `composer.json` / lockfile entries unless the user **explicitly** asks for a new dependency
- Install the same library inside a nested GP package (products consume GP via `file:` and Composer path repos)

## Commands

1. Change directory to the **active product root**.
2. Read `package.json` `scripts` and `composer.json` `scripts`.
3. Run the existing script. Pass extra args the script already supports (e.g. Cypress `--spec`).
4. Invent a new command **only** if no product script covers the job — say so and ask. Do not silently wrap `npx` or `vendor/bin`.

## Canonical names (verify on the product if missing)

| Need | Script |
|------|--------|
| Cypress e2e (pass/fail after e2e edits) | `npm run test:e2e` |
| Cypress component | `npm run test:ct` |
| Jest / JS unit | `npm run test:js` |
| PHPUnit units | `npm run test:unit:php` (or `test:unit:php:base` if wp-env is already up) |
| PHPUnit via Composer | `npm run test:unit:php:composer` / `composer run-script test` |
| PHP snapshots | `npm run test:snapshots:php` |
| Playwright (where present) | `npm run test:e2e:base` |
| PHP lint | `npm run lint:php` or `composer run lint` |

There is no `e2e:test` script. Filter specs: `npm run test:e2e -- --spec <relative-spec>`.

When validating **this** monorepo in isolation, use this repo root’s scripts (same names).
