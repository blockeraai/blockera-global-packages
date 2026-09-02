/**
 * WordPress dependencies
 */
import { dispatch, select } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { store as keyboardShortcutsStore } from '@wordpress/keyboard-shortcuts';

/**
 * Core defaults `core/editor/toggle-sidebar` to Cmd+Shift+, (comma). Blockera
 * unregisters that shortcut so Gutenberg's handler does not toggle Settings.
 * Cmd+Shift+. is registered as Blockera's physical right-dock toggle.
 *
 * The Site Editor registers core's shortcut after Blockera's first run; subscribe
 * to the keyboard-shortcuts store and re-call this when core restores it.
 */
export function applyBlockeraPrimarySidebarShortcutSwap(): void {
	const { unregisterShortcut, registerShortcut } = dispatch(
		keyboardShortcutsStore
	);

	unregisterShortcut('core/editor/toggle-sidebar');
	registerShortcut({
		name: 'blockera/sidebars/toggle-sidebar',
		category: 'blockera',
		description: __(
			'Show or hide the primary sidebar (right side).',
			'blockera'
		),
		keyCombination: {
			modifier: 'primaryShift',
			character: '.',
		},
		icon: 'arrow-right',
	} as Parameters<typeof registerShortcut>[0]);
}

/**
 * True when Gutenberg's settings shortcut is bound again (any combo).
 */
export function isCoreToggleSidebarRegistered(): boolean {
	const combo = (
		select(keyboardShortcutsStore) as {
			getShortcutKeyCombination: (
				name: string
			) => { modifier?: string; character?: string } | undefined;
		}
	).getShortcutKeyCombination('core/editor/toggle-sidebar');

	return !!combo?.character;
}
