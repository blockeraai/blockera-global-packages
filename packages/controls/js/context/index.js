// @flow

/**
 * External dependencies
 */
import type { MixedElement } from 'react';
import {
	useDispatch,
	useSelect,
	useRegistry,
	select as dataSelect,
} from '@wordpress/data';
import {
	createContext,
	useLayoutEffect,
	useMemo,
	useRef,
} from '@wordpress/element';

/**
 * Blockera dependencies
 */
import {
	isEquals,
	shouldTrackComponentRender,
	trackComponentRender,
} from '@blockera/utils';

/**
 * Internal dependencies
 */
import { STORE_NAME } from '../store/constants';
import type { ControlContextProviderProps } from './types';
import { retainIfEqual } from './retain-if-equal';
import { resolveControlSelectResult } from './resolve-control-select-result';
import {
	enqueueControlRegistration,
	flushQueuedControlRegistrations,
} from './enqueue-control-registration';

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

	const controlInfoRef = useRef(controlInfo);
	const stableControlInfo = retainIfEqual(
		controlInfoRef.current,
		controlInfo,
		isEquals
	);
	controlInfoRef.current = stableControlInfo;

	const registry = useRegistry();

	// Queue during render (no dispatch). Flush once after this commit so
	// opening the inspector is one store update, not one per control.
	if (
		stableControlInfo?.name &&
		!dataSelect(storeName).getControl(stableControlInfo.name)
	) {
		enqueueControlRegistration({
			...stableControlInfo,
			type: storeName,
		});
	}

	useLayoutEffect(() => {
		const batch =
			registry && typeof registry.batch === 'function'
				? registry.batch.bind(registry)
				: null;
		flushQueuedControlRegistrations(batch);
	}, [registry]);

	const selectResult = useSelect(
		(select) => {
			const { getControl } = select(storeName);
			const control = getControl(stableControlInfo.name);

			if (!control) {
				return null;
			}

			return resolveControlSelectResult(
				control,
				stableControlInfo,
				isEquals
			);
		},
		[stableControlInfo, storeName]
	);

	const dispatch = useDispatch(storeName);

	const providerValue = useMemo(
		() => ({
			controlInfo: stableControlInfo,
			value: selectResult?.value,
			dispatch,
			STORE_NAME,
		}),
		[stableControlInfo, selectResult?.value, dispatch]
	);

	// Wait until addControl has landed. Children (e.g. RepeaterControl) read
	// getControl(name) and crash if the store record is still missing.
	if (!selectResult || !selectResult.status) {
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
