/**
 * Run a function in the parent page via CDP.
 *
 * Playwright `page.evaluate` / iframe `locator.evaluate` wait for every
 * frame’s `load`. Gutenberg’s blob canvas with pending comment avatars never
 * fires that event, so those APIs hang until the test timeout.
 *
 * CDP `Runtime.evaluate` targets the parent document and does not wait.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Function} pageFunction
 * @param {any} [arg]
 * @param {number} [timeout]
 * @return {Promise<any>}
 */
async function evaluateViaCdp(page, pageFunction, arg, timeout = 5000) {
	if (!page || page.isClosed()) {
		throw new Error('evaluateViaCdp: page is closed');
	}

	const client = await page.context().newCDPSession(page);
	const expression = `Promise.resolve((${pageFunction.toString()})(${JSON.stringify(
		arg === undefined ? null : arg
	)}))`;

	try {
		const response = await Promise.race([
			client.send('Runtime.evaluate', {
				expression,
				awaitPromise: true,
				returnByValue: true,
			}),
			new Promise((_, reject) => {
				setTimeout(() => {
					reject(
						new Error(`evaluateViaCdp timed out after ${timeout}ms`)
					);
				}, timeout);
			}),
		]);

		if (response.exceptionDetails) {
			const text =
				response.exceptionDetails.exception?.description ||
				response.exceptionDetails.text ||
				'evaluateViaCdp failed';
			throw new Error(text);
		}

		return response.result ? response.result.value : undefined;
	} finally {
		await client.detach().catch(() => undefined);
	}
}

const DEVICE_METRICS_SESSION = '_blockeraDeviceMetricsCdp';

/**
 * Device-metrics overrides are bound to the CDP session that set them.
 * Detaching that session restores Playwright’s default viewport (1280×900)
 * and editor screenshots miss the goldens by a few percent of pixels.
 *
 * @param {import('@playwright/test').Page} page
 * @return {Promise<import('playwright-core').CDPSession>}
 */
async function getDeviceMetricsCdpSession(page) {
	if (page[DEVICE_METRICS_SESSION]) {
		return page[DEVICE_METRICS_SESSION];
	}

	const client = await page.context().newCDPSession(page);
	page[DEVICE_METRICS_SESSION] = client;
	return client;
}

/**
 * Match Playwright `page.setViewportSize()` layout (see crPage `_updateViewport`):
 * resize the embedder window, then set device metrics including orientation.
 * Skipping `Browser.setWindowBounds` leaves the canvas on integer bounds so
 * element screenshots come out 1px shorter than goldens (560 vs 559).
 *
 * @param {import('playwright-core').CDPSession} client
 * @param {{ width: number, height: number }} viewport
 * @return {Promise<void>}
 */
async function sendDeviceMetricsOverride(client, viewport) {
	try {
		const { windowId } = await client.send('Browser.getWindowForTarget');

		if (windowId !== undefined && windowId !== null) {
			await client.send('Browser.setWindowBounds', {
				windowId,
				bounds: {
					width: viewport.width,
					height: viewport.height,
				},
			});
		}
	} catch {
		// Browser domain unavailable; metrics override below still applies.
	}

	await client.send('Emulation.setDeviceMetricsOverride', {
		mobile: false,
		width: viewport.width,
		height: viewport.height,
		screenWidth: viewport.width,
		screenHeight: viewport.height,
		deviceScaleFactor: 1,
		screenOrientation: { angle: 0, type: 'landscapePrimary' },
		dontSetVisibleSize: false,
	});
}

/**
 * Resize the window without Playwright `page.setViewportSize()`.
 *
 * `setViewportSize` waits for every frame’s `load`. Gutenberg remounts the
 * blob canvas on resize, and comment avatars can leave `load` pending forever.
 *
 * Keep the CDP session attached so the override survives until the frontend
 * helper clears it.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ width: number, height: number }} viewport
 * @param {number} [timeout]
 * @return {Promise<void>}
 */
async function setViewportSizeViaCdp(page, viewport, timeout = 3000) {
	if (!page || page.isClosed()) {
		throw new Error('setViewportSizeViaCdp: page is closed');
	}

	const apply = async (client) => {
		await Promise.race([
			sendDeviceMetricsOverride(client, viewport),
			new Promise((_, reject) => {
				setTimeout(() => {
					reject(
						new Error(
							`setViewportSizeViaCdp timed out after ${timeout}ms`
						)
					);
				}, timeout);
			}),
		]);
	};

	let client = await getDeviceMetricsCdpSession(page);

	try {
		await apply(client);
	} catch {
		await client.detach().catch(() => undefined);
		page[DEVICE_METRICS_SESSION] = undefined;
		client = await getDeviceMetricsCdpSession(page);
		await apply(client);
	}

	// Screenshot helpers read this; do not call page.setViewportSize (hangs).
	page._viewportSize = {
		width: viewport.width,
		height: viewport.height,
	};
}

/**
 * Drop a CDP device-metrics override so Playwright `page.setViewportSize`
 * owns the viewport again (frontend screenshots).
 *
 * @param {import('@playwright/test').Page} page
 * @return {Promise<void>}
 */
async function clearDeviceMetricsOverrideViaCdp(page) {
	const client = page[DEVICE_METRICS_SESSION];
	page[DEVICE_METRICS_SESSION] = undefined;

	if (!client) {
		return;
	}

	try {
		await client.send('Emulation.clearDeviceMetricsOverride');
	} catch {
		// Override was not set, or the page already navigated.
	} finally {
		await client.detach().catch(() => undefined);
	}
}

module.exports = {
	evaluateViaCdp,
	setViewportSizeViaCdp,
	clearDeviceMetricsOverrideViaCdp,
};
