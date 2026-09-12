// @flow
/**
 * react-color@2 still sets `defaultProps` on the function Sketch picker.
 * ColorWrap already passes those values. Do not strip Checkboard/Raised
 * `defaultProps`: Sketch renders those components directly, and Checkboard
 * reads `renderers.canvas` with no other fallback.
 */
import { Sketch } from 'react-color/lib/components/sketch/Sketch';

if (Sketch && Sketch.defaultProps) {
	delete Sketch.defaultProps;
}
