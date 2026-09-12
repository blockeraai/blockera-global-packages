/**
 * Blockera dependencies
 */
import { isEquals } from '@blockera/utils';

/**
 * Repeater chrome that is not shown in the preset item editor.
 * Sibling persist often clones these flags onto every row.
 */
export const PRESET_ROW_CHROME_KEYS: ReadonlySet<string> = new Set([
	'renderRepeaterItem',
	'hasVariations',
	'listViewCompactShades',
	'selectable',
	'isSelected',
	'order',
]);

/**
 * Whether two repeater rows match for the item editor (slug + visible fields).
 */
export function arePresetRepeaterItemEditorEqual(
	previous: unknown,
	next: unknown
): boolean {
	if (previous === next) {
		return true;
	}

	if (
		previous == null ||
		next == null ||
		typeof previous !== 'object' ||
		typeof next !== 'object'
	) {
		return isEquals(previous, next);
	}

	const previousRecord = previous as Record<string, unknown>;
	const nextRecord = next as Record<string, unknown>;
	const keys = new Set([
		...Object.keys(previousRecord),
		...Object.keys(nextRecord),
	]);

	for (const key of keys) {
		if (PRESET_ROW_CHROME_KEYS.has(key)) {
			continue;
		}

		if (!isEquals(previousRecord[key], nextRecord[key])) {
			return false;
		}
	}

	return true;
}
