/**
 * Default search scopes. Pro unlocks locked entries via applyFilters.
 *
 * @package
 */

import { applyFilters } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

export const SEARCH_REPLACE_SCOPES_FILTER =
	'blockera.editor.searchReplace.scopes';

/**
 * @return {Array<{ value: string, label: string, locked: boolean }>}
 */
export function getSearchReplaceScopes() {
	return applyFilters(SEARCH_REPLACE_SCOPES_FILTER, [
		{
			value: 'visible',
			label: __('Visible Content', 'blockera'),
			locked: false,
		},
		{
			value: 'attributes',
			label: __('Attributes', 'blockera'),
			locked: true,
		},
		{
			value: 'all',
			label: __('All', 'blockera'),
			locked: true,
		},
	]);
}
