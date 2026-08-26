/**
 * External dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import {
	memo,
	useState,
	useContext,
	useMemo,
	useRef,
	useCallback,
} from '@wordpress/element';
import { SearchControl as WPSearchControl } from '@wordpress/components';
import { useDebounce } from '@wordpress/compose';

/**
 * Blockera dependencies
 */
import {
	controlClassNames,
	controlInnerClassNames,
} from '@blockera/classnames';
import { Icon, useIconPickerLibrariesReady } from '@blockera/icons';

/**
 * Internal dependencies
 */
import { IconContext } from '../../context';
import { getIconLibraryLockType, getLibraryIcons } from '../../utils';
import { useDraftIconHighlight } from '../../hooks/use-draft-icon-highlight';
import { useIconGridWindow } from '../../hooks/use-icon-grid-window';
import { FeatureWrapper } from '../../../feature-wrapper';
import {
	DEFAULT_LIBRARIES,
	formatIconCount,
	getLibrariesIconCount,
} from './icon-libraries';
import { SEARCH_FREE_LIMIT, SEARCH_PRO_LIMIT } from './constants';
import IconGrid from './icon-grid';

const SearchResultsGrid = memo(function SearchResultsGrid({
	records,
	lockType = 'none',
	resetKey,
	windowEnabled,
}) {
	const gridRef = useRef(null);
	const {
		startIndex,
		endIndex,
		remainingCount,
		moreHintRef,
		spacerBeforePx,
		spacerAfterPx,
	} = useIconGridWindow({
		gridRef,
		total: records.length,
		limitToPreview: false,
		windowEnabled,
		resetKey,
	});

	const { handleIconSelect, handleLibraryIconQuickSelect, draftLibraryIcon } =
		useContext(IconContext);

	useDraftIconHighlight(
		gridRef,
		draftLibraryIcon,
		`${resetKey}:${startIndex}:${endIndex}`
	);

	const grid = (
		<IconGrid
			gridRef={gridRef}
			records={records}
			startIndex={startIndex}
			endIndex={endIndex}
			spacerBeforePx={spacerBeforePx}
			spacerAfterPx={spacerAfterPx}
			onSelect={handleIconSelect}
			onDoubleSelect={handleLibraryIconQuickSelect}
		/>
	);

	return (
		<div className={controlInnerClassNames('library-body', 'no-fade')}>
			{lockType === 'none' ? (
				grid
			) : (
				<FeatureWrapper
					className={controlInnerClassNames('icon-library-lock')}
					type={lockType}
					showText="always"
				>
					{grid}
				</FeatureWrapper>
			)}
			{remainingCount > 0 && (
				<p
					ref={moreHintRef}
					className={controlInnerClassNames('library-more-hint')}
				>
					{sprintf(
						// translators: %s is the number of remaining search result icons.
						__('and more %s icons', 'blockera'),
						Number(remainingCount).toLocaleString(
							document.documentElement.lang || undefined
						)
					)}
				</p>
			)}
		</div>
	);
});

export default function Search({
	libraries = DEFAULT_LIBRARIES,
	onSearchChange = () => {},
}) {
	const pickerReady = useIconPickerLibrariesReady();
	const [searchInput, setSearchInput] = useState('');
	const [committedQuery, setCommittedQuery] = useState('');
	const [searchData, setSearchData] = useState([]);
	const [searchData2, setSearchData2] = useState([]);

	const iconCount = useMemo(
		() => getLibrariesIconCount(libraries),
		[libraries, pickerReady]
	);

	const buildSearchResults = useCallback((value) => {
		setCommittedQuery(value);
		setSearchData(
			getLibraryIcons({
				library: 'search',
				query: value,
				limit: SEARCH_FREE_LIMIT,
			})
		);
		setSearchData2(
			getLibraryIcons({
				library: 'search-2',
				query: value,
				limit: SEARCH_PRO_LIMIT,
			})
		);
	}, []);

	const runSearchDebounced = useDebounce(buildSearchResults, 150);

	const handleSearchChange = useCallback(
		(value) => {
			setSearchInput(value);
			onSearchChange(value);

			if (!value) {
				if (typeof runSearchDebounced.cancel === 'function') {
					runSearchDebounced.cancel();
				}
				setCommittedQuery('');
				setSearchData([]);
				setSearchData2([]);
				return;
			}

			runSearchDebounced(value);
		},
		[onSearchChange, runSearchDebounced]
	);

	return (
		<>
			<div
				className={controlInnerClassNames(
					'icon-search',
					searchInput ? 'is-searched' : ''
				)}
			>
				<WPSearchControl
					value={searchInput}
					onChange={handleSearchChange}
					placeholder={sprintf(
						// translators: %s is the total number of icons available in the library.
						__('Search %s icons…', 'blockera'),
						formatIconCount(iconCount)
					)}
					className={controlClassNames('search')}
					__nextHasNoMarginBottom={true}
				/>
			</div>
			{searchInput && (
				<div>
					<div
						className={controlInnerClassNames(
							'icon-library',
							'library-search',
							'is-rendered'
						)}
					>
						<div
							className={controlInnerClassNames('library-header')}
						>
							<Icon icon="search" iconSize="24" />{' '}
							{__('Search Result', 'blockera')}
							<span
								className={controlInnerClassNames(
									'library-header__label'
								)}
							>
								{__('Free', 'blockera')}
							</span>
						</div>

						{!searchData.length ? (
							<p
								className={controlInnerClassNames(
									'library-search-hint'
								)}
							>
								{__('Sorry, no icons found.', 'blockera')}
							</p>
						) : (
							<SearchResultsGrid
								records={searchData}
								// Debounced query only: live input must not remount these grids.
								resetKey={`search:${committedQuery}`}
								windowEnabled={false}
							/>
						)}
					</div>

					<div
						className={controlInnerClassNames(
							'icon-library',
							'library-search',
							'is-rendered'
						)}
					>
						<div
							className={controlInnerClassNames('library-header')}
						>
							<Icon icon="search" iconSize="24" />{' '}
							{__('Search Result', 'blockera')}
							<span
								className={controlInnerClassNames(
									'library-header__label'
								)}
							>
								{__('Pro', 'blockera')}
							</span>
						</div>

						{!searchData2.length ? (
							<p
								className={controlInnerClassNames(
									'library-search-hint'
								)}
							>
								{__('Sorry, no icons found.', 'blockera')}
							</p>
						) : (
							<SearchResultsGrid
								records={searchData2}
								lockType={getIconLibraryLockType('search-2')}
								resetKey={`search-2:${committedQuery}`}
								windowEnabled={true}
							/>
						)}

						{!searchData.length && !searchData2.length && (
							<p
								className={controlInnerClassNames(
									'library-search-hint'
								)}
							>
								{__(
									'Please try a different keyword.',
									'blockera'
								)}
							</p>
						)}
					</div>
				</div>
			)}
		</>
	);
}
