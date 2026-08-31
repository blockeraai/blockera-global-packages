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

const BlockEditContext: Object = createContext({});

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
	} = value || {};

	const memoizedValue: {
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
		const {
			updatePickedDeviceType,
			updateDeviceIndicator,
		} = select('blockera/editor') || {};
		const {
			setBlockClientInnerState,
			setBlockClientMasterState,
			changeExtensionCurrentBlockState: setCurrentState,
			changeExtensionInnerBlockState: setCurrentInnerBlockState,
		} = dispatch('blockera/extensions') || {};

		return {
			...value,
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
						clientId: block?.clientId,
					});
					return setCurrentInnerBlockState(state);
				}

				setBlockClientMasterState({
					currentState: state,
					name: block?.blockName,
					clientId: block?.clientId,
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
		value,
		block,
		currentTab,
		currentBlock,
		currentState,
		setCurrentTab,
		currentBreakpoint,
		currentInnerBlockState,
	]);

	return (
		<BlockEditContext.Provider value={memoizedValue}>
			{children}
		</BlockEditContext.Provider>
	);
};

const useBlockContext = (): Object => {
	return useContext(BlockEditContext);
};

export { BlockEditContext, useBlockContext, BlockEditContextProvider };
