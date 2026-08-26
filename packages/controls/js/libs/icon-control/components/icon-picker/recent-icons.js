/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useMemo, useContext, useRef } from '@wordpress/element';

/**
 * Blockera dependencies
 */
import {
	controlInnerClassNames,
	controlClassNames,
} from '@blockera/classnames';
import { Icon, getIcon, isValidIcon } from '@blockera/icons';

/**
 * Internal dependencies
 */
import { Button } from '../../../button';
import { IconContext } from '../../context';
import { useDraftIconHighlight } from '../../hooks/use-draft-icon-highlight';
import IconGrid from './icon-grid';

function RecentRemoveButton({ entryId, onRemove }) {
	return (
		<Button
			className={controlInnerClassNames('recent-icon-remove')}
			data-blockera-recent-remove={entryId}
			label={__('Remove from recently used', 'blockera')}
			noBorder={true}
			icon={<Icon icon="close" library="ui" iconSize={12} />}
			onClick={(event) => {
				event.stopPropagation();
				onRemove(entryId);
			}}
			showTooltip={true}
		/>
	);
}

function RecentCustomIcon({ entry, onSelect, onRemove }) {
	const label =
		entry.uploadSVG &&
		typeof entry.uploadSVG === 'object' &&
		entry.uploadSVG.title
			? entry.uploadSVG.title.replaceAll('-', ' ')
			: __('Custom icon', 'blockera');

	let preview = null;

	if (entry.svgString) {
		preview = (
			<div
				className={controlInnerClassNames('recent-icon-custom-preview')}
				dangerouslySetInnerHTML={{
					__html: entry.svgString.replace(
						/\s*style\s*=\s*["'][^"']*["']/g,
						''
					),
				}}
			/>
		);
	} else if (
		entry.uploadSVG &&
		typeof entry.uploadSVG === 'object' &&
		entry.uploadSVG.url
	) {
		preview = <img src={entry.uploadSVG.url} alt={label} />;
	}

	if (!preview) {
		return null;
	}

	return (
		<span
			key={entry.id}
			className={controlInnerClassNames(
				'icon-control-icon',
				'recent-icon-item',
				'is-custom'
			)}
			aria-label={label}
			title={label}
			onClick={(event) =>
				onSelect(event, {
					type: 'UPDATE_SVG',
					svgString: entry.svgString,
					uploadSVG: entry.uploadSVG || '',
				})
			}
		>
			<RecentRemoveButton entryId={entry.id} onRemove={onRemove} />
			{preview}
		</span>
	);
}

export default function RecentIcons() {
	const libraryBodyRef = useRef(null);
	const gridRef = useRef(null);

	const {
		recentIcons,
		removeRecentIcon,
		clearRecentIcons,
		handleIconSelect,
		handleLibraryIconQuickSelect,
		draftLibraryIcon,
	} = useContext(IconContext);

	const libraryRecords = useMemo(() => {
		const records = [];

		for (const entry of recentIcons) {
			if (entry.type !== 'library') {
				continue;
			}

			const icon = getIcon(entry.icon, entry.library);

			if (!icon || !isValidIcon(icon, entry.icon)) {
				continue;
			}

			records.push({
				key: entry.id,
				iconName: icon.iconName,
				library: icon.library,
				icon,
				sourceMeta: null,
				className: 'recent-icon-item',
				children: (
					<RecentRemoveButton
						entryId={entry.id}
						onRemove={removeRecentIcon}
					/>
				),
			});
		}

		return records;
	}, [recentIcons, removeRecentIcon]);

	const customItems = useMemo(
		() => recentIcons.filter((entry) => entry.type === 'custom'),
		[recentIcons]
	);

	useDraftIconHighlight(libraryBodyRef, draftLibraryIcon, recentIcons.length);

	if (!libraryRecords.length && !customItems.length) {
		return null;
	}

	return (
		<div
			className={controlClassNames(
				'icon-library',
				'library-recent',
				'icon-picker-recent-icons',
				'is-rendered'
			)}
		>
			<div
				className={controlClassNames(
					'library-header',
					'recent-icons-header'
				)}
			>
				<div
					className={controlClassNames('recent-icons-header__title')}
				>
					<Icon icon="fa-clock" library="faregular" iconSize="22" />
					{__('Recently used', 'blockera')}
				</div>

				<Button
					variant="tertiary"
					size="extra-small"
					className={controlInnerClassNames('recent-icons-clear')}
					aria-label={__('Clear all recently used icons', 'blockera')}
					onClick={(event) => {
						event.stopPropagation();
						clearRecentIcons();
					}}
				>
					{__('Clear all', 'blockera')}
				</Button>
			</div>

			<div
				className={controlInnerClassNames('library-body', 'no-fade')}
				ref={libraryBodyRef}
			>
				<IconGrid
					gridRef={gridRef}
					records={libraryRecords}
					onSelect={handleIconSelect}
					onDoubleSelect={handleLibraryIconQuickSelect}
				>
					{customItems.map((entry) => (
						<RecentCustomIcon
							key={entry.id}
							entry={entry}
							onSelect={handleIconSelect}
							onRemove={removeRecentIcon}
						/>
					))}
				</IconGrid>
			</div>
		</div>
	);
}
