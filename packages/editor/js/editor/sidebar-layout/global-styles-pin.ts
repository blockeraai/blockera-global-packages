export const GLOBAL_STYLES_PIN_SELECTOR =
	'button[aria-controls="edit-site:global-styles"]';

export const SETTINGS_DOCUMENT_AREA = 'edit-post/document';
export const SETTINGS_BLOCK_AREA = 'edit-post/block';

/**
 * Gutenberg's Styles pin toggles the complementary area off when it is already
 * active. Blockera keeps the physical dock open, so that click should switch
 * back to Settings instead of leaving an empty pane.
 */
export function isGlobalStylesPinDeactivateEvent(event: {
	target: EventTarget | null;
}): boolean {
	const target = event.target;
	if (!(target instanceof Element)) {
		return false;
	}

	const button = target.closest(GLOBAL_STYLES_PIN_SELECTOR);
	if (!(button instanceof HTMLElement)) {
		return false;
	}

	return (
		button.getAttribute('aria-expanded') === 'true' ||
		button.classList.contains('is-pressed')
	);
}

export function fallbackSettingsComplementaryArea(
	hasBlockSelection: boolean
): typeof SETTINGS_BLOCK_AREA | typeof SETTINGS_DOCUMENT_AREA {
	return hasBlockSelection ? SETTINGS_BLOCK_AREA : SETTINGS_DOCUMENT_AREA;
}
