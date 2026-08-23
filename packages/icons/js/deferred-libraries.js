// @flow

/**
 * Icon libraries that stay out of the editor boot bundle.
 *
 * @type {Array<string>}
 */
export const DEFERRED_ICON_LIBRARY_IDS: Array<string> = [
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

/**
 * @param {string} library Icon library id.
 * @return {boolean} True when the library ships in the picker script.
 */
export function isDeferredIconLibrary(library: string): boolean {
	return DEFERRED_ICON_LIBRARY_IDS.includes(library);
}
