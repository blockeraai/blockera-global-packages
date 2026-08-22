// @flow

/**
 * The Blockera product details shape.
 *
 * Mirrors `product-details.schema.json` at the package root.
 */
export type TProductDetails = {
	/**
	 * Public name of the Blockera product.
	 */
	name: string,
	/**
	 * A short summary of the product's purpose.
	 */
	description?: string,
	/**
	 * Unique identifier for the product (plugin or theme slug).
	 */
	slug: string,
	/**
	 * Version of the product, semver if possible.
	 */
	version: string,
	/**
	 * Type of product.
	 */
	type: 'plugin' | 'theme',
	/**
	 * Whether the product is a companion plugin.
	 */
	isCompanion: boolean,
	/**
	 * Activation or lifecycle status.
	 */
	status: 'active' | 'inactive' | 'deprecated' | 'beta' | 'unreleased',
	/**
	 * Author or company responsible for the product.
	 */
	author?: string,
	/**
	 * Public homepage for the Blockera product.
	 */
	homepage?: string,
	/**
	 * Various asset URLs relevant to the product.
	 */
	assets?: {
		logo?: string,
		screenshot?: string,
		[key: string]: any,
	},
	/**
	 * System requirements for the product.
	 */
	requires?: {
		wordpress?: string,
		php?: string,
	},
	/**
	 * Other Blockera or WP plugins/themes required.
	 */
	dependencies?: Array<string>,
	/**
	 * License name (e.g. GPLv2, MIT, etc).
	 */
	license?: string,
	/**
	 * Additional custom meta for the product.
	 */
	meta?: Object,
};
