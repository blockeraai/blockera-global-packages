// @flow

/**
 * External dependencies
 */
import Fuse from 'fuse.js';
import { __ } from '@wordpress/i18n';

/**
 * Blockera dependencies
 */
import { isUndefined } from '@blockera/utils';

/**
 * Internal dependencies
 */
import searchIndex from './search-index.json';
import type { IconLibraryTypes, IconLibrary } from './types';
// WP Library
import { WPIcons } from './library-wp';
import { default as WPLibraryIcon } from './library-wp/library-icon';
import WPIconsSearchData from './library-wp/search-data.json';
import { default as FaRegularLibraryIcon } from './library-faregular/library-icon';
import { default as FaBrandsLibraryIcon } from './library-fabrands/library-icon';
import { default as FaSolidLibraryIcon } from './library-fasolid/library-icon';
// Blockera Library
import { BlockeraIcons } from './library-blockera';
import { default as LibraryIcon } from './library-blockera/library-icon';
import IconsSearchData from './library-blockera/search-data.json';
// UI Library
import { BlockeraUIIcons } from './library-ui';
import { default as LibraryUIIcon } from './library-ui/library-icon';
// Cursor Library
import { CursorIcons } from './library-cursor';
import CursorIconsSearchData from './library-cursor/search-data.json';
import { default as LibraryCursorIcon } from './library-cursor/library-icon';
// Brands Library
import { BrandsIcons } from './library-brands';
import BrandsIconsSearchData from './library-brands/search-data.json';
import { default as EssentialsLibraryIcon } from './library-essentials/library-icon';
import { default as FeatherLibraryIcon } from './library-feather/library-icon';
import { default as LucideLibraryIcon } from './library-lucide/library-icon';
import { default as UntitleduiLibraryIcon } from './library-untitledui/library-icon';
import { default as TablerLibraryIcon } from './library-tabler/library-icon';
import { default as TablerFilledLibraryIcon } from './library-tabler-filled/library-icon';
import { default as BrandsIcon } from './library-brands/library-icon';
import searchLibraries from './search-libraries.json';
import searchLibraries2 from './search-libraries-2.json';

const BLOCKERA_LIBRARY_ATTRIBUTION = {
	author: 'Blockera AI',
	link: 'https://blockera.ai',
};

const FONT_AWESOME_LIBRARY_ATTRIBUTION = {
	author: 'Font Awesome',
	link: 'https://github.com/fortawesome/font-awesome',
};

const libraryIconsMaps: { [key: string]: Object } = {
	ui: BlockeraUIIcons || {},
	blockera: BlockeraIcons || {},
	wp: WPIcons || {},
	cursor: CursorIcons || {},
	brands: BrandsIcons || {},
};

const librarySearchDataMaps: { [key: string]: Array<any> } = {
	wp: WPIconsSearchData,
	blockera: IconsSearchData,
	cursor: CursorIconsSearchData,
	brands: BrandsIconsSearchData,
};

const searchRecordIndexes: { [key: string]: { [string]: Object } } = {};
let cachedSearchDocsAll = null;
let cachedSearchDocsAll2 = null;

const libraryRenderers: { [key: string]: any } = {};

let parsedSearchIndex = null;
let parsedSearchIndex2 = null;
let pickerLibrariesLoaded = false;
const pickerLibraryListeners: Array<() => void> = [];

