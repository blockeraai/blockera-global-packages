const fs = require('fs');
const os = require('os');
const path = require('path');
const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { listCategories, sortCategories } = require('./list-test-categories');

describe('listCategories', { concurrency: 1 }, () => {
	let tmpDir;

	function writeFile(relativePath, contents = '') {
		const fullPath = path.join(tmpDir, relativePath);
		fs.mkdirSync(path.dirname(fullPath), { recursive: true });
		fs.writeFileSync(fullPath, contents);
	}

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(
			path.join(os.tmpdir(), 'list-test-categories-')
		);
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
		delete process.env.BLOCKERA_TEST_SCAN_ROOTS;
		delete process.env.BLOCKERA_E2E_SCAN_ROOTS;
		delete process.env.BLOCKERA_TEST_SUFFIX;
	});

	test('sortCategories puts general* first', () => {
		assert.deepEqual(
			sortCategories(['features', 'general-2', 'general', 'layout']),
			['general', 'general-2', 'features', 'layout']
		);
	});

	test('default scan of packages+tests finds categorized and general-1', () => {
		writeFile('packages/blockera/js/foo.features.e2e.cy.js');
		writeFile('packages/blockera/js/plain.e2e.cy.js');
		writeFile('tests/e2e/bar.layout.e2e.cy.js');
		writeFile('packages/blockera/js/ignored.unit.js');

		assert.deepEqual(
			listCategories({ root: tmpDir, suffix: 'e2e.cy.js' }),
			['general-1', 'features', 'layout']
		);
	});

	test('package suffix/prefix and exclude-categories are consumer-supplied', () => {
		writeFile('packages/blockera-pro/js/foo.features.e2e.cy.js');
		writeFile('packages/blockera-pro/js/plain.e2e.cy.js');
		writeFile('packages/validator/js/plain.e2e.cy.js');
		writeFile('packages/blockera/js/core.features.e2e.cy.js');
		writeFile('packages/blockera-pro/js/x.plugin-compatibility.e2e.cy.js');
		writeFile(
			'packages/blockera-pro/js/x.plugin-compatibility-2.e2e.cy.js'
		);

		assert.deepEqual(
			listCategories({
				root: tmpDir,
				suffix: 'e2e.cy.js',
				scanRoots: ['packages'],
				packageSuffix: '-pro',
				packagePrefix: 'blockera-pro-',
				generalPackages: ['validator', 'guard', 'console'],
				generalCategory: 'general',
				excludeCategories: ['plugin-compatibility*'],
			}),
			['general', 'features']
		);
	});

	test('scan-roots and package suffix ignore other packages and tests/', () => {
		writeFile('packages/blockera-one/js/foo.features.e2e.cy.js');
		writeFile('packages/blockera-one/js/plain.e2e.cy.js');
		writeFile('packages/blockera/js/core.layout.e2e.cy.js');
		writeFile('tests/e2e/theme.layout.e2e.cy.js');

		assert.deepEqual(
			listCategories({
				root: tmpDir,
				suffix: 'e2e.cy.js',
				scanRoots: ['packages'],
				packageSuffix: '-one',
				packagePrefix: 'blockera-one-',
			}),
			['general-1', 'features']
		);
	});

	test('file-pattern and last-segment category mode', () => {
		writeFile('packages/site-toolkit/js/foo.toolkit.e2e.cy.js');
		writeFile('packages/site-toolkit/js/foo.toolkit.admin.e2e.cy.js');
		writeFile('packages/blockera/js/core.features.e2e.cy.js');

		assert.deepEqual(
			listCategories({
				root: tmpDir,
				suffix: 'e2e.cy.js',
				scanRoots: ['packages/site-toolkit'],
				filePattern: /\.toolkit(\.[a-z0-9-]+)?\.e2e\.cy\.js$/i,
				categoryMode: 'last-segment',
				generalCategory: null,
			}),
			['admin', 'toolkit']
		);
	});

	test('exclude-files drops listed specs', () => {
		writeFile('packages/editor-one/js/foo.features.ply.js');
		writeFile('tests/visual.block-screenshots.ply.js');
		writeFile('tests/theme.layout.ply.js');
		writeFile('tests/plain.ply.js');

		assert.deepEqual(
			listCategories({
				root: tmpDir,
				suffix: 'ply.js',
				packageSuffix: '-one',
				packagePrefix: 'blockera-one-',
				excludeFiles: ['tests/visual.block-screenshots.ply.js'],
			}),
			['general-1', 'features', 'layout']
		);
	});

	test('scanRoots option limits discovery', () => {
		writeFile('custom/js/foo.features.e2e.cy.js');
		writeFile('packages/blockera/js/core.layout.e2e.cy.js');

		assert.deepEqual(
			listCategories({
				root: tmpDir,
				suffix: 'e2e.cy.js',
				scanRoots: ['custom'],
			}),
			['features']
		);
	});

	test('SCAN_ROOTS env is read via --env-prefix', () => {
		writeFile('custom/js/foo.features.e2e.cy.js');
		writeFile('packages/blockera/js/core.layout.e2e.cy.js');
		process.env.BLOCKERA_E2E_SCAN_ROOTS = 'custom';

		assert.deepEqual(
			listCategories({
				root: tmpDir,
				suffix: 'e2e.cy.js',
				envPrefix: 'BLOCKERA_E2E_',
			}),
			['features']
		);
	});
});
