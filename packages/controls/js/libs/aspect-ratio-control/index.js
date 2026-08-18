// @flow
/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import type { MixedElement } from 'react';

/**
 * Internal dependencies
 */
import Flex from '../flex';
import BaseControl from '../base-control';
import InputControl from '../input-control';
import SelectControl from '../select-control';
import { useControlContext } from '../../context';
import type { AspectRatioControlProps, AspectRatioValue } from './types';
import {
	DEFAULT_ASPECT_RATIO_VALUE,
	getAspectRatioSelectOptions,
} from './utils';
import './style.scss';

export type * from './types';
export * from './utils';

const EMPTY_FIELD_PROPS = {};

function hasLegacyValueKey(raw: mixed): boolean {
	if (!raw || typeof raw !== 'object') {
		return false;
	}
	const anyRaw: Object = raw;
	return anyRaw.hasOwnProperty('value');
}

export default function AspectRatioControl({
	ratio,
	label = __('Aspect Ratio', 'blockera'),
	labelDescription = (
		<>
			<p>
				{__(
					'Aspect Ratio Control allows for maintaining a specific width-to-height ratio for blocks, ensuring consistent and responsive sizing across devices.',
					'blockera'
				)}
			</p>
			<p>
				{__(
					'Crucial for media blocks like images and videos, this feature preserves the original proportions, enhancing visual appeal and preventing distortion.',
					'blockera'
				)}
			</p>
			<p>
				{__(
					'The aspect ratio is calculated in this format:',
					'blockera'
				)}{' '}
				<>
					<code>width</code>
					{' / '}
					<code>height</code>
				</>
			</p>
		</>
	),
	labelProps: propsForLabelControl = {},
	defaultValue = DEFAULT_ASPECT_RATIO_VALUE,
	onChange,
	columns = '1fr 2.5fr',
	fieldProps = EMPTY_FIELD_PROPS,
	...props
}: AspectRatioControlProps): MixedElement {
	const { value, setValue, attribute, blockName, resetToDefault } =
		useControlContext({
			onChange,
			defaultValue,
			mergeInitialAndDefault: true,
			valueCleanup: (newValue: AspectRatioValue) => {
				if (newValue?.val === undefined || newValue?.val === '') {
					return defaultValue;
				}

				return newValue;
			},
		});

	const current: AspectRatioValue = value || defaultValue;
	const nestedId =
		hasLegacyValueKey(ratio) || hasLegacyValueKey(current)
			? 'value'
			: 'val';

	const labelProps = {
		value: current,
		attribute,
		blockName,
		defaultValue,
		resetToDefault,
		mode: 'advanced',
		path: attribute,
		...propsForLabelControl,
	};

	return (
		<BaseControl
			columns={columns}
			controlName="toggle-select"
			className="blockera-control-aspect-ratio"
			label={label}
			labelDescription={labelDescription}
			fieldProps={fieldProps}
			{...labelProps}
		>
			<SelectControl
				id={nestedId}
				singularId={nestedId === 'value' ? '' : 'val'}
				aria-label={__('Ratio', 'blockera')}
				options={getAspectRatioSelectOptions()}
				type="native"
				defaultValue={defaultValue.val}
				data-test="aspect-ratio-select"
				onChange={(newValue: string) => {
					if (newValue === '') {
						setValue(defaultValue);
						return;
					}

					let next: AspectRatioValue = {
						val: newValue,
						width: '',
						height: '',
					};

					if (newValue !== 'custom') {
						next = {
							...next,
							width: '',
							height: '',
						};
					} else if (current?.val && current.val !== '') {
						const [width, height] = String(current.val).split('/');

						if (width && height) {
							next = {
								...next,
								width: width.trim(),
								height: height.trim(),
							};
						} else if (width && !height) {
							next = {
								...next,
								width: width.trim(),
								height: width.trim(),
							};
						}
					}

					setValue({
						...current,
						...next,
					});
				}}
				{...props}
			/>

			{current?.val === 'custom' && (
				<Flex alignItems="flex-start">
					<InputControl
						id="width"
						singularId={'width'}
						columns="columns-1"
						className="control-first label-center small-gap"
						label={__('Width', 'blockera')}
						labelDescription={
							<>
								<p>
									{__(
										'Represents the width part of the ratio.',
										'blockera'
									)}
								</p>
								<p>
									{__(
										'In the "16 / 9" example, 16 is the width.',
										'blockera'
									)}
								</p>
							</>
						}
						style={{ margin: '0px' }}
						type="number"
						min={0}
						defaultValue={defaultValue.width}
						data-test="aspect-ratio-width"
						onChange={(newValue) => {
							setValue({
								...current,
								width: newValue === undefined ? '' : newValue,
							});
						}}
					/>

					<p className="blockera-colon">/</p>

					<InputControl
						id="height"
						singularId={'height'}
						columns="columns-1"
						className="control-first label-center small-gap"
						label={__('Height', 'blockera')}
						labelDescription={
							<>
								<p>
									{__(
										'Represents the height part of the ratio.',
										'blockera'
									)}
								</p>
								<p>
									{__(
										'In the "16 / 9" example, 9 is the height.',
										'blockera'
									)}
								</p>
							</>
						}
						style={{ margin: '0px' }}
						min={0}
						type="number"
						defaultValue={defaultValue.height}
						data-test="aspect-ratio-height"
						onChange={(newValue) =>
							setValue({
								...current,
								height: newValue,
							})
						}
					/>
				</Flex>
			)}
		</BaseControl>
	);
}
