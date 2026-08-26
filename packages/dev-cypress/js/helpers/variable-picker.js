/**
 * Shared Cypress helpers for the block editor variable picker popover.
 */
import { createPost } from './site-navigation';
import { getSelectedBlock, getWPDataObject } from './editor';

/** Opens paragraph → Style → Line Height → variable picker popover. */
export function openParagraphLineHeightVariablePickerPopover() {
	createPost();

	cy.getBlock('default').type('Variable picker header add.', { delay: 0 });
	cy.getByAriaControls('styles-view').click();

	cy.getParentContainer('Line Height').within(() => {
		cy.openValueAddon();
	});

	return cy
		.getByDataTest('variable-picker-popover', { timeout: 20000 })
		.filter(':visible')
		.first()
		.should('be.visible');
}

/** Opens paragraph → Style → Font Size → variable picker popover. */
export function openParagraphFontSizeVariablePickerPopover() {
	createPost();

	cy.getBlock('default').type('Variable picker header add.', { delay: 0 });
	cy.getByAriaControls('styles-view').click();

	cy.getParentContainer('Font Size').within(() => {
		cy.openValueAddon();
	});

	return cy
		.getByDataTest('variable-picker-popover', { timeout: 20000 })
		.filter(':visible')
		.first()
		.should('be.visible');
}

/** Scoped chainable for the visible variable-picker popover content. */
export function withinVariablePickerPopover(fn) {
	return cy
		.getByDataTest('variable-picker-popover', { timeout: 20000 })
		.filter(':visible')
		.first()
		.should('be.visible')
		.within(fn);
}

/**
 * Counts preset repeater rows in the visible variable picker.
 * Returns 0 when theme/default/custom origins are empty (Cypress `.its('length')` fails on empty sets).
 *
 * @return {Cypress.Chainable<number>}
 */
export function getVariablePickerRepeaterItemCount() {
	return cy
		.getByDataTest('variable-picker-popover', { timeout: 20000 })
		.filter(':visible')
		.first()
		.should('be.visible')
		.then(($popover) => $popover.find('[data-cy="repeater-item"]').length);
}

/**
 * Asserts the visible picker gained one repeater row after a custom-add action.
 *
 * @param {number} beforeCount Row count before add.
 */
export function assertVariablePickerRepeaterItemCountIncreasedByOne(
	beforeCount
) {
	cy.getByDataTest('variable-picker-popover')
		.filter(':visible')
		.first()
		.should(($popover) => {
			expect($popover.find('[data-cy="repeater-item"]').length).to.eq(
				beforeCount + 1
			);
		});
}

/** Returns the visible variable picker popover body (scroll/content container). */
export function getVariablePickerPopoverBody() {
	return cy
		.getByDataTest('variable-picker-popover', { timeout: 20000 })
		.filter(':visible')
		.first()
		.closest('[data-test="popover-body"]')
		.should('be.visible');
}

/**
 * Constrains popover body height so long preset lists scroll inside the picker.
 *
 * @param {string} maxHeight CSS max-height value.
 */
export function makeVariablePickerPopoverBodyScrollable(maxHeight = '200px') {
	getVariablePickerPopoverBody()
		.invoke('css', 'max-height', maxHeight)
		.invoke('css', 'overflow-y', 'auto');
}

/** Scrolls the variable picker popover body to the top. */
export function scrollVariablePickerPopoverToTop() {
	getVariablePickerPopoverBody().scrollTo(0, 0, {
		duration: 0,
		ensureScrollable: false,
	});
}

/** Clicks the custom section “+” in a single-type variable picker (e.g. font-size). */
export function clickVariablePickerCustomSectionAddCustomVariable(
	variableType = 'font-size'
) {
	clickVariablePickerSectionAddCustomVariable(variableType);
}

/** Clicks a section “+” for a variable type in a multi-type picker. */
export function clickVariablePickerSectionAddCustomVariable(variableType) {
	cy.getByDataTest(`variable-picker-section-add-${variableType}`, {
		timeout: 20000,
	})
		.filter(':visible')
		.first()
		.scrollIntoView()
		.should('be.visible')
		.click({ force: true });

	cy.getByDataTest('repeater-item-creating-step', { timeout: 20000 }).should(
		'exist'
	);
}

