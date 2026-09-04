// @flow

/**
 * External dependencies
 */
import type { MixedElement } from 'react';
import { SnackbarList as WPSnackbarList } from '@wordpress/components';

/**
 * Blockera dependencies
 */
import { componentClassNames } from '@blockera/classnames';

export default function SnackbarList({
	className,
	...props
}: Object): MixedElement {
	return (
		<WPSnackbarList
			className={componentClassNames('snackbar-list', className)}
			{...props}
		/>
	);
}
