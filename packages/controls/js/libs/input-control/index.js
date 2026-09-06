// @flow

/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import type { MixedElement } from 'react';
import { useState, useEffect, useMemo, useCallback } from '@wordpress/element';

/**
 * Blockera dependencies
 */
import { controlClassNames } from '@blockera/classnames';
import {
	isEmpty,
	isUndefined,
	shouldTrackComponentRender,
	trackComponentRender,
} from '@blockera/utils';

/**
 * Internal dependencies
 */
import type { InputControlProps } from './types';
import { useControlContext } from '../../context';
import { UnitInput } from './components/unit-input';
import { OtherInput } from './components/other-input';
import { NumberInput } from './components/number-input';
import { setValueAddon, useValueAddon } from '../../value-addons';
import { BaseControl } from './../index';
import {
	appendNotFoundUnitOption,
	extractNumberAndUnit,
	getCSSUnits,
	getFirstUnit,
	getUnitByValue,
	isSpecialUnit,
} from './utils';

const noopOnChange = () => {};
const EMPTY_UNITS_PROP: Array<any> = [];
const EMPTY_LABEL_PROPS: Object = {};

export type ContextUnitInput = {
	unitValue: Object,
	inputValue: string,
};

export default function InputControl({
	unitType = '',
	units: _units = EMPTY_UNITS_PROP,
	noBorder = false,
	id,
	range = false,
	label,
	labelProps: propsForLabelControl = EMPTY_LABEL_PROPS,
	columns,
	defaultValue = '',
	onChange = noopOnChange,
	field = 'input',
	className = '',
	type = 'text',
	min,
	max,
	validator,
	disabled = false,
	drag = true,
	float = true,
	arrows = false,
	size = 'normal',
	labelDescription,
	labelPopoverTitle,
	//
	singularId,
	repeaterItem,
	controlAddonTypes,
	variableTypes,
	//
	children,
	fieldProps,
	...props
}: InputControlProps): MixedElement {
	// Isolated debug block: no-op unless window.__BLOCKERA_RENDER_DEBUG__.
	if (shouldTrackComponentRender()) {
		trackComponentRender('InputControl', {
			id,
			name: label,
		});
	}

	let isValidValue = true;
	const [units, setUnits] = useState(
		isEmpty(_units) ? getCSSUnits(unitType) : _units
	);
	const [pickedUnit, setPickedUnit] = useState(getFirstUnit(units));
	const {
		value,
		setValue,
		attribute,
		blockName,
		resetToDefault,
		getControlPath,
	} = useControlContext({
		id,
		defaultValue,
		onChange,
	});

	if ('function' === typeof validator) {
		isValidValue = validator(value);
	}

	const normalizedVariableTypes = useMemo(() => {
		if (typeof variableTypes === 'string') {
			return [variableTypes];
		}

		return variableTypes;
	}, [variableTypes]);

	const controlFieldId = propsForLabelControl.controlFieldId ?? id;

	const setValueFromAddon = useCallback(
		(newValue: any): void =>
			setValueAddon(newValue, setValue, defaultValue),
		[setValue, defaultValue]
	);

	const presetInterface = useMemo(() => {
		if (
			!Array.isArray(normalizedVariableTypes) ||
			!(
				normalizedVariableTypes.includes('spacing') ||
				normalizedVariableTypes.includes('border-radius')
			)
		) {
			return undefined;
		}

		return {
			variableTypes: normalizedVariableTypes,
			unitType,
			id,
			singularId,
			attribute,
			controlFieldId,
		};
	}, [
		normalizedVariableTypes,
		unitType,
		id,
		singularId,
		attribute,
		controlFieldId,
	]);

	const {
		valueAddonClassNames,
		isSetValueAddon,
		ValueAddonControl,
		ValueAddonPointer,
		valueAddonControlProps,
	} = useValueAddon({
		types: controlAddonTypes,
		value,
		setValue: setValueFromAddon,
		variableTypes,
		onChange: setValue,
		size,
		presetInterface,
	});

	const controlPath = getControlPath(attribute, id);
	const labelProps = useMemo(
		() => ({
			value,
			singularId,
			attribute,
			blockName,
			label,
			labelDescription,
			labelPopoverTitle,
			repeaterItem,
			defaultValue,
			resetToDefault,
			mode: 'advanced',
			path: controlPath,
			...propsForLabelControl,
			controlFieldId,
		}),
		[
			value,
			singularId,
			attribute,
			blockName,
			label,
			labelDescription,
			labelPopoverTitle,
			repeaterItem,
			defaultValue,
			resetToDefault,
			controlPath,
			propsForLabelControl,
			controlFieldId,
		]
	);

	const extractedValue = useMemo(() => {
		const extracted = extractNumberAndUnit(value);

		if (extracted?.unitSimulated && pickedUnit.value === '') {
			return {
				...extracted,
				unit: '',
			};
		}

		return extracted;
	}, [value, pickedUnit.value]);

	const extractedNoUnit =
		isUndefined(extractedValue.unit) || extractedValue.unit === '';
	const unitValue = useMemo(() => {
		const resolvedUnitValue = extractedNoUnit
			? pickedUnit
			: getUnitByValue(extractedValue.unit, units);
		const fallbackUnit = getFirstUnit(units);
		const emptyUnit = { value: '', label: '', format: 'number' };

		if (typeof resolvedUnitValue?.value === 'string') {
			return resolvedUnitValue;
		}

		if (typeof fallbackUnit?.value === 'string') {
			return fallbackUnit;
		}

		return emptyUnit;
	}, [extractedNoUnit, pickedUnit, extractedValue.unit, units]);

	useEffect(() => {
		// add css units
		if (!isEmpty(unitType)) {
			const cssUnits: Array<any> = getCSSUnits(unitType);

			if (unitValue?.notFound) {
				const newUnits = [
					...cssUnits,
					{
						options: [unitValue],
						id: 'founded_from_inputs',
						label: __('Founded From Inputs', 'blockera'),
					},
				];

				setUnits(newUnits);
				setPickedUnit(unitValue);
			}
		}
		// eslint-disable-next-line
	}, []);

	const openVarPicker = valueAddonControlProps.setOpen;
	const onVariableShortcut = useCallback((): void => {
		if (variableTypes && variableTypes.length > 0) {
			openVarPicker('var-picker');
		}
	}, [variableTypes, openVarPicker]);

	const onUnitChange = useCallback(
		(newValue: ContextUnitInput): void => {
			const { inputValue, unitValue: nextUnitValue } = newValue;

			if (nextUnitValue?.notFound) {
				const nextUnits = appendNotFoundUnitOption(
					units,
					nextUnitValue
				);

				if (nextUnits !== units) {
					setUnits(nextUnits);
				}

				if (!isEmpty(value) && !inputValue) {
					setPickedUnit(nextUnitValue);
				}
			}

			if (
				isSpecialUnit(nextUnitValue.value) &&
				value !== nextUnitValue.value
			) {
				setValue(nextUnitValue.value);
			} else if (
				(extractedNoUnit || !value) &&
				'' !== inputValue &&
				(nextUnitValue.value || extractedValue.unit === '')
			) {
				setValue(inputValue + nextUnitValue.value);
			} else if (
				!extractedNoUnit &&
				value &&
				value !== nextUnitValue.value &&
				!isEmpty(inputValue)
			) {
				setValue(inputValue + nextUnitValue.value);
			} else if (
				(isEmpty(inputValue) && value) ||
				(isEmpty(inputValue) && '' === value)
			) {
				setPickedUnit(nextUnitValue);
				setValue(inputValue);
			}
		},
		[units, value, extractedNoUnit, extractedValue.unit, setValue]
	);

	const valueAddonPointer = useMemo(
		() => <ValueAddonPointer />,
		[ValueAddonPointer]
	);

	if (isSetValueAddon()) {
		return (
			<BaseControl
				columns={columns}
				controlName={field}
				className={className}
				fieldProps={fieldProps}
				{...labelProps}
				{...props}
			>
				<div
					className={controlClassNames(
						'input',
						range && 'input-range',
						noBorder && 'no-border',
						className,
						valueAddonClassNames
					)}
				>
					<ValueAddonControl />
				</div>

				{children}
			</BaseControl>
		);
	}

	return (
		<BaseControl
			label={label}
			columns={columns}
			controlName={field}
			className={className + ' ' + valueAddonClassNames}
			fieldProps={fieldProps}
			{...labelProps}
		>
			{!isEmpty(units) ? (
				<UnitInput
					isValidValue={isValidValue}
					range={range}
					inputValue={extractedValue.value}
					unitValue={unitValue}
					units={units}
					defaultValue={defaultValue}
					noBorder={noBorder}
					className={className + ' ' + valueAddonClassNames}
					disabled={disabled}
					validator={validator}
					min={min}
					max={max}
					drag={drag}
					arrows={arrows}
					size={size}
					onVariableShortcut={onVariableShortcut}
					onChange={onUnitChange}
					{...props}
				>
					{valueAddonPointer}
				</UnitInput>
			) : (
				<>
					{type === 'number' ? (
						<div
							className={controlClassNames(
								'input',
								'input-number',
								range &&
									!['small', 'extra-small'].includes(size) &&
									'is-range-active',
								className,
								valueAddonClassNames
							)}
						>
							<NumberInput
								value={value}
								setValue={setValue}
								noBorder={noBorder}
								disabled={disabled}
								validator={validator}
								isValidValue={isValidValue}
								min={min}
								max={max}
								range={range}
								drag={drag}
								float={float}
								arrows={arrows}
								size={size}
								{...props}
							>
								{valueAddonPointer}
							</NumberInput>
						</div>
					) : (
						<div
							className={controlClassNames(
								'input',
								'input-' + type,
								className,
								valueAddonClassNames
							)}
						>
							<OtherInput
								value={value}
								setValue={setValue}
								isValidValue={isValidValue}
								type={type}
								noBorder={noBorder}
								disabled={disabled}
								validator={validator}
								{...props}
							>
								{valueAddonPointer}
							</OtherInput>
						</div>
					)}
				</>
			)}
			{children}
		</BaseControl>
	);
}
