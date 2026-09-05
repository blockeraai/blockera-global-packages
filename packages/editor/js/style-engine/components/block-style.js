// @flow

/**
 * External dependencies
 */
import type { ComponentType, MixedElement } from 'react';
import { memo } from '@wordpress/element';

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
import { getExtensionConfig } from '../../hooks/use-extensions-store';
import { getBaseBreakpoint } from '../../editor/header-ui/components/breakpoints/helpers';
import { getBlockeraStyleFingerprint } from '../blockera-style-fingerprint';

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
	isGlobalStylesWrapper = false,
}: {
	attributes: ?Object,
	clientId: string,
	defaultAttributes?: Object,
	hasPresetPreviewPatch?: boolean,
	isGlobalStylesWrapper?: boolean,
}): boolean {
	if (!attributes && !hasPresetPreviewPatch) {
		return false;
	}

	// Global styles uses synthetic client ids (`core-paragraph`). Walking
	// `getBlockParents` for those ids is meaningless and can skip CSS.
	if (
		!isGlobalStylesWrapper &&
		isBlockeraEngineSkippedForClient(clientId, attributes || {})
	) {
		return false;
	}

	return Boolean(
		hasPresetPreviewPatch ||
			getBlockeraId(attributes) ||
			hasBlockeraFeatureAttributes(attributes, defaultAttributes)
	);
}

/**
 * Skip BlockStyle commits when CSS inputs are unchanged.
 * Does not subscribe to the global extensions UI store — callers pass current*.
 *
 * @param {BlockStyleProps} prev
 * @param {BlockStyleProps} next
 * @return {boolean} True when props are equal (React.memo skip).
 */
export function areBlockStylePropsEqual(
	prev: BlockStyleProps,
	next: BlockStyleProps
): boolean {
	return (
		prev.clientId === next.clientId &&
		prev.blockName === next.blockName &&
		prev.customCss === next.customCss &&
		prev.activeDeviceType === next.activeDeviceType &&
		prev.hasPresetPreviewPatch === next.hasPresetPreviewPatch &&
		prev.isGlobalStylesWrapper === next.isGlobalStylesWrapper &&
		(prev.currentBlock ?? 'master') === (next.currentBlock ?? 'master') &&
		(prev.currentState ?? 'normal') === (next.currentState ?? 'normal') &&
		(prev.currentBreakpoint ?? getBaseBreakpoint()) ===
			(next.currentBreakpoint ?? getBaseBreakpoint()) &&
		(prev.currentInnerBlockState ?? 'normal') ===
			(next.currentInnerBlockState ?? 'normal') &&
		prev.supports === next.supports &&
		prev.selectors === next.selectors &&
		prev.additional === next.additional &&
		prev.defaultAttributes === next.defaultAttributes &&
		getBlockeraStyleFingerprint(prev.attributes, prev.inlineStyles) ===
			getBlockeraStyleFingerprint(next.attributes, next.inlineStyles)
	);
}

const BlockStyleComponent = ({
	customCss,
	isGlobalStylesWrapper = false,
	hasPresetPreviewPatch = false,
	currentBlock = 'master',
	currentState = 'normal',
	currentInnerBlockState = 'normal',
	...props
}: BlockStyleProps): MixedElement => {
	const previewInjectable = usePreviewInjectableStyles();
	const extraPreviewCss =
		typeof previewInjectable?.extraPreviewCss === 'string'
			? previewInjectable.extraPreviewCss.trim()
			: '';

	const currentBreakpoint =
		props.currentBreakpoint ?? getBaseBreakpoint();

	const hasBlockeraProps = shouldPrintBlockeraBlockStyles({
		attributes: props?.attributes,
		clientId: props.clientId,
		defaultAttributes: props.defaultAttributes,
		hasPresetPreviewPatch,
		isGlobalStylesWrapper,
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

export const BlockStyle: ComponentType<BlockStyleProps> = memo(
	BlockStyleComponent,
	areBlockStylePropsEqual
);
