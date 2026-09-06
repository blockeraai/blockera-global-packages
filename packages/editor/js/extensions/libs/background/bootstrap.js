// @flow

/**
 * External dependencies
 */
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { createElement, forwardRef } from '@wordpress/element';

/**
 * Blockera dependencies
 */
import type { ControlContextRefCurrent } from '@blockera/controls';

/**
 * Internal dependencies
 */
import {
	backgroundFromWPCompatibility,
	backgroundToWPCompatibility,
} from './compatibility/background-image';
import {
	backgroundColorFromWPCompatibility,
	backgroundColorToWPCompatibility,
} from './compatibility/background-color';
import type { BlockDetail } from '../block-card/block-states/types';
import {
	isInvalidCompatibilityRun,
	mergeWPCompatibility,
	sanitizeWPCompatibilityAttributes,
} from '../utils';
import {
	splitConflictingBackgroundStyleNeedsRewrite,
	splitConflictingBackgroundWrapperProps,
} from './compatibility/split-background-style';

let didRegisterCanvasBackgroundSanitize = false;

export const bootstrap = (): void => {
	addFilter(
		'blockera.blockEdit.attributes',
		'blockera.blockEdit.backgroundExtension.bootstrap',
		(attributes: Object, blockDetail: BlockDetail) => {
			const {
				blockId,
				blockAttributes,
				insideBlockInspector,
				editorSelectedBlockEvent,
			} = blockDetail;

			attributes = backgroundFromWPCompatibility({
				attributes,
				blockId,
				insideBlockInspector,
				editorSelectedBlockEvent,
			});

			attributes = backgroundColorFromWPCompatibility({
				attributes,
				blockAttributes,
				insideBlockInspector,
				editorSelectedBlockEvent,
			});

			return sanitizeWPCompatibilityAttributes(attributes, blockDetail);
		}
	);

	addFilter(
		'blockera.blockEdit.setAttributes',
		'blockera.blockEdit.backgroundExtension.bootstrap.setAttributes',
		/**
		 * Retrieve block attributes with WordPress compatibilities.
		 *
		 * @callback getAttributes
		 *
		 * @param {Object} nextState The block attributes changed with blockera feature newValue and latest version of block state.
		 * @param {string} featureId The blockera feature identifier.
		 * @param {*} newValue The newValue sets to feature.
		 * @param {ControlContextRefCurrent} ref The reference of control context action occurred.
		 * @param {getAttributes} getAttributes The getter block attributes.
		 * @param {blockDetail} blockDetail detail of current block
		 *
		 * @return {Object|{}} The retrieve updated block attributes with all of wp compatibilities.
		 */
		(
			nextState: Object,
			featureId: string,
			newValue: any,
			ref: ControlContextRefCurrent,
			getAttributes: () => Object,
			blockDetail: BlockDetail
		): Object => {
			if (isInvalidCompatibilityRun(blockDetail, ref)) {
				return nextState;
			}

			const { insideBlockInspector, editorSelectedBlockEvent } =
				blockDetail;

			switch (featureId) {
				case 'blockeraBackground':
					return mergeWPCompatibility(
						nextState,
						backgroundToWPCompatibility({
							newValue,
							ref,
							insideBlockInspector,
							editorSelectedBlockEvent,
						}),
						blockDetail
					);

				case 'blockeraBackgroundColor':
					return mergeWPCompatibility(
						nextState,
						backgroundColorToWPCompatibility({
							newValue,
							ref,
							insideBlockInspector,
							editorSelectedBlockEvent,
						}),
						blockDetail
					);
			}

			return nextState;
		}
	);

	// Canvas only. Do not hook `blocks.getSaveContent.extraProps` — rewriting
	// saved markup invalidates core blocks vs their original HTML and can
	// stall post save (no success snackbar).
	if (!didRegisterCanvasBackgroundSanitize) {
		didRegisterCanvasBackgroundSanitize = true;
		addFilter(
			'editor.BlockListBlock',
			'blockera.editor.sanitizeBackgroundStyleConflict',
			createHigherOrderComponent((BlockListBlock) => {
				return forwardRef(function BlockeraSanitizedBackgroundStyle(
					props: Object,
					ref: mixed
				) {
					const wrapperProps = props.wrapperProps;

					if (
						!splitConflictingBackgroundStyleNeedsRewrite(
							wrapperProps?.style
						)
					) {
						return createElement(BlockListBlock, {
							...props,
							ref,
						});
					}

					return createElement(BlockListBlock, {
						...props,
						ref,
						wrapperProps:
							splitConflictingBackgroundWrapperProps(
								wrapperProps
							),
					});
				});
			}, 'withSanitizedBackgroundStyle'),
			9
		);
	}
};
