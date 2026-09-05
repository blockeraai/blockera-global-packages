/**
 * Internal dependencies
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
	formatCategorySummaries,
	listCategories,
	listCategoriesFromSpecPaths,
	listCategorySummaries,
	specsForCategory,
	specsForCategoryFromDisk,
	stripShardSuffix,
} = require('../lib/list-test-categories');
const { countRegisteredTests } = require('../lib/count-registered-tests');

function writeSpec(dir, relative, source) {
	const filePath = path.join(dir, relative);
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, source);
	return filePath;
}

function its(count) {
	return Array.from(
		{ length: count },
		(_, index) => `it('case ${index}', () => {});`
	).join('\n');
}

describe('countRegisteredTests', () => {
	it('multiplies it() inside an array-literal forEach wrapping describe', () => {
		const source = `
['flex-direction: row', 'flex-direction: column'].forEach((type) => {
	describe(type + ' Direction', () => {
		it('should apply all special matrix units correctly', () => {});
	});
});
`;
		expect(countRegisteredTests(source)).toBe(2);
	});

	it('multiplies it() using a same-file const array forEach', () => {
		const source = `
const ITEMS = ['a', 'b', 'c'];
ITEMS.forEach((item) => {
	it(item, () => {});
});
`;
		expect(countRegisteredTests(source)).toBe(3);
	});

	it('does not multiply forEach inside an it body', () => {
		const source = `
it('one test', () => {
	MATRIX.forEach((unit) => {
		cy.wrap(unit);
	});
});
`;
		expect(countRegisteredTests(source)).toBe(1);
	});

	it('does not count it.skip', () => {
		expect(
			countRegisteredTests(`it.skip('nope', () => {});\nit('yes', () => {});`)
		).toBe(1);
	});

	it('multiplies nested forEach generators', () => {
		const source = `
['a', 'b'].forEach((x) => {
	['1', '2', '3'].forEach((y) => {
		it(x + y, () => {});
	});
});
`;
		expect(countRegisteredTests(source)).toBe(6);
	});
});

describe('stripShardSuffix', () => {
	it('strips a trailing -N shard', () => {
		expect(stripShardSuffix('compatibility-2')).toBe('compatibility');
		expect(stripShardSuffix('plugin-compatibility-1')).toBe(
			'plugin-compatibility'
		);
		expect(stripShardSuffix('woocommerce')).toBe('woocommerce');
	});
});

describe('list-test-categories sharding', () => {
	let root;

	beforeEach(() => {
		root = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-shards-'));
	});

	afterEach(() => {
		fs.rmSync(root, { recursive: true, force: true });
	});

	it('keeps filename categories when SHARD_SIZE is unset', () => {
		writeSpec(
			root,
			'packages/editor/test/width.compatibility-2.e2e.cy.js',
			its(3)
		);
		writeSpec(
			root,
			'packages/editor/test/plain.e2e.cy.js',
			its(1)
		);

		expect(
			listCategories({
				root,
				suffix: 'e2e.cy.js',
				scanRoots: ['packages'],
			})
		).toEqual(['general-1', 'compatibility-2']);
	});

	it('packs a base category into base-1..N by registered it() count', () => {
		writeSpec(
			root,
			'packages/editor/test/a.compatibility.e2e.cy.js',
			its(40)
		);
		writeSpec(
			root,
			'packages/editor/test/b.compatibility.e2e.cy.js',
			its(40)
		);
		writeSpec(
			root,
			'packages/editor/test/c.compatibility.e2e.cy.js',
			its(40)
		);

		const options = {
			root,
			suffix: 'e2e.cy.js',
			scanRoots: ['packages'],
			shardSize: 100,
			generalCategory: 'none',
		};

		expect(listCategories(options)).toEqual([
			'compatibility-1',
			'compatibility-2',
		]);
		expect(specsForCategoryFromDisk('compatibility-1', options)).toEqual([
			'packages/editor/test/a.compatibility.e2e.cy.js',
			'packages/editor/test/b.compatibility.e2e.cy.js',
		]);
		expect(specsForCategoryFromDisk('compatibility-2', options)).toEqual([
			'packages/editor/test/c.compatibility.e2e.cy.js',
		]);
	});

	it('gives an oversized file its own shard', () => {
		writeSpec(
			root,
			'packages/editor/test/huge.compatibility.e2e.cy.js',
			its(150)
		);
		writeSpec(
			root,
			'packages/editor/test/small.compatibility.e2e.cy.js',
			its(10)
		);

		const options = {
			root,
			suffix: 'e2e.cy.js',
			scanRoots: ['packages'],
			shardSize: 100,
			generalCategory: 'none',
		};

		expect(listCategories(options)).toEqual([
			'compatibility-1',
			'compatibility-2',
		]);
		expect(specsForCategoryFromDisk('compatibility-1', options)).toEqual([
			'packages/editor/test/huge.compatibility.e2e.cy.js',
		]);
	});

	it('merges numbered filename categories before packing', () => {
		writeSpec(
			root,
			'packages/editor/test/width.compatibility-1.e2e.cy.js',
			its(10)
		);
		writeSpec(
			root,
			'packages/editor/test/height.compatibility-2.e2e.cy.js',
			its(10)
		);

		expect(
			listCategories({
				root,
				suffix: 'e2e.cy.js',
				scanRoots: ['packages'],
				shardSize: 100,
				generalCategory: 'none',
			})
		).toEqual(['compatibility']);
	});

	it('keeps the base category id when packing yields a single shard', () => {
		writeSpec(
			root,
			'packages/editor/test/a.compatibility.e2e.cy.js',
			its(40)
		);

		const options = {
			root,
			suffix: 'e2e.cy.js',
			scanRoots: ['packages'],
			shardSize: 100,
			generalCategory: 'none',
		};

		expect(listCategories(options)).toEqual(['compatibility']);
		expect(specsForCategoryFromDisk('compatibility', options)).toEqual([
			'packages/editor/test/a.compatibility.e2e.cy.js',
		]);
		expect(specsForCategoryFromDisk('compatibility-1', options)).toEqual(
			[]
		);
	});

	it('spreads files evenly across the shard count instead of leaving a tiny leftover', () => {
		writeSpec(
			root,
			'packages/editor/test/a.compatibility.e2e.cy.js',
			its(30)
		);
		writeSpec(
			root,
			'packages/editor/test/b.compatibility.e2e.cy.js',
			its(30)
		);
		writeSpec(
			root,
			'packages/editor/test/c.compatibility.e2e.cy.js',
			its(30)
		);
		writeSpec(
			root,
			'packages/editor/test/d.compatibility.e2e.cy.js',
			its(30)
		);
		writeSpec(
			root,
			'packages/editor/test/e.compatibility.e2e.cy.js',
			its(5)
		);

		const options = {
			root,
			suffix: 'e2e.cy.js',
			scanRoots: ['packages'],
			shardSize: 80,
			generalCategory: 'none',
		};

		expect(listCategories(options)).toEqual([
			'compatibility-1',
			'compatibility-2',
		]);
		expect(specsForCategoryFromDisk('compatibility-1', options)).toEqual([
			'packages/editor/test/a.compatibility.e2e.cy.js',
			'packages/editor/test/b.compatibility.e2e.cy.js',
			'packages/editor/test/c.compatibility.e2e.cy.js',
		]);
		expect(specsForCategoryFromDisk('compatibility-2', options)).toEqual([
			'packages/editor/test/d.compatibility.e2e.cy.js',
			'packages/editor/test/e.compatibility.e2e.cy.js',
		]);
	});

	it('packs PR spec paths only', () => {
		const paths = [
			'packages/editor/test/a.compatibility.e2e.cy.js',
			'packages/editor/test/b.compatibility.e2e.cy.js',
		];
		writeSpec(root, paths[0], its(40));
		writeSpec(root, paths[1], its(40));

		const options = {
			root,
			suffix: 'e2e.cy.js',
			shardSize: 50,
			generalCategory: 'none',
		};

		expect(listCategoriesFromSpecPaths(paths, options)).toEqual([
			'compatibility-1',
			'compatibility-2',
		]);
		expect(specsForCategory(paths, 'compatibility-1', options)).toEqual([
			paths[0],
		]);
	});

	it('summarizes registered it() and file counts per shard', () => {
		writeSpec(
			root,
			'packages/editor/test/a.compatibility.e2e.cy.js',
			its(30)
		);
		writeSpec(
			root,
			'packages/editor/test/b.compatibility.e2e.cy.js',
			its(30)
		);
		writeSpec(
			root,
			'packages/editor/test/c.compatibility.e2e.cy.js',
			its(30)
		);
		writeSpec(
			root,
			'packages/editor/test/d.compatibility.e2e.cy.js',
			its(30)
		);
		writeSpec(
			root,
			'packages/editor/test/e.compatibility.e2e.cy.js',
			its(5)
		);

		const options = {
			root,
			suffix: 'e2e.cy.js',
			scanRoots: ['packages'],
			shardSize: 80,
			generalCategory: 'none',
		};

		expect(listCategorySummaries(options)).toEqual([
			{ category: 'compatibility-1', files: 3, its: 90 },
			{ category: 'compatibility-2', files: 2, its: 35 },
		]);
		expect(
			formatCategorySummaries(listCategorySummaries(options))
		).toContain('compatibility-1');
		expect(
			formatCategorySummaries(listCategorySummaries(options))
		).toMatch(/total\s+125 its/);
	});
});
