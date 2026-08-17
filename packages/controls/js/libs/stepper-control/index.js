// @flow

/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import type { MixedElement } from 'react';
import { useCallback, useMemo, useState } from '@wordpress/element';

/**
 * Blockera dependencies
 */
import {
	controlClassNames,
	controlInnerClassNames,
} from '@blockera/classnames';
import { isUndefined } from '@blockera/utils';
import { Icon } from '@blockera/icons';

/**
 * Internal dependencies
 */
import { Button } from '../button';
import BaseControl from '../base-control';
import { useControlContext } from '../../context';
import type { TStepperControlProps } from './types';
import {
	clampOrWrap,
	isAtBound,
	isFiniteNumber,
	parseStepperValue,
	stepValue,
} from './utils';

function getButtonSize(size: string): 'small' | 'extra-small' {
	return 'extra-small' === size ? 'extra-small' : 'small';
}

function toDisplayValue(value: mixed): string {
	if ('' === value || null === value || typeof value === 'undefined') {
		return '';
	}

	return String(value);
}

export default function StepperControl({
	id,
	label,
	labelPopoverTitle,
	labelDescription,
	labelProps: propsForLabelControl = {},
	repeaterItem,
	singularId,
	columns,
	className,
	children,
	field = 'stepper',
	defaultValue = 0,
	onChange,
	min,
	max,
	step = 1,
	shiftStep = 10,
	float = false,
	disabled = false,
	size = 'normal',
	showButtons = true,
	allowEmpty = false,
	wrap = false,
	inputWidth,
	prefix,
	suffix,
	placeholder,
	validator,
	sideEffect = true,
	fieldProps,
	...props
}: TStepperControlProps): MixedElement {
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

	const [isFocused, setIsFocused] = useState(false);
	const [draft, setDraft] = useState('');

	const labelProps = {
		value,
		singularId,
		attribute,
		blockName,
		label,
		labelPopoverTitle,
		labelDescription,
		repeaterItem,
		defaultValue,
		resetToDefault,
		mode: 'advanced',
		path: getControlPath(attribute, id),
		...propsForLabelControl,
	};

	const tryCommit = useCallback(
		(next: number | string): boolean => {
			if ('function' === typeof validator && !validator(next)) {
				return false;
			}

			if (sideEffect) {
				setValue(next);
				return true;
			}

			if ('function' === typeof onChange) {
				onChange(next);
			}

			return true;
		},
		[onChange, setValue, sideEffect, validator]
	);

	const numericValue = isFiniteNumber(value) ? value : 0;
	// Show the in-progress keystrokes while focused; otherwise the committed value.
	const displayValue = isFocused ? draft : toDisplayValue(value);
	const parsedDisplay = parseStepperValue(displayValue, float);
	const isValidValue =
		'function' !== typeof validator
			? null !== parsedDisplay
			: null !== parsedDisplay &&
				('' === parsedDisplay ? allowEmpty : validator(parsedDisplay));

	const minusDisabled =
		disabled || (!wrap && isAtBound(numericValue, min) && '' !== value);
	const plusDisabled =
		disabled || (!wrap && isAtBound(numericValue, max) && '' !== value);

	const applyStep = useCallback(
		(direction: 1 | -1, shift: boolean): void => {
			if (disabled) {
				return;
			}

			const next = stepValue(value, direction, {
				min,
				max,
				step,
				shiftStep,
				shift,
				wrap,
				float,
			});

			if (tryCommit(next)) {
				setDraft(String(next));
			}
		},
		[
			disabled,
			float,
			max,
			min,
			shiftStep,
			step,
			tryCommit,
			value,
			wrap,
		]
	);

	const handleInputChange = useCallback(
		(event: SyntheticInputEvent<HTMLInputElement>) => {
			const nextDraft = event.target.value;

			setDraft(nextDraft);

			const parsed = parseStepperValue(nextDraft, float);

			if ('' === parsed) {
				if (allowEmpty) {
					tryCommit('');
				}
				return;
			}

			if (null === parsed) {
				return;
			}

			// Commit while typing so ± / arrows use the latest number, not the pre-edit value.
			tryCommit(parsed);
		},
		[allowEmpty, float, tryCommit]
	);

	const handleBlur = useCallback((): void => {
		setIsFocused(false);

		const parsed = parseStepperValue(draft, float);

		if ('' === parsed || null === parsed) {
			if (allowEmpty) {
				tryCommit('');
				setDraft('');
				return;
			}

			const fallback = isFiniteNumber(value)
				? value
				: clampOrWrap(isFiniteNumber(defaultValue) ? defaultValue : 0, {
						min,
						max,
						wrap: false,
					});

			tryCommit(fallback);
			setDraft(String(fallback));
			return;
		}

		// Typed values always clamp. Wrap is only for ± / arrow steps.
		const clamped = clampOrWrap(parsed, { min, max, wrap: false });

		if (tryCommit(clamped)) {
			setDraft(String(clamped));
		}
	}, [allowEmpty, defaultValue, draft, float, max, min, tryCommit, value]);

	const handleKeyDown = useCallback(
		(event: SyntheticKeyboardEvent<HTMLInputElement>) => {
			if (disabled) {
				return;
			}

			if ('ArrowUp' === event.key) {
				event.preventDefault();
				applyStep(1, event.shiftKey);
				return;
			}

			if ('ArrowDown' === event.key) {
				event.preventDefault();
				applyStep(-1, event.shiftKey);
				return;
			}

			if ('Home' === event.key && !isUndefined(min)) {
				event.preventDefault();
				if (tryCommit(min)) {
					setDraft(String(min));
				}
				return;
			}

			if ('End' === event.key && !isUndefined(max)) {
				event.preventDefault();
				if (tryCommit(max)) {
					setDraft(String(max));
				}
			}
		},
		[applyStep, disabled, max, min, tryCommit]
	);

	const handleFocus = useCallback(() => {
		setDraft(toDisplayValue(value));
		setIsFocused(true);
	}, [value]);

	const handleMinusClick = useCallback(
		(event: SyntheticMouseEvent<HTMLButtonElement>) => {
			applyStep(-1, event.shiftKey);
		},
		[applyStep]
	);

	const handlePlusClick = useCallback(
		(event: SyntheticMouseEvent<HTMLButtonElement>) => {
			applyStep(1, event.shiftKey);
		},
		[applyStep]
	);

	const inputStyle = useMemo(
		() => (undefined !== inputWidth ? { width: inputWidth } : undefined),
		[inputWidth]
	);
	const decreaseLabel = __('Decrease', 'blockera');
	const increaseLabel = __('Increase', 'blockera');

	return (
		<BaseControl
			columns={columns}
			controlName={field}
			className={className}
			fieldProps={fieldProps}
			{...labelProps}
		>
			<div
				className={controlClassNames(
					'stepper',
					className,
					`size-${size}`,
					disabled && 'is-disabled',
					!isValidValue && 'is-invalid'
				)}
				data-test="stepper-control"
			>
				{showButtons && (
					<Button
						type="button"
						variant="tertiary"
						noBorder={true}
						size={getButtonSize(size)}
						disabled={minusDisabled}
						className={controlInnerClassNames('stepper-button')}
						label={decreaseLabel}
						aria-label={decreaseLabel}
						showTooltip={true}
						tooltipPosition="top"
						data-test="stepper-minus"
						onClick={handleMinusClick}
					>
						<Icon icon="minus" library="ui" iconSize={18} />
					</Button>
				)}

				{prefix ? (
					<span className={controlInnerClassNames('stepper-prefix')}>
						{prefix}
					</span>
				) : null}

				<input
					{...props}
					type="number"
					value={displayValue}
					min={min}
					max={max}
					step={step}
					disabled={disabled}
					placeholder={placeholder}
					style={inputStyle}
					className={controlInnerClassNames(
						'stepper-input',
						!isValidValue && 'invalid'
					)}
					data-test="stepper-input"
					onFocus={handleFocus}
					onBlur={handleBlur}
					onChange={handleInputChange}
					onKeyDown={handleKeyDown}
				/>

				{suffix ? (
					<span className={controlInnerClassNames('stepper-suffix')}>
						{suffix}
					</span>
				) : null}

				{showButtons && (
					<Button
						type="button"
						variant="tertiary"
						noBorder={true}
						size={getButtonSize(size)}
						disabled={plusDisabled}
						className={controlInnerClassNames('stepper-button')}
						label={increaseLabel}
						aria-label={increaseLabel}
						showTooltip={true}
						tooltipPosition="top"
						data-test="stepper-plus"
						onClick={handlePlusClick}
					>
						<Icon icon="plus" library="ui" iconSize={18} />
					</Button>
				)}
			</div>

			{children}
		</BaseControl>
	);
}
