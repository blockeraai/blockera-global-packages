#!/usr/bin/env node
/**
 * Discover CI matrix categories from `*.{suffix}` test files.
 * Consumers pass filters via flags or env — this file has no product styles.
 *
 *   node list-test-categories.js --suffix e2e.cy.js --env-prefix BLOCKERA_E2E
 *   node list-test-categories.js --suffix ply.js --env-prefix BLOCKERA_PLAYWRIGHT
 */
require('./lib/list-test-categories').runCli();
