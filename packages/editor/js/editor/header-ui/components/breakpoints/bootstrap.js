// @flow

/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import domReady from '@wordpress/dom-ready';
import { dispatch } from '@wordpress/data';

export const bootstrapBreakpoints = (): void | Object => {
	domReady(() => {
		// Store name, not `@wordpress/core-data` — that package nests a second
		// `@wordpress/block-editor` under Jest ("Store already registered").
		const { addEntities } = dispatch('core');

		// Adding entities into WordPress core data.
		addEntities([
			{
				label: __('Blockera Users Settings', 'blockera'),
				kind: 'blockera/v1',
				name: 'users',
				baseURL: '/blockera/v1/users',
			},
		]);
	});
};
