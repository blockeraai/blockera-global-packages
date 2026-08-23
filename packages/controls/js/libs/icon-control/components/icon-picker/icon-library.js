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
import { FeatureWrapper } from '../../../feature-wrapper';
import { default as IconLibraryLoading } from './icon-library-loading';

const ALL_PREVIEW_SIZE = 200;
const ICON_CHUNK_SIZE = 500;
const PLACEHOLDER_HEIGHT_RATIO = 2;

function formatRemainingCount(count) {
	const locale = document.documentElement.lang || undefined;

	return Number(count).toLocaleString(locale);
}

function getIntersectionRoot(node) {
	let current = node?.parentElement;

	while (current && current !== document.body) {
		const { overflowY } = window.getComputedStyle(current);
		const canScroll =
			overflowY === 'auto' ||
			overflowY === 'scroll' ||
			overflowY === 'overlay';

		if (
			canScroll &&
			current.clientHeight > 32 &&
			current.scrollHeight > current.clientHeight + 8
		) {
			return current;
		}

		current = current.parentElement;
	}

	return (
		node?.closest('.blockera-control-icon-picker-modal') ||
		node?.closest('.components-modal__frame') ||
		null
	);
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
	const moreHintRef = useRef(null);
	const loadStartedRef = useRef(false);

	const [isVisible, setIsVisible] = useState(false);
	const iconsRef = useRef([]);
	const [, startTransition] = useTransition();
	const [visibleCount, setVisibleCount] = useState(0);
	const [isRendered, setRendered] = useState(false);

	const { handleIconSelect, handleLibraryIconQuickSelect, draftLibraryIcon } =
		useContext(IconContext);

	const lockType = getIconLibraryLockType(library);

	const buildLibraryIcons = useCallback(
		() =>
			getLibraryIcons({
				library,
				query: searchQuery,
				onClick: handleIconSelect,
				onDoubleClick: handleLibraryIconQuickSelect,
			}),
		[library, searchQuery, handleIconSelect, handleLibraryIconQuickSelect]
	);

	// Highlight draft selection via DOM class toggling (see useDraftIconHighlight).
	useDraftIconHighlight(libraryBodyRef, draftLibraryIcon, isRendered);

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

		const placeholderMinHeight = Math.round(
			root.clientHeight * PLACEHOLDER_HEIGHT_RATIO
		);

		node.style.setProperty(
			'--icon-library-lazy-min-height',
			`${placeholderMinHeight}px`
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
			const icons = buildLibraryIcons();
			iconsRef.current = icons;
			const initialVisible = Math.min(
				limitToPreview ? ALL_PREVIEW_SIZE : ICON_CHUNK_SIZE,
				icons.length
			);

			setVisibleCount(initialVisible);
			setRendered(true);
		});
	}, [
		isRendered,
		buildLibraryIcons,
		startTransition,
		limitToPreview,
	]);

	useEffect(() => {
		if (isRendered) {
			return;
		}

		const shouldLoad = eager || !lazyLoad || isVisible;

		if (shouldLoad) {
			loadIcons();
		}
	}, [eager, lazyLoad, isVisible, isRendered, loadIcons]);

	useEffect(() => {
		if (limitToPreview || !isRendered) {
			return;
		}

		const total = iconsRef.current.length;

		if (visibleCount >= total) {
			return;
		}

		const node = moreHintRef.current;

		if (!node) {
			return;
		}

		const root = getIntersectionRoot(node);

		if (!root) {
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) {
					return;
				}

				observer.disconnect();
				startTransition(() => {
					setVisibleCount((count) =>
						Math.min(
							count + ICON_CHUNK_SIZE,
							iconsRef.current.length
						)
					);
				});
			},
			{
				root,
				rootMargin: '0px',
				threshold: 0,
			}
		);

		observer.observe(node);

		return () => observer.disconnect();
	}, [limitToPreview, isRendered, visibleCount, startTransition]);

	const totalIcons = isRendered ? iconsRef.current.length : 0;
	const previewCount = limitToPreview
		? Math.min(visibleCount, ALL_PREVIEW_SIZE)
		: visibleCount;
	const remainingCount = Math.max(0, totalIcons - previewCount);

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
					<div className={controlInnerClassNames('library-grid')}>
						{isRendered ? (
							iconsRef.current.slice(0, previewCount)
						) : (
							<IconLibraryLoading />
						)}
					</div>
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
