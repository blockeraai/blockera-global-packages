// @flow

/**
 * External dependencies
 */
import { applyFilters } from '@wordpress/hooks';

/**
 * Internal dependencies
 */
import type { CssRule } from './types';

/**
 * Resolve style generators once per getComputedCssProps burst.
 * applyFilters may mutate the copy; a new copy is used each run so session
 * state does not leak.
 *
 * @param {Object} defaultGenerators
 * @param {Array<string>} disabledStyles
 * @return {Function} appendStyles(settings) => Array<CssRule>
 */
export function createAppendStylesRunner(
	defaultGenerators: Object,
	disabledStyles: Array<string> = []
): (settings: Object) => Array<CssRule> {
	const styleGenerators = applyFilters(
		'blockera.editor.styleEngine.generators',
		{ ...defaultGenerators }
	);
	const disabledSet =
		disabledStyles && disabledStyles.length
			? new Set(disabledStyles)
			: null;
	const enabledGenerators = Object.entries(styleGenerators)
		.filter(
			([name]: [string, mixed]): boolean =>
				!disabledSet || !disabledSet.has(name)
		)
		.map(([, generator]: [string, Function]): Function => generator);

	return (settings: Object): Array<CssRule> => {
		const enabledStyles = [];
		const generatorsLen = enabledGenerators.length;
		for (let i = 0; i < generatorsLen; i++) {
			enabledStyles.push(enabledGenerators[i](settings));
		}
		return enabledStyles.flat();
	};
}