/** Opens paragraph → Style → Min Width → variable picker popover. */
export function openMinWidthVariablePickerPopover() {
	createPost();

	cy.getBlock('default').type('Min width variable picker.', { delay: 0 });
	cy.getByAriaControls('styles-view').click();
	cy.activateMoreSettingsItem('More Size Settings', 'Min Width');

	cy.getParentContainer('Min Width').within(() => {
		cy.openValueAddon();
	});

	return cy
		.getByDataTest('variable-picker-popover', { timeout: 20000 })
		.filter(':visible')
		.first()
		.should('be.visible');
}

/** Clicks the header “+” that adds a custom preset (single-type pickers only). */
export function clickVariablePickerHeaderAddCustomVariable() {
	cy.getByDataTest('variable-picker-header-add-custom-variable', {
		timeout: 20000,
	}).scrollIntoView();
	cy.getByDataTest('variable-picker-header-add-custom-variable')
		.should('be.visible')
		.click({ force: true });

	cy.getByDataTest('repeater-item-creating-step', { timeout: 20000 }).should(
		'exist'
	);
}

/** Returns the last repeater row inside the visible variable picker popover. */
export function getVariablePickerLastRepeaterItem() {
	return cy
		.getByDataTest('variable-picker-popover', { timeout: 20000 })
		.filter(':visible')
		.first()
		.find('[data-cy="repeater-item"]')
		.last();
}

/**
 * Asserts an element (by data-test) intersects the visible variable picker body.
 *
 * @param {string} dataTest
 */
export function assertDataTestInVariablePickerPopoverBody(dataTest) {
	getVariablePickerPopoverBody().then(($body) => {
		const bodyRect = $body[0].getBoundingClientRect();

		cy.getByDataTest(dataTest, { timeout: 20000 }).then(($el) => {
			const rect = $el[0].getBoundingClientRect();

			expect(rect.top, `${dataTest} top`).to.be.at.least(bodyRect.top);
			expect(rect.bottom, `${dataTest} bottom`).to.be.at.most(
				bodyRect.bottom
			);
		});
	});
}

/** Asserts the last repeater row in the picker intersects the popover body. */
export function assertLastVariablePickerRepeaterItemInPopoverBody() {
	getVariablePickerPopoverBody().then(($body) => {
		const bodyRect = $body[0].getBoundingClientRect();

		getVariablePickerLastRepeaterItem().then(($el) => {
			const rect = $el[0].getBoundingClientRect();

			expect(rect.top, 'last repeater item top').to.be.lessThan(
				bodyRect.bottom
			);
			expect(rect.bottom, 'last repeater item bottom').to.be.greaterThan(
				bodyRect.top
			);
		});
	});
}

/**
 * Visible preset edit popover (nested group popover inside the variable picker).
 */
export function getCustomPresetEditPopover() {
	return cy
		.get('.blockera-component-popover.blockera-control-group-popover', {
			timeout: 20000,
		})
		.filter(':visible')
		.last()
		.should('be.visible');
}

/**
 * Asserts a control field value in the visible custom-preset edit popover
 * opened after header "+" add (creatingStep).
 *
 * @param {string} parentLabel Parent container label (e.g. `Font Size`, `Spacing Size`).
 * @param {string} expectedValue Expected input value.
 */
export function assertCustomPresetEditPopoverFieldValue(
	parentLabel,
	expectedValue
) {
	cy.getByDataTest('repeater-item-creating-step', { timeout: 20000 }).should(
		'exist'
	);

	getCustomPresetEditPopover().within(() => {
		cy.getParentContainer(parentLabel).within(() => {
			cy.get('input[type="text"]').should('have.value', expectedValue);
		});
	});
}

/**
 * Asserts color CSS value in the custom-preset edit popover (after header add).
 *
 * @param {string} expectedHex Expected hex without `#` (e.g. `70ca9e`).
 */
export function assertCustomPresetEditPopoverColorValue(expectedHex) {
	cy.getByDataTest('repeater-item-creating-step', { timeout: 20000 }).should(
		'exist'
	);

	cy.getByDataTest('repeater-item-creating-step').within(() => {
		cy.get('[data-cy="header-values"]').should(
			'contain.text',
			expectedHex.toLowerCase()
		);
	});

	getCustomPresetEditPopover();
}

