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
	'.edit-site-visual-editor',
	'.editor-visual-editor',
	'.interface-interface-skeleton__content',
	'.interface-interface-skeleton',
];

/**
 * Watch the canvas for iframe mount, not the inspector or sidebar docks.
 * `.interface-interface-skeleton` includes Global Styles; prefer the visual
 * editor so inspector color/preset mutations do not walk added nodes.
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

function nodeAddedIframe(node: Node): boolean {
	if (node.nodeName === 'IFRAME') {
		return true;
	}

	if (node.nodeType !== 1) {
		return false;
	}

	return (node as Element).getElementsByTagName('iframe').length > 0;
}

/**
 * True when a childList observer saw a canvas iframe mount. Avoids
 * spreading `addedNodes` and `querySelector` on inspector ticks.
 */
export function mutationsAddedIframe(mutations: MutationRecord[]): boolean {
	for (let i = 0; i < mutations.length; i++) {
		const nodes = mutations[i].addedNodes;
		for (let j = 0; j < nodes.length; j++) {
			if (nodeAddedIframe(nodes[j])) {
				return true;
			}
		}
	}

	return false;
}
