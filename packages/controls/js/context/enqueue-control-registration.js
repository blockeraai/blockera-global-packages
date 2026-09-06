// @flow

/**
 * Internal dependencies
 */
import { registerControl } from '../api';

type BatchFn = (callback: () => void) => void;

let queued: Array<Object> = [];

/**
 * Collect registerControl payloads during render (no store dispatch).
 * Flush once from useLayoutEffect so sibling providers do not each notify
 * the controls store (O(n) instead of O(n²) on inspector mount).
 *
 * @param {Object} payload registerControl argument.
 */
export function enqueueControlRegistration(payload: Object): void {
	queued.push(payload);
}

/**
 * Register every queued control in one WP data batch.
 *
 * @param {Function|null|void} batch registry.batch when available.
 */
export function flushQueuedControlRegistrations(batch: ?BatchFn): void {
	if (!queued.length) {
		return;
	}

	const items = queued;
	queued = [];

	const run = () => {
		for (let i = 0; i < items.length; i++) {
			registerControl(items[i]);
		}
	};

	if (typeof batch === 'function') {
		batch(run);
		return;
	}

	run();
}

export function resetControlRegistrationQueueForTests(): void {
	queued = [];
}
