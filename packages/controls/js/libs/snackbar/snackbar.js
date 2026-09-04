// @flow

/**
 * External dependencies
 */
import type { MixedElement } from 'react';
import { Snackbar as WPSnackbar } from '@wordpress/components';

/**
 * Blockera dependencies
 */
import { componentClassNames } from '@blockera/classnames';

/**
 * Internal dependencies
 */
import { DefaultSnackbarIcon } from './default-icon';
import './style.scss';

export default function Snackbar({
	icon,
	className,
	children,
	...props
}: Object): MixedElement {
	const resolvedIcon =
		undefined === icon || null === icon ? (
			<DefaultSnackbarIcon />
		) : (
			icon
		);

	return (
		<WPSnackbar
			icon={resolvedIcon}
			className={componentClassNames('snackbar', className)}
			{...props}
		>
			{children}
		</WPSnackbar>
	);
}
