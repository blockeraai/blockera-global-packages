// @flow

/**
 * External dependencies
 */
import type { MixedElement } from 'react';
import { useDispatch, useSelect, select as dataSelect } from '@wordpress/data';
import { createContext, useMemo, useRef } from '@wordpress/element';

/**
 * Blockera dependencies
 */
import {
	isEquals,
	isUndefined,
	shouldTrackComponentRender,
	trackComponentRender,
} from '@blockera/utils';

/**
 * Internal dependencies
 */
import { registerControl } from '../api';
import { STORE_NAME } from '../store/constants';
import type { ControlContextProviderProps } from './types';
import { retainIfEqual } from './retain-if-equal';

export const ControlContext: Object = createContext({
	controlInfo: {
		name: null,
		value: null,
		attribute: null,
		blockName: null,
		description: null,
	},
	value: null,
	dispatch: null,
	type: 'simple',
});

export const ControlContextProvider = ({
	value: controlInfo,
	children,
	storeName = STORE_NAME,
	...props
}: ControlContextProviderProps): MixedElement | null => {
	// Isolated debug block: no-op unless window.__BLOCKERA_RENDER_DEBUG__.
	if (shouldTrackComponentRender()) {
		trackComponentRender('ControlContextProvider', {
			id: controlInfo?.name,
			name: controlInfo?.name,
		});
	}
	if (!dataSelect(storeName).getControl(controlInfo.name)) {
		// $FlowFixMe
		registerControl({
			...controlInfo,
			type: storeName,
		});
	}

	const controlInfoRef = useRef(controlInfo);
	const stableControlInfo = retainIfEqual(
		controlInfoRef.current,
		controlInfo,
		isEquals
	);
	controlInfoRef.current = stableControlInfo;

	//Prepare control status and value!
	const { status, value } = useSelect(
		(select) => {
			const { getControl } = select(storeName);

			const control = getControl(stableControlInfo.name);

			const skipSyncValue =
				stableControlInfo.hasOwnProperty('skipSyncValue') &&
				true === stableControlInfo.skipSyncValue;

			/**
			 * If the control skipSyncValue is defined and true, we skip the value update based on control name.
			 */
			if (skipSyncValue) {
				return control;
			}

			if (
				!isUndefined(stableControlInfo.value) &&
				!isEquals(control?.value, stableControlInfo.value)
			) {
				return {
					...control,
					value: stableControlInfo.value,
				};
			}

			return control;
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[stableControlInfo]
	);
	//control dispatch for available actions
	const dispatch = useDispatch(storeName);

	const providerValue = useMemo(
		() => ({
			controlInfo: stableControlInfo,
			value,
			dispatch,
			STORE_NAME,
		}),
		[stableControlInfo, value, dispatch]
	);

	//You can to enable||disable current control with status column!
	if (!status) {
		return null;
	}

	return (
		<ControlContext.Provider {...props} value={providerValue}>
			{children}
		</ControlContext.Provider>
	);
};

export * from './types';
export { BaseControlContext } from './base-control-context';
export { useControlContext, useControlEffect } from './hooks';
export {
	PreviewInjectableStylesContext,
	usePreviewInjectableStyles,
} from './preview-injectable-styles-context';
export {
	BlockInjectedSlotContext,
	useBlockInjectedSlotClientId,
} from './block-injected-slot-context';
export {
	PresetCanvasPreviewContext,
	usePresetCanvasPreview,
} from './preset-canvas-preview-context';
export {
	PopoverActiveColorStyleContext,
	PopoverActiveColorStyleProvider,
	usePopoverActiveColorStyle,
} from './popover-active-color-style-context';
