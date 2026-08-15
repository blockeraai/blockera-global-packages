// @flow

/**
 * External dependencies
 */
import createSelector from 'rememo';

/**
 * Internal dependencies
 */
import type { TProductDetails } from '../types';

/**
 * Get all registered products details keyed by slug.
 *
 * @param {Object} state the store state.
 * @return {{[key: string]: TProductDetails}} the registered products.
 */
export function getProducts(state: Object): { [key: string]: TProductDetails } {
	return state.products;
}

/**
 * Get a registered product details.
 *
 * @param {Object} state the store state.
 * @param {string} slug the product slug.
 * @return {TProductDetails|void} the product details or undefined when not registered.
 */
export function getProduct(
	state: Object,
	slug: string
): TProductDetails | void {
	return state.products[slug];
}

/**
 * Is a product registered?
 *
 * @param {Object} state the store state.
 * @param {string} slug the product slug.
 * @return {boolean} true when the product is registered.
 */
export function hasProduct(state: Object, slug: string): boolean {
	return undefined !== state.products[slug];
}

/**
 * Get a registered product version.
 *
 * @param {Object} state the store state.
 * @param {string} slug the product slug.
 * @return {string|void} the product version or undefined when not registered.
 */
export function getProductVersion(state: Object, slug: string): string | void {
	return state.products[slug]?.version;
}

/**
 * Get registered products of the given type ("plugin" or "theme").
 * Memoized so consumers (useSelect) keep a stable reference between renders.
 */
export const getProductsByType: Function = createSelector(
	(state: Object, type: string): { [key: string]: TProductDetails } => {
		const products: { [key: string]: TProductDetails } = {};

		for (const slug in state.products) {
			if (type === state.products[slug].type) {
				products[slug] = state.products[slug];
			}
		}

		return products;
	},
	(state: Object) => [state.products]
);

/**
 * Get registered products with the given lifecycle status.
 * Memoized so consumers (useSelect) keep a stable reference between renders.
 */
export const getProductsByStatus: Function = createSelector(
	(state: Object, status: string): { [key: string]: TProductDetails } => {
		const products: { [key: string]: TProductDetails } = {};

		for (const slug in state.products) {
			if (status === state.products[slug].status) {
				products[slug] = state.products[slug];
			}
		}

		return products;
	},
	(state: Object) => [state.products]
);

/**
 * Get the registered companion plugin product, if any.
 *
 * @param {Object} state the store state.
 * @return {TProductDetails|void} the companion product details or undefined.
 */
export function getCompanionProduct(state: Object): TProductDetails | void {
	for (const slug in state.products) {
		if (state.products[slug].isCompanion) {
			return state.products[slug];
		}
	}

	return undefined;
}

/**
 * Is the companion plugin registered and active?
 *
 * @param {Object} state the store state.
 * @return {boolean} true when an active companion product is registered.
 */
export function isCompanionActive(state: Object): boolean {
	const companion = getCompanionProduct(state);

	return undefined !== companion && 'active' === companion.status;
}
