/**
 * Persist echoes strip `isOpen` from nested layers. Keep an already-open
 * editor open when the saved record comes back (including type-key rename).
 */
function isOpenRow(row: unknown): boolean {
	return (
		!!row &&
		typeof row === 'object' &&
		!Array.isArray(row) &&
		(row as { isOpen?: unknown }).isOpen === true
	);
}

function withOpen(row: unknown): Record<string, unknown> {
	return {
		...(row as Record<string, unknown>),
		isOpen: true,
	};
}

export function preserveNestedRepeaterOpenState(
	persisted: Record<string, unknown>,
	live: Record<string, unknown>
): Record<string, unknown> {
	const next: Record<string, unknown> = { ...persisted };
	const persistedKeys = Object.keys(persisted);
	const liveKeys = Object.keys(live);

	for (let i = 0; i < persistedKeys.length; i++) {
		const key = persistedKeys[i];

		if (isOpenRow(live[key])) {
			next[key] = withOpen(persisted[key]);
		}
	}

	// Type-key rename mounts a new RepeaterItem. onChange is cleaned so
	// `live` often has no `isOpen`, but the type select lives in the open
	// editor — keep that editor open on the new key.
	if (
		liveKeys.length === 1 &&
		persistedKeys.length === 1 &&
		liveKeys[0] !== persistedKeys[0]
	) {
		next[persistedKeys[0]] = withOpen(persisted[persistedKeys[0]]);
	}

	return next;
}
