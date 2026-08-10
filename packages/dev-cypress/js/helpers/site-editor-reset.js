/**
 * Cypress helpers for Blockera One Site Editor theme reset modal + seeding.
 */

import {
	SITE_EDITOR_TEST_IDS,
	openSiteEditorViewMode,
	assertSiteEditorChrome,
	createSiteEditorPage,
	createWpTemplate,
	deleteSiteEditorPage,
	deleteWpTemplate,
	setReadingSettings,
	siteEditorRestRequest,
} from './site-editor-main-panel';

export const RESET_STYLE_MARKER = '#e2e00aa';
export const RESET_TEMPLATE_SLUG = 'e2e-reset-template';
export const RESET_TEMPLATE_PART_SLUG = 'e2e-reset-template-part';

/**
 * Open More → Reset theme modal from Site Editor view mode.
 */
export function openResetThemeModal() {
	cy.getByDataTest(SITE_EDITOR_TEST_IDS.headerMore).click();
	cy.getByDataTest(SITE_EDITOR_TEST_IDS.reset).should('be.visible').click();
	cy.getByDataTest(SITE_EDITOR_TEST_IDS.resetThemeModal).should('be.visible');
}

/**
 * Set a single reset option toggle on/off.
 *
 * @param {string} optionTestId
 * @param {boolean} enabled
 */
export function setResetOption(optionTestId, enabled) {
	cy.getByDataTest(optionTestId)
		.find('.components-form-toggle')
		.then(($toggle) => {
			const isOn = $toggle.hasClass('is-checked');

			if (isOn !== enabled) {
				cy.wrap($toggle).find('input[type="checkbox"]').click({
					force: true,
				});
			}
		});

	cy.getByDataTest(optionTestId)
		.find('.components-form-toggle')
		.should(enabled ? 'have.class' : 'not.have.class', 'is-checked');
}

/**
 * Configure which reset sections are enabled in the open modal.
 *
 * @param {{
 *   styles?: boolean,
 *   templates?: boolean,
 *   templateParts?: boolean,
 *   homepage?: boolean,
 * }} options
 */
export function setResetThemeOptions({
	styles = true,
	templates = true,
	templateParts = true,
	homepage = true,
} = {}) {
	setResetOption(SITE_EDITOR_TEST_IDS.resetOptionStyles, styles);
	setResetOption(SITE_EDITOR_TEST_IDS.resetOptionTemplates, templates);
	setResetOption(
		SITE_EDITOR_TEST_IDS.resetOptionTemplateParts,
		templateParts
	);
	setResetOption(SITE_EDITOR_TEST_IDS.resetOptionHomepage, homepage);
}

/**
 * Check the irreversible-consent checkbox in the reset modal.
 */
export function checkResetThemeConsent() {
	cy.getByDataTest(SITE_EDITOR_TEST_IDS.resetThemeConsent)
		.find('input[type="checkbox"]')
		.check({ force: true });
}

/**
 * Confirm reset and wait for Site Editor chrome after hard reload.
 */
export function confirmResetThemeAndReload() {
	cy.getByDataTest(SITE_EDITOR_TEST_IDS.resetThemeConfirm)
		.should('not.be.disabled')
		.click();

	cy.getByDataTest(SITE_EDITOR_TEST_IDS.header, { timeout: 90000 }).should(
		'be.visible'
	);
	assertSiteEditorChrome();
}

/**
 * Open modal, enable only the given section, consent, confirm, reload.
 *
 * @param {'styles'|'templates'|'templateParts'|'homepage'} section
 */
export function resetOnlyThemeSection(section) {
	openResetThemeModal();
	setResetThemeOptions({
		styles: section === 'styles',
		templates: section === 'templates',
		templateParts: section === 'templateParts',
		homepage: section === 'homepage',
	});
	checkResetThemeConsent();
	confirmResetThemeAndReload();
}

/**
 * Resolve current user global styles entity id from the editor store.
 *
 * @return {Cypress.Chainable<number|string>}
 */
export function getCurrentGlobalStylesId() {
	return cy.window().then((win) => {
		const select = win.wp?.data?.select('core');
		const id =
			typeof select?.__experimentalGetCurrentGlobalStylesId === 'function'
				? select.__experimentalGetCurrentGlobalStylesId()
				: select?.getCurrentGlobalStylesId?.();

		expect(id, 'global styles entity id').to.exist;
		return id;
	});
}

/**
 * Persist a distinctive user global-styles marker via REST.
 *
 * @param {string} [marker]
 * @return {Cypress.Chainable}
 */
