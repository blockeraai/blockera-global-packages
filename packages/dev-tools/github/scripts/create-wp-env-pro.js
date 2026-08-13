#!/usr/bin/env node
/**
 * @deprecated Use create-wp-env.js. Kept so existing Pro callers keep working.
 */
process.env.BLOCKERA_WP_ENV_PRODUCT_STYLE =
	process.env.BLOCKERA_WP_ENV_PRODUCT_STYLE ||
	process.env.BLOCKERA_E2E_PRODUCT_STYLE ||
	'pro';

require('./create-wp-env.js');
