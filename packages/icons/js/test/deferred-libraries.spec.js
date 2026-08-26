/**
 * @jest-environment jsdom
 */

/**
 * External dependencies
 */
import { render, waitFor } from '@testing-library/react';

/**
 * Internal dependencies
 */
import {
	Icon,
	arePickerLibrariesLoaded,
	ensureIconPickerLibraries,
	getIcon,
	getIconLibraryIcons,
	getIconLibrarySearchData,
	iconSearch,
	isDeferredIconLibrary,
	registerIconLibraries,
	scheduleIdleIconPickerPrefetch,
} from '../index';
import { __resetPickerLibrariesForTests } from '../icon-library';
import { __resetPickerLibraryLoaderForTests } from '../load-picker-libraries';

describe('deferred icon libraries', () => {
	afterEach(() => {
		__resetPickerLibrariesForTests();
		__resetPickerLibraryLoaderForTests();
		delete window.blockeraIconPickerScriptUrl;
		document
			.querySelectorAll('script[data-blockera-icon-picker]')
			.forEach((node) => node.remove());
		jest.useRealTimers();
	});

	it('keeps core UI icons available at boot', () => {
		expect(Object.keys(getIconLibraryIcons('ui')).length).toBeGreaterThan(
			0
		);
		expect(getIcon('trash', 'ui')).not.toBeNull();
	});

	it('does not ship picker packs until they are registered', () => {
		expect(arePickerLibrariesLoaded()).toBe(false);
		expect(getIconLibraryIcons('tabler')).toEqual({});
		expect(getIcon('home', 'tabler')).toBeNull();
		expect(iconSearch({ query: 'home', library: 'all2' })).toEqual({});
		expect(isDeferredIconLibrary('tabler')).toBe(true);
		expect(isDeferredIconLibrary('ui')).toBe(false);
	});

	it('merges picker packs on registerIconLibraries', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

		registerIconLibraries({
			libraries: {
				tabler: {
					icons: {
						home: '<svg></svg>',
					},
					searchData: [
						{
							iconName: 'home',
							title: 'Home',
							library: 'tabler',
							tags: [],
						},
					],
					render: () => null,
				},
			},
		});

		expect(arePickerLibrariesLoaded()).toBe(true);
		expect(getIconLibraryIcons('tabler').home).toBe('<svg></svg>');
		expect(getIcon('home', 'tabler')).toMatchObject({
			iconName: 'home',
			library: 'tabler',
		});
		expect(
			getIconLibrarySearchData('tabler').some(
				(item) => item.iconName === 'home'
			)
		).toBe(true);
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	it('renders a placeholder for deferred icons before packs load', () => {
		window.blockeraIconPickerScriptUrl =
			'https://example.test/icons-picker.js';

		const { container } = render(
			<Icon library="tabler" icon="home" iconSize={24} />
		);

		expect(
			container.querySelector('.blockera-icon-loading')
		).not.toBeNull();
	});

	it('starts a single script request from ensureIconPickerLibraries', async () => {
		window.blockeraIconPickerScriptUrl =
			'https://example.test/icons-picker.js';

		const first = ensureIconPickerLibraries();
		const second = ensureIconPickerLibraries();

		expect(first).toBe(second);
		expect(
			document.querySelectorAll('script[data-blockera-icon-picker]')
				.length
		).toBe(1);

		const script = document.querySelector(
			'script[data-blockera-icon-picker]'
		);
		registerIconLibraries({ libraries: {} });
		script.dispatchEvent(new Event('load'));

		await waitFor(async () => {
			await expect(first).resolves.toBe(true);
		});
	});

	it('rejects when the picker script URL is missing', async () => {
		await expect(ensureIconPickerLibraries()).rejects.toThrow(
			'Icon picker script URL is missing.'
		);
	});

	it('does not fetch the picker script until idle delay after load', () => {
		jest.useFakeTimers();
		window.blockeraIconPickerScriptUrl =
			'https://example.test/icons-picker.js?ver=1.2.3';

		scheduleIdleIconPickerPrefetch(5000);

		expect(
			document.querySelectorAll('script[data-blockera-icon-picker]')
				.length
		).toBe(0);

		jest.advanceTimersByTime(4999);
		expect(
			document.querySelectorAll('script[data-blockera-icon-picker]')
				.length
		).toBe(0);

		jest.advanceTimersByTime(1);
		expect(
			document.querySelector('script[data-blockera-icon-picker]')?.src
		).toContain('icons-picker.js?ver=1.2.3');

		jest.useRealTimers();
	});

	it('cancels the idle execute timer on loader reset', () => {
		jest.useFakeTimers();
		window.blockeraIconPickerScriptUrl =
			'https://example.test/icons-picker.js?ver=1.2.3';

		scheduleIdleIconPickerPrefetch(5000);
		__resetPickerLibraryLoaderForTests();
		jest.advanceTimersByTime(5000);

		expect(
			document.querySelectorAll('script[data-blockera-icon-picker]')
				.length
		).toBe(0);

		jest.useRealTimers();
	});
});
