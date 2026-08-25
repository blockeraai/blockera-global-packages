/**
 * Internal dependencies
 */
import { createCssDeclarations } from '../../../../style-engine';
import { getVariableRepeaterItemsFromSettings } from '../../value-addon-variable-payload';
import { joinTransitionCssFromRepeaterMap } from '../transition-repeater-to-css';

function wrapCssVarIfVariable(field, cssValue) {
	if (
		'variable' === field?.valueType &&
		field?.settings?.var &&
		cssValue !== '' &&
		cssValue !== undefined
	) {
		return `var(${field.settings.var}, ${cssValue})`;
	}
	return cssValue;
}

export function TransitionGenerator(id, props, options) {
	const { attributes } = props;

	if (!Object.keys(attributes?.blockeraTransition || {})?.length) {
		return '';
	}

	const transitionAttr = attributes?.blockeraTransition;
	let transitionValue = transitionAttr;

	if ('variable' === transitionValue?.valueType) {
		const rawItems = getVariableRepeaterItemsFromSettings(
			transitionValue?.settings
		);
		const items = Array.isArray(rawItems) ? rawItems : [];
		transitionValue = items.map((t, i) => [`${t.type}-${i}`, t]);
	}

	const transitionCss = wrapCssVarIfVariable(
		transitionAttr,
		joinTransitionCssFromRepeaterMap(transitionValue)
	);

	return createCssDeclarations({
		options,
		properties: {
			transition: transitionCss,
		},
	});
}
