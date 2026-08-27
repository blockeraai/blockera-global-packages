// @flow

/**
 * External dependencies
 */
import { useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { getBaseBreakpoint } from '../../editor/header-ui/components/breakpoints/helpers';
import { useGlobalStylesPanelContext } from '../../editor/global-styles/panel/context';

const EMPTY_ATTRIBUTES = {};

/**
 * Blockera/extension store slice for BlockBase.
 *
 * When the block is not selected, skips global extension fields (current inner
 * target, breakpoint, editor events) so inserter hover and other editor-wide
 * UI does not re-render every BlockBase instance.
 *
 * Returns data values only (no selector functions). Returning `getDeviceType`
 * / `getActiveBlockVariation` from useSelect made the result fail shallow
 * equality whenever the registry rebuilt those function identities, which
 * re-rendered every mounted BlockBase on unrelated store updates.
 *
 * @param {Object}  options
 * @param {string}  options.clientId
 * @param {string}  options.name
 * @param {boolean} options.isSelected
 * @param {boolean} [options.insideBlockInspector=true]
 */
export function useBlockBaseStoreSelect({
	clientId,
	name,
	isSelected,
	insideBlockInspector = true,
}: {
	clientId: string,
	name: string,
	isSelected: boolean,
	insideBlockInspector?: boolean,
}): Object {
	// Global styles panel mounts a single BlockBase (insideBlockInspector=false) without
	// isSelected; it must still read extension inner-block target from the store.
	const effectivelySelected = isSelected || !insideBlockInspector;
	const { extensionsUiContext: panelExtensionsUiContext } =
		useGlobalStylesPanelContext();
	const extensionsUiContext =
		effectivelySelected && !insideBlockInspector
			? panelExtensionsUiContext
			: undefined;

	return useSelect(
		(select) => {
			const {
				getActiveInnerState,
				getActiveMasterState,
				getExtensionCurrentBlock,
				getExtensionCurrentBlockStateBreakpoint,
			} = select('blockera/extensions');

			const {
				getBlockType,
				getActiveBlockVariation,
				getBlockVariations,
			} = select('core/blocks');
			const { getBlockAttributes } = select('core/block-editor');
			const { getDeviceType, getEditorSelectedBlockEvent } =
				select('blockera/editor');

			const currentBlock = effectivelySelected
				? getExtensionCurrentBlock(extensionsUiContext)
				: 'master';
			const currentBreakpoint = effectivelySelected
				? getExtensionCurrentBlockStateBreakpoint()
				: getBaseBreakpoint();
			const editorSelectedBlockEvent = effectivelySelected
				? getEditorSelectedBlockEvent()
				: undefined;

			const blockType = getBlockType(name) || {};
			const {
				supports,
				selectors,
				attributes: availableAttributes,
			} = blockType;

			return {
				deviceType: getDeviceType(),
				currentBlock,
				currentState: getActiveMasterState(clientId, name),
				currentBreakpoint,
				currentInnerBlockState: effectivelySelected
					? getActiveInnerState(clientId, currentBlock)
					: 'normal',
				supports,
				selectors,
				availableAttributes,
				editorSelectedBlockEvent,
				activeBlockVariation: getActiveBlockVariation(
					name,
					getBlockAttributes(clientId) || EMPTY_ATTRIBUTES
				),
				blockVariations: name
					? getBlockVariations(name, 'transform')
					: undefined,
			};
		},
		[clientId, name, isSelected, effectivelySelected, extensionsUiContext]
	);
}
