/**
 * External dependencies
 */
import type { ElementType } from 'react';

/**
 * Internal dependencies
 */
import { useLivePresetRepeaterHeaderItem } from './preset-item-header-draft-context';

export function LivePresetRepeaterItemHeader({
	Header,
	...props
}: {
	Header: ElementType;
	[key: string]: unknown;
}) {
	const item = useLivePresetRepeaterHeaderItem(
		props.item,
		props.itemId as string | number
	);

	return <Header {...props} item={item} />;
}
