// @flow

/**
 * Shared transform string building for block attributes and global-styles preset preview.
 * Mirrors the switch in `styles.js` (blockeraTransform) using {@link getValueAddonRealValue}.
 *
 * Blockera dependencies
 */
import { getValueAddonRealValue, getSortedRepeater } from '@blockera/controls';

/**
 * Schema / sanitize may keep `{ value: repeater }`. Hover overlay maps are unwrapped.
 * Variable addons (`valueType: 'variable'`) stay wrapped.
 *
 * @param {mixed} value Repeater map, tuples, array, or `{ value }`.
 * @return {mixed} Unwrapped repeater payload.
 */
export function unwrapRepeaterAttr(value: mixed): mixed {
	if (value == null || typeof value !== 'object' || Array.isArray(value)) {
		return value;
	}

	const record: Object = value;
	if (record.valueType === 'variable') {
		return value;
	}

	if (!('value' in record)) {
		return value;
	}

	const otherKeys = Object.keys(record).filter(
		(key) =>
			key !== 'value' && key !== 'valueType' && key !== 'settings'
	);
	if (otherKeys.length) {
		return value;
	}

	return unwrapRepeaterAttr(record.value);
}

function getTransformEntries(blockeraTransformRepeater: mixed): mixed {
	const repeater = unwrapRepeaterAttr(blockeraTransformRepeater);

	if (
		!repeater ||
		(typeof repeater === 'object' &&
			!Array.isArray(repeater) &&
			!Object.keys(repeater).length)
	) {
		return [];
	}

	if (
		Array.isArray(repeater) &&
		repeater.length &&
		Array.isArray(repeater[0])
	) {
		return repeater;
	}

	if (Array.isArray(repeater) && !repeater.length) {
		return [];
	}

	return getSortedRepeater(repeater);
}

/**
 * @param {Object|Array} blockeraTransformRepeater Repeater map or sorted `[key, item]` tuples (same as `styles.js` after resolving variable vs store).
 * @return {string} Space-joined transform functions, or empty.
 */
export function joinTransformCssFromRepeaterMap(
	blockeraTransformRepeater: Object | Array<mixed>
): string {
	const sorted: Array<mixed> = (getTransformEntries(
		blockeraTransformRepeater
	): any);
	const parts: string[] = [];

	sorted.forEach((entry: mixed) => {
		if (!Array.isArray(entry)) {
			return;
		}
		const row: any = entry[1];
		if (!row || row.isVisible === false) {
			return;
		}

		switch (row.type) {
			case 'move':
				parts.push(
					`translate3d(${getValueAddonRealValue(
						row['move-x']
					)}, ${getValueAddonRealValue(
						row['move-y']
					)}, ${getValueAddonRealValue(row['move-z'])})`
				);
				break;

			case 'scale':
				parts.push(
					`scale3d(${getValueAddonRealValue(
						row.scale
					)}, ${getValueAddonRealValue(row.scale)}, 50%)`
				);
				break;

			case 'rotate':
				parts.push(
					`rotateX(${getValueAddonRealValue(
						row['rotate-x']
					)}) rotateY(${getValueAddonRealValue(
						row['rotate-y']
					)}) rotateZ(${getValueAddonRealValue(row['rotate-z'])})`
				);
				break;

			case 'skew':
				parts.push(
					`skew(${getValueAddonRealValue(
						row['skew-x']
					)}, ${getValueAddonRealValue(row['skew-y'])})`
				);
				break;
			default:
				break;
		}
	});

	return parts.join(' ');
}
