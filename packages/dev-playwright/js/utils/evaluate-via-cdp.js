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

/**
 * Resize the window without Playwright `page.setViewportSize()`.
 *
 * `setViewportSize` waits for every frame’s `load`. Gutenberg remounts the
 * blob canvas on resize, and comment avatars can leave `load` pending forever.
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

	const client = await page.context().newCDPSession(page);

	try {
		await Promise.race([
			client.send('Emulation.setDeviceMetricsOverride', {
				width: viewport.width,
				height: viewport.height,
				deviceScaleFactor: 1,
				mobile: false,
			}),
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
	} finally {
		await client.detach().catch(() => undefined);
	}

	// Screenshot helpers read this; do not call page.setViewportSize (hangs).
	page._viewportSize = {
		width: viewport.width,
		height: viewport.height,
	};
}

module.exports = { evaluateViaCdp, setViewportSizeViaCdp };
