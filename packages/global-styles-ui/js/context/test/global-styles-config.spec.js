import {
	mergeBaseAndUserConfigs,
	retainEqualSubtrees,
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

	it('keeps theme and default preset arrays when only custom changes', () => {
		const theme = [{ slug: 'theme-shadow', shadow: '0 0 4px #000' }];
		const defaults = [{ slug: 'default-shadow', shadow: '0 0 2px #000' }];
		const base = {
			settings: {
				shadow: {
					presets: {
						theme,
						default: defaults,
						custom: [],
					},
				},
			},
		};
		const firstUser = retainUserGlobalStylesRecord(
			{
				shadow: {
					presets: {
						custom: [{ slug: 'c1', shadow: '0 0 8px #111' }],
					},
				},
			},
			{},
			{}
		);
		const first = retainMergedBaseAndUserConfigs(base, firstUser);

		const secondUser = retainUserGlobalStylesRecord(
			{
				shadow: {
					presets: {
						custom: [{ slug: 'c1', shadow: '0 0 18px #111' }],
					},
				},
			},
			{},
			{}
		);
		const second = retainMergedBaseAndUserConfigs(base, secondUser);

		expect(second).not.toBe(first);
		expect(second.settings.shadow.presets.theme).toBe(
			first.settings.shadow.presets.theme
		);
		expect(second.settings.shadow.presets.default).toBe(
			first.settings.shadow.presets.default
		);
		expect(second.settings.shadow.presets.custom).not.toBe(
			first.settings.shadow.presets.custom
		);
		expect(second.settings.shadow.presets.custom).toEqual([
			{ slug: 'c1', shadow: '0 0 18px #111' },
		]);
	});
});

describe('retainEqualSubtrees', () => {
	it('reuses a cloned wrapper when child refs are unchanged', () => {
		const item = { slug: 'a', size: '16px' };
		const previous = { item };
		const next = { item };

		expect(retainEqualSubtrees(previous, next)).toBe(previous);
	});

	it('reuses equal nested values on new identities', () => {
		const previous = { item: { slug: 'a', size: '16px' } };
		const next = { item: { slug: 'a', size: '16px' } };

		expect(retainEqualSubtrees(previous, next)).toBe(previous);
		expect(retainEqualSubtrees(previous, next).item).toBe(previous.item);
	});
});
