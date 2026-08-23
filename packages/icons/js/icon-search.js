// @flow

/**
 * External dependencies
 */
import Fuse from 'fuse.js';

/**
 * Internal dependencies
 */
import {
	getIconLibraryIcons,
	getIconLibrarySearchData,
	getIconLibrariesSearchIndex,
	isValidIconLibrary,
	subscribeIconPickerLibraries,
} from './icon-library';
import { isValidIcon } from './icon';
import { type IconLibraryTypes } from './types';

const searchConfig = require('./search-config.json');

const fuseCache: { [key: string]: { index: Object, fuse: Object } } = {};

subscribeIconPickerLibraries(() => {
	for (const key in fuseCache) {
		if (Object.prototype.hasOwnProperty.call(fuseCache, key)) {
			delete fuseCache[key];
		}
	}
});

function getCachedFuse(library: IconLibraryTypes | 'all' | 'all2'): ?Object {
	const searchIndex = getIconLibrariesSearchIndex(library);

	if (!searchIndex) {
		return null;
	}

	const cacheKey = library === 'all2' || library === 'all' ? library : '';

	if (cacheKey) {
		const cached = fuseCache[cacheKey];

		if (cached && cached.index === searchIndex) {
			return cached.fuse;
		}

		const docs = getIconLibrarySearchData(library);
		const fuse = new Fuse(docs, searchConfig, searchIndex);
		fuseCache[cacheKey] = { index: searchIndex, fuse };

		return fuse;
	}

	return new Fuse(
		getIconLibrarySearchData(library),
		searchConfig,
		searchIndex
	);
}

/**
 * Escape Fuse.js extended-search operators in user input.
 * Spaces are preserved so multi-word queries use AND semantics (e.g. "fli v").
 *
 * @param {string} query Raw search input.
 * @return {string} Query safe for Fuse extended search.
 */
export function prepareIconSearchQuery(query: string): string {
	const trimmed = query.trim();

	if (!trimmed) {
		return '';
	}

	// Extended-search reserved characters (whitespace is intentionally excluded).
	return trimmed.replace(/[|\\'"=!:^$]/g, '\\$&');
}

export function iconSearch({
	query,
	library = 'all',
	limit,
}: {
	query: string,
	limit: number,
	library: IconLibraryTypes,
}): Object {
	if (!query) {
		return {};
	}

	const getResult = () => {
		const fuse = getCachedFuse(library);

		if (!fuse) {
			return {};
		}

		const searchOptions = limit ? { limit } : undefined;
		const result = fuse.search(
			prepareIconSearchQuery(query),
			searchOptions
		);

		if (!result?.length) {
			return {};
		}

		const finalResult = {};

		const iconRegistration = (foundItem: Object) => {
			if (foundItem?.item?.iconName) {
				finalResult[foundItem.item.iconName] = foundItem.item;
			}
		};

		result.forEach(iconRegistration);

		return finalResult;
	};

	return getResult();
}

export function createIconsBaseSearchData({
	library,
}: {
	library: IconLibraryTypes,
}): Array<any> {
	if (!isValidIconLibrary(library)) {
		return [];
	}

	const libraryIcons = getIconLibraryIcons(library);
	let _charsToRemoveFromTagBeginning = 0;

	if (library === 'blockera') {
		_charsToRemoveFromTagBeginning = 9;
	}

	const searchData = [];

	for (const icon in libraryIcons) {
		if (!isValidIcon(libraryIcons[icon])) {
			continue;
		}

		const title = icon
			.replace(/([A-Z])/g, ' $1')
			.slice(_charsToRemoveFromTagBeginning)
			.replace(/( Alt)(?!.*\1)/, '')
			.trim();

		searchData.push({
			iconName: icon,
			title: title ? title : icon,
			library,
			tags: [],
		});
	}

	// sort
	searchData.sort((a, b) => {
		let number: number;

		if (a.iconName > b.iconName) {
			number = 1;
		} else {
			number = b.iconName > a.iconName ? -1 : 0;
		}

		return number;
	});

	return searchData;
}
