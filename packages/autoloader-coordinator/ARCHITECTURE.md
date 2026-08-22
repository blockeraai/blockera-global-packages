# Architecture Documentation

## Overview

The Autoloader Coordinator is a utility package for WordPress plugins that solves the problem of version conflicts when multiple plugins ship the same Composer package. It uses semantic versioning to automatically select and load the newest version.

## Core Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    WordPress Plugins                     │
│  ┌──────────────┐              ┌──────────────┐        │
│  │  Plugin A    │              │  Plugin B    │        │
│  │              │              │              │        │
│  │  name-utils  │              │  name-utils  │        │
│  │  v2.0.0      │              │  v1.0.0      │        │
│  └──────┬───────┘              └──────┬───────┘        │
│         │                              │                 │
│         └──────────┬───────────────────┘                 │
│                    │                                     │
│                    ▼                                     │
│         ┌──────────────────────┐                         │
│         │  Coordinator Filter  │                         │
│         │  (Registration)      │                         │
│         └──────────┬───────────┘                         │
└────────────────────┼─────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Autoloader Coordinator                        │
│  ┌──────────────────────────────────────────────┐     │
│  │  Coordinator Singleton                        │     │
│  │  - registerPlugin()                           │     │
│  │  - bootstrap()                                │     │
│  │  - getPackageManifest()                       │     │
│  └──────────────────────────────────────────────┘     │
│                     │                                    │
│         ┌────────────┴────────────┐                      │
│         ▼                         ▼                      │
│  ┌──────────────┐         ┌──────────────┐              │
│  │  Version     │         │  File        │              │
│  │  Comparison  │         │  Loading     │              │
│  └──────────────┘         └──────────────┘              │
│         │                         │                      │
│         └────────────┬─────────────┘                      │
│                      ▼                                    │
│         ┌──────────────────────┐                          │
│         │  Selected Version    │                          │
│         │  (v2.0.0 from A)    │                          │
│         └──────────────────────┘                          │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
         ┌──────────────────────┐
         │  Composer Autoload   │
         │  (Only v2.0.0)       │
         └──────────────────────┘
```

## Data Flow

### 1. Plugin Registration

```
Plugin Loads
    ↓
Filter Hook: blockera/autoloader-coordinator/plugins/dependencies
    ↓
Coordinator.registerPlugin()
    ↓
Store plugin metadata (dir, priority, default)
```

### 2. Bootstrap Process

```
Coordinator.bootstrap()
    ↓
Register Autoloader (if first plugin)
    ↓
Load autoload data from all plugins
    ↓
Collect package versions
    ↓
Compare versions (semantic versioning)
    ↓
Select winning version
    ↓
Load only winning version's files
```

### 3. Package Resolution

```
getPackageManifest()
    ↓
Check transient cache
    ↓
If cache miss:
    Scan plugin directories
    Find composer.json files
    Extract name + version
    Build manifest
    Cache in transient
    ↓
Return manifest
```

### 4. File Loading

```
includeAutoloadFiles()
    ↓
preparePackagesFiles()
    ↓
Group files by package name
    ↓
Sort by version (descending)
    ↓
Load files from highest version only
    ↓
