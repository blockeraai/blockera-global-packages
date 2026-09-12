/**
 * Classify block.json attribute schemas into visible vs attribute search paths.
 *
 * @package
 */

export const SEARCHABLE_HTML_ATTRIBUTES = new Set([
	'alt',
	'title',
	'href',
	'src',
	'srcset',
	'poster',
	'cite',
	'datetime',
	'placeholder',
	'label',
	'download',
	'aria-label',
	'class',
	'name',
	'value',
	'rel',
	'target',
	'action',
	'method',
	'for',
]);

export const DENY_ATTRIBUTE_NAMES = new Set([
	'align',
	'textAlign',
	'backgroundColor',
	'textColor',
	'gradient',
	'fontSize',
	'fontFamily',
	'fontWeight',
	'fontStyle',
	'lineHeight',
	'letterSpacing',
	'textDecoration',
	'textTransform',
	'dropCap',
	'style',
	'layout',
	'lock',
	'blob',
	'metadata',
	'templateLock',
	'allowedBlocks',
	'anchor',
	'width',
	'height',
	'aspectRatio',
	'scale',
	'sizeSlug',
	'overlayColor',
	'dimRatio',
	'focalPoint',
	'minHeight',
	'verticalAlignment',
	'justification',
	'orientation',
	'flexWrap',
	'isStackedOnMobile',
	'tagName',
	'type',
	'namespace',
	'slug',
	'ref',
	'alias',
	'mode',
	'context',
	'query',
	'displayLayout',
	'enhancedPagination',
	'inherit',
	'pages',
	'offset',
	'order',
	'orderBy',
	'sticky',
	'parents',
	'format',
	'status',
	'perPage',
	'taxonomy',
	'term',
	'showCounts',
	'level',
	'levelOptions',
	'isStacked',
	'template',
	'cssClassName',
	'borderColor',
	'duotone',
	'nudge',
	'providerNameSlug',
	'fileId',
	'mediaType',
	'icon',
	'length',
	'tag',
	'scope',
	'colspan',
	'rowspan',
	'annotations',
]);

function walkSchema(schema, prefix) {
	const visible = [];
	const attributes = [];

	if (!schema || typeof schema !== 'object') {
		return { visible, attributes };
	}

	const type = schema.type;
	const source = schema.source;

	if (source === 'query' && schema.query) {
		const childPrefix = prefix + '[]';
		for (const [key, prop] of Object.entries(schema.query)) {
			const child = walkSchema(prop, childPrefix + '.' + key);
			visible.push(...child.visible);
			attributes.push(...child.attributes);
		}
		return { visible, attributes };
	}

	if (
		type === 'rich-text' ||
		source === 'rich-text' ||
		source === 'html' ||
		source === 'text' ||
		source === 'raw'
	) {
		visible.push(prefix);
		return { visible, attributes };
	}

	if (type === 'array' && schema.items) {
		const child = walkSchema(schema.items, prefix + '[]');
		visible.push(...child.visible);
		attributes.push(...child.attributes);
		return { visible, attributes };
	}

	if ((type === 'object' || !type) && schema.properties) {
		for (const [key, prop] of Object.entries(schema.properties)) {
			const child = walkSchema(
				prop,
				prefix ? prefix + '.' + key : key
			);
			visible.push(...child.visible);
			attributes.push(...child.attributes);
		}
		return { visible, attributes };
	}

	const leaf = prefix.split('.').pop().replace(/\[\]/g, '');

	if (type === 'string' || (!type && source === 'attribute')) {
		if (schema.enum || DENY_ATTRIBUTE_NAMES.has(leaf)) {
			return { visible, attributes };
		}
		if (source === 'attribute') {
			const htmlAttr = schema.attribute || leaf;
			if (
				SEARCHABLE_HTML_ATTRIBUTES.has(htmlAttr) ||
				SEARCHABLE_HTML_ATTRIBUTES.has(leaf)
			) {
				attributes.push(prefix);
			}
			return { visible, attributes };
		}
		if (leaf === 'content' || schema.role === 'content') {
			if (leaf === 'content') {
				visible.push(prefix);
			} else {
				attributes.push(prefix);
			}
		}
		return { visible, attributes };
	}

	return { visible, attributes };
}

/**
 * Classify a block type's attributes into searchable paths.
 *
 * @param {Object} blockType Gutenberg block type (`getBlockType` shape).
 * @return {{ skip?: boolean, reason?: string, visible: string[], attributes: string[] }}
 */
export function classifyBlockType(blockType) {
	const visible = new Set();
	const attributes = new Set();
	const attrs = blockType?.attributes || {};

	for (const [name, schema] of Object.entries(attrs)) {
		if (name.toLowerCase().includes('annotation')) {
			continue;
		}
		const result = walkSchema(schema, name);
		result.visible.forEach((path) => visible.add(path));
		result.attributes.forEach((path) => attributes.add(path));
	}

	const supports = blockType?.supports || {};
	if (supports.customClassName !== false && supports.className !== false) {
		attributes.add('className');
	}

	const spec = {
		visible: [...visible].sort(),
		attributes: [...attributes].sort(),
	};

	if (!spec.visible.length && !spec.attributes.length) {
		return {
			skip: true,
			reason: 'no searchable strings',
			visible: [],
			attributes: [],
		};
	}

	return spec;
}
