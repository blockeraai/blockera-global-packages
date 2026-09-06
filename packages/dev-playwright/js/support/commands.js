/**
 * External dependencies
 */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@wordpress/e2e-test-utils-playwright');

/**
 * Internal dependencies
 */
const { evaluateInEditorCanvas, openDocumentSettingsSidebar } = require('../utils/editor');
const { loginToSite, goTo } = require('../utils/site-navigation');

test.beforeEach(async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });

	// Login if not already logged in
	// Note: In Playwright, authentication is typically handled via storageState
	// But we can also manually login if needed
	if (!process.env.isLogin) {
		await loginToSite(page);
	}
});

/**
 * Blockera delay expected time constant.
 */
const BLOCKERA_DELAY_EXPECTED_TIME = 1000;

/**
 * Wait for assert value (helper function).
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {number} time - Time to wait in milliseconds (default: 300).
 * @return {Promise<void>}
 */
async function waitForAssertValue(page, time = BLOCKERA_DELAY_EXPECTED_TIME) {
	await page.waitForTimeout(time);
}

/**
 * Logout from WordPress site.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @return {Promise<void>}
 */
async function logout(page) {
	await goTo(page, '/wp-login.php?loggedout=true&wp_lang=en_US', true);
	// Note: Playwright doesn't have Cypress.session.clearAllSavedSessions()
	// Session management is handled differently in Playwright
}

/**
 * Add a new user to WordPress.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} user - Username.
 * @param {string} pass - Password.
 * @param {string} role - User role.
 * @return {Promise<void>}
 */
async function addNewUser(page, user, pass, role) {
	await goTo(page, '/wp-admin/users.php', true);
	await page.waitForTimeout(1000);

	// Click "Add New User" button
	const addUserButton = page
		.locator('a')
		.filter({ hasText: /Add( New)? User/ })
		.first();
	await addUserButton.click();
	await page.waitForTimeout(1000);

	// Fill in user details
	await page.locator('input[name="user_login"]').clear();
	await page.locator('input[name="user_login"]').fill(user);
	await page.locator('input[name="email"]').clear();
	await page.locator('input[name="email"]').fill(`${user}@${user}.com`);
	await page
		.locator('input[aria-describedby="pass-strength-result"]')
		.clear();
	await page
		.locator('input[aria-describedby="pass-strength-result"]')
		.fill(pass);
	await page
		.locator('label')
		.filter({ hasText: 'Confirm use of weak password' })
		.click();
	await page
		.locator('label')
		.filter({ hasText: 'Send the new user an email about their account' })
		.click();
	await page.locator('select[name="role"]').selectOption(role);

	// Submit the form
	await page
		.locator('input[value="Add New User"], input[value="Add User"]')
		.click();
}

/**
 * Get element by data-cy attribute.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} selector - Data-cy selector value.
 * @param {Object} options - Locator options.
 * @return {import('@playwright/test').Locator} Locator.
 */
function getByDataCy(page, selector, options = {}) {
	return page.locator(`[data-cy="${selector}"]`, options);
}

/**
 * Get element by data-test attribute.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} selector - Data-test selector value.
 * @param {Object} options - Locator options.
 * @return {import('@playwright/test').Locator} Locator.
 */
function getByDataTest(page, selector, options = {}) {
	return page.locator(`[data-test="${selector}"]`, options);
}

/**
 * Get element by data-testid attribute.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} selector - Data-testid selector value.
 * @param {Object} options - Locator options.
 * @return {import('@playwright/test').Locator} Locator.
 */
function getByDataTestId(page, selector, options = {}) {
	return page.locator(`[data-testid="${selector}"]`, options);
}

/**
 * Get element by data-id attribute.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} selector - Data-id selector value.
 * @param {Object} options - Locator options.
 * @return {import('@playwright/test').Locator} Locator.
 */
function getByDataId(page, selector, options = {}) {
	return page.locator(`[data-id="${selector}"]`, options);
}

/**
 * Get element by aria-label attribute.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} selector - Aria-label value.
 * @param {string} fallbackLabel - Optional fallback label.
 * @param {Object} options - Locator options.
 * @return {import('@playwright/test').Locator} Locator.
 */
function getByAriaLabel(page, selector, fallbackLabel = null, options = {}) {
	if (fallbackLabel) {
		return page.locator(
			`[aria-label="${selector}"], [aria-label="${fallbackLabel}"]`,
			options
		);
	}

	// Handle "Select X" pattern
	const regexp = /\bSelect\b\s\w+/i;
	if (regexp.exec(selector)) {
		const parsedSelector = selector.split(' ');
		const parsedLabel = selector.split(':');

		if (parsedLabel?.length > 1) {
			return page.locator(
				`[aria-label="${parsedSelector[0].trim()} parent block: ${parsedSelector[1].trim()}"], [aria-label="${parsedLabel[1].trim()}"]`,
				options
			);
		}

		return page.locator(
			`[aria-label="${parsedSelector[0].trim()} parent block: ${parsedSelector[1].trim()}"]`,
			options
		);
	}

	return page.locator(`[aria-label="${selector}"]`, options);
}

/**
 * Get CSS variable value.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} cssVarName - CSS variable name.
 * @param {string} selector - Optional selector.
 * @return {Promise<string>} CSS variable value.
 */
async function cssVar(page, cssVarName, selector = null) {
	if (selector) {
		return await page.evaluate(
			({ varName, sel }) => {
				const element = document.body.querySelector(sel);
				return window
					.getComputedStyle(element)
					.getPropertyValue(varName)
					.trim();
			},
			{ varName: cssVarName, sel: selector }
		);
	}

	return await page.evaluate((varName) => {
		return window
			.getComputedStyle(document.body)
			.getPropertyValue(varName)
			.trim();
	}, cssVarName);
}

/**
 * Get parent container element.
 * Returns the first [data-cy] container that has a descendant with the given aria-label.
 * Tries :last-child selector first; falls back to base selector when no match.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} ariaLabel - Aria label.
 * @param {string} parentsDataCy - Parent data-cy value (default: 'base-control').
 * @param {Object} options - Optional options.
 * @param {boolean} options.useLastChild - When true, try :last-child first, fallback to base selector. Default: true. Pass false to skip and use base selector only.
 * @return {Promise<import('@playwright/test').Locator>} Parent container locator (first match).
 */
async function getParentContainer(
	page,
	ariaLabel,
	parentsDataCy = 'base-control',
	options = {}
) {
	const baseSelector = `[data-cy="${parentsDataCy}"]:has([aria-label="${ariaLabel}"])`;

	if (options.useLastChild === false) {
		return page.locator(baseSelector).first();
	}

	const lastChildLocator = page.locator(`${baseSelector}:last-child`);
	if ((await lastChildLocator.count()) > 0) {
		return lastChildLocator.first();
	}

	return page.locator(baseSelector).first();
}

/**
 * Get block by name.
 *
 * In the WordPress block editor (Gutenberg), block elements use [data-type] in the site editor/canvas (iframe).
 * This function reliably selects a block by its name, supporting both post editor and site/canvas (iframe),
 * and returns a Locator for the nth matching block (by index).
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} blockName - Block name (e.g., 'core/paragraph', 'core/group').
 * @param {string} blockTag - Optional block tag (e.g., 'div', '[role="presentation"]'), default is ''.
 * @param {number} index - Zero-based index of the block when multiple blocks of same type exist (default: 0).
 * @return {Promise<import('@playwright/test').Locator>} Block locator for the nth matching block.
 */
