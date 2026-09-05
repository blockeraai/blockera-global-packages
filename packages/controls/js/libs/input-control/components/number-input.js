// @flow
/**
 * External dependencies
 */
import type { MixedElement } from 'react';
import { memo, useCallback, useMemo } from '@wordpress/element';

/**
 * Blockera dependencies
 */
import {
	controlClassNames,
	controlInnerClassNames,
} from '@blockera/classnames';
import {
	isNumber,
	isString,
	isUndefined,
	isEmpty,
	useDragValue,
} from '@blockera/utils';

/**
 * Internal dependencies
 */
import { RangeControl } from '../../index';
import type { InnerInputControlProps } from '../types';
import { InputArrows } from './input-arrows';

const EMPTY_CONSTRAINTS: Object = {};
const PASTE_NUMBER_REGEX = /^(-?\d+(\.\d+)?)$/;
const FLOAT_STRIP_REGEX = /[^-\.0-9]/g;
const INT_STRIP_REGEX = /[^-0-9]/g;

export const NumberInput = memo(function NumberInput({
	value,
	setValue,
	noBorder,
	className,
	disabled,
	validator,
	min,
	max,
	range = false,
	arrows = false,
	drag = true,
	float = true,
	actions = '',
	children,
	size,
	isValidValue,
	...props
}: InnerInputControlProps): MixedElement {
	const minValue = useMemo(() => {
		if (!isUndefined(min) && isNumber(+min)) {
			return { min: +min };
		}

		return EMPTY_CONSTRAINTS;
	}, [min]);

	const maxValue = useMemo(() => {
		if (!isUndefined(max) && isNumber(+max)) {
			return { max: +max };
		}

		return EMPTY_CONSTRAINTS;
	}, [max]);

	const handleKeyDown = useCallback(
		(event: Object) => {
			const regex = new RegExp(
				`${
					value === '' ? '(^-?\\d*$)' : '(^\\d*$)'
				}|(Backspace|Tab|Delete|ArrowLeft|ArrowRight|ArrowUp|ArrowDown${
					float ? '|\\.' : ''
				})`
			);

			if (
				!(
					(event.ctrlKey || event.metaKey) &&
					(event.key.toLowerCase() === 'a' ||
						event.key.toLowerCase() === 'v' ||
						event.key.toLowerCase() === 'c' ||
						event.key.toLowerCase() === 'r')
				) &&
				!event.key.match(regex)
			) {
				event.preventDefault();
			}
		},
		[value, float]
	);

	const handlePaste = useCallback(
		(event: Object) => {
			const clipboardData = event.clipboardData || window.clipboardData;
			const pastedText: string = clipboardData.getData('text');

			if (!PASTE_NUMBER_REGEX.test(pastedText)) {
				event.preventDefault();
				return;
			}

			if (!isEmpty(minValue?.min) && +pastedText < minValue.min) {
				event.preventDefault();
				return;
			}

			if (!isEmpty(maxValue?.max) && +pastedText > +maxValue.max) {
				event.preventDefault();
			}
		},
		[minValue, maxValue]
	);

	const handleInputChange = useCallback(
		(event: Object) => {
			let nextValue = event.target.value.replace(
				float ? FLOAT_STRIP_REGEX : INT_STRIP_REGEX,
				''
			);

			if (!isEmpty(nextValue)) {
				if (!isEmpty(minValue?.min) && nextValue < minValue.min) {
					nextValue = minValue.min;
				} else if (
					!isEmpty(maxValue?.max) &&
					nextValue > maxValue.max
				) {
					nextValue = maxValue.max;
				}

				setValue(+nextValue);
			} else {
				setValue(nextValue);
			}
		},
		[float, minValue, maxValue, setValue]
	);

	const { onDragStart, onDragEnd } = useDragValue({
		value: isString(value)
			? //$FlowFixMe
				value.replace(float ? FLOAT_STRIP_REGEX : INT_STRIP_REGEX, '')
			: +value,
		setValue,
		movement: 'vertical',
		...minValue,
		...maxValue,
	});

	const dragEvent = drag
		? {
				onMouseDown: onDragStart,
				onMouseUp: onDragEnd,
			}
		: EMPTY_CONSTRAINTS;

	const onRangeChange = useCallback(
		(newValue: number) => {
			setValue(newValue);
		},
		[setValue]
	);

	return (
		<>
			{range && !['small', 'extra-small'].includes(size) && (
				<RangeControl
					withInputField={false}
					sideEffect={false}
					onChange={onRangeChange}
					disabled={disabled}
					{...minValue}
					{...maxValue}
					{...props}
				/>
			)}

			<input
				//$FlowFixMe
				value={value}
				disabled={disabled}
				className={controlClassNames(
					'input-tag',
					'input-tag-number',
					noBorder && 'no-border',
					!isValidValue && 'invalid',
					drag && 'is-drag-active',
					className
				)}
				onKeyDown={handleKeyDown}
				onPaste={handlePaste}
				{...minValue}
				{...maxValue}
				{...props}
				onChange={handleInputChange}
				type="number"
				{...dragEvent}
			/>

			<div className={controlInnerClassNames('input-actions')}>
				{arrows && (
					<InputArrows
						value={value}
						setValue={setValue}
						disabled={disabled}
						min={min}
						max={max}
						size={size}
					/>
				)}

				{actions}
			</div>

			{children}
		</>
	);
});