/**
 * Visible preset edit popover opened for the current creatingStep row.
 */
export function getCreatingStepPresetEditPopover() {
	cy.getByDataTest('repeater-item-creating-step', { timeout: 20000 }).should(
		'exist'
	);

	return getCustomPresetEditPopover();
}

/**
 * Types into the preset ID field while creatingStep is active.
 *
 * @param {string} value
 */
export function typeCreatingStepPresetId(value) {
	getCreatingStepPresetEditPopover().within(() => {
		cy.getParentContainer('Name')
			.find('.blockera-preset-id-field input', { timeout: 20000 })
			.first()
			.then(($input) => {
				cy.wrap($input).setControlledInputValue(value);
			});
	});
}

/**
 * @param {string} expectedId
 */
export function assertCreatingStepPresetId(expectedId) {
	cy.getByDataTest('global-styles-preset-id-field', { timeout: 20000 })
		.filter('input')
		.filter(':visible')
		.last()
		.should('have.value', expectedId);
}

/** Closes the visible preset edit popover (e.g. finish creatingStep). */
export function closeCustomPresetEditPopover() {
	getCustomPresetEditPopover().within(() => {
		cy.getByDataTest('close-popover').click({ force: true });
	});
}

/** Closes the creatingStep preset edit popover while keeping the variable picker open. */
export function closeCreatingStepPresetEditPopover() {
	cy.getByDataTest('repeater-item-creating-step', { timeout: 20000 }).should(
		'exist'
	);

	closeCustomPresetEditPopover();

	cy.getByDataTest('repeater-item-creating-step', { timeout: 20000 }).should(
		'not.exist'
	);

	cy.getByDataTest('variable-picker-popover', { timeout: 20000 })
		.filter(':visible')
		.first()
		.should('be.visible');
}

/** Opens the edit popover for the last repeater row in the picker. */
export function openLastVariablePickerPresetEditPopover() {
	withinVariablePickerPopover(() => {
		getVariablePickerLastRepeaterItem()
			.realHover()
			.within(() => {
				cy.get('.blockera-control-btn-edit-item').click({
					force: true,
				});
			});
	});

	getCustomPresetEditPopover().should('be.visible');
}

/** Opens the edit popover for the selected variable row in the picker. */
export function openSelectedVariablePickerPresetEditPopover() {
	withinVariablePickerPopover(() => {
		cy.get('[data-cy="repeater-item"]')
			.filter(':has(.is-selected-item)')
			.first()
			.realHover()
			.within(() => {
				cy.get('.blockera-control-btn-edit-item').click({
					force: true,
				});
			});
	});

	getCustomPresetEditPopover().should('be.visible');
}

/** Unlocks the ID field in a saved preset edit popover (click-to-edit). */
export function unlockPresetEditPopoverIdField() {
	getCustomPresetEditPopover().within(() => {
		cy.getParentContainer('Name')
			.find('.blockera-preset-id-field input', { timeout: 20000 })
			.first()
			.click({ force: true });
	});
}

/**
 * Sets the preset ID in an unlocked edit popover (post-create slug change flow).
 *
 * @param {string} value
 */
export function typePresetEditPopoverId(value) {
	getCustomPresetEditPopover().within(() => {
		cy.getParentContainer('Name')
			.find('.blockera-preset-id-field input', { timeout: 20000 })
			.first()
			.then(($input) => {
				cy.wrap($input).setControlledInputValue(value);
			});
	});
}

/** Confirms the slug-change warning before saving a renamed preset ID. */
export function confirmPresetEditPopoverSlugChange() {
	getCustomPresetEditPopover().within(() => {
		cy.contains(
			'I understand that blocks using the old ID will lose their variables.'
		).click({ force: true });
	});
}

/** Saves name/slug edits from the preset edit popover. */
export function savePresetEditPopoverNameAndSlug() {
	getCustomPresetEditPopover().within(() => {
		cy.get('.blockera-preset-save-actions__save')
			.should('not.be.disabled')
			.click({ force: true });
	});
}

