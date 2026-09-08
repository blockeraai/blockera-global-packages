/**
 * External dependencies
 */
import { useCallback, useRef } from '@wordpress/element';

/**
 * Always-current preset row for persist patches, without putting the row
 * object on `useCallback` dependency lists.
 */
export function useLatestPresetItem<T>(item: T): () => T {
	const itemRef = useRef(item);
	itemRef.current = item;

	return useCallback(() => itemRef.current, []);
}
