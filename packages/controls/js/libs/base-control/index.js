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
	...props
}: BaseControlProps): MixedElement {
	let cssColumns = '';

	if (columns !== '' && columns !== 'columns-1' && columns !== 'columns-2') {
		cssColumns = columns;
		columns = 'columns-custom';
	}

	const dataAttrs: { [string]: mixed } = {};
	const labelProps: { [string]: mixed } = {};
	Object.keys(props).forEach((key) => {
		if (key.startsWith('data-')) {
			dataAttrs[key] = props[key];
		} else {
			labelProps[key] = props[key];
		}
	});

	const fieldProps = {
		className: fieldsClassNames(controlName, columns, className),
		style: { ...style, gridTemplateColumns: cssColumns || '' },
		'data-cy': 'base-control',
		...dataAttrs,
	};

	if (label === '' && columns === '') {
		const shouldWrapControl =
			controlName === 'empty' ||
			!!className ||
			Object.keys(dataAttrs).length > 0 ||
			(style && Object.keys(style).length > 0);

		if (shouldWrapControl) {
			return (
				<div {...fieldProps}>
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
		<div {...fieldProps}>
			{label !== '' && (
				<div className={fieldsClassNames('label')}>
					<LabelControl label={label} {...labelProps} />
				</div>
			)}

			<div className={fieldsClassNames('control')} {...controlProps}>
				{children}
			</div>
		</div>
	);
}
