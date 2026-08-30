/**
 * Wait until screenshot-relevant network and DOM media have settled.
 *
 * WordPress `networkidle` is unreliable here: heartbeat, post-lock, and
 * autosave keep at least one request open. This helper tracks images, media,
 * fonts, stylesheets, XHR, and fetch, and ignores that background traffic.
 */

const { evaluateViaCdp } = require('./evaluate-via-cdp');

const TRACKED_RESOURCE_TYPES = new Set([
	'image',
	'media',
	'font',
	'stylesheet',
	'xhr',
	'fetch',
]);

const IGNORED_RESOURCE_TYPES = new Set(['websocket', 'eventsource']);

/**
 * @param {import('@playwright/test').Request | {
 *   url?: string | (() => string),
 *   resourceType?: string | (() => string),
 *   postData?: string | (() => string | null),
 * }} request Playwright request or a plain test double.
 * @return {{ url: string, resourceType: string, postData: string }}
 */
function readRequestFields(request) {
	const url =
		typeof request.url === 'function' ? request.url() : request.url || '';
	const resourceType =
		typeof request.resourceType === 'function'
			? request.resourceType()
			: request.resourceType || '';
	const postDataRaw =
		typeof request.postData === 'function'
			? request.postData()
			: request.postData;

	return {
		url: url || '',
		resourceType: resourceType || '',
		postData: postDataRaw || '',
	};
}

/**
 * Heartbeat, cron, and autosave never go idle in the editor.
 *
 * @param {{ url: string, postData: string }} fields
 * @return {boolean}
 */
function isBackgroundWordPressTraffic(fields) {
	const { url, postData } = fields;
	const payload = `${url}\n${postData}`;

	if (url.includes('wp-cron.php')) {
		return true;
	}

	if (
		/action=(heartbeat|wp-refresh-post-lock|wp-remove-post-lock)/.test(
			payload
		)
	) {
		return true;
	}

	if (/\/wp-json\/[^?]*\/autosaves(?:\/|\?|$)/.test(url)) {
		return true;
	}

	return false;
}

/**
 * Whether this request should block screenshots until it settles.
 *
 * @param {import('@playwright/test').Request | object} request
 * @return {boolean}
 */
function shouldTrackNetworkRequest(request) {
	const fields = readRequestFields(request);
	const { url, resourceType } = fields;

	if (!url || IGNORED_RESOURCE_TYPES.has(resourceType)) {
		return false;
	}

	if (url.startsWith('data:') || url.startsWith('blob:')) {
		return false;
	}

	if (!TRACKED_RESOURCE_TYPES.has(resourceType)) {
		return false;
	}

	if (isBackgroundWordPressTraffic(fields)) {
		return false;
	}

	return true;
}

/**
 * @param {number} ms
 * @return {Promise<void>}
 */
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {number} startedAt
 * @param {number} timeout
 * @return {number}
 */
function remainingMs(startedAt, timeout) {
	return Math.max(0, timeout - (Date.now() - startedAt));
}

/**
 * Kick lazy images so they start loading. Do not await decode/fonts here:
 * `page.evaluate` uses the WP e2e timeout of 0, and `document.fonts.ready`
 * / `img.decode()` can leave that call pending forever on blob canvases.
 *
 * @param {import('@playwright/test').Page} page
 * @return {Promise<void>}
 */
async function waitForDomMedia(page) {
	await evaluateViaCdp(
		page,
		() => {
			const docs = [document];
			const canvas = document.querySelector(
				'iframe[name="editor-canvas"]'
			);

			if (canvas && canvas.contentDocument) {
				docs.push(canvas.contentDocument);
			}

			for (const doc of docs) {
				const images = Array.from(doc.querySelectorAll('img'));

				for (const img of images) {
					if (img.getAttribute('loading') === 'lazy') {
						img.loading = 'eager';
					}
				}
			}
		},
		null,
		2000
	).catch(() => undefined);
}

/**
 * Wait until images/media/fonts and AJAX/fetch relevant to screenshots are done.
 *
 * Listeners are attached first so in-flight work that starts during the DOM
 * media wait is still counted toward network idle.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ timeout?: number, idleTime?: number }} [options]
 * @return {Promise<void>}
 */
async function waitForContentReady(page, options = {}) {
	const timeout = options.timeout ?? 15000;
	const idleTime = options.idleTime ?? 400;
	const startedAt = Date.now();
	const pending = new Set();

	const onRequest = (request) => {
		if (shouldTrackNetworkRequest(request)) {
			pending.add(request);
		}
	};

	const onSettled = (request) => {
		pending.delete(request);
	};

	page.on('request', onRequest);
	page.on('requestfinished', onSettled);
	page.on('requestfailed', onSettled);

	try {
		const mediaBudget = remainingMs(startedAt, timeout);

		if (mediaBudget > 0) {
			await waitForDomMedia(page);
		}

		const idleBudget = remainingMs(startedAt, timeout);

		if (idleBudget <= 0) {
			return;
		}

		const deadline = Date.now() + idleBudget;
		let idleSince = pending.size === 0 ? Date.now() : null;

		while (Date.now() < deadline) {
			if (pending.size === 0) {
				if (idleSince === null) {
					idleSince = Date.now();
				}

				if (Date.now() - idleSince >= idleTime) {
					return;
				}
			} else {
				idleSince = null;
			}

			await sleep(50);
		}
	} finally {
		page.off('request', onRequest);
		page.off('requestfinished', onSettled);
		page.off('requestfailed', onSettled);
	}
}

module.exports = {
	waitForContentReady,
	shouldTrackNetworkRequest,
	isBackgroundWordPressTraffic,
};
