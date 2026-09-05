import {
	mergeBaseAndUserConfigs,
	retainMergedBaseAndUserConfigs,
	retainUserGlobalStylesRecord,
	resetGlobalStylesConfigRetainersForTests,
} from '../global-styles-config';

describe('retainUserGlobalStylesRecord', () => {
	beforeEach(() => {
		resetGlobalStylesConfigRetainersForTests();
	});

	it('returns the same object while settings, styles, and links identity is unchanged', () => {
		const settings = { color: { palette: [] } };
		const styles = { color: { text: '#111' } };
		const links = {};

		const first = retainUserGlobalStylesRecord(settings, styles, links);
		const second = retainUserGlobalStylesRecord(settings, styles, links);

		expect(second).toBe(first);
	});

	it('rebuilds when a slice identity changes', () => {
		const settings = { color: { palette: [] } };
		const first = retainUserGlobalStylesRecord(settings, {}, {});
		const second = retainUserGlobalStylesRecord(
			{ color: { palette: [] } },
			{},
			{}
		);

		expect(second).not.toBe(first);
	});
});

describe('retainMergedBaseAndUserConfigs', () => {
	beforeEach(() => {
		resetGlobalStylesConfigRetainersForTests();
	});

	it('deep-merges once for the same base and user records', () => {
		const base = { settings: { color: { defaultPalette: true } } };
		const user = retainUserGlobalStylesRecord(
			{ color: { palette: { custom: [{ slug: 'a' }] } } },
			{},
			{}
		);

		const first = retainMergedBaseAndUserConfigs(base, user);
		const second = retainMergedBaseAndUserConfigs(base, user);

		expect(second).toBe(first);
		expect(first).toEqual(mergeBaseAndUserConfigs(base, user));
	});

	it('replaces backgroundImage instead of merging it', () => {
		const merged = mergeBaseAndUserConfigs(
			{ styles: { backgroundImage: { url: 'a.png' } } },
			{ styles: { backgroundImage: { url: 'b.png' } } }
		);

		expect(merged.styles.backgroundImage).toEqual({ url: 'b.png' });
	});
});