Mark as included (prevent duplicates)
```

## Key Classes

### Coordinator

**Location:** `packages/autoloader-coordinator/class-shared-autoload-coordinator.php`

**Responsibilities:**
- Plugin registration management
- Package version collection
- Version comparison logic
- Autoload file coordination
- Caching strategy

**Key Methods:**
- `registerPlugin()` - Register a plugin with the coordinator
- `bootstrap()` - Initialize autoloading
- `getPackageManifest()` - Get cached package manifest
- `buildPackageManifest()` - Build manifest from plugins
- `detectPackageFromPath()` - Extract package info from path
- `includeAutoloadFiles()` - Load files from winning versions

### Loader

**Location:** `packages/autoloader-coordinator/loader.php`

**Responsibilities:**
- Entry point for plugins
- Initialize coordinator instance
- Handle autoloader registration

## Caching Strategy

### Transient Cache

**Keys:**
- `blockera_pkgs_files` - Cached package files mapping
- `blockera_pkg_manifest` - Cached package manifest

**TTL:** 1 hour (HOUR_IN_SECONDS)

**Invalidation:**
- Plugin activation
- Plugin deactivation
- Plugin upgrade
- Manual cache clear

### Request-Level Cache

**Implementation:** Static variables in methods

**Purpose:** Prevent duplicate work within single request

**Scope:** Per-request only

## Version Comparison

### Semantic Versioning

Format: `MAJOR.MINOR.PATCH`

**Comparison Rules:**
1. Compare major versions first
2. If equal, compare minor versions
3. If equal, compare patch versions
4. If all equal, use default plugin or first registered

**Example:**
- `3.0.0` > `2.0.0` > `1.0.1` > `1.0.0`

### Tie-Breaking

When versions are identical:
1. Check `default: true` flag in plugin registration
2. If multiple defaults, first registered wins
3. If no defaults, first registered wins

## File Loading Strategy

### Autoload Files

Coordinator loads files from `vendor/composer/autoload_files.php`:

1. Collect all files from all plugins
2. Group by package name
3. For each package:
   - Sort versions descending
   - Load files from highest version only
   - Skip if already included

### PSR-4 Mappings

Coordinator merges PSR-4 mappings:

1. Load mappings from all plugins
2. Apply version-based priority
3. Register with ClassLoader

**Testing:** The `name-utils` package includes `NameFormatter` class to verify PSR-4 autoloading works correctly. See `TESTING_CLASSES.md` for details.

## Integration Points

### WordPress Hooks

**Filters:**
- `blockera/autoloader-coordinator/plugins/dependencies` - Plugin registration

**Actions:**
- `activated_plugin` - Cache invalidation
- `deactivated_plugin` - Cache invalidation
- `upgrader_process_complete` - Cache invalidation

### Composer Integration

**Path Repositories:**
- Local development: Symlinks
- CI/CD: Copies (Docker doesn't support symlinks)

**Autoload Files:**
- Generated by Composer
- Read by Coordinator
- Validated in CI

## Performance Considerations

### Optimization Strategies

1. **Transient Caching** - Cache manifest for 1 hour
2. **Request Memoization** - Static variables prevent duplicate work
3. **Lazy Loading** - Only build manifest on cache miss
4. **Selective File Loading** - Load only winning version's files
5. **Early Exit** - Skip already included files

### Bottlenecks

- File system scanning (mitigated by caching)
- Composer autoload file parsing (cached)
- Version comparison (minimal, cached)

## Testing Architecture

### Test Structure

```
tests/
├── phpunit/
│   ├── Unit/              # Unit tests (isolated)
│   │   └── CoordinatorTest.php
│   ├── Integration/        # Integration tests (WordPress)
│   │   └── CoordinatorIntegrationTest.php
│   ├── TestCase.php        # Base test case
│   └── bootstrap.php       # Test bootstrap
```

### Test Scenarios

**Version Resolution:**
- Different versions (major, minor, patch)
- Same versions (tie-breaking)
- Missing versions (fallback)

**Integration:**
- Plugin registration
- Package discovery
- File loading
- Cache invalidation

### CI/CD Testing

**wp-env Integration:**
- Real WordPress environment
- Multiple plugin scenarios
- Version conflict resolution
- Cross-version compatibility

## Security Considerations

### Input Validation

- Validate plugin directories exist
- Sanitize plugin slugs
- Validate composer.json structure
- Check file paths before including

### Access Control

- Prevent direct file access (`ABSPATH` check)
- Validate WordPress context
- Sanitize output in debug functions

## Extension Points

### Custom Version Comparators

Currently uses semantic versioning. Could be extended to support:
- Custom version formats
- Pre-release versions
- Build metadata

### Custom Package Detection

Currently searches for `composer.json`. Could be extended to:
- Support other package formats
- Custom detection logic
- Package aliases

## Future Enhancements

### Potential Improvements

1. **Package Aliases** - Map package names to aliases
2. **Version Constraints** - Support Composer version constraints
3. **Conflict Resolution** - User-defined conflict resolution
4. **Performance Metrics** - Track coordinator performance
5. **Debug Mode** - Enhanced debugging output

### Known Limitations

1. Requires Composer autoload files
2. Only supports PSR-4 and files autoloading
3. No support for dev dependencies
4. Cache invalidation on every plugin change

## References

- [WordPress Plugin API](https://developer.wordpress.org/plugins/)
- [Composer Autoloading](https://getcomposer.org/doc/01-basic-usage.md#autoloading)
- [Semantic Versioning](https://semver.org/)
- [PSR-4 Autoloading](https://www.php-fig.org/psr/psr-4/)