async function getBlock(page, blockName, blockTag = '', index = 0) {
	const iframeSelector = 'iframe[name="editor-canvas"]';
	const hasIframe = (await page.locator(iframeSelector).count()) > 0;

	const isDefault = blockName === 'default';

	// Utility to wait for and click 'add default block', as before.
	async function addDefaultBlock(ctx) {
		const addDefaultSelector = '[aria-label="Add default block"]';
		await ctx
			.locator(addDefaultSelector)
			.first()
			.waitFor({ state: 'visible', timeout: 2500 });
		await ctx.locator(addDefaultSelector).first().click();
	}

	// Site/Template editor: canvas iframe (block editor uses [data-type] on block wrapper elements)
	if (hasIframe) {
		const frameLoc = page.frameLocator(iframeSelector);
		if (isDefault) {
			await addDefaultBlock(frameLoc);
			blockName = 'core/paragraph';
		}
		// Exclude blocks inside template parts (Header, Footer) - they intercept clicks and are not the main content
		const frame = page.frame({ name: 'editor-canvas' });
		if (frame) {
			const blockHandle = await frame.evaluateHandle(
				({ name, idx }) => {
					const all = document.querySelectorAll(
						`[data-type="${name}"]`
					);
					const filtered = Array.from(all).filter((el) => {
						let parent = el.parentElement;
						while (parent && parent !== document.body) {
							if (parent.dataset?.type === 'core/template-part') {
								return false;
							}
							parent = parent.parentElement;
						}
						return true;
					});
					return filtered[idx] || null;
				},
				{ name: blockName, idx: index }
			);
			if (blockHandle.asElement()) {
				const element = blockHandle.asElement();
				const selector = await element.evaluate((el) => {
					if (el.id) {
						return `#${el.id}`;
					}
					if (el.dataset.block) {
						return `[data-block="${el.dataset.block}"]`;
					}
					return null;
				});
				blockHandle.dispose();
				if (selector) {
					const locator = frameLoc.locator(selector);
					await locator.waitFor({ state: 'visible', timeout: 5000 });
					return locator;
				}
			} else {
				blockHandle.dispose();
			}
		}
		// Fallback: use selector without template-part exclusion
		const selectorFallback = blockTag
			? `${blockTag}[data-type="${blockName}"]`
			: `[data-type="${blockName}"]`;
		const blocksLocator = frameLoc.locator(selectorFallback);
		const blockLocator = blocksLocator.nth(index);
		await blockLocator.waitFor({ state: 'visible', timeout: 5000 });
		return blockLocator;
	}

	// Block/Post editor (no iframe): try [data-type] in main document, then fallbacks
	if (isDefault) {
		await addDefaultBlock(page);
		blockName = 'core/paragraph';
	}

	// 1. Try [data-type] in main document (some post editor setups use it)
	const dataTypeLocators = page.locator(`[data-type="${blockName}"]`);
	if ((await dataTypeLocators.count()) > 0) {
		const block = dataTypeLocators.nth(index);
		await block.waitFor({ state: 'visible', timeout: 5000 });
		return block;
	}

	// 2. Try locate block by aria-label (common in block editors for recognizable blocks)
	const ariaSelector = `[aria-label*="${blockName.replace(/^core\//, '').replace(/-/g, ' ')}"]`;
	const ariaLocators = page.locator(ariaSelector);
	if ((await ariaLocators.count()) > 0) {
		const block = ariaLocators.nth(index);
		await block.waitFor({ state: 'visible', timeout: 5000 });
		return block;
	}

	// 3. Try Gutenberg-specific: data-block and data-type via evaluate (post editor without iframe)
	const blockIndex = index;
	const maybeBlock = await page.evaluateHandle(
		({ blockName: name, blockIndex: idx }) => {
			const blockEls = Array.from(
				document.querySelectorAll('[data-block],[data-type]')
			).filter((el) => el.dataset.type === name);
			return blockEls.length > idx ? blockEls[idx] : null;
		},
		{ blockName, blockIndex }
	);

	if (maybeBlock && maybeBlock.asElement()) {
		const blockHandle = maybeBlock.asElement();
		const selector = await blockHandle.evaluate((el) => {
			if (el.id) {
				return `#${el.id}`;
			}
			if (el.dataset.block) {
				return `[data-block="${el.dataset.block}"]`;
			}
			return null;
		});
		if (selector) {
			const block = page.locator(selector);
			await block.waitFor({ state: 'visible', timeout: 5000 });
			return block;
		}
		return page.locator('body').filter({ has: maybeBlock });
	}

	// 4. Fallback: try finding block by text content (label matching)
	const blockLabel = blockName.replace(/^core\//, '').replace(/-/g, ' ');
	const guessLocators = page.locator(`text=/^${blockLabel}$/i`);
	if ((await guessLocators.count()) > 0) {
		const block = guessLocators.nth(index);
		await block.waitFor({ state: 'visible', timeout: 5000 });
		return block;
	}

	throw new Error(
		`Block "${blockName}" (index ${index}) could not be located in this editor context.`
	);
}

/**
 * Get selected block.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @return {Promise<import('@playwright/test').Locator>} Selected block locator.
 */
async function getSelectedBlock(page) {
	const iframe = page.frameLocator('iframe[name="editor-canvas"]');
	return iframe.locator('.wp-block.is-selected');
}

/**
 * Upload file.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} fileName - File name from fixtures.
 * @param {string} fileType - File MIME type.
 * @param {string} selector - Input selector.
 * @return {Promise<void>}
 */
async function uploadFile(page, fileName, fileType, selector) {
	const filePath = require('path').join(__dirname, '../fixtures', fileName);

	await page.locator(selector).setInputFiles(filePath);
}

/**
 * Multi-click an element.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} selector - Element selector.
 * @param {number} count - Number of clicks.
 * @return {Promise<void>}
 */
async function multiClick(page, selector, count) {
	const element = page.locator(selector);
	for (let i = 0; i < count; i++) {
		await element.click({ force: true });
	}
}

/**
 * Click outside (on body).
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @return {Promise<void>}
 */
async function clickOutside(page) {
	await page.locator('body').click({ position: { x: 0, y: 0 } });
}

/**
 * Set slider value.
 *
 * @param {import('@playwright/test').Locator} element - Slider element.
 * @param {number} value - Value to set.
 * @return {Promise<void>}
 */
async function setSliderValue(element, value) {
	await element.evaluate((el, val) => {
		const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
			window.HTMLInputElement.prototype,
			'value'
		)?.set;

		nativeInputValueSetter?.call(el, val);
		el.dispatchEvent(new Event('input', { bubbles: true }));
	}, value);
}

/**
 * Paste text into element.
 *
 * @param {import('@playwright/test').Locator} element - Element to paste into.
 * @param {string} text - Text to paste.
 * @return {Promise<void>}
 */
async function pasteText(element, text) {
	await element.fill(text);
	await element.press('Control+v');
}

/**
 * Custom select item from dropdown.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} item - Item text to select.
 * @return {Promise<void>}
 */
async function customSelect(page, item) {
	await page
		.locator('button[aria-haspopup="listbox"]')
		.click({ force: true });

	await page.locator('[role="listbox"]').locator(`text=${item}`).click({
		force: true,
	});
}

