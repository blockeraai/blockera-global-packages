/**
 * WordPress dependencies
 */
import { _x } from '@wordpress/i18n';

/**
 * Blockera dependencies
 */
import { classNames } from '@blockera/classnames';

export default function SearchReplaceCount({
	current,
	total,
	query,
	emptyLabel,
	className,
	'data-test': dataTest,
}) {
	const hasQuery = Boolean(typeof query === 'string' && query.trim());
	const isEmptySearch = hasQuery && !total;

	if (!total) {
		return (
			<span
				className={classNames(className, {
					'blockera-search-replace-count--empty': isEmptySearch,
				})}
				data-test={dataTest}
			>
				{emptyLabel}
			</span>
		);
	}

	return (
		<span className={className} data-test={dataTest}>
			{current}
			{' '}
			<span className="blockera-search-replace-count__of">
				{_x('of', 'search match count: 1 of 12', 'blockera')}
			</span>
			{' '}
			{total}
		</span>
	);
}
