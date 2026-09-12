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
 * Apply this only on the editor canvas (`wrapperProps`). Saved HTML must keep
 * Gutenberg’s native `background` + `backgroundColor` mix so serialize matches
 * parsed markup (otherwise save can hang without a success notice).
 *
 * WP sentinel shorthands (`none`, `transparent none`) stay on `background`
 * unless a `backgroundColor` is also present — that matches the compatibility
 * e2e computed-style checks.
 *
 * @param {Object|null|void} style Inline style object from block wrapper props.
 * @return {Object|null|void} Same object, or a copy without the `background` shorthand.
 */
export function splitConflictingBackgroundStyleNeedsRewrite(
	style: ?Object
): boolean {
	return Boolean(
		style &&
			style.background != null &&
			style.background !== '' &&
			style.backgroundColor != null &&
			style.backgroundColor !== ''
	);
}

export function splitConflictingBackgroundStyle(style: ?Object): ?Object {
	if (!style || !splitConflictingBackgroundStyleNeedsRewrite(style)) {
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
const rewrittenWrapperProps: WeakMap<Object, Object> = new WeakMap();

export function splitConflictingBackgroundWrapperProps(
	wrapperProps: ?Object
): ?Object {
	if (!wrapperProps) {
		return wrapperProps;
	}

	if (!splitConflictingBackgroundStyleNeedsRewrite(wrapperProps.style)) {
		return wrapperProps;
	}

	const cached = rewrittenWrapperProps.get(wrapperProps);

	if (cached) {
		return cached;
	}

	const nextStyle = splitConflictingBackgroundStyle(wrapperProps.style);
	const next =
		nextStyle === wrapperProps.style
			? wrapperProps
			: {
					...wrapperProps,
					style: nextStyle,
			  };

	rewrittenWrapperProps.set(wrapperProps, next);

	return next;
}
