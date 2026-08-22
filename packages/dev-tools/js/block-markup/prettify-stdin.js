#!/usr/bin/env node
/**
 * Read HTML from stdin, write prettified HTML to stdout.
 *
 * Usage: node prettify-stdin.js [productRoot]
 */

const { loadBlockMarkupConfig } = require('./load-config');
const { prettifyMarkup } = require('./prettify-markup');

const productRoot = process.argv[2] || process.cwd();

async function readStdin() {
	const chunks = [];

	for await (const chunk of process.stdin) {
		chunks.push(chunk);
	}

	return Buffer.concat(chunks).toString('utf8');
}

(async () => {
	const input = await readStdin();
	let options = { productRoot, quiet: true };

	try {
		const config = loadBlockMarkupConfig({ quiet: true }, productRoot);
		options = {
			...config,
			productRoot,
			quiet: true,
		};
	} catch (error) {
		// Fall back to base prettier flags when the product config is missing.
	}

	const output = await prettifyMarkup(input, options);
	process.stdout.write(output);
})().catch((error) => {
	process.stderr.write(String(error && error.stack ? error.stack : error));
	process.exit(1);
});
