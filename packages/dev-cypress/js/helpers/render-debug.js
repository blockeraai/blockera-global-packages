/**
 * Cypress helpers for window-flag render counters.
 *
 * Specs must set the flags in `cy.visit` `onBeforeLoad` before the editor
 * boots. No extra webpack / APP_MODE env is required — Cypress CI uses the
 * production bundle and only counts when these window keys are set.
 */
import {
	closeWelcomeGuide,
	disableGutenbergFeatures,
	getWPDataObject,
} from './editor';
import { removeScopedStorageKeys } from './storage';
import { setAbsoluteBlockToolbar } from './site-navigation';

export const RENDER_DEBUG_KEY = '__BLOCKERA_RENDER_DEBUG__';
export const RENDER_STATS_KEY = '__BLOCKERA_RENDER_STATS__';
export const BLOCK_BASE_RENDER_DEBUG_KEY =
	'__BLOCKERA_BLOCK_BASE_RENDER_DEBUG__';
export const BLOCK_BASE_RENDER_STATS_KEY =
	'__BLOCKERA_BLOCK_BASE_RENDER_STATS__';

function emptyBlockBaseStats() {
	return {
		total: 0,
		byClientId: {},
		log: [],
	};
}

function emptySharedStats() {
	return {
		total: 0,
		byComponent: {},
	};
}

/**
 * @param {Window} win
 * @param {{ mode?: 'all' | 'blockBase' }} [options]
 */
export function installRenderDebugOnWindow(win, { mode = 'all' } = {}) {
	removeScopedStorageKeys(win.localStorage, 'blockeraEditorZoomPercent');

	if (mode === 'all') {
		win[RENDER_DEBUG_KEY] = true;
		win[RENDER_STATS_KEY] = emptySharedStats();
	}

	if (mode === 'all' || mode === 'blockBase') {
		win[BLOCK_BASE_RENDER_DEBUG_KEY] = true;
		win[BLOCK_BASE_RENDER_STATS_KEY] = emptyBlockBaseStats();
	}
}

function visitNewPost(path, onBeforeLoad) {
	const testURL = Cypress.env('testURL');
	let resolved = path;

	if (
		(testURL.endsWith('/') && !path.startsWith('/')) ||
		(!testURL.endsWith('/') && path.startsWith('/'))
	) {
		resolved = `${testURL}${path}`;
	} else if (!testURL.endsWith('/') && !path.startsWith('/')) {
		resolved = `${testURL}/${path}`;
	} else if (testURL.endsWith('/') && path.startsWith('/')) {
		resolved = `${testURL.slice(0, -1)}${path}`;
	} else {
		resolved = `${testURL}${path}`;
	}

	return cy.visit(resolved, { onBeforeLoad });
}

/**
 * Open a new post with render-debug flags set before editor boot.
 *
 * @param {{ mode?: 'all' | 'blockBase', postType?: string }} [options]
 */
export function createPostWithRenderDebug({
	mode = 'all',
	postType = 'post',
} = {}) {
	return visitNewPost(
		'/wp-admin/post-new.php?post_type=' + postType,
		(win) => {
			installRenderDebugOnWindow(win, { mode });
		}
	).then(() => {
		// eslint-disable-next-line
		cy.wait(2000);
		closeWelcomeGuide();
		disableGutenbergFeatures();
		setAbsoluteBlockToolbar();
		return getWPDataObject();
	});
}

export function readBlockBaseRenderStats() {
	return cy.window().then((win) => win[BLOCK_BASE_RENDER_STATS_KEY]);
}

export function readRenderStats() {
	return cy.window().then((win) => win[RENDER_STATS_KEY]);
}

export function snapshotBlockBaseRenderStats(alias) {
	return readBlockBaseRenderStats().then((stats) => {
		cy.log(
			`[BlockBase renders] ${alias} total=${stats?.total ?? 0} blocks=${
				Object.keys(stats?.byClientId || {}).length
			}`
		);
		cy.wrap(JSON.parse(JSON.stringify(stats || {}))).as(alias);
	});
}

export function snapshotRenderStats(alias) {
	return readRenderStats().then((stats) => {
		const components = Object.keys(stats?.byComponent || {});
		cy.log(
			`[renders] ${alias} total=${stats?.total ?? 0} components=${
				components.join(',') || 'none'
			}`
		);
		cy.wrap(JSON.parse(JSON.stringify(stats || {}))).as(alias);
	});
}

export function componentRenderTotal(stats, component) {
	return stats?.byComponent?.[component]?.total || 0;
}

export function expectComponentRenderDeltaAtMost({
	startAlias,
	endAlias,
	component,
	max,
	message,
}) {
	return cy.get(`@${startAlias}`).then((start) => {
		cy.get(`@${endAlias}`).then((end) => {
			const delta =
				componentRenderTotal(end, component) -
				componentRenderTotal(start, component);
			cy.log(`[renders] ${component} delta=${delta}`);
			expect(
				delta,
				message ||
					`${component} re-rendered ${delta} times (budget ${max})`
			).to.be.at.most(max);
		});
	});
}
