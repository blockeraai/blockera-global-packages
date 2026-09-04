// @flow

/**
 * External dependencies
 */
import type { MixedElement } from 'react';

/**
 * Blockera dependencies
 */
import { Icon } from '@blockera/icons';

export function DefaultSnackbarIcon(): MixedElement {
	return (
		<Icon
			library={'blockera'}
			icon={'blockera'}
			iconSize={18}
			className={'blockera-component-snackbar__brand-icon'}
		/>
	);
}
