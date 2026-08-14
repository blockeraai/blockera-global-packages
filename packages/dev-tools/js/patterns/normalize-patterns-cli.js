/**
 * CLI for pattern normalization.
 *
 * Usage:
 *   node packages/dev-tools/js/patterns/normalize-patterns-cli.js
 *   node packages/dev-tools/js/patterns/normalize-patterns-cli.js --check
 */

const path = require('path');

/**
 * Internal dependencies
 */
const { loadPatternsConfig } = require('./load-patterns-config');
const {
	normalizePatterns,
	checkPatterns,
} = require('../../../utils/js/patterns/normalize-patterns');

/**
 * Parse CLI argv into option overrides.
 *
 * @param {string[]} argv process.argv.slice(2)
 * @return {Object} Overrides for loadPatternsConfig / normalize.
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
	const options = loadPatternsConfig(overrides);

	try {
		const result = overrides.check
			? await checkPatterns(options)
			: await normalizePatterns(options);

		if (!result.ok) {
			// @debug-ignore — CLI status output for patterns:check
			console.error(`❌ ${result.reason}`);
			for (const file of result.changedFiles) {
				// @debug-ignore — CLI status output for patterns:check
				console.error(
					`  - ${path.relative(options.productRoot, file)}`
				);
			}
			// @debug-ignore — CLI status output for patterns:check
			console.error(
				'Run `npm run patterns:normalize` and commit the updated pattern files.'
			);
			process.exit(1);
		}

		if (overrides.check) {
			// @debug-ignore — CLI status output for patterns:check
			console.log('✅ Pattern files are normalized.');
		} else {
			// @debug-ignore — CLI status output for patterns:normalize
			console.log(
				`✅ Pattern normalization complete (${result.changedFiles.length} file(s) updated).`
			);
		}

		process.exit(0);
	} catch (error) {
		// @debug-ignore — CLI status output for patterns:normalize
		console.error(`❌ Pattern normalization failed: ${error.message}`);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}

module.exports = { parseArgs, main };
