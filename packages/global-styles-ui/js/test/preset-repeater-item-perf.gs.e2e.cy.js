/**
 * Phase 1–5: inner field keystrokes stay local. Persist on blur / nested close
 * (and structural add-clone-delete / type-key changes). Color hex, shadow blur,
 * and filter type+value keep the picker attached (no `cy.blur()`).
 */
import {
	nameNewGlobalStylesCustomPreset,
	openGlobalStylesBordersScreen,
	openGlobalStylesColorPaletteScreen,
	openGlobalStylesFiltersScreen,
	openGlobalStylesFontSizesVariablesScreen,
	openGlobalStylesShadowsScreen,
	openGlobalStylesSpacingScreen,
	openGlobalStylesTextShadowsScreen,
	openGlobalStylesTransformsScreen,
	snapshotPerfCounters,
	snapshotRenderStats,
	logPresetPerfDeltas,
	expectComponentRenderDeltaAtMost,
	componentRenderTotal,
	getVisibleGlobalStylesPresetPopover,
} from '@blockera/dev-cypress/js/helpers';

function logComponentDeltas(startAlias, endAlias, components) {
	return cy.get(`@${startAlias}`).then((start) => {
		cy.get(`@${endAlias}`).then((end) => {
			const summary = {};
			components.forEach((component) => {
				summary[component] =
					componentRenderTotal(end, component) -
					componentRenderTotal(start, component);
			});
			cy.log(
				`[render delta] ${startAlias}→${endAlias} ${JSON.stringify(
					summary
				)}`
			);
			expect(
				JSON.stringify(summary),
				`${startAlias}→${endAlias} render counters`
			).to.be.a('string');
		});
	});
}

function openInnerRepeaterLayer(layerDataId) {
	getVisibleGlobalStylesPresetPopover()
		.find(`[data-id="${layerDataId}"]`, { timeout: 20000 })
		.should('exist')
		.find('[data-cy="group-control-header"]')
		.first()
		.click({ force: true });
}

function closeInnerRepeaterLayer() {
	cy.get('.blockera-control-group-popover')
		.filter(':visible')
		.last()
		.find('[data-test="close-popover"]')
		.click({ force: true });
}

function expectPersistDelta(startAlias, endAlias, { min, max, message }) {
	return cy.get(`@${startAlias}`).then((start) => {
		cy.get(`@${endAlias}`).then((end) => {
			const delta =
				(end?.byName?.['gs.editEntityRecord']?.total || 0) -
				(start?.byName?.['gs.editEntityRecord']?.total || 0);
			if (typeof min === 'number') {
				expect(
					delta,
					message ||
						`${startAlias}→${endAlias} editEntityRecord ${delta} (min ${min})`
				).to.be.at.least(min);
			}
			if (typeof max === 'number') {
				expect(
					delta,
					message ||
						`${startAlias}→${endAlias} editEntityRecord ${delta} (max ${max})`
				).to.be.at.most(max);
			}
		});
	});
}

const RENDER_COMPONENTS = [
	'PresetGroup',
	'FontSizePresetFields',
	'ShadowPresetFields',
	'FilterPresetFields',
	'ControlContextProvider',
	'InputControl',
];

