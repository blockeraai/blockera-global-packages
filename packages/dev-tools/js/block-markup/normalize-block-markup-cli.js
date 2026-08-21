/**
 * CLI for block-markup normalization (patterns + templates).
 *
 * Usage:
 *   node packages/dev-tools/js/block-markup/normalize-block-markup-cli.js
 *   node packages/dev-tools/js/block-markup/normalize-block-markup-cli.js --check
 *   node packages/dev-tools/js/block-markup/normalize-block-markup-cli.js --prettier-only
 */

const path = require('path');

const { loadBlockMarkupConfig } = require('./load-config');
const {
	normalizeBlockMarkup,
	checkBlockMarkup,
} = require('./normalize');

/**
 * @param {string[]} argv process.argv.slice(2)
 * @return {Object} Overrides for loadBlockMarkupConfig / normalize.
 */
function parseArgs(argv) {
	const overrides = {};

	for (const arg of argv) {
		if (arg === '--check') {
			overrides.check = true;
		} else if (arg === '--force') {
			overrides.force = true;
		} else if (arg === '--debug') {
			overrides.debug = true;
		} else if (arg === '--quiet') {
			overrides.quiet = true;
		} else if (arg === '--prettier-only') {
			overrides.prettierOnly = true;
		} else if (arg.startsWith('--text-domain=')) {
			overrides.textDomain = arg.slice('--text-domain='.length);
		} else if (arg.startsWith('--uri-php=')) {
			overrides.uriPhpExpression = arg.slice('--uri-php='.length);
		}
	}

	return overrides;
}

async function main() {
	const overrides = parseArgs(process.argv.slice(2));
	const options = loadBlockMarkupConfig(overrides);

	try {
		const result = overrides.check
			? await checkBlockMarkup(options)
			: await normalizeBlockMarkup(options);

		if (!result.ok) {
			// @debug-ignore — CLI status output for block-markup:check
			console.error(`❌ ${result.reason}`);
			for (const file of result.changedFiles) {
				// @debug-ignore — CLI status output for block-markup:check
				console.error(
					`  - ${path.relative(options.productRoot, file)}`
				);
			}
			// @debug-ignore — CLI status output for block-markup:check
			console.error(
				'Run `npm run block-markup:normalize` and commit the updated files.'
			);
			process.exit(1);
		}

		if (overrides.check) {
			// @debug-ignore — CLI status output for block-markup:check
			console.log('✅ Block-markup files are normalized.');
		} else if (overrides.prettierOnly) {
			// @debug-ignore — CLI status output for block-markup:prettier
			console.log(
				`✅ Block-markup prettier complete (${result.changedFiles.length} file(s) updated).`
			);
		} else {
			// @debug-ignore — CLI status output for block-markup:normalize
			console.log(
				`✅ Block-markup normalization complete (${result.changedFiles.length} file(s) updated).`
			);
		}

		process.exit(0);
	} catch (error) {
		// @debug-ignore — CLI status output for block-markup
		console.error(`❌ Block-markup normalization failed: ${error.message}`);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}

module.exports = { parseArgs, main };
