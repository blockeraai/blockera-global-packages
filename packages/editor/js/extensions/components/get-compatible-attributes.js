// @flow

/**
 * External dependencies
 */
import { applyFilters } from '@wordpress/hooks';
import { getBlockType } from '@wordpress/blocks';

/**
 * Blockera dependencies
 */
import { detailedDiff } from 'deep-object-diff';
import {
	isEquals,
	cloneObject,
	omitWithPattern,
	mergeObject,
	normalizeBlockeraIds,
	getBlockeraId,
	getAttributesWithIds,
	isBlockeraBlockModeBasic,
} from '@blockera/utils';

/**
 * Internal dependencies
 */
import {
	ignoreBlockeraAttributeKeysRegExp,
} from '../libs';
import { prepareBlockeraDefaultAttributesValues } from './utils';
import { displayFromWPCompatibility } from '../libs/layout/compatibility/display';
import { gridAttrsFromWPCompatibility } from '../libs/layout/compatibility/grid-attrs';
import {
	alignItemsFromWPCompatibility,
	directionFromWPCompatibility,
	justifyContentFromWPCompatibility,
} from '../libs/layout/compatibility/flex-layout';

/**
 * Whether to run WP→Blockera attribute filters.
 *
 * Gate on feature attrs, not identity. A `blockeraId` / legacy props id must
 * still hydrate empty Blockera fields from WP (e.g. `style.layout.columnSpan`).
 * Existing feature values skip the merge so schema `{ value: '' }` does not
 * wipe pasted value-addons.
 *
 * Global styles still hydrates empty fields when the user entity already has
 * other Blockera features (font size, transitions, etc.). Each fromWP helper
 * no-ops when its own field is already set.
 *
 * @param {Object} params
 * @return {boolean} Whether WP→Blockera should run.
 */
export function shouldRunWpToBlockeraHydrate({
	isActive,
	pendingReturn = false,
	hasFeatures,
	insideBlockInspector = true,
}: {
	isActive: boolean,
	pendingReturn?: boolean,
	hasFeatures: boolean,
	insideBlockInspector?: boolean,
}): boolean {
	if (!isActive) {
		return false;
	}

	if (pendingReturn || false === insideBlockInspector) {
		return true;
	}

	return !hasFeatures;
}

export function unwrapBlockeraStoredValue(value: mixed): mixed {
	if (
		value &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		'value' in value
	) {
		return value.value;
	}

	return value;
}

/**
 * Keep group layout fields aligned with WP `layout` when full WP→Blockera
 * hydrate is skipped (existing feature attrs). Does not merge schema defaults.
 * Includes grid min-width / column count from `layout.minimumColumnWidth`.
 *
 * @param {Object} attributes Current attributes.
 * @param {Object} args Block detail (`blockId`, `activeBlockVariation`, schema).
 * @return {Object} Attributes with layout compatibility applied.
 */
export function syncGroupLayoutFromWp(
	attributes: Object,
	args: Object
): Object {
	if (args?.blockId !== 'core/group') {
		return attributes;
	}

	let next = cloneObject(attributes);

	next = displayFromWPCompatibility({
		attributes: next,
		blockId: args.blockId,
		defaultValue: args.blockAttributes?.blockeraDisplay?.default,
		activeVariation: args.activeBlockVariation?.name,
	});
	next = gridAttrsFromWPCompatibility({
		attributes: next,
	});
	next = directionFromWPCompatibility({
		attributes: next,
		blockId: args.blockId,
		activeVariation: args.activeBlockVariation?.name,
	});
	next = alignItemsFromWPCompatibility({
		attributes: next,
	});
	next = justifyContentFromWPCompatibility({
		attributes: next,
	});

	return next;
}

/**
 * Run `blockera.blockEdit.setAttributes` for each Blockera feature and accumulate
 * WordPress compatibility output with deep merge.
 *
 * @param {Object} params
 * @return {Object} Accumulated WordPress compatibility attributes.
 */
export const applyBlockeraSetAttributesCompatibility = ({
	blockeraKeys,
	getBlockeraValueForKey,
	getAttributes,
	blockDetail,
	controlRef = { action: 'normal', reset: false },
}: {
	blockeraKeys: Array<string> | Object,
	getBlockeraValueForKey: (featureId: string) => any,
	getAttributes: () => Object,
	blockDetail: Object,
	controlRef?: Object,
}): Object => {
	let wordpressCompatibilityAttributes = {};
	const keys = Array.isArray(blockeraKeys)
		? blockeraKeys
		: Object.keys(blockeraKeys);

	for (let index = 0; index < keys.length; index++) {
		const featureId = keys[index];

		if (!featureId.startsWith('blockera')) {
			continue;
		}

		wordpressCompatibilityAttributes = applyFilters(
			'blockera.blockEdit.setAttributes',
			wordpressCompatibilityAttributes,
			featureId,
			getBlockeraValueForKey(featureId),
			controlRef,
			getAttributes,
			blockDetail
		);
	}

	return wordpressCompatibilityAttributes;
};

