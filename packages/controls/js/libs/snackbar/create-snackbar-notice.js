// @flow

/**
 * External dependencies
 */
import { dispatch } from '@wordpress/data';
import { store as noticesStore } from '@wordpress/notices';

/**
 * Internal dependencies
 */
import { BLOCKERA_SNACKBAR_CONTEXT } from './constants';

function getNoticesDispatch(): Object {
	const wpDispatch = window?.wp?.data?.dispatch?.('core/notices');

	if (wpDispatch) {
		return wpDispatch;
	}

	return dispatch(noticesStore);
}

export function createSnackbarNotice({
	content,
	id,
	context = BLOCKERA_SNACKBAR_CONTEXT,
	status = 'success',
	icon,
	actions,
}: {
	content: string,
	id?: string,
	context?: string,
	status?: 'success' | 'error' | 'info' | 'warning',
	icon?: mixed,
	actions?: Array<Object>,
}): void {
	const options: Object = {
		type: 'snackbar',
		context,
	};

	if (id) {
		options.id = id;
	}

	if (undefined !== icon) {
		options.icon = icon;
	}

	if (actions) {
		options.actions = actions;
	}

	const noticesDispatch = getNoticesDispatch();

	if ('error' === status) {
		noticesDispatch.createErrorNotice(content, options);
		return;
	}

	if ('warning' === status) {
		noticesDispatch.createWarningNotice(content, options);
		return;
	}

	if ('info' === status) {
		noticesDispatch.createInfoNotice(content, options);
		return;
	}

	noticesDispatch.createSuccessNotice(content, options);
}
