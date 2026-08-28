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
 * @param {Object}  [options.attributes]
 */
export function useBlockBaseStoreSelect({
	clientId,
	name,
	isSelected,
	insideBlockInspector = true,
	attributes,
}: {
	clientId: string,
	name: string,
	isSelected: boolean,
	insideBlockInspector?: boolean,
	attributes?: Object,
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
				getBlockType,
				getActiveBlockVariation,
				getBlockVariations,
			} = select('core/blocks');
			const { getDeviceType } = select('blockera/editor');
			const blockType = getBlockType(name) || {};
			const {
				supports,
				selectors,
				attributes: availableAttributes,
			} = blockType;
			const blockVariations = name
				? getBlockVariations(name, 'transform')
				: undefined;

			if (!effectivelySelected) {
				const result = {
					deviceType: getDeviceType(),
					currentBlock: 'master',
					currentState: 'normal',
					currentBreakpoint: getBaseBreakpoint(),
					currentInnerBlockState: 'normal',
					supports,
					selectors,
					availableAttributes,
					editorSelectedBlockEvent: undefined,
					activeBlockVariation: getActiveBlockVariation(
						name,
						attributes || EMPTY_ATTRIBUTES
					),
					blockVariations,
				};
				return result;
			}

			const {
				getActiveInnerState,
				getActiveMasterState,
				getExtensionCurrentBlock,
				getExtensionCurrentBlockStateBreakpoint,
			} = select('blockera/extensions');
			const { getBlockAttributes } = select('core/block-editor');
			const { getEditorSelectedBlockEvent } = select('blockera/editor');
			const currentBlock = getExtensionCurrentBlock(extensionsUiContext);

			const result = {
				deviceType: getDeviceType(),
				currentBlock,
				currentState: getActiveMasterState(clientId, name),
				currentBreakpoint: getExtensionCurrentBlockStateBreakpoint(),
				currentInnerBlockState: getActiveInnerState(
					clientId,
					currentBlock
				),
				supports,
				selectors,
				availableAttributes,
				editorSelectedBlockEvent: getEditorSelectedBlockEvent(),
				activeBlockVariation: getActiveBlockVariation(
					name,
					getBlockAttributes(clientId) || EMPTY_ATTRIBUTES
				),
				blockVariations,
			};
			return result;
		},
		[
			attributes,
			clientId,
			name,
			isSelected,
			effectivelySelected,
			extensionsUiContext,
		]
	);
}
