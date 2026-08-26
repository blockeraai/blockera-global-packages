// @flow

/**
 * External dependencies
 */
import { dispatch, select } from '@wordpress/data';
import domReady from '@wordpress/dom-ready';

/**
 * Internal dependencies
 */
import { STORE_NAME } from './store';
import type { TProductDetails } from './types';

/**
 * Bootstrap server-side registered products details into the store api.
 *
 * The payload is produced by the php package (see php/functions.php →
 * blockera_products_l10n) and exposed as `window.blockeraProductsData`.
 *
 * @param {{[key: string]: TProductDetails}} products the products details keyed by slug.
 */
export function unstableBootstrapServerSideProducts(products: {
	[key: string]: TProductDetails,
}) {
	const { registerProducts } = dispatch(STORE_NAME);

	registerProducts(products);
}

export * from './store';
export * from './types';

domReady(() => {
	// Bootstrap products details localized by the php registry.
	if (window.blockeraProductsData?.products) {
		unstableBootstrapServerSideProducts(
			window.blockeraProductsData.products
		);
	}

	// Stable, version-independent bridge shared around blockera and blockera-admin contexts.
	window.blockeraProducts = {
		select: select(STORE_NAME),
		unstableBootstrapServerSideProducts,
	};
});