export const IconLibraries: {
	[key: string]: IconLibrary,
} = {
	wp: {
		id: 'wp',
		// translators: Icon library name
		name: __('WordPress Icons', 'blockera'),
		icon: <WPLibraryIcon />,
		count: Object.keys(WPIcons || {}).length,
		author: 'WordPress',
		link: 'https://wordpress.org',
	},
	faregular: {
		id: 'faregular',
		// translators: Icon library name
		name: __('FontAwesome Regular', 'blockera'),
		icon: <FaRegularLibraryIcon />,
		count: 0,
		...FONT_AWESOME_LIBRARY_ATTRIBUTION,
	},
	fasolid: {
		id: 'fasolid',
		// translators: Icon library name
		name: __('FontAwesome Solid', 'blockera'),
		icon: <FaSolidLibraryIcon />,
		count: 0,
		...FONT_AWESOME_LIBRARY_ATTRIBUTION,
	},
	fabrands: {
		id: 'fabrands',
		// translators: Icon library name
		name: __('FontAwesome Brands', 'blockera'),
		icon: <FaBrandsLibraryIcon />,
		count: 0,
		...FONT_AWESOME_LIBRARY_ATTRIBUTION,
	},
	feather: {
		id: 'feather',
		// translators: Icon library name
		name: __('Feather Icons', 'blockera'),
		icon: <FeatherLibraryIcon />,
		count: 0,
		author: 'Feather',
		link: 'https://github.com/feathericons/feather',
	},
	lucide: {
		id: 'lucide',
		// translators: Icon library name
		name: __('Lucide Icons', 'blockera'),
		icon: <LucideLibraryIcon />,
		count: 0,
		author: 'Lucide',
		link: 'https://github.com/lucide-icons/lucide',
	},
	untitledui: {
		id: 'untitledui',
		// translators: Icon library name
		name: __('Untitled UI Icons', 'blockera'),
		icon: <UntitleduiLibraryIcon />,
		count: 0,
		author: 'Untitled UI',
		link: 'https://github.com/untitleduico/icons',
	},
	tabler: {
		id: 'tabler',
		// translators: Icon library name
		name: __('Tabler Icons', 'blockera'),
		icon: <TablerLibraryIcon />,
		count: 0,
		author: 'Tabler',
		link: 'https://github.com/tabler/tabler-icons',
	},
	'tabler-filled': {
		id: 'tabler-filled',
		// translators: Icon library name
		name: __('Tabler Icons Filled', 'blockera'),
		icon: <TablerFilledLibraryIcon />,
		count: 0,
		author: 'Tabler',
		link: 'https://github.com/tabler/tabler-icons',
	},
	brands: {
		id: 'brands',
		// translators: Icon library name
		name: __('Blockera Branding', 'blockera'),
		icon: <BrandsIcon />,
		count: Object.keys(BrandsIcons || {}).length,
		...BLOCKERA_LIBRARY_ATTRIBUTION,
	},
	blockera: {
		id: 'blockera',
		// translators: Icon library name
		name: __('Blockera Products', 'blockera'),
		icon: <LibraryIcon />,
		count: Object.keys(BlockeraIcons || {}).length,
		...BLOCKERA_LIBRARY_ATTRIBUTION,
	},
	ui: {
		id: 'ui',
		// translators: Icon library name
		name: __('User Interface', 'blockera'),
		icon: <LibraryUIIcon />,
		count: Object.keys(BlockeraUIIcons || {}).length,
		...BLOCKERA_LIBRARY_ATTRIBUTION,
	},
	cursor: {
		id: 'cursor',
		// translators: Icon library name
		name: __('Cursors', 'blockera'),
		icon: <LibraryCursorIcon />,
		count: Object.keys(CursorIcons || {}).length,
		...BLOCKERA_LIBRARY_ATTRIBUTION,
	},
	essentials: {
		id: 'essentials',
		// translators: Icon library name
		name: __('Blockera Essentials', 'blockera'),
		icon: <EssentialsLibraryIcon />,
		count: 0,
		...BLOCKERA_LIBRARY_ATTRIBUTION,
	},
};

/**
 * @return {boolean} True when picker packs have registered.
 */
export function arePickerLibrariesLoaded(): boolean {
	return pickerLibrariesLoaded;
}

/**
 * Subscribe to picker library registration.
 *
 * @param {Function} listener Callback.
 * @return {Function} Unsubscribe.
 */
export function subscribeIconPickerLibraries(listener: () => void): () => void {
	pickerLibraryListeners.push(listener);

	return () => {
		const index = pickerLibraryListeners.indexOf(listener);

		if (index !== -1) {
			pickerLibraryListeners.splice(index, 1);
		}
	};
}

function notifyPickerLibraryListeners() {
	for (let i = 0; i < pickerLibraryListeners.length; i++) {
		pickerLibraryListeners[i]();
	}
}

/**
 * Merge deferred icon packs from the picker script.
 *
 * @param {Object} payload Libraries, renderers, and Fuse index 2.
 * @return {void}
 */
export function registerIconLibraries(payload: {
	searchIndex2?: Object,
	libraries?: {
		[key: string]: {
			icons?: Object,
			searchData?: Array<any>,
			render?: any,
		},
	},
}): void {
	const libraries = payload?.libraries || {};

	for (const libraryId in libraries) {
		if (!Object.prototype.hasOwnProperty.call(libraries, libraryId)) {
			continue;
		}

		const entry = libraries[libraryId];

		if (entry?.icons) {
			libraryIconsMaps[libraryId] = entry.icons;

			if (IconLibraries[libraryId]) {
				IconLibraries[libraryId] = {
					...IconLibraries[libraryId],
					count: Object.keys(entry.icons).length,
				};
			}
		}

		if (entry?.searchData) {
			librarySearchDataMaps[libraryId] = entry.searchData;
		}

		if (entry?.render) {
			libraryRenderers[libraryId] = entry.render;
		}
	}

	if (payload?.searchIndex2) {
		parsedSearchIndex2 = Fuse.parseIndex(payload.searchIndex2);
	}

	cachedSearchDocsAll = null;
	cachedSearchDocsAll2 = null;

	for (const libraryId in searchRecordIndexes) {
		if (Object.prototype.hasOwnProperty.call(searchRecordIndexes, libraryId)) {
			delete searchRecordIndexes[libraryId];
		}
	}

	pickerLibrariesLoaded = true;
	notifyPickerLibraryListeners();
}

