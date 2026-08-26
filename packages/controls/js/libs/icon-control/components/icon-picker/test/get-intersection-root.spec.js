/**
 * Internal dependencies
 */
import { getIntersectionRoot } from '../get-intersection-root';

describe('getIntersectionRoot', () => {
	it('returns the nearest overflow scroll ancestor that actually scrolls', () => {
		const modal = document.createElement('div');
		modal.className = 'blockera-control-icon-picker-modal';

		const scroller = document.createElement('div');
		Object.defineProperty(scroller, 'clientHeight', { value: 200 });
		Object.defineProperty(scroller, 'scrollHeight', { value: 800 });
		scroller.style.overflowY = 'auto';

		const child = document.createElement('div');
		scroller.appendChild(child);
		modal.appendChild(scroller);
		document.body.appendChild(modal);

		expect(getIntersectionRoot(child)).toBe(scroller);

		modal.remove();
	});

	it('skips overflow wrappers that do not overflow', () => {
		const modal = document.createElement('div');
		modal.className = 'blockera-control-icon-picker-modal';

		const wrapper = document.createElement('div');
		Object.defineProperty(wrapper, 'clientHeight', { value: 200 });
		Object.defineProperty(wrapper, 'scrollHeight', { value: 200 });
		wrapper.style.overflowY = 'auto';

		const child = document.createElement('div');
		wrapper.appendChild(child);
		modal.appendChild(wrapper);
		document.body.appendChild(modal);

		expect(getIntersectionRoot(child)).toBe(modal);

		modal.remove();
	});

	it('falls back to the icon picker modal when no scroller exists', () => {
		const modal = document.createElement('div');
		modal.className = 'blockera-control-icon-picker-modal';
		const child = document.createElement('div');
		modal.appendChild(child);
		document.body.appendChild(modal);

		expect(getIntersectionRoot(child)).toBe(modal);

		modal.remove();
	});
});