/** Line Height value addon must not show the missing-variable deleted state. */
export function assertLineHeightControlVariableNotMissing() {
	cy.getParentContainer('Line Height')
		.first()
		.within(() => {
			cy.get('[data-test="value-addon-deleted"]').should('not.exist');
			cy.contains('Missing variable').should('not.exist');
		});
}

/**
 * @param {string} expectedId Bound variable `settings.id`.
 */
export function assertSelectedBlockLineHeightVariableId(expectedId) {
	cy.then({ timeout: 15000 }, () =>
		getWPDataObject().then((data) => {
			const lineHeight = getSelectedBlock(data, 'blockeraLineHeight');
			expect(lineHeight.isValueAddon).to.equal(true);
			expect(lineHeight.valueType).to.equal('variable');
			expect(lineHeight.settings?.id).to.equal(expectedId);
		})
	);
}

/** Font Size value addon must not show the missing-variable deleted state. */
export function assertFontSizeControlVariableNotMissing() {
	cy.getParentContainer('Font Size')
		.first()
		.within(() => {
			cy.get('[data-test="value-addon-deleted"]').should('not.exist');
			cy.contains('Missing variable').should('not.exist');
		});
}

/**
 * @param {string} expectedId Bound variable `settings.id`.
 */
export function assertSelectedBlockFontSizeVariableId(expectedId) {
	cy.then({ timeout: 15000 }, () =>
		getWPDataObject().then((data) => {
			const fontSize = getSelectedBlock(data, 'blockeraFontSize');
			expect(fontSize.isValueAddon).to.equal(true);
			expect(fontSize.valueType).to.equal('variable');
			expect(fontSize.settings?.id).to.equal(expectedId);
		})
	);
}

/**
 * Types into the variable picker search field (keeps the popover open).
 *
 * @param {string} query Search query.
 */
export function filterVariablePickerSearch(query) {
	withinVariablePickerPopover(() => {
		cy.get('.blockera-control-var-picker-search input[type="search"]', {
			timeout: 20000,
		})
			.filter(':visible')
			.first()
			.should('be.visible')
			.clear({ force: true })
			.type(query, { delay: 0, force: true });
	});
}

/** Opener header that owns `onMouseEnter` / `onMouseLeave` for canvas preview. */
const VARIABLE_PICKER_PRESET_OPENER_HEADER =
	'[data-cy$="-repeater-item-header"]';

function dispatchPresetRowPointerEvent($el, type) {
	const node = $el?.[0];

	if (!node || typeof node.dispatchEvent !== 'function') {
		return;
	}

	const view = node.ownerDocument?.defaultView || window;
	const relatedTarget = node.ownerDocument?.body || null;
	const isEnter = type === 'mouseenter' || type === 'mouseover';

	// React maps onMouseEnter/Leave to mouseover/mouseout, not native mouseenter.
	node.dispatchEvent(
		new view.MouseEvent(isEnter ? 'mouseover' : 'mouseout', {
			bubbles: true,
			cancelable: true,
			composed: true,
			view,
			relatedTarget,
		})
	);
	node.dispatchEvent(
		new view.MouseEvent(isEnter ? 'mouseenter' : 'mouseleave', {
			bubbles: false,
			cancelable: true,
			view,
			relatedTarget,
		})
	);
}

function aliasVariablePickerPresetOpenerHeader(slug) {
	withinVariablePickerPopover(() => {
		cy.get(`[data-variable-slug="${slug}"]`, { timeout: 20000 })
			.filter(':visible')
			.first()
			.closest('[data-cy="repeater-item"]')
			.as('variablePickerPresetRow');

		cy.get('@variablePickerPresetRow')
			.find(VARIABLE_PICKER_PRESET_OPENER_HEADER)
			.filter(':visible')
			.first()
			.as('variablePickerPresetOpenerHeader');
	});
}

/**
 * Hovers a preset row in the open variable picker (fires canvas preview mouseenter).
 *
 * @param {string} slug Preset slug (`data-variable-slug`).
 */
export function hoverVariablePickerPresetRow(slug) {
	aliasVariablePickerPresetOpenerHeader(slug);

	cy.get('@variablePickerPresetOpenerHeader')
		.scrollIntoView()
		.then(($header) => {
			dispatchPresetRowPointerEvent($header, 'mouseenter');
		});
}