/**
 * Open accordion by heading.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} accordionHeading - Accordion heading text.
 * @return {Promise<void>}
 */
async function openAccordion(page, accordionHeading) {
	await page
		.locator('h2')
		.filter({ hasText: accordionHeading })
		.locator('..')
		.locator('..')
		.click({ force: true });
}

/**
 * Add repeater item.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} ariaLabel - Aria label of add button.
 * @param {number} clickCount - Number of times to click.
 * @return {Promise<void>}
 */
async function addRepeaterItem(page, ariaLabel, clickCount) {
	await multiClick(page, `[aria-label="${ariaLabel}"]`, clickCount);
}

/**
 * Set input field value.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} fieldLabel - Field label.
 * @param {string} groupLabel - Group label.
 * @param {string} value - Value to set.
 * @param {boolean} force - Force click.
 * @return {Promise<void>}
 */
async function setInputFieldValue(
	page,
	fieldLabel,
	groupLabel,
	value,
	force = false
) {
	const group = page
		.locator('h2')
		.filter({ hasText: groupLabel })
		.locator('..')
		.locator('..');

	await group
		.locator(`[aria-label="${fieldLabel}"]`)
		.locator('..')
		.locator('..')
		.locator('input')
		.fill(force ? `{selectall}${value}` : value, { force });
}

/**
 * Check input field value.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} fieldLabel - Field label.
 * @param {string} groupLabel - Group label.
 * @param {string} value - Expected value.
 * @return {Promise<void>}
 */
async function checkInputFieldValue(page, fieldLabel, groupLabel, value) {
	const group = page
		.locator('h2')
		.filter({ hasText: groupLabel })
		.locator('..')
		.locator('..');

	const input = group
		.locator(`[aria-label="${fieldLabel}"]`)
		.locator('..')
		.locator('..')
		.locator('input');

	await expect(input).toHaveValue(value);
}

/**
 * Sets a React-controlled text input in one shot (mirrors dev-cypress setControlledInputValue).
 *
 * @param {import('@playwright/test').Locator} locator - Input locator.
 * @param {string} value - Final value.
 * @return {Promise<void>}
 */
async function setControlledInputValue(locator, value) {
	await locator.evaluate((el, nextValue) => {
		const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
			window.HTMLInputElement.prototype,
			'value'
		)?.set;

		if (nativeInputValueSetter) {
			nativeInputValueSetter.call(el, nextValue);
		} else {
			el.value = nextValue;
		}

		el.dispatchEvent(new Event('input', { bubbles: true }));
		el.dispatchEvent(new Event('change', { bubbles: true }));
	}, value);
}

/**
 * Set color control value.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} label - Control label.
 * @param {string} value - Color value.
 * @return {Promise<void>}
 */
async function setColorControlValue(page, label, value) {
	const container = page
		.locator(`[data-cy="base-control"]:has([aria-label="${label}"])`)
		.filter({ visible: true })
		.last();

	await container.locator('[data-cy="color-btn"]').click({ force: true });

	const popover = page
		.locator('.blockera-color-picker-popover')
		.filter({ visible: true })
		.last();

	await expect(popover).toBeVisible({ timeout: 15000 });

	const cssValueInput = popover.locator('[data-cy="color-picker-css-value"]');
	await cssValueInput.click();
	// Mirror Cypress setControlledInputValue — avoid .fill() (keystroke-by-keystroke
	// remounts/locks the picker) and avoid .blur() (focus-outside dismisses before close).
	await setControlledInputValue(cssValueInput, value);

	await popover.locator('[data-test="close-popover"]').click({ force: true });
	await expect(popover).toBeHidden({ timeout: 15000 });
}

/**
 * Clear color control value.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} label - Control label.
 * @return {Promise<void>}
 */
async function clearColorControlValue(page, label) {
	const container = await getParentContainer(page, label);
	await container.locator('[data-cy="color-btn"]').click();

	const popover = page.locator('.blockera-color-picker-popover').last();
	await popover.locator('[aria-label="Reset Color (Clear)"]').click();

	// After clearing the color, wait for 50ms to ensure the color is cleared.
	await page.waitForTimeout(50);
}

/**
 * Click value addon button to open popover.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {import('@playwright/test').Locator} container - Container locator (optional).
 * @return {Promise<void>}
 */
async function clickValueAddonButton(page, container = null) {
	const targetContainer = container || page;
	const button = targetContainer.locator('[data-cy="value-addon-btn"]');
	await button.dispatchEvent('click');
}

/**
 * Open the value addon variable picker (mirrors Cypress openValueAddon).
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {import('@playwright/test').Locator} container - Container locator (optional).
 * @return {Promise<void>}
 */
async function openValueAddon(page, container = null) {
	const targetContainer = container || page;
	const plainColorButton = targetContainer
		.locator('[data-cy="color-btn"]')
		.first();

	// Plain hex mode (Cypress background-color.global-styles beforeEach): open via pointer.
	if (await plainColorButton.isVisible()) {
		const pointer = targetContainer
			.locator('.blockera-control-value-addon-pointers .var-pointer')
			.first();
		await expect(pointer).toBeVisible({ timeout: 20000 });
		await pointer.click({ force: true });
		return;
	}

	// Variable chip mode: pointer mousedown removes the variable; chip onClick opens picker.
	const variableChip = targetContainer
		.locator('[data-cy="value-addon-btn"]')
		.first();
	await expect(variableChip).toBeVisible({ timeout: 20000 });
	await variableChip.click({ force: true });
}

/**
 * Select value addon item from popover.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} itemID - Item ID to select.
 * @return {Promise<void>}
 */
async function selectValueAddonItem(page, itemID) {
	const itemSelector = [
		`[data-test="value-addon-picker-item-${itemID}"]`,
		`[data-cy="va-item-${itemID}"]`,
		`[data-cy="group-control-header"][data-variable-slug="${itemID}"]`,
		`[data-variable-slug="${itemID}"]`,
	].join(', ');

	const popover = page
		.locator('[data-test="variable-picker-popover"]')
		.filter({ visible: true })
		.first();

	await popover.waitFor({ state: 'visible', timeout: 20000 });

	const item = popover.locator(itemSelector).first();
	await item.scrollIntoViewIfNeeded();
	await item.click({ force: true });
}

/**
 * Remove value addon.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {import('@playwright/test').Locator} container - Container locator (optional).
 * @return {Promise<void>}
 */
async function removeValueAddon(page, container = null) {
	const targetContainer = container || page;
	await targetContainer
		.locator('[data-cy="value-addon-btn-remove"]')
		.dispatchEvent('click');
}

/**
 * Set block variation.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} variation - Variation value.
 * @return {Promise<void>}
 */
async function setBlockVariation(page, variation) {
	const wrapper = page.locator('.blockera-block-card-wrapper');
	await wrapper
		.locator('.blockera-block-variation-transforms')
		.locator(`button[data-value="${variation}"]`)
		.click();
}

/**
 * Check active block variation.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} variation - Variation value.
 * @return {Promise<void>}
 */
async function checkActiveBlockVariation(page, variation) {
	const wrapper = page.locator('.blockera-block-card-wrapper');
	await expect(
		wrapper
			.locator('.blockera-block-variation-transforms')
			.locator(`button[data-value="${variation}"][aria-checked="true"]`)
	).toBeVisible();
}

/**
 * Open repeater item.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} parentContainer - Parent container aria label.
 * @param {string} contains - Text to find.
 * @return {Promise<void>}
 */
