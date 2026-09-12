// @flow

/**
 * External dependencies
 */
import type { MixedElement } from 'react';
import { dispatch, select } from '@wordpress/data';
import { createContext, useContext, useMemo } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { isInnerBlock } from './utils';
import type { THandleOnChangeAttributes } from '../libs/types';
import type {
	TStates,
	TBreakpoint,
	BreakpointTypes,
} from '../libs/block-card/block-states/types';

const BlockEditIdentityContext: Object = createContext({});
const BlockEditAttributesContext: Object = createContext({});

/** Public context object: identity slice. Prefer useBlockContext for full data. */
const BlockEditContext: Object = BlockEditIdentityContext;

const BlockEditContextProvider = ({
	children,
	value,
}: Object): MixedElement => {
	const {
		currentTab,
		setCurrentTab,
		currentBlock,
		currentState,
		currentBreakpoint,
		currentInnerBlockState,
		block,
		attributes,
		blockeraInnerBlocks,
		currentInnerBlock,
		args,
		isActive,
		additional,
		isNormalState,
		setAttributes,
		getAttributes,
		blockVariations,
		defaultAttributes,
		availableAttributes,
		masterIsNormalState,
		activeBlockVariation,
		getActiveBlockVariation,
		handleOnChangeAttributes,
		updateBlockEditorSettings,
		BlockComponent,
		activeDeviceType,
		getBlockType,
	} = value || {};

	const identityBlock = useMemo(() => {
		if (!block) {
			return block;
		}

		return {
			blockName: block.blockName,
			clientId: block.clientId,
			handleOnChangeAttributes: block.handleOnChangeAttributes,
			storeName: block.storeName,
		};
	}, [
		block?.blockName,
		block?.clientId,
		block?.handleOnChangeAttributes,
		block?.storeName,
	]);

	const memoizedIdentity: {
		currentTab: string,
		getBlockType: string,
		blockStateId: number,
		breakpointId: number,
		getAttributes: () => Object,
		isNormalState: () => boolean,
		getCurrentState: () => TStates,
		masterIsNormalState: () => boolean,
		getBreakpoint: () => BreakpointTypes,
		setCurrentTab: (tabName: string) => void,
		switchBlockState: (state: string) => void,
		handleOnChangeAttributes: THandleOnChangeAttributes,
	} = useMemo(() => {
		const { updatePickedDeviceType, updateDeviceIndicator } =
			select('blockera/editor') || {};
		const {
			setBlockClientInnerState,
			setBlockClientMasterState,
			changeExtensionCurrentBlockState: setCurrentState,
			changeExtensionInnerBlockState: setCurrentInnerBlockState,
		} = dispatch('blockera/extensions') || {};

		return {
			args,
			isActive,
			block: identityBlock,
			currentTab,
			additional,
			currentBlock,
			currentState,
			isNormalState,
			setAttributes,
			getAttributes,
			blockVariations,
			currentBreakpoint,
			defaultAttributes,
			availableAttributes,
			masterIsNormalState,
			activeBlockVariation,
			currentInnerBlockState,
			getActiveBlockVariation,
			handleOnChangeAttributes,
			updateBlockEditorSettings,
			BlockComponent,
			activeDeviceType,
			getBlockType,
			switchBlockState: (
				state: TStates,
				breakpoint: TBreakpoint
			): void => {
				updatePickedDeviceType(breakpoint);
				updateDeviceIndicator(breakpoint);

				if (isInnerBlock(currentBlock)) {
					setBlockClientInnerState({
						currentState: state,
						innerBlockType: currentBlock,
						clientId: identityBlock?.clientId,
					});
					return setCurrentInnerBlockState(state);
				}

				setBlockClientMasterState({
					currentState: state,
					name: identityBlock?.blockName,
					clientId: identityBlock?.clientId,
				});

				setCurrentState(state);
			},
			setCurrentTab: (tabName: string): void => {
				if (tabName === currentTab) {
					return;
				}

				setCurrentTab(tabName);
			},
			getBreakpoint(): BreakpointTypes {
				return currentBreakpoint;
			},
			getCurrentState(): TStates {
				if (isInnerBlock(currentBlock)) {
					return currentInnerBlockState;
				}

				return currentState;
			},
		};
	}, [
		args,
		isActive,
		identityBlock,
		currentTab,
		additional,
		currentBlock,
		currentState,
		isNormalState,
		setAttributes,
		getAttributes,
		blockVariations,
		currentBreakpoint,
		defaultAttributes,
		availableAttributes,
		masterIsNormalState,
		activeBlockVariation,
		currentInnerBlockState,
		getActiveBlockVariation,
		handleOnChangeAttributes,
		updateBlockEditorSettings,
		BlockComponent,
		activeDeviceType,
		getBlockType,
		setCurrentTab,
	]);

	const memoizedAttributes = useMemo(
		() => ({
			attributes,
			blockeraInnerBlocks,
			currentInnerBlock,
			block,
		}),
		[attributes, blockeraInnerBlocks, currentInnerBlock, block]
	);

	return (
		<BlockEditIdentityContext.Provider value={memoizedIdentity}>
			<BlockEditAttributesContext.Provider value={memoizedAttributes}>
				{children}
			</BlockEditAttributesContext.Provider>
		</BlockEditIdentityContext.Provider>
	);
};

const useBlockIdentityContext = (): Object => {
	return useContext(BlockEditIdentityContext);
};

const useBlockContext = (): Object => {
	const identity = useContext(BlockEditIdentityContext);
	const attrSlice = useContext(BlockEditAttributesContext);

	return {
		...identity,
		...attrSlice,
		block: {
			...(identity?.block || {}),
			...(attrSlice?.block || {}),
		},
	};
};

export {
	BlockEditContext,
	useBlockContext,
	useBlockIdentityContext,
	BlockEditContextProvider,
};