/**
 * @param {string} library Library id.
 * @return {any} Renderer component or null.
 */
export function getDeferredIconRenderer(library: string): any {
	return libraryRenderers[library] || null;
}

export function isValidIconLibrary(library: IconLibraryTypes): boolean {
	return !isUndefined(IconLibraries[library]);
}

export function getIconLibrary(library: IconLibraryTypes | 'all'): Object {
	const libs: { [key: string]: any } = {};

	if (library === 'all') {
		for (const key in IconLibraries) {
			libs[key] = IconLibraries[key];
		}
	} else if (isValidIconLibrary(library)) {
		libs[library] = IconLibraries[library];
	}

	return libs;
}

export function getIconLibraryIcons(iconLibrary: IconLibraryTypes): Object {
	if (!isValidIconLibrary(iconLibrary)) {
		return {};
	}

	return libraryIconsMaps[iconLibrary] || {};
}

function _getLibraryIcons(library: IconLibraryTypes): Array<any> {
	return librarySearchDataMaps[library] || [];
}

/**
 * O(1) lookup for tooltip/search metadata.
 *
 * @param {string} library Library id.
 * @param {string} iconName Icon id.
 * @return {Object|null} Search record.
 */
export function getIconLibrarySearchRecord(
	library: string,
	iconName: string
): ?Object {
	if (!library || !iconName) {
		return null;
	}

	if (!searchRecordIndexes[library]) {
		const data = librarySearchDataMaps[library] || [];
		const index: { [string]: Object } = {};

		for (let i = 0; i < data.length; i++) {
			const item = data[i];

			if (item?.iconName) {
				index[item.iconName] = item;
			}
		}

		searchRecordIndexes[library] = index;
	}

	return searchRecordIndexes[library][iconName] || null;
}

export function getIconLibrarySearchData(
	library: IconLibraryTypes | 'all' | 'all2'
): Array<any> {
	let searchData: Array<any> = [];

	if (
		library === 'all' ||
		library === 'all2' ||
		isValidIconLibrary(library)
	) {
		switch (library) {
			case 'all':
				if (!cachedSearchDocsAll) {
					cachedSearchDocsAll = [];
					searchLibraries.forEach((libraryId) => {
						// $FlowFixMe
						Array.prototype.push.apply(
							cachedSearchDocsAll,
							_getLibraryIcons(libraryId)
						);
					});
				}
				searchData = cachedSearchDocsAll;
				break;

			case 'all2':
				if (!cachedSearchDocsAll2) {
					cachedSearchDocsAll2 = [];
					searchLibraries2.forEach((libraryId) => {
						// $FlowFixMe
						Array.prototype.push.apply(
							cachedSearchDocsAll2,
							_getLibraryIcons(libraryId)
						);
					});
				}
				searchData = cachedSearchDocsAll2;
				break;

			default:
				searchData = _getLibraryIcons(library);
				break;
		}
	}

	return searchData;
}

export function getIconLibrariesSearchIndex(
	library: IconLibraryTypes | 'all' | 'all2'
): Object | null {
	if (library === 'all2' || searchLibraries2.includes(library)) {
		return parsedSearchIndex2;
	}

	if (!parsedSearchIndex) {
		parsedSearchIndex = Fuse.parseIndex(searchIndex);
	}

	return parsedSearchIndex;
}

/**
 * Reset deferred packs for unit tests.
 *
 * @return {void}
 */
export function __resetPickerLibrariesForTests(): void {
	const deferred = [
		'faregular',
		'fasolid',
		'fabrands',
		'essentials',
		'feather',
		'lucide',
		'untitledui',
		'tabler',
		'tabler-filled',
	];

	for (let i = 0; i < deferred.length; i++) {
		const id = deferred[i];
		delete libraryIconsMaps[id];
		delete librarySearchDataMaps[id];
		delete libraryRenderers[id];

		if (IconLibraries[id]) {
			IconLibraries[id] = {
				...IconLibraries[id],
				count: 0,
			};
		}
	}

	parsedSearchIndex2 = null;
	pickerLibrariesLoaded = false;
	pickerLibraryListeners.length = 0;
	cachedSearchDocsAll = null;
	cachedSearchDocsAll2 = null;

	for (const libraryId in searchRecordIndexes) {
		if (Object.prototype.hasOwnProperty.call(searchRecordIndexes, libraryId)) {
			delete searchRecordIndexes[libraryId];
		}
	}
}
