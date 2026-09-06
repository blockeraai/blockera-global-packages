// @flow

export const RENDER_DEBUG_KEY = '__BLOCKERA_RENDER_DEBUG__';
export const RENDER_STATS_KEY = '__BLOCKERA_RENDER_STATS__';
export const BLOCK_BASE_RENDER_DEBUG_KEY = '__BLOCKERA_BLOCK_BASE_RENDER_DEBUG__';
export const BLOCK_BASE_RENDER_STATS_KEY = '__BLOCKERA_BLOCK_BASE_RENDER_STATS__';

const LOG_LIMIT = 400;

function debugKeysForComponent(component: ?string): Array<string> {
	if (component === 'BlockBase') {
		return [RENDER_DEBUG_KEY, BLOCK_BASE_RENDER_DEBUG_KEY];
	}

	return [RENDER_DEBUG_KEY];
}

function windowHasDebugFlag(target: Object, keys: Array<string>): boolean {
	for (let i = 0; i < keys.length; i++) {
		if (target[keys[i]]) {
			return true;
		}
	}

	return false;
}

/**
 * Parent window when Cypress set the debug flag before boot (canvas iframes
 * report up). Same-window when the flag is local. Null when unset (production).
 *
 * @param {?string} component
 * @return {null | Object}
 */
export function getRenderDebugWindow(component: ?string): null | Object {
	if (typeof window === 'undefined') {
		return null;
	}

	const keys = debugKeysForComponent(component);

	try {
		if (window.parent && windowHasDebugFlag(window.parent, keys)) {
			return window.parent;
		}
	} catch (e) {
		// Cross-origin parent; fall through to the local window.
	}

	if (windowHasDebugFlag(window, keys)) {
		return window;
	}

	return null;
}

export function shouldTrackComponentRender(component: ?string): boolean {
	return getRenderDebugWindow(component) !== null;
}

function ensureSharedStats(target: Object): Object {
	if (!target[RENDER_STATS_KEY]) {
		target[RENDER_STATS_KEY] = {
			total: 0,
			byComponent: {},
		};
	}

	return target[RENDER_STATS_KEY];
}

function ensureBlockBaseCompatStats(target: Object): Object {
	if (!target[BLOCK_BASE_RENDER_STATS_KEY]) {
		target[BLOCK_BASE_RENDER_STATS_KEY] = {
			total: 0,
			byClientId: {},
			log: [],
		};
	}

	return target[BLOCK_BASE_RENDER_STATS_KEY];
}

function ensureComponentBucket(shared: Object, component: string): Object {
	if (!shared.byComponent[component]) {
		shared.byComponent[component] = {
			total: 0,
			byKey: {},
			log: [],
		};
	}

	return shared.byComponent[component];
}

function pushLog(bucket: Object, line: Object): void {
	bucket.log.push(line);

	if (bucket.log.length > LOG_LIMIT) {
		bucket.log.shift();
	}
}

/**
 * Count a component render when e2e (or a console session) set a window
 * debug flag before mount. `BlockBase` also honors the legacy
 * `__BLOCKERA_BLOCK_BASE_RENDER_DEBUG__` flag and writes compat stats.
 *
 * @param {string} component
 * @param {Object} details
 * @return {void}
 */
export function trackComponentRender(
	component: string,
	details: Object = {}
): void {
	const target = getRenderDebugWindow(component);

	if (!target) {
		return;
	}

	const shared = ensureSharedStats(target);
	const bucket = ensureComponentBucket(shared, component);
	const key =
		typeof details.clientId === 'string' && details.clientId
			? details.clientId
			: typeof details.id === 'string' && details.id
				? details.id
				: typeof details.name === 'string' && details.name
					? details.name
					: '_';

	shared.total += 1;
	bucket.total += 1;

	if (!bucket.byKey[key]) {
		bucket.byKey[key] = { count: 0 };
	}

	bucket.byKey[key].count += 1;

	const line = {
		component,
		key,
		total: shared.total,
		componentTotal: bucket.total,
		...details,
	};

	pushLog(bucket, line);

	if (component === 'BlockBase') {
		recordBlockBaseCompatStats(target, details, shared.total, bucket);
	}

	/* @debug-ignore */
	// eslint-disable-next-line no-console
	console.debug(`[${component} render]`, line);
}

function recordBlockBaseCompatStats(
	target: Object,
	details: Object,
	sharedTotal: number,
	bucket: Object
): void {
	const stats = ensureBlockBaseCompatStats(target);
	const { clientId, name, isSelected, insideBlockInspector } = details;

	stats.total += 1;

	if (!stats.byClientId[clientId]) {
		stats.byClientId[clientId] = {
			name,
			count: 0,
			selectedCount: 0,
			unselectedCount: 0,
			inspectorCount: 0,
		};
	}

	const entry = stats.byClientId[clientId];
	entry.name = name;
	entry.count += 1;

	if (isSelected) {
		entry.selectedCount += 1;
	} else {
		entry.unselectedCount += 1;
	}

	if (insideBlockInspector) {
		entry.inspectorCount += 1;
	}

	pushLog(stats, {
		clientId,
		name,
		isSelected,
		insideBlockInspector,
		total: stats.total,
		block: entry.count,
		sharedTotal,
		componentTotal: bucket.total,
	});
}
