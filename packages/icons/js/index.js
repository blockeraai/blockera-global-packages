export {
	isStrokeIconLibrary,
	isStrokeSvgMarkup,
	isSvgFillAccentValue,
	isSvgFillAccentElement,
	prepareIconSvgForStorage,
	extractSvgMarkup,
	getIconKebabId,
} from './helpers';
export { Icon, getIcon, isValidIcon, createStandardIconObject } from './icon';
export {
	isValidIconLibrary,
	getIconLibrary,
	getIconLibraryIcons,
	getIconLibrarySearchData,
	registerIconLibraries,
	arePickerLibrariesLoaded,
	subscribeIconPickerLibraries,
	getDeferredIconRenderer,
	getIconLibrarySearchRecord,
} from './icon-library';
export {
	ensureIconPickerLibraries,
	scheduleIdleIconPickerPrefetch,
	useIconPickerLibrariesReady,
} from './load-picker-libraries';
export {
	DEFERRED_ICON_LIBRARY_IDS,
	isDeferredIconLibrary,
} from './deferred-libraries';
export { iconSearch, prepareIconSearchQuery } from './icon-search';
export { default as IconLibrariesList } from './search-libraries.json';
export { default as NativeIconLibrariesList } from './search-libraries-2.json';