export function seedUserGlobalStylesMarker(marker = RESET_STYLE_MARKER) {
	return getCurrentGlobalStylesId().then((id) =>
		siteEditorRestRequest(`global-styles/${id}`, {
			method: 'POST',
			body: {
				styles: {
					color: {
						background: marker,
					},
				},
				settings: {},
			},
		}).then((response) => {
			expect(response.status).to.be.oneOf([200, 201]);
		})
	);
}

/**
 * Fetch persisted user global styles via REST.
 *
 * @return {Cypress.Chainable<Object>}
 */
export function fetchUserGlobalStyles() {
	return getCurrentGlobalStylesId().then((id) =>
		siteEditorRestRequest(`global-styles/${id}`).then(
			(response) => response.body
		)
	);
}

/**
 * Assert user styles still contain the reset marker.
 *
 * @param {string} [marker]
 */
export function assertUserGlobalStylesMarkerPresent(
	marker = RESET_STYLE_MARKER
) {
	fetchUserGlobalStyles().then((record) => {
		expect(record?.styles?.color?.background).to.equal(marker);
	});
}

/**
 * Assert user styles no longer contain the reset marker.
 *
 * @param {string} [marker]
 */
export function assertUserGlobalStylesMarkerCleared(
	marker = RESET_STYLE_MARKER
) {
	fetchUserGlobalStyles().then((record) => {
		expect(record?.styles?.color?.background).to.not.equal(marker);
	});
}

/**
 * Create a custom wp_template used as a reset marker.
 *
 * @param {string} [slug]
 * @return {Cypress.Chainable<{ id: string|number, slug: string }>}
 */
export function seedCustomResetTemplate(slug = RESET_TEMPLATE_SLUG) {
	return createWpTemplate({
		slug,
		title: 'E2E Reset Template',
		content:
			'<!-- wp:paragraph --><p>E2E reset template marker</p><!-- /wp:paragraph -->',
	});
}

/**
 * Create a custom wp_template_part used as a reset marker.
 *
 * @param {string} [slug]
 * @return {Cypress.Chainable<{ id: string|number, slug: string }>}
 */
export function seedCustomResetTemplatePart(slug = RESET_TEMPLATE_PART_SLUG) {
	return siteEditorRestRequest('template-parts', {
		method: 'POST',
		body: {
			slug,
			title: 'E2E Reset Template Part',
			content:
				'<!-- wp:paragraph --><p>E2E reset template-part marker</p><!-- /wp:paragraph -->',
			area: 'uncategorized',
			status: 'publish',
		},
	}).then((response) => {
		expect(response.status).to.be.oneOf([200, 201]);
		const id = response.body?.id;
		expect(id, 'created template-part id').to.exist;
		return { id, slug: response.body?.slug || slug };
	});
}

/**
 * Delete a custom wp_template_part via REST (force).
 *
 * @param {string|number} templatePartId
 * @return {Cypress.Chainable}
 */
export function deleteWpTemplatePart(templatePartId) {
	if (!templatePartId) {
		return cy.wrap(null);
	}

	const id = String(templatePartId);
	const encoded = encodeURIComponent(id);

	return siteEditorRestRequest(`template-parts/${encoded}?force=true`, {
		method: 'DELETE',
		failOnStatusCode: false,
	});
}

/**
 * List templates and return the first custom match for slug.
 *
 * @param {string} slug
 * @return {Cypress.Chainable<Object|null>}
 */
export function findTemplateBySlug(slug) {
	return siteEditorRestRequest('templates', {
		qs: {
			context: 'edit',
			per_page: 100,
		},
	}).then((response) => {
		expect(response.status).to.eq(200);
		const list = Array.isArray(response.body) ? response.body : [];
		return (
			list.find(
				(item) => item?.slug === slug && item?.source === 'custom'
			) || null
		);
	});
}

/**
 * List template-parts and return the first custom match for slug.
 *
 * @param {string} slug
 * @return {Cypress.Chainable<Object|null>}
 */
export function findTemplatePartBySlug(slug) {
	return siteEditorRestRequest('template-parts', {
		qs: {
			context: 'edit',
			per_page: 100,
		},
	}).then((response) => {
		expect(response.status).to.eq(200);
		const list = Array.isArray(response.body) ? response.body : [];
		return (
			list.find(
				(item) => item?.slug === slug && item?.source === 'custom'
			) || null
		);
	});
}

/**
 * Assert a custom template slug exists in the DB.
 *
 * @param {string} [slug]
 */
export function assertCustomTemplateExists(slug = RESET_TEMPLATE_SLUG) {
	findTemplateBySlug(slug).then((item) => {
		expect(item, `custom template ${slug}`).to.exist;
	});
}

