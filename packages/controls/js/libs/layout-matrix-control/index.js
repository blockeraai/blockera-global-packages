// @flow
/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import type { MixedElement } from 'react';
import { useEffect, useRef } from '@wordpress/element';

/**
 * Blockera dependencies
 */
import {
	classNames,
	controlClassNames,
	controlInnerClassNames,
} from '@blockera/classnames';
import { Icon } from '@blockera/icons';

/**
 * Internal dependencies
 */
import BaseControl from '../base-control';
import { useControlContext } from '../../context';
import type { Props } from './types';
import {
	Flex,
	Tooltip,
	SelectControl,
	CheckboxControl,
	ToggleSelectControl,
} from '../index';
import { MatrixItem } from './components/matrix-item';
import {
	isLegacyFlexLayout,
	migrateFlexLayoutToStored,
} from './flex-layout-value';
// Matrix Icons
import MatrixNormalEmptyIcon from './matrix/matrix-normal-empty';
import MatrixNormalTopLeftIcon from './matrix/matrix-normal-top-left';
import MatrixNormalTopCenterIcon from './matrix/matrix-normal-top-center';
import MatrixNormalTopRightIcon from './matrix/matrix-normal-top-right';
import MatrixNormalCenterLeftIcon from './matrix/matrix-normal-center-left';
import MatrixNormalCenterCenterIcon from './matrix/matrix-normal-center-center';
import MatrixNormalCenterRightIcon from './matrix/matrix-normal-center-right';
import MatrixNormalBottomLeftIcon from './matrix/matrix-normal-bottom-left';
import MatrixNormalBottomCenterIcon from './matrix/matrix-normal-bottom-center';
import MatrixNormalBottomRightIcon from './matrix/matrix-normal-bottom-right';
import MatrixStretchFillIcon from './matrix/matrix-stretch-fill';
import MatrixSpaceAroundStartFillIcon from './matrix/matrix-space-around-start-fill';
import MatrixSpaceAroundCenterFillIcon from './matrix/matrix-space-around-center-fill';
import MatrixSpaceAroundEndFillIcon from './matrix/matrix-space-around-end-fill';
import MatrixSpaceBetweenStartFillIcon from './matrix/matrix-space-between-start-fill';
import MatrixSpaceBetweenCenterFillIcon from './matrix/matrix-space-between-center-fill';
import MatrixSpaceBetweenEndFillIcon from './matrix/matrix-space-between-end-fill';
import MatrixStretchSpaceBetweenIcon from './matrix/matrix-stretch-space-between';
import MatrixStretchSpaceAroundIcon from './matrix/matrix-stretch-space-around';

type FlexAxisKey = 'flexJustify' | 'flexAlign';

const AXIS_CLASS_NAMES: { [key: FlexAxisKey]: string } = {
	flexJustify: 'layout-matrix__justify-content',
	flexAlign: 'layout-matrix__align-items',
};

function getAxisTooltip(
	propertyKey: FlexAxisKey,
	propertyValue: string
): string {
	const cssProperty =
		propertyKey === 'flexJustify' ? 'justify-content' : 'align-items';

	if (propertyValue) {
		return cssProperty + ': ' + propertyValue;
	}

	return cssProperty;
}

function getJustifyContentOptions(): Array<Object> {
	return [
		{
			label: __('Empty', 'blockera'),
			value: '',
			icon: (
				<Icon
					icon="justify-content-empty"
					iconSize="20"
					data-test="layout-matrix-justify-empty"
				/>
			),
		},
		{
			label: __('Start', 'blockera'),
			value: 'flex-start',
			icon: (
				<Icon
					icon="justify-content-start"
					iconSize="20"
					className="blockera-flex-justify-content-flex-start"
					data-test="layout-matrix-justify-start"
				/>
			),
		},
		{
			label: __('Center', 'blockera'),
			value: 'center',
			icon: (
				<Icon
					icon="justify-content-center"
					iconSize="20"
					data-test="layout-matrix-justify-center"
				/>
			),
		},
		{
			label: __('End', 'blockera'),
			value: 'flex-end',
			icon: (
				<Icon
					icon="justify-content-end"
					iconSize="20"
					className="blockera-flex-justify-content-flex-end"
					data-test="layout-matrix-justify-end"
				/>
			),
		},
		{
			label: __('Space Around', 'blockera'),
			value: 'space-around',
			icon: (
				<Icon
					icon="justify-content-space-around"
					iconSize="20"
					data-test="layout-matrix-justify-around"
				/>
			),
		},
		{
			label: __('Space Between', 'blockera'),
			value: 'space-between',
			icon: (
				<Icon
					icon="justify-content-space-between"
					iconSize="20"
					data-test="layout-matrix-justify-between"
				/>
			),
		},
	];
}

