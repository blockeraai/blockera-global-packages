/**
 * Internal dependencies
 */
const {
	shouldTrackNetworkRequest,
	isBackgroundWordPressTraffic,
} = require('../wait-for-content-ready');

describe('shouldTrackNetworkRequest', () => {
	it('tracks image, media, font, stylesheet, xhr, and fetch', () => {
		expect(
			shouldTrackNetworkRequest({
				url: 'https://example.com/photo.jpg',
				resourceType: 'image',
			})
		).toBe(true);
		expect(
			shouldTrackNetworkRequest({
				url: 'https://example.com/clip.mp4',
				resourceType: 'media',
			})
		).toBe(true);
		expect(
			shouldTrackNetworkRequest({
				url: 'https://example.com/font.woff2',
				resourceType: 'font',
			})
		).toBe(true);
		expect(
			shouldTrackNetworkRequest({
				url: 'https://example.com/style.css',
				resourceType: 'stylesheet',
			})
		).toBe(true);
		expect(
			shouldTrackNetworkRequest({
				url: 'https://example.com/wp-json/wp/v2/media/12',
				resourceType: 'fetch',
			})
		).toBe(true);
		expect(
			shouldTrackNetworkRequest({
				url: 'https://example.com/wp-admin/admin-ajax.php',
				resourceType: 'xhr',
				postData: 'action=query-attachments',
			})
		).toBe(true);
	});

	it('ignores scripts, websockets, data URLs, and WP background traffic', () => {
		expect(
			shouldTrackNetworkRequest({
				url: 'https://example.com/app.js',
				resourceType: 'script',
			})
		).toBe(false);
		expect(
			shouldTrackNetworkRequest({
				url: 'wss://example.com/socket',
				resourceType: 'websocket',
			})
		).toBe(false);
		expect(
			shouldTrackNetworkRequest({
				url: 'data:image/png;base64,abc',
				resourceType: 'image',
			})
		).toBe(false);
		expect(
			shouldTrackNetworkRequest({
				url: 'https://example.com/wp-admin/admin-ajax.php',
				resourceType: 'xhr',
				postData: 'action=heartbeat&interval=15',
			})
		).toBe(false);
		expect(
			shouldTrackNetworkRequest({
				url: 'https://example.com/wp-cron.php?doing_wp_cron=1',
				resourceType: 'fetch',
			})
		).toBe(false);
		expect(
			shouldTrackNetworkRequest({
				url: 'https://example.com/wp-json/wp/v2/posts/4/autosaves',
				resourceType: 'fetch',
			})
		).toBe(false);
	});

	it('reads Playwright-style request methods', () => {
		expect(
			shouldTrackNetworkRequest({
				url: () => 'https://example.com/photo.jpg',
				resourceType: () => 'image',
				postData: () => null,
			})
		).toBe(true);
	});
});

describe('isBackgroundWordPressTraffic', () => {
	it('treats post-lock ajax as background', () => {
		expect(
			isBackgroundWordPressTraffic({
				url: 'https://example.com/wp-admin/admin-ajax.php',
				postData: 'action=wp-refresh-post-lock',
			})
		).toBe(true);
	});
});