/**
 * Ends preset-row hover preview (mouseleave on the row, then move pointer to search).
 *
 * @param {string} slug Preset slug (`data-variable-slug`).
 */
export function leaveVariablePickerPresetRowHover(slug) {
	aliasVariablePickerPresetOpenerHeader(slug);

	cy.get('@variablePickerPresetOpenerHeader').then(($header) => {
		dispatchPresetRowPointerEvent($header, 'mouseleave');
	});

	withinVariablePickerPopover(() => {
		cy.get('.blockera-control-var-picker-search input[type="search"]', {
			timeout: 20000,
		})
			.filter(':visible')
			.first()
			.then(($search) => {
				dispatchPresetRowPointerEvent($search, 'mouseenter');
			});
	});
}

/**
 * Asserts editor canvas styles include a CSS needle (e.g. hover preview declarations).
 *
 * @param {string} cssNeedle Substring expected in `#blockera-styles-wrapper`.
 */
export function assertEditorStylesWrapperIncludes(cssNeedle) {
	cy.getBlockeraStylesWrapper({ timeout: 20000 })
		.invoke('text')
		.should('include', cssNeedle);
}

/**
 * Asserts editor canvas styles no longer include a CSS needle (hover preview cleared).
 *
 * @param {string} cssNeedle Substring that must be absent from `#blockera-styles-wrapper`.
 */
export function assertEditorStylesWrapperExcludes(cssNeedle) {
	cy.getBlockeraStylesWrapper({ timeout: 20000 }).should(($el) => {
		const hasOverlayRule = String(collectWrapperEngineCss($el))
			.split('}')
			.some(
				(chunk) =>
					chunk.includes(cssNeedle) && !/--wp--preset--/.test(chunk)
			);

		expect(hasOverlayRule).to.eq(false);
	});
}

/**
 * Hover overlay CSS is printed by the style engine into `#blockera-styles-wrapper`
 * (`.blockera-block-{id}` when the block has identity, otherwise `#block-{clientId}`).
 * It must not live in `data-blockera-preview-inject` (clientId inject tags).
 */
function aliasSelectedBlockClientId() {
	getWPDataObject().then((data) => {
		const selected = getSelectedBlock(data);
		cy.wrap(selected?.clientId).as('previewBlockClientId');
	});
}

function collectWrapperEngineCss($wrapper) {
	const node = $wrapper?.[0];

	if (!node || typeof node.cloneNode !== 'function') {
		return '';
	}

	const clone = node.cloneNode(true);
	clone
		.querySelectorAll('[data-blockera-preview-inject]')
		.forEach((el) => el.remove());

	return clone.textContent || '';
}

function collectDocumentsEngineCss(doc) {
	if (!doc?.querySelectorAll) {
		return '';
	}

	return Array.from(doc.querySelectorAll('#blockera-styles-wrapper'))
		.map((el) => collectWrapperEngineCss(Cypress.$(el)))
		.join('\n');
}

/**
 * Hover overlay is a block-targeted rule. Seeded `:root { --wp--preset--*: … }`
 * custom properties reuse the same fallback string and must not count.
 */
function hasBlockHoverPreviewRule(cssText, cssNeedle, selectorNeedle) {
	return String(cssText)
		.split('}')
		.some((chunk) => {
			if (!chunk.includes(cssNeedle) || !chunk.includes(selectorNeedle)) {
				return false;
			}

			return !/--wp--preset--/.test(chunk);
		});
}

function getUniqueBlockeraBlockClassName(className) {
	return (
		String(className || '')
			.split(/\s+/)
			.find(
				(token) =>
					token &&
					token !== 'blockera-block' &&
					/^blockera-block-[\w-]+$/i.test(token)
			) || ''
	);
}

/**
 * Style engine uses `.blockera-block-{id}` once that unique class is on the
 * selected block (any Blockera attribute / identity). Unused blocks have
 * neither, so overlay CSS targets `#block-{clientId}`.
 */
function getHoverPreviewSelectorNeedle(blockEl, clientId) {
	const unique = getUniqueBlockeraBlockClassName(
		blockEl?.getAttribute?.('class') || blockEl?.className || ''
	);

	if (unique) {
		return `.${unique}`;
	}

	return `#block-${clientId}`;
}

