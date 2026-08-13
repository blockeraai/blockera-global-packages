// @flow

/**
 * Subscribe a derived URL-state value to Site Editor navigations.
 *
 * Built on `useSiteEditorNavigate` (patched pushState/replaceState + popstate
 * + custom navigate event), so it also catches core router navigations that
 * do not fire a popstate — unlike the raw `popstate` listeners it replaces.
 */

/**
 * External dependencies
 */
import { useCallback, useRef, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { useSiteEditorNavigate } from './history-patch';

export function useSiteEditorUrlState<T>(read: () => T): T {
	const [state, setState] = useState<T>(read);

	// Latest reader without re-subscribing the navigate listener.
	const readRef = useRef(read);
	readRef.current = read;

	const sync = useCallback(() => {
		setState(readRef.current());
	}, []);

	useSiteEditorNavigate(sync);

	return state;
}
