// @flow

/**
 * External dependencies
 */
import { useEffect, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import {
	arePickerLibrariesLoaded,
	subscribeIconPickerLibraries,
} from './icon-library';

const SCRIPT_ATTR = 'data-blockera-icon-picker';
const IDLE_PREFETCH_DELAY_MS = 5000;

let loadPromise: Promise<boolean> | null = null;
let idleTimerId: mixed = null;
let idleLoadListener: ?() => void = null;
let idlePrefetchScheduled = false;

function getPickerScriptUrl(): string {
	if (typeof window === 'undefined') {
		return '';
	}

	// $FlowFixMe
	const src = window.blockeraIconPickerScriptUrl;

	return typeof src === 'string' ? src : '';
}

/**
 * Load the deferred icon-picker script once.
 *
 * @return {Promise<boolean>} Resolves true when picker libraries are registered.
 */
export function ensureIconPickerLibraries(): Promise<boolean> {
	if (arePickerLibrariesLoaded()) {
		return Promise.resolve(true);
	}

	if (loadPromise) {
		return loadPromise;
	}

	loadPromise = new Promise((resolve, reject) => {
		if (arePickerLibrariesLoaded()) {
			resolve(true);
			return;
		}

		if (typeof document === 'undefined') {
			resolve(arePickerLibrariesLoaded());
			return;
		}

		const existing = document.querySelector(`script[${SCRIPT_ATTR}]`);

		if (existing) {
			if (arePickerLibrariesLoaded()) {
				resolve(true);
				return;
			}

			existing.addEventListener('load', () => {
				resolve(arePickerLibrariesLoaded());
			});
			existing.addEventListener('error', () => {
				loadPromise = null;
				reject(new Error('Failed to load icon picker libraries.'));
			});
			return;
		}

		const src = getPickerScriptUrl();

		if (!src) {
			loadPromise = null;
			reject(new Error('Icon picker script URL is missing.'));
			return;
		}

		const script = document.createElement('script');
		script.src = src;
		script.async = true;
		script.setAttribute(SCRIPT_ATTR, 'true');
		script.onload = () => {
			resolve(arePickerLibrariesLoaded());
		};
		script.onerror = () => {
			loadPromise = null;
			reject(new Error('Failed to load icon picker libraries.'));
		};
		document.head.appendChild(script);
	});

	return loadPromise;
}

/**
 * After the page has finished loading, wait, then execute picker packs in the
 * background. HTTP prefetch is printed from PHP in `admin_head`.
 *
 * @param {number} delayMs Idle delay after `window` load before execute.
 * @return {void}
 */
export function scheduleIdleIconPickerPrefetch(
	delayMs: number = IDLE_PREFETCH_DELAY_MS
): void {
	if (
		idlePrefetchScheduled ||
		typeof window === 'undefined' ||
		typeof document === 'undefined'
	) {
		return;
	}

	idlePrefetchScheduled = true;

	const start = () => {
		idleLoadListener = null;
		idleTimerId = setTimeout(() => {
			idleTimerId = null;
			ensureIconPickerLibraries().catch(() => {});
		}, delayMs);
	};

	if (document.readyState === 'complete') {
		start();
		return;
	}

	idleLoadListener = start;
	window.addEventListener('load', start, { once: true });
}

if (
	typeof process === 'undefined' ||
	!process.env ||
	process.env.NODE_ENV !== 'test'
) {
	scheduleIdleIconPickerPrefetch();
}

/**
 * Prefetch picker packs and re-render when they register.
 *
 * @return {boolean} True when deferred libraries are available.
 */
export function useIconPickerLibrariesReady(): boolean {
	const [ready, setReady] = useState(arePickerLibrariesLoaded);

	useEffect(() => {
		if (ready) {
			return undefined;
		}

		let cancelled = false;

		ensureIconPickerLibraries()
			.then((isReady) => {
				if (!cancelled && isReady) {
					setReady(true);
				}
			})
			.catch(() => {});

		const unsubscribe = subscribeIconPickerLibraries(() => {
			if (!cancelled) {
				setReady(arePickerLibrariesLoaded());
			}
		});

		return () => {
			cancelled = true;
			unsubscribe();
		};
	}, [ready]);

	return ready;
}

/**
 * Reset loader state for unit tests.
 *
 * @return {void}
 */
export function __resetPickerLibraryLoaderForTests(): void {
	loadPromise = null;
	idlePrefetchScheduled = false;

	if (idleLoadListener && typeof window !== 'undefined') {
		window.removeEventListener('load', idleLoadListener);
		idleLoadListener = null;
	}

	if (idleTimerId) {
		clearTimeout((idleTimerId: any));
		idleTimerId = null;
	}
}
