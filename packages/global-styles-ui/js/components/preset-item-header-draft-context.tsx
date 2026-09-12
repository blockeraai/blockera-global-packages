/**
 * External dependencies
 */
import {
	createContext,
	useContext,
	useMemo,
	useSyncExternalStore,
	type ReactNode,
} from '@wordpress/element';

/**
 * Internal dependencies
 */
import {
	createPresetItemHeaderDraftStore,
	mergePresetItemWithHeaderDraft,
	type PresetItemHeaderDraftStore,
} from './preset-item-header-draft-store';

const PresetItemHeaderDraftContext =
	createContext<PresetItemHeaderDraftStore | null>(null);

export function PresetItemHeaderDraftProvider({
	children,
}: {
	children: ReactNode;
}) {
	const existing = useContext(PresetItemHeaderDraftContext);
	const created = useMemo(
		() => (existing ? null : createPresetItemHeaderDraftStore()),
		[existing]
	);
	const store = existing ?? created;

	if (existing) {
		return children;
	}

	return (
		<PresetItemHeaderDraftContext.Provider value={store}>
			{children}
		</PresetItemHeaderDraftContext.Provider>
	);
}

export function usePresetItemHeaderDraftStore(): PresetItemHeaderDraftStore | null {
	return useContext(PresetItemHeaderDraftContext);
}

export function useLivePresetRepeaterHeaderItem<T>(
	item: T,
	itemId: string | number
): T {
	const store = usePresetItemHeaderDraftStore();
	const key = String(itemId);
	const draft = useSyncExternalStore(
		(onStoreChange) =>
			store ? store.subscribe(key, onStoreChange) : () => undefined,
		() => store?.get(key) ?? null,
		() => null
	);

	return mergePresetItemWithHeaderDraft(item, draft);
}