function runWpToBlockeraFilters(
	attributes: Object,
	args: Object,
	defaultAttributes: Object,
	availableAttributes: Object
): Object {
	const canRegister =
		Boolean(availableAttributes?.blockeraId) ||
		Boolean(availableAttributes?.blockeraPropsId);

	let filteredAttributes = applyFilters(
		'blockera.blockEdit.attributes',
		canRegister
			? mergeObject(
					prepareBlockeraDefaultAttributesValues(defaultAttributes),
					{ ...attributes }
				)
			: { ...attributes },
		args
	);

	if (
		filteredAttributes.hasOwnProperty('blocks') &&
		Object.keys(filteredAttributes?.blocks || {}).length
	) {
		for (const blockType in filteredAttributes.blocks) {
			const blockTypeObj = getBlockType(blockType);

			if (!blockType) {
				continue;
			}

			const currentBlockAttributes = filteredAttributes.blocks[blockType];
			const nestedHasId = Boolean(getBlockeraId(currentBlockAttributes));

			const { blocks, blockeraInnerBlocks, ...latestFilteredAttributes } =
				applyFilters(
					'blockera.blockEdit.attributes',
					!nestedHasId &&
						(blockTypeObj.attributes?.blockeraId ||
							blockTypeObj.attributes?.blockeraPropsId)
						? mergeObject(
								{ ...currentBlockAttributes },
								prepareBlockeraDefaultAttributesValues(
									blockTypeObj.attributes
								)
							)
						: { ...currentBlockAttributes },
					args
				);

			if (Object.keys(blockeraInnerBlocks || {}).length) {
				filteredAttributes = mergeObject(filteredAttributes, {
					blockeraInnerBlocks: {
						value: {
							[blockType]: {
								attributes: {
									...Object.fromEntries(
										Object.entries(latestFilteredAttributes)
											.filter(([, val]) =>
												val.hasOwnProperty('value')
											)
											.map(([index, val]) => {
												return [index, val?.value];
											})
									),
									blockeraInnerBlocks,
								},
							},
						},
					},
				});
			}

			filteredAttributes = mergeObject(filteredAttributes, {
				blocks: {
					[blockType]: omitWithPattern(
						latestFilteredAttributes,
						ignoreBlockeraAttributeKeysRegExp()
					),
				},
			});
		}
	}

	return filteredAttributes;
}

export const getCompatibleAttributes = ({
	args,
	isActive,
	attributes,
	defaultAttributes,
	availableAttributes,
	runWpToBlockera = true,
	stampIdentity = false,
}: {
	args: Object,
	isActive: boolean,
	attributes: Object,
	defaultAttributes: Object,
	availableAttributes: Object,
	runWpToBlockera?: boolean,
	stampIdentity?: boolean,
}): Object => {
	const normalized = normalizeBlockeraIds({ ...attributes });

	if (!isActive || isBlockeraBlockModeBasic(normalized)) {
		return normalized;
	}

	if (!runWpToBlockera) {
		let skipped = normalized;

		if (stampIdentity && !getBlockeraId(skipped)) {
			skipped = getAttributesWithIds(skipped, 'blockeraId');
		}

		return syncGroupLayoutFromWp(skipped, args);
	}

	let filteredAttributes = runWpToBlockeraFilters(
		normalized,
		args,
		defaultAttributes,
		availableAttributes
	);

	if (isEquals(normalized, filteredAttributes)) {
		return normalized;
	}

	const filteredAttributesWithoutIds = {
		...filteredAttributes,
		blockeraId: '',
		blockeraPropsId: '',
		blockeraCompatId: '',
		...(normalized.hasOwnProperty('className')
			? { className: normalized?.className || '' }
			: {}),
	};

	const { added, updated } = detailedDiff(
		filteredAttributesWithoutIds,
		prepareBlockeraDefaultAttributesValues(defaultAttributes)
	);

	if (
		!Object.keys(added).length &&
		!Object.keys(updated).length &&
		isEquals(normalized, filteredAttributesWithoutIds)
	) {
		return normalized;
	}

	if (stampIdentity && !getBlockeraId(filteredAttributes) && isActive) {
		filteredAttributes = getAttributesWithIds(
			filteredAttributes,
			'blockeraId'
		);
	}

	return filteredAttributes;
};
