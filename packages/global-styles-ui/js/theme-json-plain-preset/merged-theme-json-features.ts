/**
 * External dependencies
 */
import { useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';

/**
 * Blockera dependencies
 */
import { wrapExperimentalFeaturesRaw } from '@blockera/data';

/**
 * Live merged theme.json preset roots from the block editor (`__experimentalFeatures`),
 * in the same wrapped shape used by variable resolution helpers.
 */
export function useMergedThemeJsonExperimentalFeaturesWrapped():
	Record<string, unknown> | undefined {
	return useSelect((wpSelect) => {
		try {
			const editorSettings = wpSelect(blockEditorStore).getSettings();
			return wrapExperimentalFeaturesRaw(
				editorSettings?.__experimentalFeatures
			) as Record<string, unknown> | undefined;
		} catch {
			return undefined;
		}
	}, []);
}
