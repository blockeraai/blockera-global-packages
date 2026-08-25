// @flow

/**
 * Blockera dependencies
 */
import {
	cloneObject,
	getBlockeraId,
	mergeObject,
	withBlockeraBlockClassFromId,
} from '@blockera/utils';

/**
 * Overlay Global Styles preset hover values onto sanitized block attributes.
 *
 * Feature keys in the patch replace the base (including unwrapped `''` defaults)
 * instead of deep-merging into `{ value: '' }` wrappers, which would hide the
 * preview from `hasBlockeraFeatureAttributes` and CSS generators.
 *
 * Without identity, drop `className` so the style engine targets
 * `#block-{clientId}` instead of shared WP classes (e.g. `.wp-block-paragraph`).
 *
 * @param {Object} base Sanitized (or current) attributes.
 * @param {Object|null|void} patch Overlay patch from preset hover.
 * @return {Object} Merged attributes for BlockStyle.
 */
export function mergeAttributesWithPresetPreviewPatch(
	base: Object,
	patch: Object | null | void
): Object {
	if (!patch || typeof patch !== 'object' || !Object.keys(patch).length) {
		return base;
	}

	const merged = mergeObject(cloneObject(base || {}), patch, {
		forceUpdated: Object.keys(patch),
	});

	if (getBlockeraId(merged)) {
		return withBlockeraBlockClassFromId(merged);
	}

	if (!merged.className) {
		return merged;
	}

	return {
		...merged,
		className: '',
	};
}