describe('Global Styles → preset repeater item performance (Phase 1–5)', () => {
	it('simple: Font Size field persists on blur, not each keystroke', () => {
		openGlobalStylesFontSizesVariablesScreen({ renderDebug: 'all' });

		nameNewGlobalStylesCustomPreset({
			addDataTest: 'global-styles-preset-add-font-size-presets-custom',
			presetName: 'Perf Font',
			closePopover: false,
		});

		snapshotPerfCounters('fontBefore');
		snapshotRenderStats('fontBeforeRenders');

		cy.getParentContainer('Font Size').within(() => {
			cy.get('input[type="text"]').clear({ force: true });
			cy.get('input[type="text"]').type('22', {
				delay: 0,
				force: true,
			});
		});

		cy.wait(400);
		snapshotPerfCounters('fontAfterType');
		snapshotRenderStats('fontAfterTypeRenders');
		logPresetPerfDeltas('fontBefore', 'fontAfterType');
		logComponentDeltas(
			'fontBeforeRenders',
			'fontAfterTypeRenders',
			RENDER_COMPONENTS
		);
		expectPersistDelta('fontBefore', 'fontAfterType', {
			max: 0,
			message: 'font size keystrokes must not persist the entity',
		});

		cy.getByDataCy('font-size-repeater-item-header')
			.last()
			.find('[data-cy="header-values"]')
			.should('contain', '22');

		cy.getByDataTest('global-styles-preset-name-field')
			.first()
			.click({ force: true });

		cy.wait(400);
		snapshotPerfCounters('fontAfterBlur');
		logPresetPerfDeltas('fontAfterType', 'fontAfterBlur');
		expectPersistDelta('fontAfterType', 'fontAfterBlur', {
			min: 1,
			max: 2,
			message: 'font size blur should persist once',
		});
		expectComponentRenderDeltaAtMost({
			startAlias: 'fontBeforeRenders',
			endAlias: 'fontAfterTypeRenders',
			component: 'ControlContextProvider',
			max: 80,
		});
	});

	it('nested: box-shadow blur persists on close, not each keystroke', () => {
		openGlobalStylesShadowsScreen({ renderDebug: 'all' });

		nameNewGlobalStylesCustomPreset({
			addDataTest: 'global-styles-preset-add-shadow-preset-presets-custom',
			presetName: 'Perf Shadow',
			closePopover: false,
		});

		openInnerRepeaterLayer('outer-0');

		snapshotPerfCounters('shadowBefore');
		snapshotRenderStats('shadowBeforeRenders');

		cy.getByDataTest('box-shadow-blur-input', { timeout: 20000 }).should(
			'be.visible'
		);
		cy.getByDataTest('box-shadow-blur-input').clear({ force: true });
		cy.getByDataTest('box-shadow-blur-input').type('18', {
			delay: 0,
			force: true,
		});

		cy.getByDataTest('box-shadow-blur-input').should('be.visible');
		getVisibleGlobalStylesPresetPopover().should('be.visible');

		cy.wait(400);
		snapshotPerfCounters('shadowAfterType');
		snapshotRenderStats('shadowAfterTypeRenders');
		logPresetPerfDeltas('shadowBefore', 'shadowAfterType');
		logComponentDeltas(
			'shadowBeforeRenders',
			'shadowAfterTypeRenders',
			RENDER_COMPONENTS
		);
		expectPersistDelta('shadowBefore', 'shadowAfterType', {
			max: 0,
			message: 'shadow blur keystrokes must not persist the entity',
		});

		cy.get('[data-id="outer-0"]')
			.filter(':visible')
			.first()
			.find('[data-cy="group-control-header"]')
			.should('contain', '18');

		closeInnerRepeaterLayer();

		cy.wait(400);
		snapshotPerfCounters('shadowAfterClose');
		logPresetPerfDeltas('shadowAfterType', 'shadowAfterClose');
		expectPersistDelta('shadowAfterType', 'shadowAfterClose', {
			min: 1,
			max: 2,
			message: 'closing the shadow layer should persist once',
		});
	});

	it('type-variant: filter blur defers; type change and close persist', () => {
		openGlobalStylesFiltersScreen({ renderDebug: 'all' });

		nameNewGlobalStylesCustomPreset({
			addDataTest: 'global-styles-preset-add-filter-preset-presets-custom',
			presetName: 'Perf Filter',
			closePopover: false,
		});

		openInnerRepeaterLayer('blur-0');

		snapshotPerfCounters('filterBefore');
		snapshotRenderStats('filterBeforeRenders');

		cy.getByDataTest('filter-blur-input', { timeout: 20000 }).should(
			'be.visible'
		);
		cy.getByDataTest('filter-blur-input').clear({ force: true });
		cy.getByDataTest('filter-blur-input').type('7', {
			delay: 0,
			force: true,
		});

		cy.wait(300);
		snapshotPerfCounters('filterAfterBlur');
		snapshotRenderStats('filterAfterBlurRenders');
		logPresetPerfDeltas('filterBefore', 'filterAfterBlur');
		logComponentDeltas(
			'filterBeforeRenders',
			'filterAfterBlurRenders',
			RENDER_COMPONENTS
		);
		expectPersistDelta('filterBefore', 'filterAfterBlur', {
			max: 0,
			message: 'filter blur keystrokes must not persist the entity',
		});

		cy.get('[data-id="blur-0"]')
			.filter(':visible')
			.first()
			.find('[data-cy="group-control-header"]')
			.should('contain', '7');

		cy.getByDataTest('filter-blur-input')
			.closest('[data-test="popover-body"]')
			.within(() => {
				cy.getParentContainer('Type').within(() => {
					cy.get('select').select('drop-shadow');
				});
			});

		cy.wait(300);
		snapshotPerfCounters('filterAfterType');
		logPresetPerfDeltas('filterAfterBlur', 'filterAfterType');

		cy.getByDataTest('filter-drop-shadow-blur-input', {
			timeout: 10000,
		}).should('be.visible');
		getVisibleGlobalStylesPresetPopover().should('be.visible');
		cy.getByDataTest('filter-drop-shadow-blur-input').clear({
			force: true,
		});
		cy.getByDataTest('filter-drop-shadow-blur-input').type('12', {
			delay: 0,
			force: true,
		});

		cy.getByDataTest('filter-drop-shadow-blur-input').should('be.visible');

		cy.wait(400);
		snapshotPerfCounters('filterAfterDropShadowType');
		logPresetPerfDeltas('filterAfterType', 'filterAfterDropShadowType');
		expectPersistDelta('filterAfterType', 'filterAfterDropShadowType', {
			max: 0,
			message: 'drop-shadow blur keystrokes must not persist the entity',
		});

		closeInnerRepeaterLayer();

		cy.wait(400);
		snapshotPerfCounters('filterAfterClose');
		logPresetPerfDeltas('filterAfterDropShadowType', 'filterAfterClose');
		expectPersistDelta('filterBefore', 'filterAfterClose', {
			min: 1,
			message: 'filter edits should persist on type change and/or close',
		});
	});

	it('simple: spacing size persists on blur, not each keystroke', () => {
		openGlobalStylesSpacingScreen({ renderDebug: 'all' });

		nameNewGlobalStylesCustomPreset({
			addDataTest: 'global-styles-preset-add-spacing-size-presets-custom',
			presetName: 'Perf Spacing',
			closePopover: false,
		});

		snapshotPerfCounters('spacingBefore');

		cy.getByDataTest('spacing-size-input', { timeout: 20000 }).should(
			'be.visible'
		);
		cy.getByDataTest('spacing-size-input').clear({ force: true });
		cy.getByDataTest('spacing-size-input').type('24', {
			delay: 0,
			force: true,
		});

		cy.wait(400);
		snapshotPerfCounters('spacingAfterType');
		expectPersistDelta('spacingBefore', 'spacingAfterType', {
			max: 0,
			message: 'spacing size keystrokes must not persist the entity',
		});

		cy.getByDataCy('spacing-size-repeater-item-header')
			.last()
			.find('[data-cy="header-values"]')
			.should('contain', '24');

		cy.getByDataTest('global-styles-preset-name-field')
			.first()
			.click({ force: true });

		cy.wait(400);
		snapshotPerfCounters('spacingAfterBlur');
		expectPersistDelta('spacingAfterType', 'spacingAfterBlur', {
			min: 1,
			max: 2,
			message: 'spacing size blur should persist once',
		});
	});

	it('shared: name field persists on close, not each keystroke', () => {
		openGlobalStylesFontSizesVariablesScreen({ renderDebug: 'all' });

		nameNewGlobalStylesCustomPreset({
			addDataTest: 'global-styles-preset-add-font-size-presets-custom',
			presetName: 'Perf Name',
			closePopover: true,
		});

		cy.getByDataCy('font-size-repeater-item-header')
			.last()
			.click({ force: true });

		getVisibleGlobalStylesPresetPopover()
			.find('[data-test="global-styles-preset-name-field"]')
			.should('be.visible');

		snapshotPerfCounters('nameBefore');

		cy.getByDataTest('global-styles-preset-name-field')
			.first()
			.type(' X', { delay: 0, force: true });

		cy.wait(400);
		snapshotPerfCounters('nameAfterType');
		expectPersistDelta('nameBefore', 'nameAfterType', {
			max: 0,
			message: 'name keystrokes must not persist the entity',
		});

		cy.realPress('Escape');

		cy.wait(400);
		snapshotPerfCounters('nameAfterClose');
		expectPersistDelta('nameAfterType', 'nameAfterClose', {
			min: 1,
			max: 2,
			message: 'closing the name editor should persist once',
		});
	});

	it('nested: text-shadow blur persists on close, not each keystroke', () => {
		openGlobalStylesTextShadowsScreen({ renderDebug: 'all' });

		nameNewGlobalStylesCustomPreset({
			addDataTest:
				'global-styles-preset-add-text-shadow-preset-presets-custom',
			presetName: 'Perf Text Shadow',
			closePopover: false,
		});

		openInnerRepeaterLayer('0');

		snapshotPerfCounters('textShadowBefore');

		cy.getByAriaLabel('Blur Effect', { timeout: 20000 }).should(
			'be.visible'
		);
		cy.getByAriaLabel('Blur Effect').clear({ force: true });
		cy.getByAriaLabel('Blur Effect').type('18', {
			delay: 0,
			force: true,
		});

		cy.wait(400);
		snapshotPerfCounters('textShadowAfterType');
		expectPersistDelta('textShadowBefore', 'textShadowAfterType', {
			max: 0,
			message: 'text-shadow blur keystrokes must not persist the entity',
		});

		cy.getByDataCy('text-shadow-repeater-item-header')
			.filter(':visible')
			.last()
			.find('[data-cy="header-values"]')
			.should('contain', '18');

		closeInnerRepeaterLayer();

		cy.wait(400);
		snapshotPerfCounters('textShadowAfterClose');
		expectPersistDelta('textShadowAfterType', 'textShadowAfterClose', {
			min: 1,
			max: 2,
			message: 'closing the text-shadow layer should persist once',
		});
	});

	it('nested: transform move-x persists on close, not each keystroke', () => {
		openGlobalStylesTransformsScreen({ renderDebug: 'all' });

		nameNewGlobalStylesCustomPreset({
			addDataTest:
				'global-styles-preset-add-transform-preset-presets-custom',
			presetName: 'Perf Transform',
			closePopover: false,
		});

		openInnerRepeaterLayer('move-0');

		snapshotPerfCounters('transformBefore');

		cy.getByAriaLabel('Move-X', { timeout: 20000 }).should('be.visible');
		cy.getByAriaLabel('Move-X').clear({ force: true });
		cy.getByAriaLabel('Move-X').type('12', {
			delay: 0,
			force: true,
		});

		cy.wait(400);
		snapshotPerfCounters('transformAfterType');
		expectPersistDelta('transformBefore', 'transformAfterType', {
			max: 0,
			message: 'transform move-x keystrokes must not persist the entity',
		});

		cy.get('[data-id="move-0"]')
			.filter(':visible')
			.first()
			.find('[data-cy="group-control-header"]')
			.should('contain', '12');

		closeInnerRepeaterLayer();

		cy.wait(400);
		snapshotPerfCounters('transformAfterClose');
		expectPersistDelta('transformAfterType', 'transformAfterClose', {
			min: 1,
			max: 2,
			message: 'closing the transform layer should persist once',
		});
	});

	it('simple: color hex stages without persist; picker stays attached', () => {
		openGlobalStylesColorPaletteScreen({ renderDebug: 'all' });

		nameNewGlobalStylesCustomPreset({
			addDataTest: 'global-styles-preset-add-color-presets-custom',
			presetName: 'Perf Color',
			closePopover: false,
		});

		getVisibleGlobalStylesPresetPopover()
			.find('[data-cy="color-btn"]')
			.first()
			.click({ force: true });

		cy.get('[data-cy="color-picker-css-value"]', { timeout: 20000 }).should(
			'be.visible'
		);

		snapshotPerfCounters('colorBefore');

		cy.get('[data-cy="color-picker-css-value"]')
			.click({ force: true })
			.type('{selectall}#00ff99', { delay: 0, force: true });

		cy.get('[data-cy="color-picker-css-value"]').should('be.visible');
		cy.get('.sketch-picker').should('exist');
		getVisibleGlobalStylesPresetPopover().should('be.visible');

		cy.wait(400);
		snapshotPerfCounters('colorAfterType');
		expectPersistDelta('colorBefore', 'colorAfterType', {
			max: 0,
			message: 'color hex keystrokes must not persist the entity',
		});

		cy.getByDataTest('global-styles-preset-name-field')
			.first()
			.click({ force: true });

		cy.wait(400);
		snapshotPerfCounters('colorAfterLeave');
		expectPersistDelta('colorAfterType', 'colorAfterLeave', {
			min: 1,
			max: 2,
			message: 'leaving the color picker should persist once',
		});
	});

	it('creating: name keystrokes do not persist until close', () => {
		openGlobalStylesBordersScreen({ renderDebug: 'all' });

		cy.addNewGlobalStylesCustomPresetByDataTest(
			'global-styles-preset-add-border-preset-presets-custom'
		);

		cy.getByDataTest('repeater-item-creating-step', {
			timeout: 20000,
		}).should('exist');

		snapshotPerfCounters('createNameBefore');

		cy.getByDataTest('global-styles-preset-name-field', { timeout: 20000 })
			.first()
			.click({ force: true })
			.clear({ force: true })
			.type('Perf Border Name', { delay: 0, force: true });

		cy.wait(400);
		snapshotPerfCounters('createNameAfterType');
		expectPersistDelta('createNameBefore', 'createNameAfterType', {
			max: 0,
			message: 'creating-step name keystrokes must not persist the entity',
		});

		cy.realPress('Escape');
		cy.getByDataTest('repeater-item-creating-step').should('not.exist');

		cy.wait(400);
		snapshotPerfCounters('createNameAfterClose');
		expectPersistDelta('createNameAfterType', 'createNameAfterClose', {
			min: 1,
			max: 2,
			message: 'closing a new preset should persist the name once',
		});
	});
});
