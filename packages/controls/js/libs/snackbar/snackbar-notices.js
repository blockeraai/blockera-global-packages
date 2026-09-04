// @flow

/**
 * External dependencies
 */
import type { MixedElement } from 'react';
import { createPortal, useEffect, useState } from '@wordpress/element';

/**
 * Internal dependencies
 */
import SnackbarList from './snackbar-list';
import { DefaultSnackbarIcon } from './default-icon';
import { BLOCKERA_SNACKBAR_CONTEXT } from './constants';
import './style.scss';

const MAX_VISIBLE_NOTICES = -3;

function getWpData(): Object | null {
	return window?.wp?.data || null;
}

function serializeNotices(notices: ?Array<Object>): string {
	if (!Array.isArray(notices) || 0 === notices.length) {
		return '';
	}

	return notices
		.map(
			(notice) =>
				`${notice.id || ''}:${notice.status || ''}:${notice.content || ''}:${notice.type || ''}`
		)
		.join('|');
}

function readNotices(context: string): Array<Object> {
	try {
		return getWpData()?.select?.('core/notices')?.getNotices?.(context) || [];
	} catch (error) {
		return [];
	}
}

export default function SnackbarNotices({
	className,
	context = BLOCKERA_SNACKBAR_CONTEXT,
}: {
	className?: string,
	context?: string,
}): MixedElement {
	const [notices, setNotices] = useState(() => readNotices(context));

	useEffect(() => {
		const data = getWpData();

		if (!data?.subscribe) {
			return;
		}

		let isMounted = true;

		const sync = () => {
			const next = readNotices(context);

			if (!isMounted) {
				return;
			}

			setNotices((current) => {
				if (serializeNotices(current) === serializeNotices(next)) {
					return current;
				}

				return next;
			});
		};

		sync();

		const unsubscribe = data.subscribe(sync);

		return () => {
			isMounted = false;
			unsubscribe();
		};
	}, [context]);

	const snackbarNotices = (notices || [])
		.filter(({ type }) => 'snackbar' === type)
		.slice(MAX_VISIBLE_NOTICES)
		.map((notice) => ({
			...notice,
			icon:
				undefined !== notice.icon && null !== notice.icon ? (
					notice.icon
				) : (
					<DefaultSnackbarIcon />
				),
		}));

	const handleRemove = (noticeId: string) => {
		try {
			getWpData()?.dispatch?.('core/notices')?.removeNotice?.(
				noticeId,
				context
			);
		} catch (error) {
			// Notices store may be unavailable during editor teardown.
		}
	};

	const list = (
		<div data-test={'blockera-snackbar-list'}>
			{0 < snackbarNotices.length ? (
				<SnackbarList
					notices={snackbarNotices}
					className={className}
					onRemove={handleRemove}
				/>
			) : null}
		</div>
	);

	if ('undefined' === typeof document || !document.body) {
		return list;
	}

	return createPortal(list, document.body);
}