async function openRepeaterItem(page, parentContainer, contains) {
	const container = await getParentContainer(page, parentContainer);
	await container
		.locator('[data-cy="group-control-header"]')
		.filter({ hasText: contains })
		.click();
}

/**
 * Close spotlight popover.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @return {Promise<void>}
 */
async function closeSpotlightPopover(page) {
	await page.locator('.blockera-spotlighter-svg').click({ force: true });
}

/**
 * Normalize CSS content.
 *
 * @param {string} cssContent - CSS content to normalize.
 * @return {string} Normalized CSS content.
 */
function normalizeCSSContent(cssContent) {
	return (
		cssContent
			.replace(/\/\*[\s\S]*?\*\//g, '') // Remove CSS comments
			.replace(/[\t\n\r]+/g, ' ') // Replace tabs and newlines with space
			.replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
			.replace(/\s*{\s*/g, '{') // Remove spaces around opening braces
			.replace(/\s*}\s*/g, '}') // Remove spaces around closing braces
			.replace(/\s*:\s*/g, ':') // Remove spaces around colons
			.replace(/\s*;\s*/g, ';') // Remove spaces around semicolons

			// Normalize attribute selectors to use double quotes
			.replace(
				/\[([^\]\s~|^$*!=]+)\s*([~|^$*]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+))\]/g,
				(_, attr, operator, v1, v2, v3) => {
					const value = v1 ?? v2 ?? v3 ?? '';
					return `[${attr}${operator}"${value}"]`;
				}
			)

			.trim()
	); // Remove leading/trailing whitespace
}

/**
 * Consumer plugin root (not global-packages). Tests start from the product
 * repo; __dirname would resolve into the monorepo checkout on CI.
 *
 * @return {string} Absolute plugin root path.
 */
function getPluginRoot() {
	return process.env.BLOCKERA_CONSUMER_ROOT &&
		fs.existsSync(process.env.BLOCKERA_CONSUMER_ROOT)
		? path.resolve(process.env.BLOCKERA_CONSUMER_ROOT)
		: process.cwd();
}

/**
 * Map a host path inside the plugin to the path inside the wp-env CLI container.
 *
 * @param {string} hostPath - Absolute path on the host.
 * @return {string} Path relative to the WordPress root inside the container.
 */
function getWpEnvPluginContainerPath(hostPath) {
	const pluginRoot = getPluginRoot();
	const pluginSlug = path.basename(pluginRoot);
	const relative = path
		.relative(pluginRoot, hostPath)
		.split(path.sep)
		.join('/');

	return `wp-content/plugins/${pluginSlug}/${relative}`;
}

/**
 * Parse a post ID from WP-CLI `wp eval` stdout (ignore wp-env banner lines).
 *
 * @param {string} stdout - Combined command output.
 * @return {number} Post ID, or 0 when none is found.
 */
function parseWpEvalPostId(stdout) {
	const lines = String(stdout || '')
		.trim()
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	for (let i = lines.length - 1; i >= 0; i--) {
		const id = parseInt(lines[i], 10);

		if (Number.isFinite(id) && id > 0 && String(id) === lines[i]) {
			return id;
		}
	}

	return 0;
}

/**
 * Execute WP CLI command.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object (not used, but kept for API consistency).
 * @param {string} command - WP CLI command (without 'wp ' prefix).
 * @param {boolean} ignoreFailures - Don't fail on error.
 * @param {boolean} skipEscaping - Skip escaping quotes.
 * @return {Promise<Object>} Command result.
 */
async function wpCli(
	page,
	command,
	ignoreFailures = false,
	skipEscaping = false
) {
	const { exec } = require('child_process');
	const { promisify } = require('util');
	const execAsync = promisify(exec);

	const escapedCommand = skipEscaping
		? command
		: command.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

	// Consumer plugin root (not global-packages). Tests start from the product
	// repo; __dirname would resolve into the monorepo checkout on CI.
	const pluginRoot = getPluginRoot();

	try {
		const result = await execAsync(
			`npm --silent run env run cli -- ${escapedCommand}`,
			{ cwd: pluginRoot }
		);
		return { stdout: result.stdout, stderr: result.stderr, code: 0 };
	} catch (error) {
		if (ignoreFailures) {
			return {
				stdout: error.stdout || '',
				stderr: error.stderr || '',
				code: error.code || 1,
			};
		}
		throw error;
	}
}

/**
 * Create a published post from an HTML file via PHP (`wp_insert_post`).
 *
 * Reads markup from a plugin file already mounted in wp-env so large block
 * HTML is not passed on the command line. Does not open the block editor.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {Object} options - Post fields.
 * @param {string} options.contentFileHostPath - Absolute host path to post HTML.
 * @param {string} options.postTitle - Post title.
 * @param {string} [options.postStatus='publish'] - Post status.
 * @param {string} [options.postType='post'] - Post type.
 * @param {string} [options.postDate] - `Y-m-d H:i:s` post date.
 * @param {string} [options.commentStatus] - Comment status (`open` / `closed`).
 * @param {string} [options.pingStatus] - Ping status (`open` / `closed`).
 * @return {Promise<number>} Created post ID.
 */
