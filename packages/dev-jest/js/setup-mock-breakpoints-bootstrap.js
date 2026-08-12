/**
 * Stub breakpoints bootstrap in Jest.
 *
 * `breakpoints/index.js` re-exports `./bootstrap`, and moduleNameMapper cannot
 * uniquely match that relative specifier. Mock the resolved file so tests never
 * evaluate `@wordpress/core-data` via this module.
 */
jest.mock(
	'../../editor/js/editor/header-ui/components/breakpoints/bootstrap.js',
	() => ({
		bootstrapBreakpoints: () => {},
	})
);
