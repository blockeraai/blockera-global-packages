//@flow

/**
 * External dependencies
 */
import * as _rawIcons from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { getIconKebabId } from '../helpers';

const WPIcons: Object = Object.fromEntries(
	Object.entries(_rawIcons)
		.map(([key, value]) => [getIconKebabId(key), value])
		.filter(([key]) => 'icon' !== key)
);

const wpCoreIconKey = Object.keys(WPIcons).find(
	(key) =>
		9 === key.length && key.startsWith('word') && key.endsWith('press')
);

if (wpCoreIconKey) {
	delete WPIcons[wpCoreIconKey];
}

WPIcons['wordpress-logo'] = _rawIcons.wordpress;

export { WPIcons };
