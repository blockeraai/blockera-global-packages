/**
 * Internal dependencies
 */
import {
	getSidebarDrag,
	startSidebarDrag,
	subscribeSidebarDrag,
} from '../drag-session';
import { getSidebarPerfSnapshot } from '../sidebar-perf';

function dispatchPointer(type, clientX, clientY) {
	const event = new Event(type, { bubbles: true });
	event.clientX = clientX;
	event.clientY = clientY;
	window.dispatchEvent(event);
}

describe('sidebar drag session', () => {
	beforeEach(() => {
		document.body.innerHTML = `
			<div data-test="blockera-sidebar-dock-left" data-drop-heights="50,50" data-can-reveal-third="0"></div>
			<div data-test="blockera-sidebar-dock-right" data-drop-heights="100" data-can-reveal-third="0"></div>
			<div data-test="blockera-sidebar-pane-listView"></div>
		`;
		document
			.querySelector('[data-test="blockera-sidebar-dock-left"]')
			.getBoundingClientRect = () => ({
			left: 0,
			right: 100,
			top: 0,
			bottom: 200,
			width: 100,
			height: 200,
			x: 0,
			y: 0,
			toJSON() {},
		});
		document
			.querySelector('[data-test="blockera-sidebar-dock-right"]')
			.getBoundingClientRect = () => ({
			left: 200,
			right: 300,
			top: 0,
			bottom: 200,
			width: 100,
			height: 200,
			x: 200,
			y: 0,
			toJSON() {},
		});
	});

	afterEach(() => {
		jest.useRealTimers();
		dispatchPointer('pointerup', 0, 0);
		document.body.innerHTML = '';
	});

	it('notifies layout listeners on start, hover change, and drop — not on every move', () => {
		const layout = jest.fn();
		const position = jest.fn();
		const unsubscribeLayout = subscribeSidebarDrag(layout, 'layout');
		const unsubscribePosition = subscribeSidebarDrag(position, 'position');

		startSidebarDrag({
			sectionId: 'listView',
			width: 100,
			height: 80,
			grabX: 10,
			grabY: 10,
			x: 10,
			y: 10,
			onDrop: () => {},
		});

		expect(layout).toHaveBeenCalledTimes(1);

		dispatchPointer('pointermove', 20, 20);
		expect(layout).toHaveBeenCalledTimes(2);

		dispatchPointer('pointermove', 24, 22);
		expect(layout).toHaveBeenCalledTimes(2);

		dispatchPointer('pointermove', 250, 40);
		expect(layout).toHaveBeenCalledTimes(3);

		dispatchPointer('pointermove', 252, 42);
		dispatchPointer('pointermove', 254, 44);
		dispatchPointer('pointermove', 256, 46);
		expect(layout).toHaveBeenCalledTimes(3);

		dispatchPointer('pointerup', 252, 42);

		expect(layout.mock.calls.length).toBeGreaterThan(3);
		expect(position.mock.calls.length).toBeGreaterThan(0);

		const snapshot = getSidebarPerfSnapshot();
		expect(snapshot.pointerMoves).toBeGreaterThan(2);
		expect(snapshot.layoutNotifies).toBeLessThan(snapshot.pointerMoves);
		expect(snapshot.actions.some((action) => action.name === 'start')).toBe(
			true
		);
		expect(snapshot.actions.some((action) => action.name === 'drop')).toBe(
			true
		);

		unsubscribeLayout();
		unsubscribePosition();
	});

	it('re-reads dock rects on move so a later reveal zone is hit', () => {
		const left = document.querySelector(
			'[data-test="blockera-sidebar-dock-left"]'
		);
		left.setAttribute('data-can-reveal-third', '1');
		left.getBoundingClientRect = () => ({
			left: 0,
			right: 100,
			top: 0,
			bottom: 80,
			width: 100,
			height: 80,
			x: 0,
			y: 0,
			toJSON() {},
		});

		startSidebarDrag({
			sectionId: 'listView',
			width: 100,
			height: 80,
			grabX: 10,
			grabY: 10,
			x: 10,
			y: 10,
			onDrop: () => {},
		});

		left.getBoundingClientRect = () => ({
			left: 0,
			right: 100,
			top: 0,
			bottom: 200,
			width: 100,
			height: 200,
			x: 0,
			y: 0,
			toJSON() {},
		});

		dispatchPointer('pointermove', 50, 190);

		expect(getSidebarDrag()?.hoverDock).toBe('left');
		expect(getSidebarDrag()?.hoverSlot).toBe(2);
		expect(getSidebarDrag()?.revealThirdDock).toBe('left');
	});

	it('does not drop and returns when released off a dock', () => {
		const onDrop = jest.fn();
		jest.useFakeTimers();

		startSidebarDrag({
			sectionId: 'listView',
			width: 100,
			height: 80,
			grabX: 10,
			grabY: 10,
			x: 10,
			y: 10,
			onDrop,
		});

		dispatchPointer('pointermove', 900, 900);
		dispatchPointer('pointerup', 900, 900);

		expect(onDrop).not.toHaveBeenCalled();
		expect(getSidebarDrag()?.returning).toBe(true);

		jest.advanceTimersByTime(300);

		expect(getSidebarDrag()).toBe(null);
		expect(onDrop).not.toHaveBeenCalled();
		expect(
			getSidebarPerfSnapshot().actions.some(
				(action) => action.name === 'cancel'
			)
		).toBe(true);
	});
});
