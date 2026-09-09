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
	item: unknown;
	itemId: string | number;
	[key: string]: unknown;
}) {
	const item = useLivePresetRepeaterHeaderItem(props.item, props.itemId);

	return <Header {...props} item={item} />;
}
