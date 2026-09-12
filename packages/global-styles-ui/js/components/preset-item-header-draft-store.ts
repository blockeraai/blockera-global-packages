type HeaderDraft = Record<string, unknown>;
type Listener = () => void;

export type PresetItemHeaderDraftStore = {
	get: (itemId: string) => HeaderDraft | null;
	patch: (itemId: string, next: HeaderDraft) => void;
	subscribe: (itemId: string, listener: Listener) => () => void;
};

/**
 * Per-item draft overlay for repeater headers. Subscribers listen to one item
 * id so sibling rows do not re-render on each keystroke.
 */
export function createPresetItemHeaderDraftStore(): PresetItemHeaderDraftStore {
	const drafts = new Map<string, HeaderDraft>();
	const listeners = new Map<string, Set<Listener>>();

	const notify = (itemId: string) => {
		listeners.get(itemId)?.forEach((listener) => listener());
	};

	return {
		get(itemId) {
			return drafts.get(itemId) ?? null;
		},
		patch(itemId, next) {
			const prev = drafts.get(itemId);
			const merged = { ...(prev || {}), ...next };

			if (prev) {
				const mergedKeys = Object.keys(merged);
				const prevKeys = Object.keys(prev);

				if (
					mergedKeys.length === prevKeys.length &&
					mergedKeys.every((key) => prev[key] === merged[key])
				) {
					return;
				}
			}

			drafts.set(itemId, merged);
			notify(itemId);
		},
		subscribe(itemId, listener) {
			let set = listeners.get(itemId);

			if (!set) {
				set = new Set();
				listeners.set(itemId, set);
			}

			set.add(listener);

			return () => {
				set?.delete(listener);
			};
		},
	};
}

export function mergePresetItemWithHeaderDraft<T>(
	item: T,
	draft: HeaderDraft | null
): T {
	if (!draft || item === null || typeof item !== 'object') {
		return item;
	}

	return { ...(item as object), ...draft } as T;
}
