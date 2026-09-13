/**
 * Internal dependencies
 */
import {
	SLIDE_HOST_OPEN_CLASS,
	subscribeSlideHostOpenClass,
} from '../slide-host-open-class';

describe('subscribeSlideHostOpenClass', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('applies is-open after the host is inserted', async () => {
		const findHost = () =>
			document.querySelector(
				'.interface-interface-skeleton__secondary-sidebar-blockera'
			);

		const unsubscribe = subscribeSlideHostOpenClass(findHost, true);

		const host = document.createElement('div');
		host.className =
			'interface-interface-skeleton__secondary-sidebar-blockera';
		document.body.append(host);

		await Promise.resolve();
		await new Promise((resolve) => {
			requestAnimationFrame(() => resolve());
		});

		expect(host.classList.contains(SLIDE_HOST_OPEN_CLASS)).toBe(true);
		unsubscribe();
	});
});
