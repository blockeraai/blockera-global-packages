// @flow

export const BLOCK_BASE_RENDER_DEBUG_KEY = '__BLOCKERA_BLOCK_BASE_RENDER_DEBUG__';
export const BLOCK_BASE_RENDER_STATS_KEY = '__BLOCKERA_BLOCK_BASE_RENDER_STATS__';

function getStatsWindow(): null | Object {
	if (typeof window === 'undefined') {
		return null;
	}

	try {
		if (window.parent && window.parent[BLOCK_BASE_RENDER_DEBUG_KEY]) {
			return window.parent;
		}
	} catch (e) {
		// Cross-origin parent; fall through to the local window.
	}

	if (window[BLOCK_BASE_RENDER_DEBUG_KEY]) {
		return window;
	}

	return null;
}

function ensureStats(target: Object): Object {
	if (!target[BLOCK_BASE_RENDER_STATS_KEY]) {
		target[BLOCK_BASE_RENDER_STATS_KEY] = {
			total: 0,
			byClientId: {},
			log: [],
		};
	}

	return target[BLOCK_BASE_RENDER_STATS_KEY];
}

/**
 * Count BlockBase renders when e2e (or a console session) sets
 * `window.__BLOCKERA_BLOCK_BASE_RENDER_DEBUG__ = true` before mount.
 * Canvas iframe instances report onto the parent window so Cypress can read them.
 *
 * @param {Object} details
 * @return {void}
 */
export function trackBlockBaseRender(details: {
	clientId: string,
	name: string,
	isSelected: boolean,
	insideBlockInspector: boolean,
}): void {
	const target = getStatsWindow();

	if (!target) {
		return;
	}

	const stats = ensureStats(target);
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

	const line = {
		clientId,
		name,
		isSelected,
		insideBlockInspector,
		total: stats.total,
		block: entry.count,
	};

	stats.log.push(line);

	if (stats.log.length > 400) {
		stats.log.shift();
	}

	/* @debug-ignore */
	// eslint-disable-next-line no-console
	console.debug('[BlockBase render]', line);
}
