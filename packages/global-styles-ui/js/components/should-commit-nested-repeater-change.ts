/**
 * Nested preset controls (box shadow, filter) write the inner repeater store
 * on every field keystroke. Persist the outer row for type, visibility, or
 * reorder changes. Add, clone, delete, and layer open/close stay staged
 * until the preset editor closes.
 */

function itemKeys(record: Record<string, unknown> | null | undefined): string[] {
	if (!record || typeof record !== 'object') {
		return [];
	}

	return Object.keys(record)
		.filter((key) => {
			const row = record[key];
			return row !== null && typeof row === 'object' && !Array.isArray(row);
		})
		.sort();
}

function rowIsVisible(row: unknown): boolean {
	if (!row || typeof row !== 'object' || Array.isArray(row)) {
		return true;
	}

	const visible = (row as { isVisible?: unknown }).isVisible;

	return visible !== false;
}

function rowOrder(row: unknown): unknown {
	if (!row || typeof row !== 'object' || Array.isArray(row)) {
		return undefined;
	}

	return (row as { order?: unknown }).order;
}

/**
 * @param {Record<string, unknown> | null | undefined} prev Previous inner repeater record.
 * @param {Record<string, unknown> | null | undefined} next Next inner repeater record.
 * @return {boolean} True when the outer preset row should persist now.
 */
export function shouldCommitNestedRepeaterChange(
	prev: Record<string, unknown> | null | undefined,
	next: Record<string, unknown> | null | undefined
): boolean {
	if (!prev) {
		return true;
	}

	const prevKeys = itemKeys(prev);
	const nextKeys = itemKeys(next);

	if (prevKeys.length !== nextKeys.length) {
		return false;
	}

	for (let i = 0; i < prevKeys.length; i++) {
		if (prevKeys[i] !== nextKeys[i]) {
			return true;
		}
	}

	for (let i = 0; i < nextKeys.length; i++) {
		const key = nextKeys[i];

		if (rowIsVisible(prev[key]) !== rowIsVisible(next?.[key])) {
			return true;
		}

		if (rowOrder(prev[key]) !== rowOrder(next?.[key])) {
			return true;
		}
	}

	return false;
}
