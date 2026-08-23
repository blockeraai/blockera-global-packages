/**
 * Internal dependencies
 */
const createRootWebpackConfig = require('../create-root-config');

describe('createRootWebpackConfig icons-picker', () => {
	it('adds an unversioned icons-picker entry next to icons', () => {
		let capturedEntry;

		const factory = createRootWebpackConfig({
			dependencies: {
				'@blockera/icons': 'file:./packages/global-packages/packages/icons',
			},
			packagesConfig: (env, argv) => {
				capturedEntry = argv.entry;

				return { entry: argv.entry };
			},
			resolvePackageDir: () =>
				'./packages/global-packages/packages/icons',
			getExternals: () => ({
				'@blockera/icons': 'blockeraIcons',
			}),
		});

		factory({}, { mode: 'production' });

		expect(capturedEntry.icons.library.name).toBe('blockeraIcons');
		expect(capturedEntry['icons-picker']).toEqual({
			import: './packages/global-packages/packages/icons/js/picker.js',
			library: {
				name: 'blockeraIconsPicker',
				type: 'var',
			},
		});
	});
});
