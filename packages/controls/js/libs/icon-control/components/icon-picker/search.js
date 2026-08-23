/**
 * External dependencies
 */
import { __, sprintf } from '@wordpress/i18n';
import {
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
import { FeatureWrapper } from '../../../feature-wrapper';
import {
	DEFAULT_LIBRARIES,
	formatIconCount,
	getLibrariesIconCount,
} from './icon-libraries';

export default function Search({
	libraries = DEFAULT_LIBRARIES,
	onSearchChange = () => {},
}) {
	const pickerReady = useIconPickerLibrariesReady();
	const [searchInput, setSearchInput] = useState('');
	const [searchData, setSearchData] = useState([]);
	const [searchData2, setSearchData2] = useState([]);
	const searchResultsRef = useRef(null);

	const { handleIconSelect, handleLibraryIconQuickSelect, draftLibraryIcon } =
		useContext(IconContext);

	const iconCount = useMemo(
		() => getLibrariesIconCount(libraries),
		[libraries, pickerReady]
	);

	const buildSearchResults = useCallback(
		(value) => {
			setSearchData(
				getLibraryIcons({
					library: 'search',
					query: value,
					onClick: handleIconSelect,
					onDoubleClick: handleLibraryIconQuickSelect,
					limit: 49,
				})
			);
			setSearchData2(
				getLibraryIcons({
					library: 'search-2',
					query: value,
					onClick: handleIconSelect,
					onDoubleClick: handleLibraryIconQuickSelect,
					limit: 400,
				})
			);
		},
		[handleIconSelect, handleLibraryIconQuickSelect]
	);

	const runSearchDebounced = useDebounce(buildSearchResults, 150);

	useDraftIconHighlight(
		searchResultsRef,
		draftLibraryIcon,
		`${searchInput}:${searchData.length}:${searchData2.length}`
	);

	const handleSearchChange = (value) => {
		setSearchInput(value);
		onSearchChange(value);

		if (!value) {
			if (typeof runSearchDebounced.cancel === 'function') {
				runSearchDebounced.cancel();
			}
			setSearchData([]);
			setSearchData2([]);
			return;
		}

		runSearchDebounced(value);
	};

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
				<div ref={searchResultsRef}>
					<div
						className={controlInnerClassNames(
							'icon-library',
							'library-search',
							'is-rendered',
							!searchInput ? 'is-empty' : ''
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
							<div
								className={controlInnerClassNames(
									'library-body',
									'no-fade'
								)}
							>
								<div
									className={controlInnerClassNames(
										'library-grid'
									)}
								>
									{searchData}
								</div>
							</div>
						)}
					</div>

					<div
						className={controlInnerClassNames(
							'icon-library',
							'library-search',
							'is-rendered',
							!searchInput ? 'is-empty' : ''
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
							<div
								className={controlInnerClassNames(
									'library-body',
									'no-fade'
								)}
							>
								<FeatureWrapper
									className={controlInnerClassNames(
										'icon-library-lock'
									)}
									type={getIconLibraryLockType('search-2')}
									showText="always"
								>
									<div
										className={controlInnerClassNames(
											'library-grid'
										)}
									>
										{searchData2}
									</div>
								</FeatureWrapper>
							</div>
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
