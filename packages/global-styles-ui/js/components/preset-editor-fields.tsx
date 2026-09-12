/**
 * External dependencies
 */
import type { ReactNode } from 'react';
import { memo } from '@wordpress/element';

/**
 * Blockera dependencies
 */
import { isEquals } from '@blockera/utils';

export type PresetEditorFieldsProps = {
	/**
	 * Slug plus the fields the inner editor actually shows (or liveRecord).
	 * When this value is equal, the previous inner control tree is kept.
	 */
	signature: unknown;
	children: ReactNode;
};

function PresetEditorFieldsComponent({
	children,
}: PresetEditorFieldsProps): ReactNode {
	return children;
}

/**
 * Keep type-specific inner controls mounted across sibling row clones.
 * Compares `signature` only so new `children` elements are discarded when
 * the visible editor values did not change.
 */
export const PresetEditorFields = memo(
	PresetEditorFieldsComponent,
	(previous, next) => isEquals(previous.signature, next.signature)
);
