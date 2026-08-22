/**
 * @jest-environment jsdom
 */

/**
 * Internal dependencies
 */
import { clearCoreSidebarSlideClasses, clickCoreNavItem } from '../dom';

describe('clickCoreNavItem', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	test('clicks the element with the given id', () => {
		const button = document.createElement('button');
		button.id = 'global-styles-navigation-item';
		const onClick = jest.fn();
		button.addEventListener('click', onClick);
		document.body.appendChild(button);

		clickCoreNavItem('global-styles-navigation-item');

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	test('no-ops when the id is missing', () => {
		expect(() => clickCoreNavItem('missing-uid')).not.toThrow();
	});
});

describe('clearCoreSidebarSlideClasses', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	test('removes core slide classes from the sidebar screen wrapper', () => {
		document.body.innerHTML = `
			<div class="edit-site-layout__sidebar">
				<div class="edit-site-sidebar__screen-wrapper slide-from-right slide-from-left other-class"></div>
			</div>
		`;

		clearCoreSidebarSlideClasses();

		const wrapper = document.querySelector(
			'.edit-site-sidebar__screen-wrapper'
		);
		expect(wrapper.classList.contains('slide-from-right')).toBe(false);
		expect(wrapper.classList.contains('slide-from-left')).toBe(false);
		expect(wrapper.classList.contains('other-class')).toBe(true);
	});

	test('no-ops when the wrapper is missing', () => {
		expect(() => clearCoreSidebarSlideClasses()).not.toThrow();
	});
});
