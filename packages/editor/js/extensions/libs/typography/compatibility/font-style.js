// @flow

/**
 * Internal dependencies
 */
import { isEmptyBlockeraCompatValue, getWpFromStyleOrGlobal } from '../../utils';

export function fontStyleFromWPCompatibility({
	attributes,
}: {
	attributes: Object,
	insideBlockInspector?: boolean,
	runSelectedBlockEvent: boolean,
}): Object {
	const fontStyle = getWpFromStyleOrGlobal(
		attributes?.style?.typography?.fontStyle,
		attributes?.typography?.fontStyle
	);

	if (
		isEmptyBlockeraCompatValue(attributes?.blockeraFontStyle?.value) &&
		fontStyle !== undefined
	) {
		attributes.blockeraFontStyle = {
			value: fontStyle,
		};
	}

	return attributes;
}

export function fontStyleToWPCompatibility({
	newValue,
	ref,
	insideBlockInspector = true,
	runSelectedBlockEvent,
}: {
	newValue: Object,
	ref?: Object,
	insideBlockInspector?: boolean,
	runSelectedBlockEvent: boolean,
}): Object {
	if (
		newValue === '' ||
		'reset' === ref?.current?.action ||
		['normal', 'italic'].indexOf(newValue) === -1
	) {
		return insideBlockInspector && runSelectedBlockEvent
			? {
					style: {
						typography: {
							fontStyle: undefined,
						},
					},
				}
			: {
					typography: {
						fontStyle: undefined,
					},
				};
	}

	return insideBlockInspector && runSelectedBlockEvent
		? {
				style: {
					typography: {
						fontStyle: newValue,
					},
				},
			}
		: {
				typography: {
					fontStyle: newValue,
				},
			};
}
