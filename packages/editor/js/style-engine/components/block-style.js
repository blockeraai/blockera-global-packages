// @flow

/**
 * External dependencies
 */
import type { MixedElement } from 'react';

/**
 * Blockera dependencies
 */
import { usePreviewInjectableStyles } from '@blockera/controls';
import {
	getBlockeraId,
	hasBlockeraFeatureAttributes,
} from '@blockera/utils';
import { isBlockeraEngineSkippedForClient } from '../../extensions/components/is-blockera-engine-skipped';

/**
 * Internal dependencies
 */
import type { BlockStyleProps } from './types';
import { StateStyle } from '..';
import {
	useExtensionsStore,
	getExtensionConfig,
} from '../../hooks/use-extensions-store';

/**
 * Whether BlockStyle should emit per-block CSS.
 *
 * Identity is enough (saved Blockera block). Feature attrs without an id, or
 * an overlay-only Global Styles preset hover patch, are enough to print CSS
 * targeting `#block-{clientId}` before identity is stamped.
 *
 * @param {Object} params
 * @return {boolean} Whether to print block styles.
 */
export function shouldPrintBlockeraBlockStyles({
	attributes,
	clientId,
	defaultAttributes,
	hasPresetPreviewPatch = false,
}: {
	attributes: ?Object,
	clientId: string,
	defaultAttributes?: Object,
	hasPresetPreviewPatch?: boolean,
}): boolean {
	if (!attributes && !hasPresetPreviewPatch) {
		return false;
	}

	if (isBlockeraEngineSkippedForClient(clientId, attributes || {})) {
		return false;
	}

	return Boolean(
		hasPresetPreviewPatch ||
			getBlockeraId(attributes) ||
			hasBlockeraFeatureAttributes(attributes, defaultAttributes)
	);
}

export const BlockStyle = ({
	customCss,
	isGlobalStylesWrapper = false,
	hasPresetPreviewPatch = false,
	...props
}: BlockStyleProps): MixedElement => {
	const previewInjectable = usePreviewInjectableStyles();
	const extraPreviewCss =
		typeof previewInjectable?.extraPreviewCss === 'string'
			? previewInjectable.extraPreviewCss.trim()
			: '';

	const {
		currentBlock,
		currentState,
		currentBreakpoint,
		currentInnerBlockState,
	} = useExtensionsStore({
		name: props.blockName,
		clientId: props.clientId,
	});

	const hasBlockeraProps = shouldPrintBlockeraBlockStyles({
		attributes: props?.attributes,
		clientId: props.clientId,
		defaultAttributes: props.defaultAttributes,
		hasPresetPreviewPatch,
	});

	// Skip unless Blockera styles apply or inspector preview CSS is active.
	if (!hasBlockeraProps && !extraPreviewCss) {
		return <></>;
	}

	const config = hasBlockeraProps
		? getExtensionConfig(props.blockName, currentBlock)
		: null;
	const shouldPrintCustomCss =
		hasBlockeraProps &&
		typeof customCss === 'string' &&
		customCss.trim().length > 0;

	return (
		<>
			{extraPreviewCss ? (
				<style
					id={`blockera-preview-inject-${props.clientId}`}
					data-blockera-preview-inject="1"
				>
					{extraPreviewCss}
				</style>
			) : null}
			{hasBlockeraProps && config ? (
				<>
					{shouldPrintCustomCss ? <style>{customCss}</style> : <></>}
					<StateStyle
						{...{
							...props,
							config,
							currentState,
							currentBlock,
							currentBreakpoint,
							isGlobalStylesWrapper,
							currentInnerBlockState,
							styleEngineConfig:
								props.supports?.blockeraStyleEngine,
						}}
					/>
				</>
			) : null}
		</>
	);
};
