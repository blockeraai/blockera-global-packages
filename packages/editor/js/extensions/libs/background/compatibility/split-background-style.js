// @flow

/**
 * Internal dependencies
 */
import { normalizeWpGradientSentinel } from './wp-gradient-sentinel';

/**
 * Gutenberg maps `style.color.background` → React `backgroundColor` and
 * `style.color.gradient` → React `background`. Both on one node trips React’s
 * shorthand/longhand warning. Gradients belong on `backgroundImage`.
 *
 * WP sentinel shorthands (`none`, `transparent none`) stay on `background`
 * unless a `backgroundColor` is also present — that matches the compatibility
 * e2e computed-style checks.
 *
 * @param {Object|null|void} style Inline style object from block wrapper props.
 * @return {Object|null|void} Same object, or a copy without the `background` shorthand.
 */
export function splitConflictingBackgroundStyle(style: ?Object): ?Object {
	if (!style || style.background == null || style.background === '') {
		return style;
	}

	if (style.backgroundColor == null || style.backgroundColor === '') {
		return style;
	}

	const { background, backgroundImage, ...rest } = style;
	const sentinel = normalizeWpGradientSentinel(background);

	if (sentinel === 'none' || sentinel === 'transparent-none') {
		return {
			...rest,
			backgroundImage: backgroundImage || 'none',
		};
	}

	return {
		...rest,
		backgroundImage: backgroundImage
			? `${String(background)}, ${String(backgroundImage)}`
			: background,
	};
}

/**
 * @param {Object|null|void} wrapperProps BlockListBlock wrapper props.
 * @return {Object|null|void} Same props, or a copy with a safe `style`.
 */
export function splitConflictingBackgroundWrapperProps(
	wrapperProps: ?Object
): ?Object {
	if (!wrapperProps) {
		return wrapperProps;
	}

	const nextStyle = splitConflictingBackgroundStyle(wrapperProps.style);

	if (nextStyle === wrapperProps.style) {
		return wrapperProps;
	}

	return {
		...wrapperProps,
		style: nextStyle,
	};
}
