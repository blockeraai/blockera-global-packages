// @flow

export type TransformOriginSides = {
	top: any,
	left: any,
};

function isOriginRecord(value: mixed): boolean {
	return value != null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Unwrap `{ value: { top, left } }` or pass through legacy `{ top, left }`.
 */
export function unwrapTransformOrigin(value: mixed): ?TransformOriginSides {
	if (!isOriginRecord(value)) {
		return null;
	}

	const record: { [string]: mixed } = (value: any);
	const wrapped = record.value;
	const sides: { [string]: mixed } =
		isOriginRecord(wrapped) && ('top' in wrapped || 'left' in wrapped)
			? (wrapped: any)
			: record;

	if (!('top' in sides) && !('left' in sides)) {
		return null;
	}

	return {
		top: sides.top == null ? '' : sides.top,
		left: sides.left == null ? '' : sides.left,
	};
}

export function normalizeTransformOriginForControl(
	value: mixed
): TransformOriginSides {
	return unwrapTransformOrigin(value) || { top: '', left: '' };
}

export function isUnusedTransformOrigin(
	current: mixed,
	registeredDefault: mixed
): boolean {
	const origin = normalizeTransformOriginForControl(current);
	const fallback = normalizeTransformOriginForControl(registeredDefault);

	return origin.top === fallback.top && origin.left === fallback.left;
}