function getAlignItemsOptions(): Array<Object> {
	return [
		{
			label: __('Empty', 'blockera'),
			value: '',
			icon: (
				<Icon
					icon="flex-align-empty"
					iconSize="20"
					data-test="layout-matrix-align-empty"
				/>
			),
		},
		{
			label: __('Start', 'blockera'),
			value: 'flex-start',
			icon: (
				<Icon
					icon="flex-align-start"
					iconSize="20"
					data-test="layout-matrix-align-start"
				/>
			),
		},
		{
			label: __('Center', 'blockera'),
			value: 'center',
			icon: (
				<Icon
					icon="flex-align-center"
					iconSize="20"
					data-test="layout-matrix-align-center"
				/>
			),
		},
		{
			label: __('End', 'blockera'),
			value: 'flex-end',
			icon: (
				<Icon
					icon="flex-align-end"
					iconSize="20"
					data-test="layout-matrix-align-end"
				/>
			),
		},
		{
			label: __('Stretch', 'blockera'),
			value: 'stretch',
			icon: (
				<Icon
					icon="flex-align-stretch"
					iconSize="20"
					data-test="layout-matrix-align-stretch"
				/>
			),
		},
	];
}

function getAxisOptions(propertyKey: FlexAxisKey): Array<Object> {
	return propertyKey === 'flexJustify'
		? getJustifyContentOptions()
		: getAlignItemsOptions();
}

function withAxisValue(
	layout: Object,
	axisKey: FlexAxisKey,
	newValue: mixed
): Object {
	if (axisKey === 'flexJustify') {
		return {
			...layout,
			flexJustify: newValue,
		};
	}

	return {
		...layout,
		flexAlign: newValue,
	};
}

const SIMPLE_AXIS_VALUES: Set<string> = new Set([
	'',
	'flex-start',
	'center',
	'flex-end',
]);

/**
 * When flex-direction toggles, preserve on-screen layout:
 * - flex-start/center/flex-end can apply on both axes → swap properties.
 * - stretch only exists on align-items (cross); space-* only on justify-content (main)
 *   → keep values on the same property when direction changes.
 */
function remapFlexLayoutForDirectionChange(
	flexAlign: string,
	flexJustify: string,
	nextDirection: string
): {
	direction: string,
	flexAlign: string,
	flexJustify: string,
} {
	const alignSimple = SIMPLE_AXIS_VALUES.has(flexAlign);
	const justifySimple = SIMPLE_AXIS_VALUES.has(flexJustify);

	if (alignSimple && justifySimple) {
		return {
			direction: nextDirection,
			flexAlign: flexJustify,
			flexJustify: flexAlign,
		};
	}

	return {
		direction: nextDirection,
		flexAlign,
		flexJustify,
	};
}

/**
 * Map screen vertical/horizontal alignment to stored flex properties.
 * Row: justify = horizontal, align = vertical. Column: align = horizontal, justify = vertical.
 */
function flexLayoutFromScreenAxes(
	direction: string,
	vertical: string,
	horizontal: string
): {
	flexAlign: string,
	flexJustify: string,
} {
	if (direction === 'column') {
		return {
			flexAlign: horizontal,
			flexJustify: vertical,
		};
	}

	return {
		flexAlign: vertical,
		flexJustify: horizontal,
	};
}

function matchesScreenAxes(
	direction: string,
	flexAlign: string,
	flexJustify: string,
	vertical: string,
	horizontal: string
): boolean {
	const layout = flexLayoutFromScreenAxes(direction, vertical, horizontal);

	return (
		flexAlign === layout.flexAlign && flexJustify === layout.flexJustify
	);
}

