// @flow
/**
 * External dependencies
 */
import { useBlockEditContext } from '@wordpress/block-editor';

/**
 * Whether this block instance should mount Blockera inspector chrome.
 *
 * Gutenberg's InspectorControls Fill uses a store-backed helper so the first
 * block in a homogeneous multi-selection also gets a sidebar. That helper
 * `select`s `core/block-editor` on every canvas BlockBase. With thousands of
 * instances, a selection change re-runs that mapper for every subscriber.
 *
 * Canvas BlockBase only needs inspector UI on the selected block. Core still
 * handles multi-select InspectorControls. Do not subscribe here.
 *
 * @see source-codes/block-editor/packages/block-editor/src/components/inspector-controls
 */
export function useDisplayBlockControls(): boolean {
	const { isSelected } = useBlockEditContext();
	return Boolean(isSelected);
}
