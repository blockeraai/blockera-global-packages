// @flow
/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';

/**
 * Gutenberg editor mode: `visual` or `text` (code editor).
 *
 * Reads the public `core/editor` `getEditorMode()` selector by store name so
 * the utils barrel does not import `@wordpress/editor` (that package unlocks
 * Gutenberg private APIs and breaks Cypress when pulled in via `@blockera/utils`).
 *
 * @return {'visual' | 'text'} Current editor mode. Defaults to `visual` if the selector is missing.
 */
export function useEditorMode(): string {
	return useSelect((select) => {
		const editorSelect = select('core/editor');

		return editorSelect?.getEditorMode?.() || 'visual';
	}, []);
}
