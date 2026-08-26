// @flow

/**
 * Blockera dependencies
 */
import { isSpecialUnit } from '@blockera/controls';
import { normalizeCssLengthValue } from '@blockera/utils';

/**
 * Internal dependencies
 */
import {
	runInsideBlockInspector,
	isEmptyBlockeraCompatValue,
	getWpFromStyleOrGlobal,
} from '../../utils';

export function letterSpacingFromWPCompatibility({
	attributes,
	insideBlockInspector = true,
	editorSelectedBlockEvent,
}: {
	attributes: Object,
	insideBlockInspector?: boolean,
	editorSelectedBlockEvent?: 'save-customizations' | 'detach-style',
}): Object {
	const letterSpacing = getWpFromStyleOrGlobal(
		attributes?.style?.typography?.letterSpacing,
		attributes?.typography?.letterSpacing
	);

	const currentLetterSpacing = attributes?.blockeraLetterSpacing?.value;
	if (
		isEmptyBlockeraCompatValue(currentLetterSpacing) &&
		letterSpacing !== undefined
	) {
		attributes.blockeraLetterSpacing = {
			value: normalizeCssLengthValue(letterSpacing),
		};
	}

	return attributes;
}

export function letterSpacingToWPCompatibility({
	newValue,
	ref,
	insideBlockInspector = true,
	editorSelectedBlockEvent,
}: {
	newValue: Object,
	ref?: Object,
	insideBlockInspector?: boolean,
	editorSelectedBlockEvent?: 'save-customizations' | 'detach-style',
}): Object {
	if ('reset' === ref?.current?.action || newValue === '') {
		return runInsideBlockInspector(
			insideBlockInspector,
			editorSelectedBlockEvent
		)
			? {
					style: {
						typography: {
							letterSpacing: undefined,
						},
					},
				}
			: {
					typography: {
						letterSpacing: undefined,
					},
				};
	}

	// Advanced css functions and units not supported by core.
	if (isSpecialUnit(newValue)) {
		newValue = undefined;
	}

	return runInsideBlockInspector(
		insideBlockInspector,
		editorSelectedBlockEvent
	)
		? {
				style: {
					typography: {
						letterSpacing: newValue,
					},
				},
			}
		: {
				typography: {
					letterSpacing: newValue,
				},
			};
}
