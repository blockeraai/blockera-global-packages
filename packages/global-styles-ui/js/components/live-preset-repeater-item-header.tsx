/**
 * External dependencies
 */
import type { ComponentType } from 'react';

/**
 * Internal dependencies
 */
import { useLivePresetRepeaterHeaderItem } from './preset-item-header-draft-context';

export function LivePresetRepeaterItemHeader({
	Header,
	...props
}: {
	Header: ComponentType<Record<string, unknown>>;
	item: unknown;
	itemId: string | number;
	[key: string]: unknown;
}) {
	const item = useLivePresetRepeaterHeaderItem(props.item, props.itemId);

	return <Header {...props} item={item} />;
}
