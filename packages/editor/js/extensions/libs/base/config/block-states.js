// @flow

/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import type { FeatureConfig } from '..';

const contentField: FeatureConfig = {
	status: true,
	show: true,
	force: true,
	label: __('Content', 'blockera'),
};

export const statesConfig = {
	initialOpen: true,
	contentField,
};
