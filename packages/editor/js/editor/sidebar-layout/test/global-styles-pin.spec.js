/**
 * Internal dependencies
 */
import {
	fallbackSettingsComplementaryArea,
	isGlobalStylesPinDeactivateEvent,
} from '../global-styles-pin';

describe('global styles header pin', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	function eventFrom(node) {
		return { target: node };
	}

	it('detects a click on the active Styles pin', () => {
		document.body.innerHTML = `
			<button
				aria-controls="edit-site:global-styles"
				aria-expanded="true"
				class="is-pressed"
			>
				<span>Styles</span>
			</button>
		`;

		expect(isGlobalStylesPinDeactivateEvent(eventFrom(null))).toBe(false);
		expect(
			isGlobalStylesPinDeactivateEvent(
				eventFrom(document.querySelector('span'))
			)
		).toBe(true);
	});

	it('ignores the Styles pin when it is not the active complementary area', () => {
		document.body.innerHTML = `
			<button aria-controls="edit-site:global-styles" aria-expanded="false">
				<span>Styles</span>
			</button>
		`;

		expect(
			isGlobalStylesPinDeactivateEvent(
				eventFrom(document.querySelector('span'))
			)
		).toBe(false);
	});

	it('picks the block settings area when a block is selected', () => {
		expect(fallbackSettingsComplementaryArea(true)).toBe('edit-post/block');
		expect(fallbackSettingsComplementaryArea(false)).toBe(
			'edit-post/document'
		);
	});
});
