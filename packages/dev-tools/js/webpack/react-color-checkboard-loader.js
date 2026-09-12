/**
 * Alpha/Sketch require `./Checkboard` inside react-color. Replace that
 * module with the controls checkerboard (JS default parameters, no
 * `defaultProps`).
 */
const { resolve } = require('path');

const CHECKBOARD = resolve(
	__dirname,
	'..',
	'..',
	'..',
	'controls',
	'js',
	'libs',
	'color-picker-control',
	'components',
	'react-color-checkboard.js'
);

module.exports.pitch = function reactColorCheckboardLoaderPitch() {
	this.addDependency(CHECKBOARD);
	const file = JSON.stringify(CHECKBOARD);

	return (
		'var m = require(' +
		file +
		');\n' +
		'module.exports = m && m.__esModule ? m.default : m;\n'
	);
};
