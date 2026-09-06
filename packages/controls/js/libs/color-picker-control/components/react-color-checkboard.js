// @flow
/**
 * Drop-in for react-color's Checkboard. Same paint, JavaScript default
 * parameters instead of `defaultProps` (React 19). Webpack maps
 * react-color's Checkboard module to this file so Alpha/Sketch pick it up.
 */
import type { MixedElement } from 'react';
import {
	cloneElement,
	createElement,
	isValidElement,
} from '@wordpress/element';
import { get as getCheckboard } from 'react-color/lib/helpers/checkboard';

type CheckboardProps = {
	white?: string,
	grey?: string,
	size?: number,
	renderers?: { canvas?: mixed },
	borderRadius?: string | number,
	boxShadow?: string,
	children?: mixed,
};

export function Checkboard({
	white = 'transparent',
	grey = 'rgba(0,0,0,.08)',
	size = 8,
	renderers = {},
	borderRadius,
	boxShadow,
	children,
}: CheckboardProps): MixedElement {
	const grid = {
		borderRadius,
		boxShadow,
		position: 'absolute',
		top: '0px',
		right: '0px',
		bottom: '0px',
		left: '0px',
		background:
			'url(' +
			String(
				getCheckboard(white, grey, size, renderers.canvas) || ''
			) +
			') center left',
	};

	if (isValidElement(children)) {
		return cloneElement(children, {
			...children.props,
			style: { ...children.props.style, ...grid },
		});
	}

	return createElement('div', { style: grid });
}

export default Checkboard;
