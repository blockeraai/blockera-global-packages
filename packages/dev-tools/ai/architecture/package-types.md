# Package types

| Kind | Examples |
|------|----------|
| Runtime libraries | `editor`, `controls`, `data`, `data-editor`, `utils`, `storage`, `wordpress`, `icons`, `global-styles-ui`, `telemetry`, `blocks-core` |
| Application entries (side-effect boots) | `blockera`, `blockera-admin`, `plugin-compatibility` |
| Feature system | `features-core`; `features-library/icon` (`@blockera/feature-icon`) |
| Infrastructure (mostly PHP) | `autoloader-coordinator`, `http`, `exceptions` |
| Dev tooling | `dev-jest`, `dev-cypress`, `dev-playwright`, `dev-phpunit`, `dev-tools` |
| Stubs / containers | `blocks-library`; `features-library` (root) |
| Experimental | `env` (config paths, not secrets) |

## JS + PHP (real dual)

Examples: `storage`, `data-editor`, `editor`, `data`, `utils`, `bootstrap`, `features-core`, `features-library/icon`, `env`. Keep naming, serialization, and keys aligned.

## JS + PHP stub only

`controls`, `classnames` — `php/index.php` is a security stub. Do not invent PHP APIs there.

## Layout variants

- Typical: `js/` + `php/`
- Features: JS and PHP together under `src/`
