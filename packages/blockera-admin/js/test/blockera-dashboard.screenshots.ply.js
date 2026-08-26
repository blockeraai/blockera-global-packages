/**
 * Visual snapshot test for Blockera Dashboard
 * Playwright e2e test
 */
const { goTo } = require('@blockera/dev-playwright/js/utils/helpers');
const {
	test,
	expect,
	applyDomSearchReplace,
} = require('@blockera/dev-playwright/js/support/commands');

test.describe('Blockera Dashboard → Visual Test', () => {
	test('screenshot dashboard', async ({ page }) => {
		await goTo(
			page,
			'/wp-admin/admin.php?page=blockera-settings-dashboard'
		);

		// disable wp footer to avoid screenshot issue
		await page.evaluate(() => {
			const wpfooter = document.querySelector('#wpfooter');
			if (wpfooter) {
				wpfooter.style.display = 'none';
			}
		});

		// disable sticky menu to avoid screenshot issue
		await page.evaluate(() => {
			const adminmenuwrap = document.querySelector('#adminmenuwrap');
			if (adminmenuwrap) {
				adminmenuwrap.style.position = 'relative';
			}
		});

		// hide WP update/moderation badges (Plugins, Themes, Updates, Comments)
		// so fluctuating counts cannot flake the snapshot
		await page.evaluate(() => {
			const badges = document.querySelectorAll(
				'#adminmenu .update-plugins, #adminmenu .awaiting-mod, #adminmenu .menu-counter, #wpadminbar #wp-admin-bar-updates'
			);

			badges.forEach((el) => {
				el.style.display = 'none';
			});
		});

		// Wait for content to be ready
		await page.waitForTimeout(500);

		// Dashboard Snapshot
		const body = page.locator('body');
		await body.scrollIntoViewIfNeeded();

		await page.setViewportSize({
			width: 1600,
			height: 1500,
		});

		await page
			.locator('.blockera-settings-header-version')
			.first()
			.waitFor({ state: 'visible' });

		// Keep the plugin version static so package bumps do not flake snapshots
		await applyDomSearchReplace(body, [
			{
				search: '(<span class="blockera-settings-header-version">)[^<]+(</span>)',
				replace: '$1vX.Y.Z$2',
			},
		]);

		// Soft assertion keeps the failure on this test (avoid try/catch + afterAll,
		// which can be misreported as flaky on CI retries).
		await expect.soft(body).toHaveScreenshot(`dashboard.png`, {
			threshold: 0.02,
		});
	});
});
