// @flow
/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';
import { store as editorStore } from '@wordpress/editor';

/**
 * Gutenberg editor mode: `visual` or `text` (code editor).
 *
 * Reads the public `core/editor` `getEditorMode()` selector.
 *
 * @return {'visual' | 'text'} Current editor mode. Defaults to `visual` if the selector is missing.
 */
export function useEditorMode(): string {
	return useSelect((select) => {
		const editorSelect = select(editorStore);

		return editorSelect?.getEditorMode?.() || 'visual';
	}, []);
}
