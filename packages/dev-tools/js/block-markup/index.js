/**
 * Block-markup normalization (Node-only; do not import from browser bundles).
 */

module.exports = require('./normalize');
module.exports.loadBlockMarkupConfig = require('./load-config').loadBlockMarkupConfig;
module.exports.mergeBlockMarkupConfig = require('./merge-config').mergeBlockMarkupConfig;
module.exports.baseConfig = require('./base-config').baseConfig;
