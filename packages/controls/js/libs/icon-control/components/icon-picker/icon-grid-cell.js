/**
 * WordPress dependencies
 */
import { sprintf, __ } from '@wordpress/i18n';
import {
	memo,
	useCallback,
	useMemo,
	useState,
	useRef,
	useEffect,
	useLayoutEffect,
	createPortal,
} from '@wordpress/element';

/**
 * Blockera dependencies
 */
import { controlInnerClassNames } from '@blockera/classnames';
import { Icon } from '@blockera/icons';

/**
 * Internal dependencies
 */
import {
	buildIconLibraryTooltipContent,
	getLibraryIconDisplayName,
	getLibraryDisplayName,
	getLibraryIconPreviewSize,
} from '../../utils';

const RICH_TOOLTIP_DELAY = 300;

function IconHoverFlyout({ anchorRef, children }) {
	const [style, setStyle] = useState(null);

	useLayoutEffect(() => {
		const node = anchorRef?.current;

		if (!node) {
			return;
		}

		const rect = node.getBoundingClientRect();

		setStyle({
			position: 'fixed',
			left: rect.left + rect.width / 2,
			top: rect.top,
			transform: 'translate(-50%, calc(-100% - 8px))',
			// WP modal overlay is 1000000 in this editor; stay above it.
			zIndex: 1000001,
			pointerEvents: 'none',
		});
	}, [anchorRef]);

	if (!style || typeof document === 'undefined') {
		return null;
	}

	return createPortal(
		<div
			className={controlInnerClassNames('icon-library-tooltip-flyout')}
			role="tooltip"
			style={style}
		>
			{children}
		</div>,
		document.body
	);
}

function IconGridCell({
	icon,
	iconName,
	library,
	sourceMeta = null,
	className = '',
	children = null,
}) {
	const cellRef = useRef(null);
	const [isHovered, setIsHovered] = useState(false);
	const [showRichTooltip, setShowRichTooltip] = useState(false);

	const nativeTitle = useMemo(() => {
		const name = getLibraryIconDisplayName(iconName, library, sourceMeta);
		const libraryName = getLibraryDisplayName(library);

		return `${name} (${libraryName})`;
	}, [iconName, library, sourceMeta]);

	const enableRichTooltip = useCallback(() => {
		setIsHovered(true);
	}, []);

	const disableRichTooltip = useCallback(() => {
		setIsHovered(false);
		setShowRichTooltip(false);
	}, []);

	useEffect(() => {
		if (!isHovered) {
			setShowRichTooltip(false);
			return undefined;
		}

		const timeoutId = window.setTimeout(() => {
			setShowRichTooltip(true);
		}, RICH_TOOLTIP_DELAY);

		return () => window.clearTimeout(timeoutId);
	}, [isHovered, iconName, library]);

	return (
		<span
			ref={cellRef}
			className={controlInnerClassNames(
				'icon-control-icon',
				'library-' + library,
				'icon-' + iconName,
				className
			)}
			data-blockera-icon={iconName}
			data-blockera-library={library}
			aria-label={sprintf(
				// translators: %s is icon ID in icon libraries for example arrow-left
				__('%s Icon', 'blockera'),
				iconName
			)}
			title={showRichTooltip ? undefined : nativeTitle}
			onMouseEnter={enableRichTooltip}
			onMouseLeave={disableRichTooltip}
			onFocus={enableRichTooltip}
			onBlur={disableRichTooltip}
		>
			{children}
			<Icon
				library={library}
				icon={icon}
				iconSize={getLibraryIconPreviewSize(library)}
			/>
			{showRichTooltip && (
				<IconHoverFlyout anchorRef={cellRef}>
					{buildIconLibraryTooltipContent(
						iconName,
						library,
						sourceMeta
					)}
				</IconHoverFlyout>
			)}
		</span>
	);
}

export default memo(IconGridCell);
