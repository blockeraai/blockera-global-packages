import { createReduxStore, register } from '@wordpress/data';
import reducer from './reducer';
import * as actions from './actions';
import * as selectors from './selectors';
import { STORE_NAME } from './constants';

export const store = createReduxStore(STORE_NAME, {
	reducer,
	actions,
	selectors,
});

register(store);

export { STORE_NAME, ANNOTATION_SOURCE, SEARCH_REPLACE_TEST_ID } from './constants';
export * from './actions';
export * from './selectors';