/**
 * Assert a custom template slug was removed.
 *
 * @param {string} [slug]
 */
export function assertCustomTemplateMissing(slug = RESET_TEMPLATE_SLUG) {
	findTemplateBySlug(slug).then((item) => {
		expect(item, `custom template ${slug}`).to.eq(null);
	});
}

/**
 * Assert a custom template-part slug exists in the DB.
 *
 * @param {string} [slug]
 */
export function assertCustomTemplatePartExists(
	slug = RESET_TEMPLATE_PART_SLUG
) {
	findTemplatePartBySlug(slug).then((item) => {
		expect(item, `custom template-part ${slug}`).to.exist;
	});
}

/**
 * Assert a custom template-part slug was removed.
 *
 * @param {string} [slug]
 */
export function assertCustomTemplatePartMissing(
	slug = RESET_TEMPLATE_PART_SLUG
) {
	findTemplatePartBySlug(slug).then((item) => {
		expect(item, `custom template-part ${slug}`).to.eq(null);
	});
}

/**
 * Seed static homepage reading settings and return created page ids.
 *
 * @return {Cypress.Chainable<{ frontPageId: number, postsPageId: number }>}
 */
export function seedHomepageSettingsCustomizations() {
	return createSiteEditorPage({
		title: `E2E Reset Front ${Date.now()}`,
	}).then((frontPageId) =>
		createSiteEditorPage({
			title: `E2E Reset Posts ${Date.now()}`,
		}).then((postsPageId) =>
			setReadingSettings({
				showOnFront: 'page',
				pageOnFront: frontPageId,
				pageForPosts: postsPageId,
			}).then(() => ({ frontPageId, postsPageId }))
		)
	);
}

/**
 * Assert homepage reading settings are still customized (static page).
 *
 * @param {{ frontPageId: number, postsPageId: number }} pages
 */
export function assertHomepageSettingsCustomized(pages) {
	return siteEditorRestRequest('settings').then((response) => {
		expect(response.status).to.eq(200);
		expect(response.body?.show_on_front).to.equal('page');
		expect(Number(response.body?.page_on_front)).to.equal(
			Number(pages.frontPageId)
		);
		expect(Number(response.body?.page_for_posts)).to.equal(
			Number(pages.postsPageId)
		);
	});
}

/**
 * Assert homepage reading settings were restored to WP defaults.
 */
export function assertHomepageSettingsReset() {
	return siteEditorRestRequest('settings').then((response) => {
		expect(response.status).to.eq(200);
		expect(response.body?.show_on_front).to.equal('posts');
		expect(Number(response.body?.page_on_front || 0)).to.equal(0);
		expect(Number(response.body?.page_for_posts || 0)).to.equal(0);
	});
}

/**
 * Seed styles + templates + template-parts + homepage customizations.
 *
 * @return {Cypress.Chainable<{
 *   frontPageId: number,
 *   postsPageId: number,
 *   templateId: string|number,
 *   templatePartId: string|number,
 * }>}
 */
export function seedAllResetCustomizations() {
	openSiteEditorViewMode('/');
	assertSiteEditorChrome();

	return seedUserGlobalStylesMarker()
		.then(() => seedCustomResetTemplate())
		.then((template) =>
			seedCustomResetTemplatePart().then((templatePart) =>
				seedHomepageSettingsCustomizations().then((pages) => ({
					frontPageId: pages.frontPageId,
					postsPageId: pages.postsPageId,
					templateId: template.id,
					templatePartId: templatePart.id,
				}))
			)
		);
}

/**
 * Best-effort cleanup of reset markers and reading settings.
 *
 * @param {{
 *   frontPageId?: number,
 *   postsPageId?: number,
 *   templateId?: string|number,
 *   templatePartId?: string|number,
 * }} [state]
 */
export function cleanupResetCustomizations(state = {}) {
	openSiteEditorViewMode('/');

	return setReadingSettings({ showOnFront: 'posts' })
		.then(() => deleteSiteEditorPage(state.frontPageId))
		.then(() => deleteSiteEditorPage(state.postsPageId))
		.then(() => deleteWpTemplate(state.templateId))
		.then(() => deleteWpTemplatePart(state.templatePartId))
		.then(() =>
			findTemplateBySlug(RESET_TEMPLATE_SLUG).then((item) => {
				if (item?.id) {
					return deleteWpTemplate(item.id);
				}
				return null;
			})
		)
		.then(() =>
			findTemplatePartBySlug(RESET_TEMPLATE_PART_SLUG).then((item) => {
				if (item?.id) {
					return deleteWpTemplatePart(item.id);
				}
				return null;
			})
		);
}
