// @flow

/**
 * External dependencies
 */
import React from 'react';
import { dispatch, select } from '@wordpress/data';
import { addFilter, applyFilters } from '@wordpress/hooks';

// Useful to development environment, in production build process will be removed it!
if ('development' === process.env.APP_MODE) {
	/**
	 * see: https://github.com/welldone-software/why-did-you-render
	 */
	const whyDidYouRender = require('@welldone-software/why-did-you-render');
	whyDidYouRender(React);
}

/**
 * Blockera dependencies
 */
import {
	registerBlockeraBlocks,
	blockeraBootstrapBlocks,
	registerBlockeraBlockTypes,
	registerBlockeraBlockVariations,
	registerConfigExtensionsOfInnerBlocks,
} from '@blockera/blocks-core';
import { noop } from '@blockera/utils';
import { initializer } from '@blockera/bootstrap';
import {
	applyHooks,
	defineGlobalProps,
	bootstrapBlockAppSettings,
	blockeraExtensionsBootstrap,
	bootstrapEditor,
	bootstrapTabs,
	bootstrapPreviewMode,
	bootstrapZoom,
	bootstrapShortcuts,
	bootstrapScrollbar,
	bootstrapSlots,
	bootstrapCommandBar,
} from '@blockera/editor';
import blockeraEditorPackageInfo from '@blockera/editor/package.json';
import {
	unstableBootstrapServerSideFeatures,
	bootstrapEditorStyleEngineFilters,
} from '@blockera/features-core';

/**
 * Internal dependencies
 */
import { default as blockTypes } from './block-types';
import { default as blockVariations } from './block-variations';

/**
 * This plugin defines the companion (Blockera Site Builder) plugin as installed.
 *
 * Prefers the `blockera/products` store api (registered by the products
 * package) and only returns true when the companion product is registered and
 * active.
 */
addFilter(
	'blockera.products.isCompanionPlugin',
	'blockera/products.isCompanionPlugin',
	() => {
		// Resolved by store name (not a module import) so this shared bundle
		// keeps building in repos where the products package is not wired up.
		const companion = select('blockera/products')?.getCompanionProduct();

		if (undefined !== companion && 'blockera' === companion.slug) {
			return 'active' === companion.status;
		}

		return false;
	},
	10
);

/**
 * Registration blockera core block settings with internal definitions.
 */
addFilter('blockera.bootstrapper.before.domReady', 'blockera.bootstrap', () => {
	applyHooks(() => {
		const {
			registerSharedBlockAttributes = () => {},
			registerBlockTypeAttributes = () => {},
		} = dispatch('blockera/extensions') || {};

		const packageName =
			'blockeraEditor_' +
			blockeraEditorPackageInfo.version.replace(/\./g, '_');

		window[packageName].editor = {
			...(window[packageName]?.editor || {}),
			unstableRegistrationSharedBlockAttributes:
				registerSharedBlockAttributes,
			unstableRegistrationBlockTypeAttributes:
				registerBlockTypeAttributes,
		};

		window.unstableBootstrapServerSideFeatures =
			unstableBootstrapServerSideFeatures;

		bootstrapEditorStyleEngineFilters();

		registerBlockeraBlocks();
		registerConfigExtensionsOfInnerBlocks();

		registerBlockeraBlockTypes(blockTypes);
		registerBlockeraBlockVariations(blockVariations);
	});
});

/**
 * Initialize blockera react application.
 */
addFilter('blockera.bootstrapper', 'blockera.bootstrap', () => {
	applyFilters('blockera.before.bootstrap', noop)();

	// Bootstrap functions for extensions.
	blockeraExtensionsBootstrap();

	return () => {
		defineGlobalProps(() => {
			bootstrapBlockAppSettings();

			// Bootstrap functions for blocks.
			blockeraBootstrapBlocks();

			// Bootstrap editor modules (sidebars, persistence)
			bootstrapEditor();

			// Bootstrap tabs module
			bootstrapTabs();

			// Bootstrap preview mode
			bootstrapPreviewMode();

			// Bootstrap zoom controls
			bootstrapZoom();

			// Bootstrap keyboard shortcuts extension
			bootstrapShortcuts();

			// Bootstrap scrollbar utilities
			bootstrapScrollbar();

			// Bootstrap slots system
			bootstrapSlots();

			// Bootstrap command bar (export-only, no-op but included for consistency)
			bootstrapCommandBar();

			applyFilters('blockera.after.bootstrap', noop)();
		});
	};
});

initializer();
