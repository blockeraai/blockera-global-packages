// @flow

/**
 * External dependencies
 */
import type { MixedElement } from 'react';

/**
 * Blockera dependencies
 */
import {
	LinkControl,
	BaseControl,
	InputControl,
	SearchControl,
	SelectControl,
	StepperControl,
} from '../../libs';

/**
 * Internal dependencies
 */
import { useControlContext } from '../../context';
import type { RendererControlProps } from './types';
import { isEnableRenderer, normalizedSelectOptions } from './helpers';

export const RendererControl = ({
	id,
	key,
	type,
	label,
	columns,
	options = [],
	defaultValue,
	conditions = [],
	parentDefaultValue,
	fieldProps,
	...props
}: RendererControlProps): MixedElement => {
	const {
		value,
		controlInfo: { name: controlId },
		dispatch: { modifyControlValue },
	} = useControlContext();

	const handleOnChange = (newValue: any) => {
		if (id !== undefined) {
			modifyControlValue({
				controlId,
				value: {
					...value,
					[(id: string)]: newValue,
				},
			});
		}
	};

	// Assume conditions falsy!
	if (!isEnableRenderer(conditions, value)) {
		return <></>;
	}

	let Component;

	const controlProps: Object = (props: any);
	const resolvedDefaultValue: any = defaultValue || value[id];

	switch (type) {
		case 'text':
			Component = (
				<InputControl
					id={id}
					singularId={id}
					onChange={handleOnChange}
					defaultValue={resolvedDefaultValue}
					{...controlProps}
				/>
			);
			break;

		case 'select':
			Component = (
				<SelectControl
					id={id}
					singularId={id}
					onChange={handleOnChange}
					defaultValue={resolvedDefaultValue}
					options={normalizedSelectOptions(options)}
					{...controlProps}
				/>
			);
			break;

		case 'link':
			Component = (
				<LinkControl
					id={id}
					singularId={id}
					defaultValue={resolvedDefaultValue}
					//
					onChange={handleOnChange}
					{...controlProps}
				/>
			);
			break;

		case 'search':
			Component = (
				<SearchControl
					id={id}
					singularId={id}
					//
					onChange={handleOnChange}
					defaultValue={resolvedDefaultValue}
					{...controlProps}
				/>
			);
			break;

		case 'stepper':
			Component = (
				<StepperControl
					id={id}
					singularId={id}
					//
					onChange={handleOnChange}
					defaultValue={resolvedDefaultValue}
					{...controlProps}
				/>
			);
			break;
	}

	return (
		<BaseControl label={label} columns="columns-2" fieldProps={fieldProps}>
			{Component}
		</BaseControl>
	);
};