async function createPostViaPhp(page, options) {
	const {
		contentFileHostPath,
		postTitle,
		postStatus = 'publish',
		postType = 'post',
		postDate,
		commentStatus,
		pingStatus,
	} = options;

	if (!contentFileHostPath || !fs.existsSync(contentFileHostPath)) {
		throw new Error(
			`createPostViaPhp requires an existing content file: ${contentFileHostPath}`
		);
	}

	const containerPath = getWpEnvPluginContainerPath(contentFileHostPath);
	const escapePhp = (value) => String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

	const extraArgs = [];

	if (postDate) {
		extraArgs.push(`'post_date' => '${escapePhp(postDate)}'`);
	}

	if (commentStatus) {
		extraArgs.push(`'comment_status' => '${escapePhp(commentStatus)}'`);
	}

	if (pingStatus) {
		extraArgs.push(`'ping_status' => '${escapePhp(pingStatus)}'`);
	}

	const extraPhp = extraArgs.length ? ', ' + extraArgs.join(', ') : '';

	const phpCode =
		`$path = '${escapePhp(containerPath)}'; ` +
		`$content = file_get_contents($path); ` +
		`if ($content === false) { echo 'ERROR: failed to read ' . $path; return; } ` +
		`$post_id = wp_insert_post(array(` +
		`'post_title' => '${escapePhp(postTitle)}', ` +
		`'post_content' => $content, ` +
		`'post_status' => '${escapePhp(postStatus)}', ` +
		`'post_type' => '${escapePhp(postType)}', ` +
		`'post_author' => 1` +
		`${extraPhp}` +
		`)); ` +
		`echo is_wp_error($post_id) ? $post_id->get_error_message() : $post_id;`;

	const escapedPhpCode = phpCode.replace(/'/g, "'\\''");
	const result = await wpCli(page, `wp eval '${escapedPhpCode}'`, false, true);
	const postId = parseWpEvalPostId(result.stdout);

	if (!postId) {
		throw new Error(
			`Failed to create post via PHP. stdout: ${result.stdout} stderr: ${result.stderr}`
		);
	}

	return postId;
}

/**
 * Check block card items.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {Array<string>} expectedStates - Expected state IDs.
 * @param {boolean} isInnerBlock - Whether checking inner block.
 * @return {Promise<void>}
 */
async function checkBlockCardItems(page, expectedStates, isInnerBlock = false) {
	const container = isInnerBlock
		? '.block-card--inner-block'
		: '.blockera-extension-block-card';

	const card = page.locator(container);

	// Check all expected items exist and are visible
	for (const state of expectedStates) {
		const item = card.locator(
			`[data-cy="repeater-item"][data-id="${state}"]`
		);
		await expect(item).toBeVisible();
	}

	// Check no unexpected items exist
	const allItems = card.locator('[data-cy="repeater-item"]');
	const count = await allItems.count();

	for (let i = 0; i < count; i++) {
		const item = allItems.nth(i);
		const dataId = await item.getAttribute('data-id');
		if (!expectedStates.includes(dataId)) {
			throw new Error(`Unexpected repeater item found: ${dataId}`);
		}
	}
}

/**
 * Check block states picker items.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {Array<string>} expectedItems - Expected item test IDs.
 * @param {boolean} checkExtraItems - Whether to check for extra items.
 * @return {Promise<void>}
 */
async function checkBlockStatesPickerItems(
	page,
	expectedItems,
	checkExtraItems = false
) {
	await page
		.locator(
			'[data-test="blockera-block-state-container"] [data-test="add-new-block-state"]'
		)
		.click();

	const popover = page.locator(
		'.blockera-component-popover.blockera-states-picker-popover'
	);

	for (const state of expectedItems) {
		await expect(popover.locator(`[data-test="${state}"]`)).toBeVisible();
	}

	if (checkExtraItems) {
		const allItems = popover.locator('.blockera-feature-type');
		const count = await allItems.count();

		for (let i = 0; i < count; i++) {
			const item = allItems.nth(i);
			const dataTest = await item.getAttribute('data-test');
			if (!expectedItems.includes(dataTest)) {
				throw new Error(`Unexpected item found: ${dataTest}`);
			}
		}
	}
}

/**
 * Check block sections.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {Array<string>} expectedSections - Expected section names.
 * @param {string} check - Check type ('exist' or 'not.exist').
 * @return {Promise<void>}
 */
async function checkBlockSections(page, expectedSections, check = 'exist') {
	for (const section of expectedSections) {
		const sectionElement = page.locator(
			`.blockera-extension.blockera-extension-${section}`
		);

		if (check === 'exist') {
			await expect(sectionElement).toBeVisible();
		} else {
			await expect(sectionElement).not.toBeVisible();
		}
	}
}

/**
 * Open global styles panel.
 *
 * Waits for the editor to be ready and the button to be visible before clicking.
 * Uses proper Playwright click (not dispatchEvent) for actionability checks.
 * Idempotent: skips click if panel is already open.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @return {Promise<void>}
 */
async function openGlobalStylesPanel(page) {
	await page.waitForFunction(() => window?.wp?.data, { timeout: 30000 });

	await page
		.locator('.edit-site-layout.is-full-canvas, .editor-header')
		.first()
		.waitFor({ state: 'attached', timeout: 30000 });

	await page.evaluate(() => {
		const dispatch = window.wp.data.dispatch;
		const persistence = dispatch('blockera/editor-persistence');

		dispatch('core/preferences')?.set?.('core', 'showIconLabels', false);
		dispatch('core/interface')?.pinItem?.('core', 'edit-site/global-styles');

		if (typeof persistence?.setSidebarLayout === 'function') {
			persistence.setSidebarLayout({
				inserter: { dock: 'left', order: 0 },
				listView: { dock: 'left', order: 1 },
				complementary: { dock: 'right', order: 0 },
			});
			persistence.setDockPaneHeights?.('left', ['50%', '50%']);
			persistence.setDockPaneHeights?.('right', ['100%']);
			persistence.setPrimarySidebarOpen?.(true);
		}

		dispatch('core/interface')?.enableComplementaryArea?.(
			'core',
			'edit-site/global-styles'
		);
	});

	await page.waitForFunction(
		() =>
			window.wp?.data
				?.select('core/interface')
				?.getActiveComplementaryArea('core') ===
			'edit-site/global-styles',
		{ timeout: 20000 }
	);

	const headerPin = page
		.locator(
			'.editor-header .interface-pinned-items button[aria-controls="edit-site:global-styles"]'
		)
		.first();

	if (await headerPin.count()) {
		const pressed = await headerPin.getAttribute('aria-pressed');
		const expanded = await headerPin.getAttribute('aria-expanded');
		const alreadyOpen =
			pressed === 'true' ||
			expanded === 'true' ||
			(await headerPin.evaluate((el) =>
				el.classList.contains('is-pressed')
			));

		if (!alreadyOpen) {
			await headerPin.click({ force: true });
			await page.waitForFunction(
				() =>
					window.wp?.data
						?.select('core/interface')
						?.getActiveComplementaryArea('core') ===
					'edit-site/global-styles',
				{ timeout: 20000 }
			);
		}
	}

	await page
		.locator(
			'.editor-global-styles-sidebar, .edit-site-global-styles-sidebar'
		)
		.first()
		.waitFor({ state: 'attached', timeout: 30000 });

	const blockeraSidebar = page.locator(
		'[data-test="blockera-primary-sidebar-content"]'
	);
	if (await blockeraSidebar.count()) {
		try {
			await expect(blockeraSidebar).toHaveClass(/is-visible/, {
				timeout: 10000,
			});
		} catch {
			// Overlay may still host GS chrome without is-visible yet.
		}
	}

	await page
		.locator('button[id="/blocks"]')
		.first()
		.waitFor({ state: 'attached', timeout: 30000 });
}

/**
 * Open settings panel.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @return {Promise<void>}
 */
async function openSettingsPanel(page) {
	await openDocumentSettingsSidebar(page, 'Post');
}

/**
 * Add new transition.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @return {Promise<void>}
 */
async function addNewTransition(page) {
	const container = await getParentContainer(page, 'Transitions Timing');
	await container.locator('[aria-label="Add New Transition"]').click();
}
/**
 * Prepare editor for screenshot.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {boolean} reset - Whether to reset (show UI elements).
 * @return {Promise<void>}
 */
async function prepareEditorForScreenshot(page, reset = false) {
	if (!reset) {
		// Check if the close settings button exists before clicking
		const closeSettingsButton = page.locator(
			'.editor-sidebar [aria-label="Close Settings"]'
		);
		const closeSettingsButtonCount = await closeSettingsButton.count();
		if (closeSettingsButtonCount > 0) {
			await closeSettingsButton.click();
		}

		await page.evaluate(() => {
			const skeleton = document.querySelector(
				'body.is-fullscreen-mode .interface-interface-skeleton'
			);
			if (skeleton) {
				skeleton.style.top = '0';
			}

			const wpbody = document.querySelector('#wpbody');
			if (wpbody) {
				wpbody.style.paddingTop = '0';
			}

			const adminbar = document.querySelector('#wpadminbar');
			if (adminbar) {
				adminbar.style.display = 'none';
			}

			const footer = document.querySelector(
				'.admin-ui-navigable-region.interface-interface-skeleton__footer'
			);
			if (footer) {
				footer.style.display = 'none';
			}

			const iframe = document.querySelector(
				'iframe[name="editor-canvas"]'
			);
			if (iframe && iframe.contentDocument) {
				const titleWrapper = iframe.contentDocument.querySelector(
					'.edit-post-visual-editor__post-title-wrapper'
				);
				if (titleWrapper) {
					titleWrapper.style.display = 'none';
				}
			}

			const header = document.querySelector(
				'.admin-ui-navigable-region.interface-interface-skeleton__header'
			);
			if (header) {
				header.style.display = 'none';
			}
		});
	} else {
		await setScreenshotViewport(page, 'desktop');

		await page.evaluate(() => {
			const skeleton = document.querySelector(
				'body.is-fullscreen-mode .interface-interface-skeleton'
			);
			if (skeleton) {
				skeleton.style.top = '32px';
			}

			const adminbar = document.querySelector('#wpadminbar');
			if (adminbar) {
				adminbar.style.display = 'flex';
			}

			const footer = document.querySelector(
				'.admin-ui-navigable-region.interface-interface-skeleton__footer'
			);
			if (footer) {
				footer.style.display = 'flex';
			}

			const iframe = document.querySelector(
				'iframe[name="editor-canvas"]'
			);
			if (iframe && iframe.contentDocument) {
				const titleWrapper = iframe.contentDocument.querySelector(
					'.edit-post-visual-editor__post-title-wrapper'
				);
				if (titleWrapper) {
					titleWrapper.style.display = 'block';
				}
			}

			const header = document.querySelector(
				'.admin-ui-navigable-region.interface-interface-skeleton__header'
			);
			if (header) {
				header.style.display = 'block';
			}
		});
	}
}

/**
 * Prepare frontend for screenshot.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @return {Promise<void>}
 */
async function prepareFrontendForScreenshot(page) {
	await page.evaluate(() => {
		const adminbar = document.querySelector('#wpadminbar');
		if (adminbar) {
			adminbar.style.display = 'none';
		}
	});
}

/**
 * Apply search-replace operations to a locator's DOM before screenshots.
 * Patterns are treated as regex (global), matching fixture html-search-replace style.
 *
 * Sanitised HTML is applied by walking the live tree and updating matching text nodes
 * and attributes in place so React/SSR roots are not destroyed by a root innerHTML rewrite.
 *
 * @param {import('@playwright/test').Locator} locator - Root element to mutate.
 * @param {Array<{search: string|string[], replace: string}>|null|undefined} operations - Search/replace ops.
 * @return {Promise<void>}
 */
async function applyDomSearchReplace(locator, operations) {
	if (!operations || !Array.isArray(operations) || operations.length === 0) {
		return;
	}

	await locator.evaluate((el, ops) => {
		let html = el.innerHTML;

		for (const operation of ops) {
			if (
				!operation ||
				operation.search == null ||
				operation.replace == null
			) {
				continue;
			}

			const patterns = Array.isArray(operation.search)
				? operation.search
				: [operation.search];

			for (const pattern of patterns) {
				html = html.replace(
					new RegExp(pattern, 'g'),
					operation.replace
				);
			}
		}

		if (html === el.innerHTML) {
			return;
		}

		const tmp = document.createElement('div');
		tmp.innerHTML = html;

		const syncAttrs = (liveNode, nextNode) => {
			const liveAttrs = liveNode.getAttributeNames();
			const nextAttrs = nextNode.getAttributeNames();

			for (const name of liveAttrs) {
				if (!nextNode.hasAttribute(name)) {
					liveNode.removeAttribute(name);
				}
			}

			for (const name of nextAttrs) {
				const value = nextNode.getAttribute(name);
				if (liveNode.getAttribute(name) !== value) {
					liveNode.setAttribute(name, value);
				}
			}
		};

		const nodesMatch = (liveNode, nextNode) => {
			if (liveNode.nodeType !== nextNode.nodeType) {
				return false;
			}

			if (liveNode.nodeType === Node.ELEMENT_NODE) {
				return liveNode.tagName === nextNode.tagName;
			}

			return true;
		};

		// Ignore whitespace-only text nodes — live SSR trees often disagree
		// with a re-parsed HTML string on insignificant whitespace.
		const significantChildren = (node) =>
			Array.from(node.childNodes).filter(
				(child) =>
					child.nodeType !== Node.TEXT_NODE ||
					(child.nodeValue && child.nodeValue.trim() !== '')
			);

		/**
		 * Apply sanitised nodes onto the live tree without replacing ancestors.
		 *
		 * @param {Node} liveNode
		 * @param {Node} nextNode
		 */
		const syncNode = (liveNode, nextNode) => {
			if (liveNode.nodeType === Node.TEXT_NODE) {
				if (liveNode.nodeValue !== nextNode.nodeValue) {
					liveNode.nodeValue = nextNode.nodeValue;
				}
				return;
			}

			if (liveNode.nodeType !== Node.ELEMENT_NODE) {
				return;
			}

			syncAttrs(liveNode, nextNode);

			const liveChildren = significantChildren(liveNode);
			const nextChildren = significantChildren(nextNode);

			if (
				liveChildren.length === nextChildren.length &&
				liveChildren.every((child, i) =>
					nodesMatch(child, nextChildren[i])
				)
			) {
				liveChildren.forEach((child, i) => {
					syncNode(child, nextChildren[i]);
				});
				return;
			}

			// Never wipe element subtrees that host React/SSR (breaks Blockera
			// styles). Patch matching <time> nodes inside this subtree only.
			const liveTimes = liveNode.querySelectorAll('time');
			const nextTimes = nextNode.querySelectorAll('time');
			const n = Math.min(liveTimes.length, nextTimes.length);
			for (let i = 0; i < n; i++) {
				syncAttrs(liveTimes[i], nextTimes[i]);
				if (liveTimes[i].textContent !== nextTimes[i].textContent) {
					liveTimes[i].textContent = nextTimes[i].textContent;
				}
			}
		};

		const liveChildren = significantChildren(el);
		const nextChildren = significantChildren(tmp);

		if (
			liveChildren.length === nextChildren.length &&
			liveChildren.every((child, i) => nodesMatch(child, nextChildren[i]))
		) {
			liveChildren.forEach((child, i) => {
				syncNode(child, nextChildren[i]);
			});
			return;
		}

		// Root structure diverged — never assign el.innerHTML (destroys React).
		const liveTimes = el.querySelectorAll('time');
		const nextTimes = tmp.querySelectorAll('time');
		const n = Math.min(liveTimes.length, nextTimes.length);
		for (let i = 0; i < n; i++) {
			syncAttrs(liveTimes[i], nextTimes[i]);
			if (liveTimes[i].textContent !== nextTimes[i].textContent) {
				liveTimes[i].textContent = nextTimes[i].textContent;
			}
		}
	}, operations);
}

/**
 * Resize with Playwright’s own session so element screenshots clip the canvas,
 * not the device-preview chrome. A second CDP `setDeviceMetricsOverride` /
 * `setWindowBounds` desyncs screenshot coordinates (wrong size, header in shot).
 *
 * WordPress e2e often uses action timeout 0 (wait forever). Bound the iframe
 * `load` wait so a blob canvas cannot hang; the size is applied before that wait.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ width: number, height: number }} viewport
 * @return {Promise<void>}
 */
async function setViewportSizeForScreenshot(page, viewport) {
	page.setDefaultTimeout(8000);

	try {
		await page.setViewportSize(viewport);
	} catch {
		// Size is applied; canvas `load` may still be pending.
	} finally {
		page.setDefaultTimeout(0);
	}
}

/**
 * Hide Blockera/Gutenberg sidebars for editor canvas screenshots.
 *
 * Keeps complementary settings mounted (Blockera styles stay in the canvas)
 * while removing dock chrome and the 1px separator that appears when the
 * iframe is narrower than `.is-root-container`.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} canvasWidth
 * @return {Promise<void>}
 */
async function hideEditorSidebarsForScreenshot(page, canvasWidth = 1600) {
	await page.evaluate((width) => {
		document.body.classList.add('blockera-screenshot-prep');

		let style = document.querySelector('style[data-blockera-screenshot-prep]');
		if (!style) {
			style = document.createElement('style');
			style.setAttribute('data-blockera-screenshot-prep', 'true');
			document.head.appendChild(style);
		}

		style.textContent = `
			body.blockera-screenshot-prep .interface-interface-skeleton__primary-sidebar-blockera,
			body.blockera-screenshot-prep .interface-interface-skeleton__secondary-sidebar-blockera,
			body.blockera-screenshot-prep .interface-interface-skeleton__sidebar.blockera-complementary-overlay {
				display: none !important;
				width: 0 !important;
				min-width: 0 !important;
				max-width: 0 !important;
				flex: 0 0 0 !important;
				box-shadow: none !important;
				visibility: hidden !important;
				overflow: hidden !important;
				pointer-events: none !important;
			}

			body.blockera-screenshot-prep iframe[name="editor-canvas"],
			body.blockera-screenshot-prep iframe[name="editor-canvas"].blockera-in-breakpoint,
			body.blockera-screenshot-prep iframe[name="editor-canvas"].is-zoomed-out {
				width: ${width}px !important;
				max-width: none !important;
				border: none !important;
				box-shadow: none !important;
				outline: none !important;
			}
		`;
	}, canvasWidth);
}

/**
 * Set editor viewport for screenshot.
 * Calculates the viewport height based on the editor container height.
 * Sets the viewport size to the calculated height.
 * Waits for the viewport to be set.
 * By dong this so we can capture the full editor content in the screenshot.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {Object} config - Additional config.
 * @return {Promise<void>}
 */
async function setEditorViewportForScreenshot(
	page,
	size = 'desktop',
	config = {}
) {
	let width = 1600;
	let height = 5000;
	let containerHeight = null;

	if (size === 'desktop') {
		width = 1600;
	} else if (size === 'mobile') {
		width = 450;
	}

	containerHeight = await evaluateInEditorCanvas(page, (doc, win) => {
		const iframe = win.frameElement;
		if (iframe instanceof HTMLElement) {
			iframe.style.setProperty('transition', 'none', 'important');
			iframe.style.setProperty('overflow', 'visible', 'important');
		}
		doc
			.querySelectorAll(
				'[data-blockera-canvas-header-root], .blockera-canvas-header'
			)
			.forEach((node) => {
				if (node instanceof HTMLElement) {
					node.style.display = 'none';
				}
			});

		doc.body?.classList.remove('blockera-zoom-active');
		doc.documentElement?.classList.remove(
			'blockera-zoom-active',
			'blockera-outer-scrollport'
		);

		const el = doc.querySelector('.is-root-container');
		const elementHeight = el
			? Math.max(
					el.scrollHeight,
					el.offsetHeight,
					el.getBoundingClientRect().height
				)
			: 0;
		const docHeight = Math.max(
			doc.documentElement.scrollHeight,
			doc.body ? doc.body.scrollHeight : 0,
			doc.documentElement.offsetHeight,
			doc.body ? doc.body.offsetHeight : 0
		);
		return Math.max(elementHeight, docHeight);
	});

	height = containerHeight + 500;

	const finalWidth = config?.width || width;
	const finalHeight = config?.height || height;

	await setViewportSizeForScreenshot(page, {
		width: 1600,
		height: finalHeight,
	});

	await evaluateInEditorCanvas(page, (doc, win, canvasWidth) => {
		if (doc.body) {
			doc.body.style.width = canvasWidth + 'px';
		}

		const el = doc.querySelector('.is-root-container');
		if (el) {
			el.style.boxSizing = 'border-box';
		}

		const style = doc.createElement('style');
		style.textContent = `
			[data-blockera-canvas-header-root],
			.blockera-canvas-header {
				display: none !important;
				visibility: hidden !important;
				height: 0 !important;
				overflow: hidden !important;
				pointer-events: none !important;
			}

			html, body {
				height: auto !important;
				min-height: 0 !important;
				overflow: visible !important;
				background-color: #fff !important;
			}

			iframe.blockera-in-breakpoint,
			iframe.is-zoomed-out {
				overflow: visible !important;
				transition: none !important;
			}

			.block-list-appender {
				display: none !important;
			}

			body.blockera-zoom-active {
				padding-top: 0 !important;
			}

			.is-root-container.has-global-padding {
				font-size: 18px !important;
				line-height: 0;
				letter-spacing: 0 !important;
				padding: 30px !important;
				margin-top: 30px !important;
				margin-bottom: 0 !important;
				box-sizing: border-box !important;
				background-color: #fff !important;
			}

			.is-root-container.has-global-padding > * {
				line-height: normal !important;
			}

			:root :where(.is-layout-constrained) > * {
				margin-block-start: 20px;
				margin-block-end: 0;
			}
		`;
		doc.head.appendChild(style);
	}, finalWidth);

	await hideEditorSidebarsForScreenshot(page, finalWidth);

	await hideCanvasHeaderForScreenshot(page);

	if (config?.wait) {
		await page.waitForTimeout(config.wait);
	}
}

/**
 * Set screenshot viewport.
 *
 * @param {import('@playwright/test').Page} page - Playwright page object.
 * @param {string} size - Viewport size ('desktop' or 'mobile').
 * @param {Object} config - Additional config.
 * @param {import('@playwright/test').Locator} config.editorContainer - Optional editor container locator to adjust iframe height.
 * @return {Promise<void>}
 */
async function setFrontendViewportForScreenshot(
	page,
	size = 'desktop',
	config = {}
) {
	let width = 1600;
	const height = 5000;

	if (size === 'desktop') {
		width = 1600;
	} else if (size === 'mobile') {
		width = 450;
	}

	const finalWidth = config?.width || width;
	const finalHeight = config?.height || height;

	await setViewportSizeForScreenshot(page, {
		width: finalWidth,
		height: finalHeight,
	});

	const entryContent = page.locator('.entry-content').first();
	await entryContent.evaluate((el, width) => {
		el.style.width = width + 'px';
	}, finalWidth);

	// Add extra CSS to make sure spaces are always static to not affect the screenshot comparison.
	await page.evaluate(() => {
		const style = document.createElement('style');
		style.textContent = `
			.entry-content.has-global-padding {
				font-size: 18px !important;
				line-height: 0;
				letter-spacing: 0 !important;
				box-sizing: border-box !important;
				padding: 30px !important;
				margin: 30px -30px !important;
			}

			.entry-content.has-global-padding > * {
				line-height: normal;
			}

			:root :where(.is-layout-constrained) > * {
				margin-block-start: 20px;
				margin-block-end: 0;
			}
		`;
		document.head.appendChild(style);
	});

	if (config?.wait) {
		await page.waitForTimeout(config.wait);
	}
}

/**
 * Keep editor chrome out of canvas screenshots and stop the iframe from
 * clipping tall content (breakpoint preview uses overflow:hidden + a height
 * lock; the iframe also transitions width/height).
 *
 * @param {import('@playwright/test').Page} page
 * @return {Promise<void>}
 */
async function hideCanvasHeaderForScreenshot(page) {
	await evaluateInEditorCanvas(page, (doc, win) => {
		const iframe = win.frameElement;
		const parentDoc = iframe instanceof HTMLElement ? iframe.ownerDocument : null;

		const sizeIframeToContent = () => {
			if (doc.documentElement) {
				doc.documentElement.style.setProperty(
					'height',
					'auto',
					'important'
				);
				doc.documentElement.style.setProperty(
					'min-height',
					'0',
					'important'
				);
			}
			if (doc.body) {
				doc.body.style.setProperty('height', 'auto', 'important');
				doc.body.style.setProperty('min-height', '0', 'important');
			}

			const root = doc.querySelector('.is-root-container');
			if (root instanceof HTMLElement) {
				root.style.setProperty('height', 'auto', 'important');
				root.style.setProperty('min-height', '0', 'important');
			}

			const lastBlock =
				root instanceof HTMLElement
					? Array.from(root.children).findLast(
							(node) =>
								node instanceof HTMLElement &&
								node.offsetHeight > 0 &&
								!node.classList.contains(
									'block-list-appender'
								) &&
								!node.classList.contains(
									'block-editor-default-block-appender'
								)
						)
					: null;

			const lastBottom =
				lastBlock instanceof HTMLElement
					? Math.ceil(
							lastBlock.getBoundingClientRect().bottom +
								(win.scrollY || 0)
						)
					: 0;

			const needed = Math.max(
				root instanceof HTMLElement ? root.scrollHeight : 0,
				lastBottom,
				doc.body ? doc.body.scrollHeight : 0,
				doc.documentElement.scrollHeight || 0
			);

			if (!(iframe instanceof HTMLElement) || needed <= 0) {
				return needed;
			}

			const height = `${needed}px`;
			iframe.setAttribute('data-blockera-screenshot-canvas', 'true');
			iframe.style.setProperty('transition', 'none', 'important');
			iframe.style.setProperty('overflow', 'visible', 'important');
			iframe.style.setProperty('height', height, 'important');
			iframe.style.setProperty('min-height', height, 'important');
			iframe.style.setProperty('max-height', 'none', 'important');
			iframe.removeAttribute('scrolling');

			const scale = iframe.parentElement;
			if (scale instanceof HTMLElement) {
				scale.style.setProperty('overflow', 'visible', 'important');
				scale.style.setProperty('height', 'auto', 'important');
			}

			if (parentDoc?.head) {
				let parentStyle = parentDoc.querySelector(
					'style[data-blockera-screenshot-canvas]'
				);
				if (!parentStyle) {
					parentStyle = parentDoc.createElement('style');
					parentStyle.setAttribute(
						'data-blockera-screenshot-canvas',
						'true'
					);
					parentDoc.head.appendChild(parentStyle);
				}
				parentStyle.textContent = `
					iframe[name="editor-canvas"][data-blockera-screenshot-canvas],
					iframe[name="editor-canvas"][data-blockera-screenshot-canvas"].blockera-in-breakpoint,
					iframe[name="editor-canvas"][data-blockera-screenshot-canvas"].is-zoomed-out {
						transition: none !important;
						overflow: visible !important;
						border: none !important;
						box-shadow: none !important;
						outline: none !important;
					}
					.block-editor-iframe__scale-container:has(
						> iframe[name="editor-canvas"][data-blockera-screenshot-canvas]
					) {
						overflow: visible !important;
						height: auto !important;
						border: none !important;
						box-shadow: none !important;
					}
				`;
			}

			return needed;
		};

		if (iframe instanceof HTMLElement) {
			iframe.setAttribute('data-blockera-screenshot-canvas', 'true');
			iframe.style.setProperty('transition', 'none', 'important');
			iframe.style.setProperty('overflow', 'visible', 'important');
		}

		let style = doc.querySelector(
			'style[data-blockera-hide-canvas-header]'
		);
		if (!style) {
			style = doc.createElement('style');
			style.setAttribute('data-blockera-hide-canvas-header', 'true');
			doc.head.appendChild(style);
		}

		style.textContent = `
			[data-blockera-canvas-header-root],
			.blockera-canvas-header,
			.block-list-appender,
			.block-editor-default-block-appender {
				display: none !important;
				visibility: hidden !important;
				height: 0 !important;
				max-height: 0 !important;
				overflow: hidden !important;
				pointer-events: none !important;
			}

			html,
			body {
				height: auto !important;
				min-height: 0 !important;
				overflow: visible !important;
				background-color: #fff !important;
				border: none !important;
				outline: none !important;
			}

			.is-root-container {
				height: auto !important;
				min-height: 0 !important;
				margin-bottom: 0 !important;
				background-color: #fff !important;
				border: none !important;
				outline: none !important;
				box-shadow: none !important;
			}

			body.blockera-zoom-active {
				padding-top: 0 !important;
			}
		`;

		doc
			.querySelectorAll(
				'[data-blockera-canvas-header-root], .blockera-canvas-header, .block-list-appender, .block-editor-default-block-appender'
			)
			.forEach((node) => {
				if (node instanceof HTMLElement) {
					node.style.setProperty('display', 'none', 'important');
				}
			});

		doc.documentElement?.classList.remove(
			'blockera-zoom-active',
			'blockera-outer-scrollport'
		);
		doc.body?.classList.remove('blockera-zoom-active');

		win.scrollTo(0, 0);
		doc.documentElement.scrollTop = 0;
		if (doc.body) {
			doc.body.scrollTop = 0;
		}

		sizeIframeToContent();

		const visual = iframe?.ownerDocument?.querySelector(
			'.editor-visual-editor, .edit-post-visual-editor'
		);
		if (visual instanceof HTMLElement) {
			visual.scrollTop = 0;
			visual.scrollLeft = 0;
		}

		return new Promise((resolve) => {
			requestAnimationFrame(() => {
				sizeIframeToContent();
				requestAnimationFrame(() => {
					sizeIframeToContent();
					resolve();
				});
			});
		});
	});
}

module.exports = {
	test,
	expect,
	addNewUser,
	logout,
	waitForAssertValue,
	getByDataCy,
	getByDataTest,
	getByDataTestId,
	getByDataId,
	getByAriaLabel,
	cssVar,
	getParentContainer,
	getBlock,
	getSelectedBlock,
	uploadFile,
	multiClick,
	clickOutside,
	setSliderValue,
	pasteText,
	customSelect,
	openAccordion,
	addRepeaterItem,
	setInputFieldValue,
	checkInputFieldValue,
	setColorControlValue,
	clearColorControlValue,
	clickValueAddonButton,
	openValueAddon,
	selectValueAddonItem,
	removeValueAddon,
	setBlockVariation,
	checkActiveBlockVariation,
	openRepeaterItem,
	closeSpotlightPopover,
	normalizeCSSContent,
	wpCli,
	createPostViaPhp,
	checkBlockCardItems,
	checkBlockStatesPickerItems,
	checkBlockSections,
	openGlobalStylesPanel,
	openSettingsPanel,
	addNewTransition,
	prepareEditorForScreenshot,
	prepareFrontendForScreenshot,
	applyDomSearchReplace,
	setEditorViewportForScreenshot,
	setFrontendViewportForScreenshot,
	hideEditorSidebarsForScreenshot,
	hideCanvasHeaderForScreenshot,
};
