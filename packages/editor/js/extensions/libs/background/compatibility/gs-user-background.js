// @flow

/**
 * Blockera dependencies
 */
import { isEmptyObject, mergeObject } from '@blockera/utils';

export type GsUserBackgroundOwnership = {
	hasLayers: boolean,
	userResetWpImage: boolean,
	userResetGradient: boolean,
};

const EMPTY_GS_BACKGROUND_OWNERSHIP: GsUserBackgroundOwnership = {
	hasLayers: false,
	userResetWpImage: false,
	userResetGradient: false,
};

function unwrapUserBackgroundLayers(userBlock: Object): mixed {
	const background = userBlock?.blockeraBackground;
	return background?.value ?? background;
}

/**
 * Classify GS userStyles background ownership. A user-origin `null` image
 * reset must not count as owning gradient — theme `color.gradient` still
 * hydrates. Layers or `color.gradient === null` own the full background.
 *
 * @param {Object|void} userBlock `userStyles.styles.blocks[blockId]`.
 * @return {GsUserBackgroundOwnership}
 */
export function getGsUserBackgroundOwnership(
	userBlock: Object | void
): GsUserBackgroundOwnership {
	if (!userBlock || typeof userBlock !== 'object') {
		return EMPTY_GS_BACKGROUND_OWNERSHIP;
	}

	const layers = unwrapUserBackgroundLayers(userBlock);
	const hasLayers =
		Boolean(layers) &&
		typeof layers === 'object' &&
		!isEmptyObject(layers);

	return {
		hasLayers,
		userResetWpImage: userBlock?.background?.backgroundImage === null,
		userResetGradient: userBlock?.color?.gradient === null,
	};
}

/**
 * When GS userStyles already owns background (layers, a user-origin `null`
 * image reset, or a `null` gradient reset), merge that slice into attributes.
 * Empty/`undefined` `blockeraBackground` without those resets is not ownership.
 *
 * @param {Object} attributes Incoming WP/Blockera attributes.
 * @param {Object|void} userBlock `userStyles.styles.blocks[blockId]`.
 * @return {Object|null} Merged attributes when owned, otherwise null.
 */
export function mergeOwnedGsUserBackground(
	attributes: Object,
	userBlock: Object | void
): Object | null {
	const ownership = getGsUserBackgroundOwnership(userBlock);

	if (
		!ownership.hasLayers &&
		!ownership.userResetWpImage &&
		!ownership.userResetGradient
	) {
		return null;
	}

	const next = mergeObject(attributes, {
		blockeraBackground: userBlock?.blockeraBackground,
		background: userBlock?.background,
	});

	if (ownership.userResetGradient) {
		return mergeObject(next, {
			color: userBlock?.color,
		});
	}

	return next;
}
