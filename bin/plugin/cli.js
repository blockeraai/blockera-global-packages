#!/usr/bin/env node

/**
 * Thin re-export of the shared plugin CLI for the global-packages monorepo.
 */

/**
 * Internal dependencies
 */
const config = require('./config');
const { createPluginCli } = require('../../packages/dev-tools/bin/plugin/cli');

createPluginCli(config);
