// @flow

/**
 * Blockera dependencies
 */
import { isEquals } from '@blockera/utils';

/**
 * Internal dependencies
 */
import { prepareBlockeraDefaultAttributesValues } from '../../extensions/components/utils';
import { ignoreBlockeraAttributeKeysRegExp } from '../../extensions/libs/attribute-key-patterns';

/**
 * WordPress theme.json style leaves plus Blockera feature attrs.
 * Compatibility merges the full block attribute schema; persisting that into
 * `root/globalStyles` explodes the CPT and OOMs the REST controller at 128M.
 */
const WP_THEME_JSON_STYLE_KEYS: { [string]: boolean } = {
	background: true,
	border: true,
	color: true,
	css: true,
	dimensions: true,
	elements: true,
	filter: true,
	outline: true,
	shadow: true,
	spacing: true,
	typography: true,
};

export const isPersistableGlobalStylesAttribute = (attribute: string): boolean =>
	!!WP_THEME_JSON_STYLE_KEYS[attribute] ||
	ignoreBlockeraAttributeKeysRegExp().test(attribute);

/**
 * Drop schema defaults and non-theme.json keys after WP↔Blockera hydrate.
 *
 * Compare against both inspector and global-styles-panel default shapes:
 * hydrate may emit either `{ value: '' }` or a wrapped `{ value: default }`.
 *
 * @param {Object} attributes Compatible attributes for one style node.
 * @param {Object} defaultAttributes Block attribute schema.
 * @return {Object} Attributes safe to persist on the user global styles entity.
 */
export const cleanupDefaultAttributes = (
	attributes: Object,
	defaultAttributes: Object
): Object => {
	const inspectorDefaults = prepareBlockeraDefaultAttributesValues(
		defaultAttributes,
		{
			context: 'block-inspector',
		}
	);
	const globalStylesDefaults = prepareBlockeraDefaultAttributesValues(
		defaultAttributes,
		{
			context: 'global-styles-panel',
		}
	);
	const cleanedAttributes: { [string]: any } = {};

	for (const [attribute, value] of Object.entries(attributes || {})) {
		if (!isPersistableGlobalStylesAttribute(attribute)) {
			continue;
		}

		if (
			isEquals(value, inspectorDefaults[attribute]) ||
			isEquals(value, globalStylesDefaults[attribute])
		) {
			continue;
		}

		cleanedAttributes[attribute] = value;
	}

	return cleanedAttributes;
};
