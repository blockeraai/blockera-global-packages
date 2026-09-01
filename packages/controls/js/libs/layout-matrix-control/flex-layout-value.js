// @flow

export type FlexLayoutCssAxes = {
	flexAlign: string,
	flexJustify: string,
};

function isFlexLayoutRecord(value: mixed): boolean %checks {
	return value != null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(value: Object, key: string): boolean {
	return Object.getOwnPropertyDescriptor(value, key) != null;
}

function axisString(value: mixed): string {
	return typeof value === 'string' ? value : '';
}

/**
 * Legacy saved shape: screen-axis `alignItems` / `justifyContent` and no new keys
 * (empty `flexAlign` injected by default merge still counts as legacy).
 */
export function isLegacyFlexLayout(value: mixed): boolean {
	if (!isFlexLayoutRecord(value)) {
		return false;
	}

	const record: Object = value;
	const hasOld =
		hasOwn(record, 'alignItems') || hasOwn(record, 'justifyContent');

	if (!hasOld) {
		return false;
	}

	const hasNew =
		hasOwn(record, 'flexAlign') || hasOwn(record, 'flexJustify');

	if (!hasNew) {
		return true;
	}

	return !record.flexAlign && !record.flexJustify;
}

/**
 * Column legacy keys are screen-axis values and must be swapped into CSS
 * properties, except values that already lived on a CSS-only axis:
 * - `alignItems: stretch` (cross-axis only)
 * - `justifyContent: space-around` / `space-between` (main-axis only)
 */
function shouldSwapLegacyColumnAxes(
	direction: string,
	alignItems: string,
	justifyContent: string
): boolean {
	if (direction !== 'column') {
		return false;
	}

	if (alignItems === 'stretch') {
		return false;
	}

	return (
		justifyContent !== 'space-around' &&
		justifyContent !== 'space-between'
	);
}

/**
 * Persist shape: `flexAlign` → align-items, `flexJustify` → justify-content.
 * Column legacy values are swapped so CSS matches the unpublished control,
 * except stretch / space-around / space-between.
 */
export function migrateFlexLayoutToStored(value: mixed): Object {
	if (!isFlexLayoutRecord(value)) {
		return {
			direction: 'row',
			flexAlign: '',
			flexJustify: '',
		};
	}

	const record: Object = value;
	const direction =
		typeof record.direction === 'string' && record.direction
			? record.direction
			: 'row';

	let flexAlign = axisString(record.flexAlign);
	let flexJustify = axisString(record.flexJustify);

	if (isLegacyFlexLayout(record)) {
		const alignItems = axisString(record.alignItems);
		const justifyContent = axisString(record.justifyContent);

		if (shouldSwapLegacyColumnAxes(direction, alignItems, justifyContent)) {
			flexAlign = justifyContent;
			flexJustify = alignItems;
		} else {
			flexAlign = alignItems;
			flexJustify = justifyContent;
		}
	}

	const next: Object = {
		...record,
		direction,
		flexAlign,
		flexJustify,
	};

	delete next.alignItems;
	delete next.justifyContent;

	return next;
}

/**
 * CSS axes from stored legacy or new keys. Does not persist.
 */
export function resolveFlexLayoutCssAxes(value: mixed): FlexLayoutCssAxes {
	const stored = migrateFlexLayoutToStored(value);

	return {
		flexAlign: axisString(stored.flexAlign),
		flexJustify: axisString(stored.flexJustify),
	};
}
