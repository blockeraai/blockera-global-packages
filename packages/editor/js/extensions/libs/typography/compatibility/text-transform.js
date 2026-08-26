// @flow

/**
 * Internal dependencies
 */
import { runInsideBlockInspector, isEmptyBlockeraCompatValue, getWpFromStyleOrGlobal } from '../../utils';

export function textTransformFromWPCompatibility({
	attributes,
	editorSelectedBlockEvent,
	insideBlockInspector = true,
}: {
	attributes: Object,
	editorSelectedBlockEvent?: 'save-customizations' | 'detach-style',
	insideBlockInspector?: boolean,
}): Object {
	const textTransform = getWpFromStyleOrGlobal(
		attributes?.style?.typography?.textTransform,
		attributes?.typography?.textTransform
	);

	if (
		isEmptyBlockeraCompatValue(attributes?.blockeraTextTransform?.value) &&
		textTransform !== undefined
	) {
		attributes.blockeraTextTransform = {
			value: textTransform,
		};
	}

	return attributes;
}

export function textTransformToWPCompatibility({
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
							textTransform: undefined,
						},
					},
				}
			: {
					typography: {
						textTransform: undefined,
					},
				};
	}

	return runInsideBlockInspector(
		insideBlockInspector,
		editorSelectedBlockEvent
	)
		? {
				style: {
					typography: {
						textTransform: newValue,
					},
				},
			}
		: {
				typography: {
					textTransform: newValue,
				},
			};
}
