import { getTargets } from '../helpers';

describe('getTargets api testing', () => {
	it('returns WordPress 7.1 global-styles-ui selectors regardless of version', () => {
		const result = getTargets('6.6.1');
		expect(result).toHaveProperty('globalStylesPanel');
		expect(result).not.toHaveProperty('header');
		expect(result.globalStylesPanel.screen).toBe(
			'.global-styles-ui-sidebar__navigator-screen'
		);
		expect(result.globalStylesPanel.navigatorScreen).toBe(
			'.global-styles-ui-sidebar__navigator-screen'
		);
		expect(result.globalStylesPanel.screenRoot).toBe(
			'.global-styles-ui-screen-root'
		);
		expect(result.globalStylesPanel.globalStylesScreen).toBe(
			'.global-styles-ui-block-types-search'
		);
	});

	it('should be retrieve targets object for wp 6.6.3-alpha-59007 version', () => {
		const result = getTargets('6.6.3-alpha-59007');
		expect(result).toHaveProperty('globalStylesPanel');
		expect(result).not.toHaveProperty('header');
	});

	it('should be retrieve targets object for wp 6.7.3-beta-12345 version', () => {
		const result = getTargets('6.7.3-beta-12345');
		expect(result).toHaveProperty('globalStylesPanel');
		expect(result).not.toHaveProperty('header');
	});

	it('should be retrieve targets object for wp 6.6 version', () => {
		const result = getTargets('6.6');
		expect(result).toHaveProperty('globalStylesPanel');
		expect(result).not.toHaveProperty('header');
	});
});
