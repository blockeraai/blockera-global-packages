// @flow
/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { useMemo } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import type { MixedElement } from 'react';

/**
 * Internal dependencies
 */
import SelectControl from '../select-control';
import type { FontFamilyControlProps } from './types';
import { DEFAULT_FONT_FAMILY_VALUE } from './constants';
import { mapEditorFontFamiliesToSelectOptions } from './utils';

export type * from './types';
export * from './utils';
export { DEFAULT_FONT_FAMILY_VALUE } from './constants';

const EMPTY_FIELD_PROPS = {};
const DEFAULT_FIELD_PROPS = { 'data-test': 'font-family-select' };

const DEFAULT_LABEL_DESCRIPTION = (
	<>
		<p>
			{__(
				'Allows you to set the font family for text content, giving you control over the typography style.',
				'blockera'
			)}
		</p>
		<p>
			{__(
				'You can choose from system fonts or custom web fonts to match your site’s branding and design aesthetic.',
				'blockera'
			)}
		</p>
		<p>
			{__(
				'For consistent styling across your website, it’s recommended to use fonts from your design system or predefined options.',
				'blockera'
			)}
		</p>
	</>
);

export default function FontFamilyControl({
	id,
	label = __('Font Family', 'blockera'),
	labelDescription = DEFAULT_LABEL_DESCRIPTION,
	options: optionsProp,
	defaultValue = DEFAULT_FONT_FAMILY_VALUE,
	onChange = () => {},
	columns,
	field = 'font-family',
	className = '',
	// Note: this control is a simple select over font-family “variable ids”
	// (presets/slugs). It intentionally does NOT use the generic ValueAddon UI.
	controlAddonTypes: _controlAddonTypes,
	variableTypes: _variableTypes,
	fieldProps = EMPTY_FIELD_PROPS,
	labelProps: propsForLabelControl = {},
	singularId,
	repeaterItem,
	...props
}: FontFamilyControlProps): MixedElement {
	const editorFontFamilies = useSelect((select) => {
		if (optionsProp) {
			return undefined;
		}

		const settings = select(blockEditorStore)?.getSettings?.();

		return (
			settings?.__experimentalFeatures?.typography?.fontFamilies ||
			settings?.fontFamilies
		);
	}, [optionsProp]);

	const options = useMemo(() => {
		if (optionsProp) {
			return optionsProp;
		}

		return mapEditorFontFamiliesToSelectOptions(editorFontFamilies);
	}, [optionsProp, editorFontFamilies]);

	const mergedFieldProps = useMemo(() => {
		if (fieldProps === EMPTY_FIELD_PROPS) {
			return DEFAULT_FIELD_PROPS;
		}

		return {
			'data-test': 'font-family-select',
			...fieldProps,
		};
	}, [fieldProps]);

	return (
		<SelectControl
			id={id}
			label={label}
			labelDescription={labelDescription}
			labelProps={propsForLabelControl}
			options={options}
			type="native"
			defaultValue={defaultValue}
			onChange={onChange}
			columns={columns}
			field={field}
			className={className}
			fieldProps={mergedFieldProps}
			singularId={singularId}
			repeaterItem={repeaterItem}
			{...props}
		/>
	);
}
