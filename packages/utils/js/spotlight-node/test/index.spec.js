/**
 * @jest-environment jsdom
 */

/**
 * External dependencies
 */
import { act, renderHook } from '@testing-library/react';

/**
 * Internal dependencies
 */
import {
	SPOTLIGHT_NODE_CLASS,
	clearSpotlightNode,
	spotlightNode,
	spotlightNodeByClientId,
	spotlightNodeBySelector,
	useSpotlightNode,
} from '../index';

function mockRect(el, rect) {
	el.getBoundingClientRect = () => ({
		x: rect.left,
		y: rect.top,
		left: rect.left,
		top: rect.top,
		right: rect.left + rect.width,
		bottom: rect.top + rect.height,
		width: rect.width,
		height: rect.height,
		toJSON: () => {},
	});
}

function getOverlay() {
	return document.querySelector(`.${SPOTLIGHT_NODE_CLASS}`);
}

describe('spotlightNode', () => {
	let matchMediaImpl;

	beforeEach(() => {
		jest.useFakeTimers();
		matchMediaImpl = window.matchMedia;
		window.matchMedia = jest.fn().mockImplementation((query) => ({
			matches: false,
			media: query,
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
		}));
		document.body.innerHTML = '';
	});

	afterEach(() => {
		clearSpotlightNode();
		jest.runOnlyPendingTimers();
		jest.useRealTimers();
		window.matchMedia = matchMediaImpl;
		document.body.innerHTML = '';
	});

	it('does not throw when the target is missing', () => {
		expect(() => spotlightNode('.missing')).not.toThrow();
		expect(() =>
			spotlightNodeByClientId('missing-client')
		).not.toThrow();
		expect(getOverlay()).toBeNull();
	});

	it('flashes an HTMLElement target', () => {
		const target = document.createElement('div');
		mockRect(target, { left: 40, top: 80, width: 100, height: 50 });
		document.body.appendChild(target);

		spotlightNode(target, { scroll: false });

		const overlay = getOverlay();
		expect(overlay).not.toBeNull();
		expect(overlay.getAttribute('aria-hidden')).toBe('true');
		expect(overlay.style.left).toBe('20px');
		expect(overlay.style.top).toBe('60px');
		expect(overlay.style.width).toBe('140px');
		expect(overlay.style.height).toBe('90px');
	});

	it('flashes a CSS selector in document', () => {
		const target = document.createElement('div');
		target.className = 'spotlight-me';
		mockRect(target, { left: 10, top: 10, width: 20, height: 20 });
		document.body.appendChild(target);

		spotlightNodeBySelector('.spotlight-me', { scroll: false });

		expect(getOverlay()).not.toBeNull();
	});

	it('flashes a block by clientId via [data-block]', () => {
		const target = document.createElement('div');
		target.setAttribute('data-block', 'abc-123');
		mockRect(target, { left: 0, top: 0, width: 10, height: 10 });
		document.body.appendChild(target);

		spotlightNodeByClientId('abc-123', { scroll: false });

		expect(getOverlay()).not.toBeNull();
	});

	it('finds a clientId inside the editor canvas iframe', () => {
		const iframe = document.createElement('iframe');
		iframe.name = 'editor-canvas';
		document.body.appendChild(iframe);
		const iframeDoc = iframe.contentDocument;
		expect(iframeDoc).not.toBeNull();

		const target = iframeDoc.createElement('div');
		target.setAttribute('data-block', 'in-iframe');
		mockRect(target, { left: 5, top: 5, width: 30, height: 12 });
		iframeDoc.body.appendChild(target);

		spotlightNode({ clientId: 'in-iframe' }, { scroll: false });

		expect(
			iframeDoc.querySelector(`.${SPOTLIGHT_NODE_CLASS}`)
		).not.toBeNull();
		expect(document.querySelector(`.${SPOTLIGHT_NODE_CLASS}`)).toBeNull();
	});

	it('applies padding, color, opacity, and speed', () => {
		const target = document.createElement('div');
		mockRect(target, { left: 100, top: 100, width: 40, height: 20 });
		document.body.appendChild(target);

		spotlightNode(target, {
			scroll: false,
			padding: 8,
			color: 'rgb(255, 0, 0)',
			opacity: 0.25,
			speed: 400,
		});

		const overlay = getOverlay();
		expect(overlay.style.left).toBe('92px');
		expect(overlay.style.top).toBe('92px');
		expect(overlay.style.width).toBe('56px');
		expect(overlay.style.height).toBe('36px');
		expect(
			overlay.style.getPropertyValue('--blockera-spotlight-node-color')
		).toBe('rgb(255, 0, 0)');
		expect(
			overlay.style.getPropertyValue('--blockera-spotlight-node-peak')
		).toBe('0.25');
		expect(overlay.style.animationDuration).toBe('400ms');
	});

	it('removes the overlay after the animation timeout', () => {
		const target = document.createElement('div');
		mockRect(target, { left: 0, top: 0, width: 10, height: 10 });
		document.body.appendChild(target);

		spotlightNode(target, { speed: 200, scroll: false });
		expect(getOverlay()).not.toBeNull();

		act(() => {
			jest.advanceTimersByTime(260);
		});

		expect(getOverlay()).toBeNull();
	});

	it('skips the overlay when reduced motion is preferred', () => {
		window.matchMedia = jest.fn().mockImplementation((query) => ({
			matches: String(query).includes('prefers-reduced-motion'),
			media: query,
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
		}));

		const target = document.createElement('div');
		mockRect(target, { left: 0, top: 0, width: 10, height: 10 });
		document.body.appendChild(target);

		spotlightNode(target);

		expect(getOverlay()).toBeNull();
	});

	it('does not flash when flash is false', () => {
		const target = document.createElement('div');
		mockRect(target, { left: 0, top: 0, width: 10, height: 10 });
		document.body.appendChild(target);

		spotlightNode(target, { flash: false });

		expect(getOverlay()).toBeNull();
	});

	it('does not flash when the node is already fully in the viewport', () => {
		const target = document.createElement('div');
		mockRect(target, { left: 0, top: 50, width: 40, height: 74 });
		document.body.appendChild(target);

		spotlightNode(target);

		expect(getOverlay()).toBeNull();
	});

	it('flashes without scrolling when scroll is false', () => {
		const target = document.createElement('div');
		mockRect(target, { left: 0, top: 900, width: 40, height: 20 });
		document.body.appendChild(target);
		const html = document.documentElement;
		html.scrollTop = 0;
		html.scrollTo = jest.fn();

		spotlightNode(target, { scroll: false, padding: 0 });

		expect(html.scrollTo).not.toHaveBeenCalled();
		expect(getOverlay()).not.toBeNull();
	});

	it('scrolls an off-screen node into view when flash is off', () => {
		const target = document.createElement('div');
		mockRect(target, { left: 0, top: 900, width: 40, height: 30 });
		document.body.appendChild(target);
		const html = document.documentElement;
		html.scrollTop = 0;
		Object.defineProperty(html, 'scrollHeight', {
			configurable: true,
			value: 2000,
		});
		Object.defineProperty(html, 'clientHeight', {
			configurable: true,
			value: 800,
		});
		Object.defineProperty(window, 'innerHeight', {
			configurable: true,
			value: 800,
		});
		html.scrollTo = jest.fn(function (arg) {
			if (arg && typeof arg.top === 'number') {
				this.scrollTop = arg.top;
			}
		});

		spotlightNode(target, { flash: false, behavior: 'auto' });

		expect(html.scrollTo).toHaveBeenCalled();
		expect(html.scrollTop).toBe(180);
		expect(getOverlay()).toBeNull();
	});
});

describe('useSpotlightNode', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		window.matchMedia = jest.fn().mockImplementation((query) => ({
			matches: false,
			media: query,
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
		}));
		document.body.innerHTML = '';
	});

	afterEach(() => {
		clearSpotlightNode();
		jest.useRealTimers();
		document.body.innerHTML = '';
	});

	it('does not flash on mount', () => {
		const target = document.createElement('div');
		target.className = 'hook-target';
		mockRect(target, { left: 0, top: 0, width: 10, height: 10 });
		document.body.appendChild(target);

		renderHook(() => useSpotlightNode());

		expect(getOverlay()).toBeNull();
	});

	it('flashes when the returned callback is invoked', () => {
		const target = document.createElement('div');
		target.className = 'hook-target';
		mockRect(target, { left: 0, top: 0, width: 10, height: 10 });
		document.body.appendChild(target);

		const { result } = renderHook(() =>
			useSpotlightNode({ padding: 4, speed: 100, scroll: false })
		);

		act(() => {
			result.current('.hook-target');
		});

		const overlay = getOverlay();
		expect(overlay).not.toBeNull();
		expect(overlay.style.left).toBe('-4px');
		expect(overlay.style.animationDuration).toBe('100ms');
	});
});
