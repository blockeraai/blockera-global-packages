/**
 * Blockera dependencies
 */
import { isEquals } from '@blockera/utils';

/**
 * Skip updateEditorSettings when the overlay we would write is unchanged.
 */
export function shouldSkipGlobalStylesEditorSettingsUpdate(
	lastNextFeatures: unknown,
	nextFeatures: unknown,
	lastSupplementalCss: string,
	supplementalCss: string
): boolean {
	if (lastNextFeatures == null) {
		return false;
	}

	return (
		lastSupplementalCss === supplementalCss &&
		isEquals(lastNextFeatures, nextFeatures)
	);
}

const IFRAME_MOUNT_ROOT_SELECTORS = [
	'.interface-interface-skeleton',
	'.editor-visual-editor',
	'.edit-site-visual-editor',
];

/**
 * Watch the editor chrome for iframe mount, not the whole document (inspector).
 */
export function resolveIframeMountObserverRoot(
	doc: Document = document
): Element {
	for (const selector of IFRAME_MOUNT_ROOT_SELECTORS) {
		const node = doc.querySelector(selector);
		if (node) {
			return node;
		}
	}

	return doc.body ?? doc.documentElement;
}
