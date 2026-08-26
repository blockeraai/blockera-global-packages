// @flow
/**
 * External dependencies
 */
import type { MixedElement } from 'react';

/**
 * Blockera dependencies
 */
import { fieldsClassNames, fieldsInnerClassNames } from '@blockera/classnames';

/**
 * Internal dependencies
 */
import { LabelControl } from '../label-control';
import type { BaseControlProps } from './types';

export default function BaseControl({
	label = '',
	children,
	columns = '',
	className,
	controlName = 'general',
	style = {},
	controlProps = {},
	fieldProps = {},
	...props
}: BaseControlProps): MixedElement {
	let cssColumns = '';

	if (columns !== '' && columns !== 'columns-1' && columns !== 'columns-2') {
		cssColumns = columns;
		columns = 'columns-custom';
	}

	const {
		className: fieldClassName,
		style: fieldStyle,
		'data-cy': fieldDataCy,
		...restFieldProps
	} = fieldProps;

	if (label === '' && columns === '') {
		const shouldWrapControl =
			controlName === 'empty' ||
			Object.keys(fieldProps).length > 0 ||
			(style && Object.keys(style).length > 0);

		if (shouldWrapControl) {
			return (
				<div
					{...restFieldProps}
					className={fieldsClassNames(
						controlName,
						columns,
						className,
						fieldClassName
					)}
					style={{
						...style,
						...fieldStyle,
						gridTemplateColumns: cssColumns || '',
					}}
					data-cy={fieldDataCy || 'base-control'}
				>
					<div
						className={fieldsInnerClassNames('control')}
						{...controlProps}
					>
						{children}
					</div>
				</div>
			);
		}

		return <>{children}</>;
	}

	return (
		<div
			{...restFieldProps}
			className={fieldsClassNames(
				controlName,
				columns,
				className,
				fieldClassName
			)}
			style={{
				...style,
				...fieldStyle,
				gridTemplateColumns: cssColumns || '',
			}}
			data-cy={fieldDataCy || 'base-control'}
		>
			{label !== '' && (
				<div className={fieldsClassNames('label')}>
					<LabelControl label={label} {...props} />
				</div>
			)}

			<div className={fieldsClassNames('control')} {...controlProps}>
				{children}
			</div>
		</div>
	);
}
