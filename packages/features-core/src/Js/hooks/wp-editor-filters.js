// @flow

/**
 * External dependencies
 */
import { select } from '@wordpress/data';
import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';

/**
 * Internal dependencies
 */
import { STORE_NAME } from '../store';
import { default as featuresLibrary } from '../../features';

type BlockListBlockProps = {
	attributes: Object,
	wrapperProps?: Object,
	name: string,
	clientId: string,
	[string]: any,
};

type GenericStrings = { [string]: string };

/**
 * Build inline icon-related styles from block attributes.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object} Style object for wrapper props.
 */
const getIconStyles = (attributes: Object): Object => {
	const styles: Object = {};

	if (attributes?.iconColor) {
		styles.color = attributes.iconColor;
	}

	if (attributes?.iconBackgroundColor) {
		styles.backgroundColor = attributes.iconBackgroundColor;
	}

	return styles;
};

/**
 * Convert a CSS declaration map to an inline style string.
 *
 * @param {GenericStrings} styles CSS property map.
 * @return {string} Serialized CSS declarations.
 */
const cssObjectToString = (styles: GenericStrings): string => {
	return Object.keys(styles)
		.map((key) => `${key}:${styles[key]}`)
		.join(';');
};

export const wpEditorFilters = (): void => {
	addFilter(
		'editor.BlockListBlock',
		'blockera/edit-icon-styles',
		createHigherOrderComponent((BlockListBlock) => {
			return (props: BlockListBlockProps) => {
				let { attributes, wrapperProps, name, clientId } = props;
				const isButton = name === 'core/button';

				const { getFeatures } = select(STORE_NAME);
				const registeredFeatures = getFeatures();

				const { getBlockExtensionBy } = select('blockera/extensions');
				const blockExtension = getBlockExtensionBy('targetBlock', name);

				if (
					!blockExtension ||
					!attributes?.className ||
					!blockExtension?.blockFeatures
				) {
					return <BlockListBlock {...props} />;
				}

				for (const featureId in featuresLibrary) {
					const featureObject = registeredFeatures[featureId];

					if (
						!featureObject ||
						!featureObject?.isEnabled() ||
						!blockExtension?.blockFeatures?.[featureId]
					) {
						continue;
					}

					if (
						!attributes?.className?.includes('is-style-icon') &&
						!isButton
					) {
						return <BlockListBlock {...props} />;
					}
				}

				if (!wrapperProps) {
					wrapperProps = {
						style: {},
					};
				}

				wrapperProps.style = {
					...wrapperProps?.style,
					...getIconStyles(attributes),
				};

				const styles: GenericStrings = {};

				if (attributes.iconSvgString) {
					styles['--wp--custom--icon--url'] =
						"url('data:image/svg+xml;utf8," +
						attributes.iconSvgString +
						"')";
				}

				return (
					<>
						<style>
							{'#block-' +
								clientId +
								'{' +
								cssObjectToString(styles) +
								'}'}
						</style>
						<BlockListBlock
							{...props}
							wrapperProps={wrapperProps}
						/>
					</>
				);
			};
		}, 'withIcon')
	);
};
