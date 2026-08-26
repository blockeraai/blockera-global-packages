/**
 * WordPress dependencies
 */
import { sprintf, __ } from '@wordpress/i18n';
import {
	memo,
	useRef,
	useState,
	useTransition,
	useContext,
	useEffect,
	useLayoutEffect,
	useCallback,
} from '@wordpress/element';

/**
 * Blockera dependencies
 */
import { controlInnerClassNames } from '@blockera/classnames';

/**
 * Internal dependencies
 */
import { IconContext } from '../../context';
import { getIconLibraryLockType, getLibraryIcons } from '../../utils';
import { useDraftIconHighlight } from '../../hooks/use-draft-icon-highlight';
import { useIconGridWindow } from '../../hooks/use-icon-grid-window';
import { FeatureWrapper } from '../../../feature-wrapper';
import { default as IconLibraryLoading } from './icon-library-loading';
import { getIntersectionRoot } from './get-intersection-root';
import { ALL_PREVIEW_SIZE, PLACEHOLDER_HEIGHT_RATIO } from './constants';
import IconGrid from './icon-grid';

function formatRemainingCount(count) {
	const locale = document.documentElement.lang || undefined;

	return Number(count).toLocaleString(locale);
}

const IconLibrary = ({
	lazyLoad = true,
	eager = false,
	limitToPreview = false,
	library,
	searchQuery = '',
	title = '',
}) => {
	const sectionRef = useRef(null);
	const libraryBodyRef = useRef(null);
	const gridRef = useRef(null);
	const loadStartedRef = useRef(false);

	const [isVisible, setIsVisible] = useState(false);
	const iconsRef = useRef([]);
	const [, startTransition] = useTransition();
	const [isRendered, setRendered] = useState(false);
	const [recordsVersion, setRecordsVersion] = useState(0);
	const [lazyMinHeight, setLazyMinHeight] = useState('');

	const { handleIconSelect, handleLibraryIconQuickSelect, draftLibraryIcon } =
		useContext(IconContext);

	const lockType = getIconLibraryLockType(library);

	const buildLibraryIcons = useCallback(
		() =>
			getLibraryIcons({
				library,
				query: searchQuery,
			}),
		[library, searchQuery]
	);

	const totalIcons = isRendered ? iconsRef.current.length : 0;

	const {
		startIndex,
		endIndex,
		remainingCount,
		moreHintRef,
		spacerBeforePx,
		spacerAfterPx,
	} = useIconGridWindow({
		gridRef,
		total: totalIcons,
		limitToPreview,
		windowEnabled: !limitToPreview,
		resetKey: `${library}:${recordsVersion}`,
	});

	useDraftIconHighlight(
		libraryBodyRef,
		draftLibraryIcon,
		`${isRendered}:${startIndex}:${endIndex}`
	);

	useLayoutEffect(() => {
		if (isRendered) {
			return;
		}

		const node = sectionRef.current;

		if (!node) {
			return;
		}

		const root = getIntersectionRoot(node);

		if (!root) {
			setIsVisible(false);
			return;
		}

		setLazyMinHeight(
			`${Math.round(root.clientHeight * PLACEHOLDER_HEIGHT_RATIO)}px`
		);

		const observer = new IntersectionObserver(
			([entry]) => {
				setIsVisible(Boolean(entry.isIntersecting));
			},
			{
				root,
				rootMargin: '0px',
				threshold: 0,
			}
		);

		observer.observe(node);

		return () => observer.disconnect();
	}, [library, isRendered]);

	const loadIcons = useCallback(() => {
		if (isRendered || loadStartedRef.current) {
			return;
		}

		loadStartedRef.current = true;

		startTransition(() => {
			iconsRef.current = buildLibraryIcons();
			setRecordsVersion((version) => version + 1);
			setRendered(true);
		});
	}, [isRendered, buildLibraryIcons, startTransition]);

	useEffect(() => {
		if (isRendered) {
			return;
		}

		const shouldLoad = eager || !lazyLoad || isVisible;

		if (shouldLoad) {
			loadIcons();
		}
	}, [eager, lazyLoad, isVisible, isRendered, loadIcons]);

	function isEmpty() {
		if (!isRendered) {
			return false;
		}

		return iconsRef.current.length === 0;
	}

	return (
		<div
			ref={sectionRef}
			id={`icon-library-section-${library}`}
			style={
				lazyMinHeight
					? { '--icon-library-lazy-min-height': lazyMinHeight }
					: undefined
			}
			className={controlInnerClassNames(
				'icon-library',
				'library-' + library,
				isRendered ? 'is-rendered' : '',
				isEmpty() ? 'is-empty' : ''
			)}
		>
			{title && (
				<div className={controlInnerClassNames('library-header')}>
					{title}
				</div>
			)}

			<div
				className={controlInnerClassNames('library-body')}
				ref={libraryBodyRef}
			>
				<FeatureWrapper
					className={controlInnerClassNames('icon-library-lock')}
					showText="always"
					type={lockType}
				>
					{isRendered ? (
						<IconGrid
							gridRef={gridRef}
							records={iconsRef.current}
							startIndex={startIndex}
							endIndex={
								limitToPreview
									? Math.min(endIndex, ALL_PREVIEW_SIZE)
									: endIndex
							}
							spacerBeforePx={limitToPreview ? 0 : spacerBeforePx}
							spacerAfterPx={limitToPreview ? 0 : spacerAfterPx}
							onSelect={handleIconSelect}
							onDoubleSelect={handleLibraryIconQuickSelect}
						/>
					) : (
						<div className={controlInnerClassNames('library-grid')}>
							<IconLibraryLoading />
						</div>
					)}
				</FeatureWrapper>
				{isRendered && remainingCount > 0 && (
					<p
						ref={moreHintRef}
						className={controlInnerClassNames('library-more-hint')}
					>
						{sprintf(
							// translators: %s is the number of remaining icons in this library.
							__('and more %s icons', 'blockera'),
							formatRemainingCount(remainingCount)
						)}
					</p>
				)}
			</div>
		</div>
	);
};

export default memo(IconLibrary);