export default function LayoutMatrixControl({
	isDirectionActive = true,
	defaultDirection = '',
	isDenseActive = false,
	isAxisControlsActive = true,
	//
	id,
	label,
	labelPopoverTitle,
	labelDescription,
	labelProps: propsForLabelControl = {},
	columns,
	style,
	defaultValue = {
		direction: 'row',
		flexAlign: '',
		flexJustify: '',
		dense: false,
	},
	onChange,
	field = 'layout-matrix',
	singularId,
	repeaterItem,
	//
	className,
	children,
	fieldProps,
}: Props): MixedElement {
	const {
		value: storedValue,
		setValue,
		attribute,
		blockName,
		resetToDefault,
		getControlPath,
	} = useControlContext({
		id,
		onChange,
		defaultValue,
		mergeInitialAndDefault: true,
		valueCleanup: (data) => {
			const next = isLegacyFlexLayout(data)
				? migrateFlexLayoutToStored(data)
				: data;

			if (!isDirectionActive) {
				delete next.direction;
			}

			if (!isDenseActive) {
				delete next.dense;
			}

			return next;
		},
	});

	const value = isLegacyFlexLayout(storedValue)
		? migrateFlexLayoutToStored(storedValue)
		: storedValue;

	const labelProps = {
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
		path: getControlPath(attribute, id),
		...propsForLabelControl,
	};

	let matrixType = 'normal';

	if (value.flexAlign === 'stretch') {
		if (value.flexJustify === 'space-around') {
			matrixType = 'stretch-space-around';
		} else if (value.flexJustify === 'space-between') {
			matrixType = 'stretch-space-between';
		} else {
			matrixType = 'stretch';
		}
	} else if (value.flexJustify === 'space-around') {
		matrixType = 'space-around';
	} else if (value.flexJustify === 'space-between') {
		matrixType = 'space-between';
	}

	let direction = '';
	if (isDirectionActive) {
		direction =
			value?.direction || defaultValue?.direction || defaultDirection;
	} else {
		direction = defaultDirection || defaultValue?.direction || 'row';
	}

	const isRowDirection = direction === 'row';
	const xAxisKey: FlexAxisKey = isRowDirection
		? 'flexJustify'
		: 'flexAlign';
	const yAxisKey: FlexAxisKey = isRowDirection
		? 'flexAlign'
		: 'flexJustify';

	const clickTimerRef = useRef<?TimeoutID>();

	useEffect(() => {
		if (!isLegacyFlexLayout(storedValue)) {
			return;
		}

		setValue(migrateFlexLayoutToStored(storedValue));
	}, [setValue, storedValue]);

	// Single-click commits are deferred 200ms to allow double-click detection.
	// Cancel any pending commit when the controlled value changes externally
	// (block-state / breakpoint navigation) or on unmount — otherwise the
	// deferred setValue can land on the newly active state after a fast switch.
	useEffect(() => {
		return () => {
			clearTimeout(clickTimerRef.current);
		};
	}, [value?.flexAlign, value?.flexJustify, value?.direction]);

	const createMatrixHandlers = (
		singleClickAction: () => void,
		doubleClickAction: () => void
	): ({
		onClick: () => void,
		onDoubleClick: () => void,
	}) => ({
		onClick: () => {
			clearTimeout(clickTimerRef.current);
			clickTimerRef.current = setTimeout(singleClickAction, 200);
		},
		onDoubleClick: () => {
			clearTimeout(clickTimerRef.current);
			doubleClickAction();
		},
	});

	const handleDirectionChange = (nextDirection: string): void => {
		if (
			!isDirectionActive ||
			!direction ||
			!nextDirection ||
			direction === nextDirection
		) {
			return;
		}

		const remapped = remapFlexLayoutForDirectionChange(
			value.flexAlign ?? '',
			value.flexJustify ?? '',
			nextDirection
		);

		if (
			remapped.flexAlign === value.flexAlign &&
			remapped.flexJustify === value.flexJustify &&
			remapped.direction === value?.direction
		) {
			return;
		}

		setValue({
			...value,
			...remapped,
		});
	};

	return (
		<BaseControl
			columns={columns}
			controlName={field}
			className={className}
			style={style}
			fieldProps={fieldProps}
			{...labelProps}
		>
			<Flex gap="10px" direction="column">
				{isDirectionActive && (
					<ToggleSelectControl
						id="direction"
						label=""
						options={[
							{
								label: __('Row', 'blockera'),
								'aria-label': 'flex-direction: row',
								value: 'row',
							},
							{
								label: __('Column', 'blockera'),
								'aria-label': 'flex-direction: column',
								value: 'column',
							},
						]}
						defaultValue={direction}
						onChange={handleDirectionChange}
					/>
				)}

				<Flex
					gap="12px"
					direction="row"
					justifyContent="space-between"
					className={controlClassNames(
						'layout-matrix',
						'layout-matrix__direction-' + value.direction,
						'layout-matrix__align-items-' + value.flexAlign,
						'layout-matrix__justify-content-' + value.flexJustify
					)}
				>
					<div
						className={controlInnerClassNames(
							'layout-matrix__grid',
							'layout-matrix__grid-type-' + matrixType
						)}
						data-test="layout-matrix"
					>
						{matrixType === 'normal' && (
							<>
								<MatrixItem
									id={'top-left'}
									tooltipText={
										<>
											<span>
												align-items: flex-start;
												<br />
												justify-content: flex-start;
											</span>
										</>
									}
									selected={
										value.flexAlign === 'flex-start' &&
										value.flexJustify === 'flex-start'
									}
									normalIcon={
										<MatrixNormalEmptyIcon
											direction={direction}
										/>
									}
									selectedIcon={
										<MatrixNormalTopLeftIcon
											direction={direction}
										/>
									}
									{...createMatrixHandlers(
										() => {
											setValue({
												...value,
												flexAlign: 'flex-start',
												flexJustify: 'flex-start',
											});
										},
										() => {
											setValue({
												...value,
												flexAlign: 'flex-start',
												flexJustify: 'space-between',
											});
										}
									)}
								/>

								<MatrixItem
									id={'top-center'}
									tooltipText={
										<>
											{direction === 'row' ? (
												<span>
													align-items: flex-start;
													<br />
													justify-content: center;
												</span>
											) : (
												<span>
													align-items: center;
													<br />
													justify-content: flex-start;
												</span>
											)}
										</>
									}
									selected={matchesScreenAxes(
										direction,
										value.flexAlign ?? '',
										value.flexJustify ?? '',
										'flex-start',
										'center'
									)}
									normalIcon={
										<MatrixNormalEmptyIcon
											direction={direction}
										/>
									}
									selectedIcon={
										<MatrixNormalTopCenterIcon
											direction={direction}
										/>
									}
									{...createMatrixHandlers(
										() => {
											setValue({
												...value,
												...flexLayoutFromScreenAxes(
													direction,
													'flex-start',
													'center'
												),
											});
										},
										() => {
											if (direction === 'row') {
												setValue({
													...value,
													flexAlign: 'flex-start',
													flexJustify:
														'space-between',
												});
											} else {
												setValue({
													...value,
													flexAlign: 'center',
													flexJustify:
														'space-between',
												});
											}
										}
									)}
								/>

								<MatrixItem
									id={'top-right'}
									tooltipText={
										<>
											{direction === 'row' ? (
												<span>
													align-items: flex-start;
													<br />
													justify-content: flex-end;
												</span>
											) : (
												<span>
													align-items: flex-end;
													<br />
													justify-content: flex-start;
												</span>
											)}
										</>
									}
									selected={matchesScreenAxes(
										direction,
										value.flexAlign ?? '',
										value.flexJustify ?? '',
										'flex-start',
										'flex-end'
									)}
									normalIcon={
										<MatrixNormalEmptyIcon
											direction={direction}
										/>
									}
									selectedIcon={
										<MatrixNormalTopRightIcon
											direction={direction}
										/>
									}
									{...createMatrixHandlers(
										() => {
											setValue({
												...value,
												...flexLayoutFromScreenAxes(
													direction,
													'flex-start',
													'flex-end'
												),
											});
										},
										() => {
											if (direction === 'row') {
												setValue({
													...value,
													flexAlign: 'flex-start',
													flexJustify:
														'space-between',
												});
											} else {
												setValue({
													...value,
													flexAlign: 'flex-end',
													flexJustify:
														'space-between',
												});
											}
										}
									)}
								/>

								<MatrixItem
									id={'center-left'}
									tooltipText={
										<>
											{direction === 'row' ? (
												<span>
													align-items: center;
													<br />
													justify-content: flex-start;
												</span>
											) : (
												<span>
													align-items: flex-start;
													<br />
													justify-content: center;
												</span>
											)}
										</>
									}
									selected={matchesScreenAxes(
										direction,
										value.flexAlign ?? '',
										value.flexJustify ?? '',
										'center',
										'flex-start'
									)}
									normalIcon={
										<MatrixNormalEmptyIcon
											direction={direction}
										/>
									}
									selectedIcon={
										<MatrixNormalCenterLeftIcon
											direction={direction}
										/>
									}
									{...createMatrixHandlers(
										() => {
											setValue({
												...value,
												...flexLayoutFromScreenAxes(
													direction,
													'center',
													'flex-start'
												),
											});
										},
										() => {
											if (direction === 'row') {
												setValue({
													...value,
													flexAlign: 'center',
													flexJustify:
														'space-between',
												});
											} else {
												setValue({
													...value,
													flexAlign: 'flex-start',
													flexJustify:
														'space-between',
												});
											}
										}
									)}
								/>

								<MatrixItem
									id={'center-center'}
									tooltipText={
										<>
											<span>
												align-items: center;
												<br />
												justify-content: center;
											</span>
										</>
									}
									selected={
										value.flexAlign === 'center' &&
										value.flexJustify === 'center'
									}
									normalIcon={
										<MatrixNormalEmptyIcon
											direction={direction}
										/>
									}
									selectedIcon={
										<MatrixNormalCenterCenterIcon
											direction={direction}
										/>
									}
									{...createMatrixHandlers(
										() => {
											setValue({
												...value,
												flexAlign: 'center',
												flexJustify: 'center',
											});
										},
										() => {
											setValue({
												...value,
												flexAlign: 'center',
												flexJustify: 'space-between',
											});
										}
									)}
								/>

								<MatrixItem
									id={'center-right'}
									tooltipText={
										<>
											{direction === 'row' ? (
												<span>
													align-items: center;
													<br />
													justify-content: flex-end;
												</span>
											) : (
												<span>
													align-items: flex-end;
													<br />
													justify-content: center;
												</span>
											)}
										</>
									}
									selected={matchesScreenAxes(
										direction,
										value.flexAlign ?? '',
										value.flexJustify ?? '',
										'center',
										'flex-end'
									)}
									normalIcon={
										<MatrixNormalEmptyIcon
											direction={direction}
										/>
									}
									selectedIcon={
										<MatrixNormalCenterRightIcon
											direction={direction}
										/>
									}
									{...createMatrixHandlers(
										() => {
											setValue({
												...value,
												...flexLayoutFromScreenAxes(
													direction,
													'center',
													'flex-end'
												),
											});
										},
										() => {
											if (direction === 'row') {
												setValue({
													...value,
													flexAlign: 'center',
													flexJustify:
														'space-between',
												});
											} else {
												setValue({
													...value,
													flexAlign: 'flex-end',
													flexJustify:
														'space-between',
												});
											}
										}
									)}
								/>

								<MatrixItem
									id={'bottom-left'}
									tooltipText={
										<>
											{direction === 'row' ? (
												<span>
													align-items: flex-end;
													<br />
													justify-content: flex-start;
												</span>
											) : (
												<span>
													align-items: flex-start;
													<br />
													justify-content: flex-end;
												</span>
											)}
										</>
									}
									selected={matchesScreenAxes(
										direction,
										value.flexAlign ?? '',
										value.flexJustify ?? '',
										'flex-end',
										'flex-start'
									)}
									normalIcon={
										<MatrixNormalEmptyIcon
											direction={direction}
										/>
									}
									selectedIcon={
										<MatrixNormalBottomLeftIcon
											direction={direction}
										/>
									}
									{...createMatrixHandlers(
										() => {
											setValue({
												...value,
												...flexLayoutFromScreenAxes(
													direction,
													'flex-end',
													'flex-start'
												),
											});
										},
										() => {
											if (direction === 'row') {
												setValue({
													...value,
													flexAlign: 'flex-end',
													flexJustify:
														'space-between',
												});
											} else {
												setValue({
													...value,
													flexAlign: 'flex-start',
													flexJustify:
														'space-between',
												});
											}
										}
									)}
								/>

								<MatrixItem
									id={'bottom-center'}
									tooltipText={
										<>
											{direction === 'row' ? (
												<span>
													align-items: flex-end;
													<br />
													justify-content: center;
												</span>
											) : (
												<span>
													align-items: center;
													<br />
													justify-content: flex-end;
												</span>
											)}
										</>
									}
									selected={matchesScreenAxes(
										direction,
										value.flexAlign ?? '',
										value.flexJustify ?? '',
										'flex-end',
										'center'
									)}
									normalIcon={
										<MatrixNormalEmptyIcon
											direction={direction}
										/>
									}
									selectedIcon={
										<MatrixNormalBottomCenterIcon
											direction={direction}
										/>
									}
									{...createMatrixHandlers(
										() => {
											setValue({
												...value,
												...flexLayoutFromScreenAxes(
													direction,
													'flex-end',
													'center'
												),
											});
										},
										() => {
											if (direction === 'row') {
												setValue({
													...value,
													flexAlign: 'flex-end',
													flexJustify:
														'space-between',
												});
											} else {
												setValue({
													...value,
													flexAlign: 'center',
													flexJustify:
														'space-between',
												});
											}
										}
									)}
								/>

								<MatrixItem
									id={'bottom-right'}
									tooltipText={
										<>
											<span>
												align-items: flex-end;
												<br />
												justify-content: flex-end;
											</span>
										</>
									}
									selected={
										value.flexAlign === 'flex-end' &&
										value.flexJustify === 'flex-end'
									}
									normalIcon={
										<MatrixNormalEmptyIcon
											direction={direction}
										/>
									}
									selectedIcon={
										<MatrixNormalBottomRightIcon
											direction={direction}
										/>
									}
									{...createMatrixHandlers(
										() => {
											setValue({
												...value,
												flexAlign: 'flex-end',
												flexJustify: 'flex-end',
											});
										},
										() => {
											setValue({
												...value,
												flexAlign: 'flex-end',
												flexJustify: 'space-between',
											});
										}
									)}
								/>
							</>
						)}

						{matrixType === 'stretch-space-around' && (
							<>
								<MatrixItem
									id={'stretch-space-around'}
									tooltipText={
										<>
											<span>
												align-items: stretch;
												<br />
												justify-content: space-around;
											</span>
										</>
									}
									selected={
										value.flexAlign === 'stretch' &&
										value.flexJustify === 'space-around'
									}
									normalIcon={
										<MatrixStretchSpaceAroundIcon
											direction={direction}
										/>
									}
									selectedIcon={
										<MatrixStretchSpaceAroundIcon
											direction={direction}
										/>
									}
									{...createMatrixHandlers(
										() => {
											setValue({
												...value,
												flexAlign: 'stretch',
												flexJustify: 'space-around',
											});
										},
										() => {
											setValue({
												...value,
												flexAlign: 'center',
												flexJustify: 'center',
											});
										}
									)}
								/>
							</>
						)}

						{matrixType === 'stretch-space-between' && (
							<>
								<MatrixItem
									id={'stretch-space-between'}
									tooltipText={
										<>
											<span>
												align-items: stretch;
												<br />
												justify-content: space-between;
											</span>
										</>
									}
									selected={
										value.flexAlign === 'stretch' &&
										value.flexJustify === 'space-between'
									}
									normalIcon={
										<MatrixStretchSpaceBetweenIcon
											direction={direction}
										/>
									}
									selectedIcon={
										<MatrixStretchSpaceBetweenIcon
											direction={direction}
										/>
									}
									{...createMatrixHandlers(
										() => {
											setValue({
												...value,
												flexAlign: 'stretch',
												flexJustify: 'space-between',
											});
										},
										() => {
											setValue({
												...value,
												flexAlign: 'center',
												flexJustify: 'center',
											});
										}
									)}
								/>
							</>
						)}

						{matrixType === 'stretch' && (
							<>
								<MatrixItem
									id={'start'}
									tooltipText={
										<>
											<span>
												align-items: stretch;
												<br />
												justify-content: flex-start;
											</span>
										</>
									}
									selected={
										value.flexAlign === 'stretch' &&
										value.flexJustify === 'flex-start'
									}
									normalIcon={
										<MatrixStretchFillIcon
											direction={direction}
										/>
									}
									selectedIcon={
										<MatrixStretchFillIcon
											direction={direction}
										/>
									}
									{...createMatrixHandlers(
										() => {
											setValue({
												...value,
												flexAlign: 'stretch',
												flexJustify: 'flex-start',
											});
										},
										() => {
											setValue({
												...value,
												flexAlign: 'center',
												flexJustify: 'flex-start',
											});
										}
									)}
								/>

								<MatrixItem
									id={'center'}
									tooltipText={
										<>
											<span>
												align-items: stretch;
												<br />
												justify-content: center;
											</span>
										</>
									}
									selected={
										value.flexAlign === 'stretch' &&
										value.flexJustify === 'center'
									}
									normalIcon={
										<MatrixStretchFillIcon
											direction={direction}
										/>
									}
									selectedIcon={
										<MatrixStretchFillIcon
											direction={direction}
										/>
									}
									{...createMatrixHandlers(
										() => {
											setValue({
												...value,
												flexAlign: 'stretch',
												flexJustify: 'center',
											});
										},
										() => {
											setValue({
												...value,
												flexAlign: 'center',
												flexJustify: 'center',
											});
										}
									)}
								/>

								<MatrixItem
									id={'end'}
									tooltipText={
										<>
											<span>
												align-items: stretch;
												<br />
												justify-content: flex-end;
											</span>
										</>
									}
									selected={
										value.flexAlign === 'stretch' &&
										value.flexJustify === 'flex-end'
									}
									normalIcon={
										<MatrixStretchFillIcon
											direction={direction}
										/>
									}
									selectedIcon={
										<MatrixStretchFillIcon
											direction={direction}
										/>
									}
									{...createMatrixHandlers(
										() => {
											setValue({
												...value,
												flexAlign: 'stretch',
												flexJustify: 'flex-end',
											});
										},
										() => {
											setValue({
												...value,
												flexAlign: 'center',
												flexJustify: 'flex-end',
											});
										}
									)}
								/>
							</>
						)}

						{matrixType === 'space-around' && (
							<>
								<MatrixItem
									id={'start'}
									tooltipText={
										<>
											<span>
												align-items: flex-start;
												<br />
												justify-content: space-around;
											</span>
										</>
									}
									selected={
										value.flexAlign === 'flex-start' &&
										value.flexJustify === 'space-around'
									}
									normalIcon={
										<MatrixSpaceAroundStartFillIcon
											direction={direction}
										/>
									}
									selectedIcon={
										<MatrixSpaceAroundStartFillIcon
											direction={direction}
										/>
									}
									{...createMatrixHandlers(
										() => {
											setValue({
												...value,
												flexAlign: 'flex-start',
												flexJustify: 'space-around',
											});
										},
										() => {
											setValue({
												...value,
												flexAlign: 'stretch',
												flexJustify: 'flex-start',
											});
										}
									)}
								/>

								<MatrixItem
									id={'center'}
									tooltipText={
										<>
											<span>
												align-items: center;
												<br />
												justify-content: space-around;
											</span>
										</>
									}
									selected={
										value.flexAlign === 'center' &&
										value.flexJustify === 'space-around'
									}
									normalIcon={
										<MatrixSpaceAroundCenterFillIcon
											direction={direction}
										/>
									}
									selectedIcon={
										<MatrixSpaceAroundCenterFillIcon
											direction={direction}
										/>
									}
									{...createMatrixHandlers(
										() => {
											setValue({
												...value,
												flexAlign: 'center',
												flexJustify: 'space-around',
											});
										},
										() => {
											setValue({
												...value,
												flexAlign: 'stretch',
												flexJustify: 'center',
											});
										}
									)}
								/>

								<MatrixItem
									id={'end'}
									tooltipText={
										<>
											<span>
												align-items: flex-end;
												<br />
												justify-content: space-around;
											</span>
										</>
									}
									selected={
										value.flexAlign === 'flex-end' &&
										value.flexJustify === 'space-around'
									}
									normalIcon={
										<MatrixSpaceAroundEndFillIcon
											direction={direction}
										/>
									}
									selectedIcon={
										<MatrixSpaceAroundEndFillIcon
											direction={direction}
										/>
									}
									{...createMatrixHandlers(
										() => {
											setValue({
												...value,
												flexAlign: 'flex-end',
												flexJustify: 'space-around',
											});
										},
										() => {
											setValue({
												...value,
												flexAlign: 'stretch',
												flexJustify: 'flex-end',
											});
										}
									)}
								/>
							</>
						)}

						{matrixType === 'space-between' && (
							<>
								<MatrixItem
									id={'start'}
									tooltipText={
										<>
											<span>
												align-items: flex-start;
												<br />
												justify-content: space-between;
											</span>
										</>
									}
									selected={
										value.flexAlign === 'flex-start' &&
										value.flexJustify === 'space-between'
									}
									normalIcon={
										<MatrixSpaceBetweenStartFillIcon
											direction={direction}
										/>
									}
									selectedIcon={
										<MatrixSpaceBetweenStartFillIcon
											direction={direction}
										/>
									}
									{...createMatrixHandlers(
										() => {
											setValue({
												...value,
												flexAlign: 'flex-start',
												flexJustify: 'space-between',
											});
										},
										() => {
											setValue({
												...value,
												flexAlign: 'flex-start',
												flexJustify: 'space-around',
											});
										}
									)}
								/>

								<MatrixItem
									id={'center'}
									tooltipText={
										<>
											<span>
												align-items: center;
												<br />
												justify-content: space-between;
											</span>
										</>
									}
									selected={
										value.flexAlign === 'center' &&
										value.flexJustify === 'space-between'
									}
									normalIcon={
										<MatrixSpaceBetweenCenterFillIcon
											direction={direction}
										/>
									}
									selectedIcon={
										<MatrixSpaceBetweenCenterFillIcon
											direction={direction}
										/>
									}
									{...createMatrixHandlers(
										() => {
											setValue({
												...value,
												flexAlign: 'center',
												flexJustify: 'space-between',
											});
										},
										() => {
											setValue({
												...value,
												flexAlign: 'center',
												flexJustify: 'space-around',
											});
										}
									)}
								/>

								<MatrixItem
									id={'end'}
									tooltipText={
										<>
											<span>
												align-items: flex-end;
												<br />
												justify-content: space-between;
											</span>
										</>
									}
									selected={
										value.flexAlign === 'flex-end' &&
										value.flexJustify === 'space-between'
									}
									normalIcon={
										<MatrixSpaceBetweenEndFillIcon
											direction={direction}
										/>
									}
									selectedIcon={
										<MatrixSpaceBetweenEndFillIcon
											direction={direction}
										/>
									}
									{...createMatrixHandlers(
										() => {
											setValue({
												...value,
												flexAlign: 'flex-end',
												flexJustify: 'space-between',
											});
										},
										() => {
											setValue({
												...value,
												flexAlign: 'flex-end',
												flexJustify: 'space-around',
											});
										}
									)}
								/>
							</>
						)}
					</div>

					{/* Unmount X/Y SelectControls when unused (faster than CSS hide). */}
					{isAxisControlsActive && (
						<Flex
							direction="column"
							justifyContent="space-between"
							className={controlInnerClassNames(
								'layout-matrix__controls'
							)}
							data-test="layout-matrix-axis-controls"
							grow={1}
						>
							<Tooltip
								text={getAxisTooltip(
									xAxisKey,
									value[xAxisKey] ?? ''
								)}
							>
								<SelectControl
									id={xAxisKey}
									label={
										<Icon
											icon="axis-x"
											style={{ fill: 'currentColor' }}
										/>
									}
									labelPopoverTitle={__(
										'Horizontal',
										'blockera'
									)}
									labelDescription={
										<>
											<p>
												{__(
													'Control horizontal spacing and positioning from left to right',
													'blockera'
												)}
											</p>
										</>
									}
									labelProps={{
										changesetGraphPreview: {
											type: 'string',
										},
									}}
									columns="30px 1fr"
									style={{
										'--gap': '0',
									}}
									options={getAxisOptions(xAxisKey)}
									onChange={(newValue) => {
										setValue(
											withAxisValue(
												value,
												xAxisKey,
												newValue
											)
										);
									}}
									type="custom"
									defaultValue={defaultValue[xAxisKey]}
									className={classNames(
										'input-hide-label',
										AXIS_CLASS_NAMES[xAxisKey],
										'selected-item-' +
											(value[xAxisKey] || 'empty')
									)}
								/>
							</Tooltip>

							<Tooltip
								text={getAxisTooltip(
									yAxisKey,
									value[yAxisKey] ?? ''
								)}
							>
								<SelectControl
									id={yAxisKey}
									label={
										<Icon
											icon="axis-y"
											style={{ fill: 'currentColor' }}
										/>
									}
									labelPopoverTitle={__(
										'Vertical',
										'blockera'
									)}
									labelDescription={
										<p>
											{__(
												'Control vertical spacing and positioning from top to bottom',
												'blockera'
											)}
										</p>
									}
									labelProps={{
										changesetGraphPreview: {
											type: 'string',
										},
									}}
									columns="30px 1fr"
									style={{
										'--gap': '0',
									}}
									options={getAxisOptions(yAxisKey)}
									onChange={(newValue) => {
										setValue(
											withAxisValue(
												value,
												yAxisKey,
												newValue
											)
										);
									}}
									type="custom"
									defaultValue={defaultValue[yAxisKey]}
									className={classNames(
										'input-hide-label',
										AXIS_CLASS_NAMES[yAxisKey],
										'selected-item-' +
											(value[yAxisKey] || 'empty')
									)}
								/>
							</Tooltip>
						</Flex>
					)}
				</Flex>

				{isDenseActive && (
					<CheckboxControl
						id="dense"
						checkboxLabel={
							<>
								{__('Dense', 'blockera')}
								<Tooltip
									text={
										<span
											style={{
												width: '210px',
												display: 'block',
												textAlign: 'left',
												textWrap: 'pretty',
											}}
										>
											<b>
												{__(
													'Dense mode:',
													'blockera'
												)}{' '}
											</b>
											{__(
												'fills empty spaces with items that fit, potentially changing their visual order.',
												'blockera'
											)}
										</span>
									}
								>
									<span>
										<Icon
											icon="information"
											iconSize="18"
											style={{
												opacity: '30%',
											}}
										/>
									</span>
								</Tooltip>
							</>
						}
						onChange={(newValue) =>
							setValue({
								...value,
								dense: newValue,
							})
						}
					/>
				)}

				{children}
			</Flex>
		</BaseControl>
	);
}