function collectInjectPreviewCss(docs) {
	return docs
		.filter(Boolean)
		.flatMap((doc) =>
			Array.from(doc.querySelectorAll('[data-blockera-preview-inject]'))
		)
		.map((el) => el.textContent || '')
		.join('');
}

function collectEngineCssFromDocs(docs) {
	return docs
		.filter(Boolean)
		.map((doc) => collectDocumentsEngineCss(doc))
		.join('\n');
}

function getCanvasDocuments() {
	const iframe = Cypress.$('iframe[name="editor-canvas"]')[0];
	const iframeDoc = iframe?.contentDocument || iframe?.contentWindow?.document;
	const parentDoc = iframeDoc?.defaultView?.parent?.document;
	const docs = [iframeDoc];

	if (parentDoc && parentDoc !== iframeDoc) {
		docs.push(parentDoc);
	}

	if (typeof document !== 'undefined' && !docs.includes(document)) {
		docs.push(document);
	}

	return { iframeDoc, docs };
}

/**
 * Hover a preset → assert canvas CSS for the selected block → leave hover → CSS cleared.
 *
 * @param {Object} options
 * @param {string} options.slug Preset slug.
 * @param {string} options.cssNeedle Substring injected while hovering (plain preview value).
 * @param {string} [options.blockCssProperty] Optional computed style property on the paragraph.
 * @param {string} [options.blockCssValue] Expected computed style while hovering.
 */
export function assertVariablePickerPresetHoverPreview({
	slug,
	cssNeedle,
	blockCssProperty,
	blockCssValue,
}) {
	aliasSelectedBlockClientId();
	aliasVariablePickerPresetOpenerHeader(slug);

	cy.get('@previewBlockClientId').then((clientId) => {
		cy.get('@variablePickerPresetOpenerHeader').then(($header) => {
			// Keep re-entering while Cypress retries. Querying the canvas iframe
			// otherwise fires mouseleave and clears the overlay before assert.
			cy.wrap(null, { timeout: 20000 }).should(() => {
				dispatchPresetRowPointerEvent($header, 'mouseenter');

				const { iframeDoc, docs } = getCanvasDocuments();
				const blockEl = iframeDoc?.getElementById(`block-${clientId}`);
				const selectorNeedle = getHoverPreviewSelectorNeedle(
					blockEl,
					clientId
				);

				expect(
					collectInjectPreviewCss(docs),
					'hover preview must use style-engine selectors, not clientId inject'
				).to.not.include(cssNeedle);

				expect(
					hasBlockHoverPreviewRule(
						collectEngineCssFromDocs(docs),
						cssNeedle,
						selectorNeedle
					),
					`canvas CSS targets the selected block via ${selectorNeedle}`
				).to.eq(true);
			});
		});
	});

	if (blockCssProperty && blockCssValue) {
		cy.get('@variablePickerPresetOpenerHeader').then(($header) => {
			dispatchPresetRowPointerEvent($header, 'mouseenter');
		});

		cy.getBlock('core/paragraph').should(
			'have.css',
			blockCssProperty,
			blockCssValue
		);
	}

	leaveVariablePickerPresetRowHover(slug);

	assertEditorStylesWrapperExcludes(cssNeedle);
}

/**
 * Deletes a preset row from the open variable picker (custom/theme repeater section).
 *
 * @param {string} slug Preset slug (`data-variable-slug`).
 */
export function deleteVariableFromVariablePicker(slug) {
	withinVariablePickerPopover(() => {
		cy.get(`[data-variable-slug="${slug}"]`, { timeout: 20000 })
			.filter(':visible')
			.first()
			.as('variablePickerRow');

		cy.get('@variablePickerRow')
			.closest('[data-cy="repeater-item"]')
			.realHover();

		cy.get('@variablePickerRow')
			.closest('[data-cy="repeater-item"]')
			.within(() => {
				cy.get('button[aria-label^="Delete"]')
					.first()
					.click({ force: true });
			});
	});

	cy.get('.blockera-component-delete-modal', { timeout: 20000 })
		.filter(':visible')
		.last()
		.should('be.visible')
		.within(() => {
			cy.get('input[type="checkbox"]').check({ force: true });
			cy.getByDataTest('confirm-delete-modal-delete-button').click({
				force: true,
			});
		});
}
