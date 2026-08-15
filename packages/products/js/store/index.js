// @flow

/**
 * External dependencies
 */
import { createReduxStore, register } from '@wordpress/data';

/**
 * Internal dependencies
 */
import reducer from './reducers';
import * as actions from './actions';
import { STORE_NAME } from './constants';
import * as selectors from './selectors';

const storeConfig = () => ({
	reducer,
	actions,
	selectors,
});

/**
 * Store definition for the blockera products namespace.
 *
 * Shared around blockera (editor) and blockera-admin contexts,
 * both bundles select from this single registered store.
 *
 * @see https://github.com/WordPress/gutenberg/blob/HEAD/packages/data/README.md#createReduxStore
 */
export const store: Object = createReduxStore(STORE_NAME, storeConfig());

register(store);

export * from './actions';
export * from './constants';
export * from './selectors';
