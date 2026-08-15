// @flow

/**
 * Internal dependencies
 */
import type { TProductDetails } from '../types';

/**
 * Register a single product details into the store.
 *
 * @param {TProductDetails} product the product details (see product-details.schema.json).
 * @return {Object} the action object.
 */
export function registerProduct(product: TProductDetails): Object {
	return {
		type: 'REGISTER_PRODUCT',
		product,
	};
}

/**
 * Register multiple products details into the store in a single state update.
 *
 * @param {{[key: string]: TProductDetails}} products the products details keyed by slug.
 * @return {Object} the action object.
 */
export function registerProducts(products: {
	[key: string]: TProductDetails,
}): Object {
	return {
		type: 'REGISTER_PRODUCTS',
		products,
	};
}

/**
 * Unregister a product from the store.
 *
 * @param {string} slug the product slug.
 * @return {Object} the action object.
 */
export function unregisterProduct(slug: string): Object {
	return {
		type: 'UNREGISTER_PRODUCT',
		slug,
	};
}
