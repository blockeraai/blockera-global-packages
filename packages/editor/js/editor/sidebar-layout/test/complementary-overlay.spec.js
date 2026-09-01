/**
 * Internal dependencies
 */
import { findComplementaryHandleHost } from '../useComplementaryOverlay';

describe('complementary overlay host', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('prefers the editor settings tab bar over the panel body', () => {
		document.body.innerHTML = `
			<div class="interface-interface-skeleton__sidebar">
				<div class="editor-sidebar__panel-tabs"></div>
				<div class="components-panel"></div>
			</div>
		`;

		expect(findComplementaryHandleHost()?.className).toBe(
			'editor-sidebar__panel-tabs'
		);
	});

	it('falls back to the widgets settings tab bar', () => {
		document.body.innerHTML = `
			<div class="interface-interface-skeleton__sidebar">
				<div class="edit-widgets-sidebar__panel-tabs"></div>
			</div>
		`;

		expect(findComplementaryHandleHost()?.className).toBe(
			'edit-widgets-sidebar__panel-tabs'
		);
	});
});
