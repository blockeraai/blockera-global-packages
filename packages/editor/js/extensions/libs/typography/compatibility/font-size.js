// @flow

/**
 * Blockera dependencies
 */
import { isValid } from '@blockera/controls';
import {
	getFontSizeVAFromVarString,
	getFontSizeVAStringFromId,
} from '@blockera/data';

/**
 * Internal dependencies
 */
import {
	runInsideBlockInspector,
	isEmptyBlockeraCompatValue,
	getWpFromStyleOrGlobal,
} from '../../utils';

export function fontSizeFromWPCompatibility({
	attributes,
	editorSelectedBlockEvent,
	insideBlockInspector = true,
}: {
	attributes: Object,
	insideBlockInspector?: boolean,
	editorSelectedBlockEvent?: 'save-customizations' | 'detach-style',
}): Object {
	const currentFontSize = attributes?.blockeraFontSize?.value;
	if (isEmptyBlockeraCompatValue(currentFontSize)) {
		// fontSize attribute in root always is variable
		// medium → var(--wp--preset--font-size--medium)
		// it should be changed to a Value Addon (variable)
		if (attributes?.fontSize) {
			const fontSizeVar = getFontSizeVAFromVarString(
				`var:preset|font-size|${attributes?.fontSize}`
			);

			if (fontSizeVar) {
				attributes.blockeraFontSize = {
					value: fontSizeVar,
				};

				return attributes;
			}
		}

		if (attributes?.typography?.fontSize) {
			const fontSizeVar = getFontSizeVAFromVarString(
				attributes.typography.fontSize
			);

			if (fontSizeVar) {
				attributes.blockeraFontSize = {
					value: fontSizeVar,
				};

				return attributes;
			}
		}

		// Block-level custom size lives on style.typography; canvas (and global
		// styles) may also expose typography.fontSize.
		const fontSize = getWpFromStyleOrGlobal(
			attributes?.style?.typography?.fontSize,
			attributes?.typography?.fontSize
		);

		if (fontSize) {
			attributes.blockeraFontSize = {
				value: fontSize,
			};

			return attributes;
		}
	}

	return attributes;
}

export function fontSizeToWPCompatibility({
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
					fontSize: undefined,
					style: {
						typography: {
							fontSize: undefined,
						},
					},
				}
			: {
					typography: {
						fontSize: undefined,
					},
				};
	}

	// is valid font-size variable
	if (isValid(newValue)) {
		return runInsideBlockInspector(
			insideBlockInspector,
			editorSelectedBlockEvent
		)
			? {
					fontSize: newValue?.settings?.id,
					style: {
						typography: {
							fontSize: undefined,
						},
					},
				}
			: {
					typography: {
						fontSize: getFontSizeVAStringFromId(
							newValue?.settings?.id
						),
					},
				};
	}

	// Advanced css functions not supported by core.
	if (newValue.endsWith('func')) {
		newValue = undefined;
	}

	return runInsideBlockInspector(
		insideBlockInspector,
		editorSelectedBlockEvent
	)
		? {
				fontSize: undefined,
				style: {
					typography: {
						fontSize: newValue,
					},
				},
			}
		: {
				typography: {
					fontSize: newValue,
				},
			};
}
