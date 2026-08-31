/**
 * Blockera dependencies
 */
import { appendBlocks } from '@blockera/dev-cypress/js/helpers';

const BLOCKERA_ID_PATTERN = /^[0-9a-z]{6}$/;
const ORIGIN_KEYS = [
	'blockeraTransformSelfOrigin',
	'blockeraTransformChildOrigin',
];
const META_KEYS = {
	blockeraId: true,
	blockeraPropsId: true,
	blockeraCompatId: true,
	blockeraBlockMode: true,
};

/**
 * Leftovers this page is known to ship. If a future edit “pre-cleans” the
 * fixture, sourceMustInclude fails so the spec cannot silently stop covering
 * the bug.
 *
 * cleanedMustInclude is the opposite: migrate/cleanup must not drop real
 * user values while stripping unused defaults.
 */
export const LEGACY_MARKUP_CHUNKS = [
	{
		id: 'blocks-group',
		file: 'blocks-1.html',
		sourceMustInclude: [
			'blockeraPropsId',
			'blockeraCompatId',
			'blockera-block\\u002d\\u002d',
			'"blockeraTransformSelfOrigin":{"value":{"top":"","left":""}}',
			'"blockeraTransformChildOrigin":{"value":{"top":"","left":""}}',
			'"attributes":[]',
			'"spacing":[]',
			'"color":[]',
			'"elements":{"link":{"color":[]}}',
			'"style":{"position":{"type":"relative","top":"","right":"","bottom":"","left":""}}',
		],
		cleanedMustInclude: [
			'"blockeraBackgroundColor":{"value":"#eff4ff"}',
			'"blockeraMinHeight":"50vh"',
			'"blockeraOpacity":{"value":"8%"}',
			'"move-x":"-50%"',
			'"move-y":"-50%"',
			'"blockeraHeight":{"value":"80vh"}',
			'"blockeraMaxHeight":{"value":"500px"}',
			'"blockeraFontColor":"#75879a"',
			'"blockeraFontColor":"#1e2731"',
			'blockeraInnerBlocks',
			'"type":"sticky"',
			'"blockeraZIndex":{"value":"1"}',
			'"blockeraOverflow":{"value":"hidden"}',
			'"color":"#cfe0ff"',
		],
		cleanedMustNotInclude: [
			'blockeraPropsId',
			'blockeraCompatId',
			'blockera-block--',
			'blockera-block\\u002d\\u002d',
			'"attributes":[]',
			'"spacing":[]',
			'"color":[]',
			'"elements":{"link":{"color":[]}}',
			'"typography":{}',
			'"color":{}',
			'"spacing":{}',
		],
	},
];

export function getLegacyMarkupChunkPath(chunk) {
	return (
		'packages/global-packages/packages/editor/js/extensions/components/test/fixtures/legacy-markup/' +
		chunk.file
	);
}

/**
 * Concatenate one or more fixture files and paste them into the code editor.
 *
 * @param {Array<{ id: string, file: string }>} [chunks]
 */
export function appendLegacyMarkupChunks(chunks = LEGACY_MARKUP_CHUNKS) {
	const htmls = [];

	chunks.forEach((chunk, index) => {
		cy.readFile(getLegacyMarkupChunkPath(chunk)).then((html) => {
			const markup = String(html).trim();

			assertLegacyMarkupSourceStillDirty(markup, chunk);
			htmls[index] = markup;
		});
	});

	cy.then(() => {
		appendBlocks(htmls.join('\n\n'));
	});
}

function assertIncludesAll(haystack, needles, label, chunkId) {
	needles.forEach((needle) => {
		expect(
			haystack,
			`${label} [${chunkId}]: ${needle}`
		).to.include(needle);
	});
}

function assertExcludesAll(haystack, needles, label, chunkId) {
	needles.forEach((needle) => {
		expect(
			haystack,
			`${label} [${chunkId}]: ${needle}`
		).to.not.include(needle);
	});
}

/**
 * Fail if the fixture was pre-cleaned and would no longer exercise leftovers.
 *
 * @param {string} markup Raw fixture HTML.
 * @param {{ id: string, sourceMustInclude?: string[] }} chunk
 */
export function assertLegacyMarkupSourceStillDirty(markup, chunk) {
	expect(markup, `fixture ${chunk.id} is empty`).to.have.length.greaterThan(
		0
	);

	assertIncludesAll(
		markup,
		chunk.sourceMustInclude || [],
		'legacy fixture still contains leftover',
		chunk.id
	);
}

function parseBlockCommentAttributes(content) {
	const blocks = [];
	let cursor = 0;

	while (cursor < content.length) {
		const start = content.indexOf('<!-- wp:', cursor);

		if (start === -1) {
			break;
		}

		const commentEnd = content.indexOf('-->', start);

		if (commentEnd === -1) {
			break;
		}

		const jsonStart = content.indexOf('{', start);
		const closer = start + '<!-- wp:'.length;

		if (jsonStart === -1 || jsonStart > commentEnd) {
			cursor = commentEnd + 3;
			continue;
		}

		const nameEnd = content.indexOf(' ', closer);
		const blockName = content
			.slice(closer, nameEnd === -1 || nameEnd > jsonStart ? jsonStart : nameEnd)
			.trim();
		const jsonText = content.slice(jsonStart, commentEnd).trim();

		let attributes;

		try {
			attributes = JSON.parse(jsonText);
		} catch (error) {
			throw new Error(
				`Failed to parse block comment JSON for ${blockName}: ${error.message}`
			);
		}

		blocks.push({ blockName, attributes });
		cursor = commentEnd + 3;
	}

	return blocks;
}

function originSides(value) {
	if (value == null || typeof value !== 'object' || Array.isArray(value)) {
		return null;
	}

	const wrapped = value.value;
	const sides =
		wrapped != null &&
		typeof wrapped === 'object' &&
		!Array.isArray(wrapped) &&
		('top' in wrapped || 'left' in wrapped)
			? wrapped
			: value;

	if (!('top' in sides) && !('left' in sides)) {
		return null;
	}

	return {
		top: sides.top == null ? '' : sides.top,
		left: sides.left == null ? '' : sides.left,
	};
}

function isUnusedOriginValue(value) {
	const sides = originSides(value);

	return Boolean(sides) && String(sides.top) === '' && String(sides.left) === '';
}

function walkRecords(node, visit, path = '') {
	if (node == null || typeof node !== 'object') {
		return;
	}

	if (Array.isArray(node)) {
		node.forEach((item, index) => {
			walkRecords(item, visit, `${path}[${index}]`);
		});
		return;
	}

	visit(node, path);

	Object.keys(node).forEach((key) => {
		walkRecords(node[key], visit, path ? `${path}.${key}` : key);
	});
}

function hasBlockeraFeatureKeys(attributes) {
	return Object.keys(attributes).some(
		(key) => key.indexOf('blockera') === 0 && !META_KEYS[key]
	);
}

function assertNoEmptyJsonCollections(node, path, label) {
	if (node == null || typeof node !== 'object') {
		return;
	}

	if (Array.isArray(node)) {
		expect(node.length, `${label} empty array at ${path}`).to.not.equal(0);
		node.forEach((item, index) => {
			assertNoEmptyJsonCollections(item, `${path}[${index}]`, label);
		});
		return;
	}

	const keys = Object.keys(node);

	expect(keys.length, `${label} empty object at ${path}`).to.not.equal(0);

	keys.forEach((key) => {
		assertNoEmptyJsonCollections(
			node[key],
			path ? `${path}.${key}` : key,
			label
		);
	});
}

function assertCleanedBlockAttributes(attributes, blockName) {
	expect(
		attributes.blockeraPropsId,
		`${blockName} leftover blockeraPropsId`
	).to.equal(undefined);
	expect(
		attributes.blockeraCompatId,
		`${blockName} leftover blockeraCompatId`
	).to.equal(undefined);

	if (hasBlockeraFeatureKeys(attributes)) {
		expect(
			String(attributes.blockeraId || ''),
			`${blockName} canonical blockeraId after migrate`
		).to.match(BLOCKERA_ID_PATTERN);
	}

	const className = String(attributes.className || '');

	expect(className, `${blockName} legacy double-dash class`).to.not.include(
		'blockera-block--'
	);

	if (attributes.blockeraId) {
		expect(
			className,
			`${blockName} unique class matches blockeraId`
		).to.include(`blockera-block-${attributes.blockeraId}`);
	}

	walkRecords(attributes, (record, path) => {
		ORIGIN_KEYS.forEach((key) => {
			if (!(key in record)) {
				return;
			}

			expect(
				isUnusedOriginValue(record[key]),
				`${blockName} unused ${key} at ${path || '(root)'} (legacy empty or wrapped empty default)`
			).to.equal(false);

			const sides = originSides(record[key]);

			if (sides) {
				expect(
					String(sides.top) !== '' && String(sides.left) !== '',
					`${blockName} ${key} at ${path || '(root)'} must have both sides when serialized`
				).to.equal(true);
			}
		});

		if (
			record.breakpoints &&
			typeof record.breakpoints === 'object' &&
			!Array.isArray(record.breakpoints)
		) {
			Object.keys(record.breakpoints).forEach((breakpoint) => {
				const slot = record.breakpoints[breakpoint];
				const breakpointAttrs =
					slot && typeof slot === 'object' ? slot.attributes : undefined;

				if (breakpointAttrs === undefined) {
					return;
				}

				expect(
					Array.isArray(breakpointAttrs) && breakpointAttrs.length === 0,
					`${blockName} empty breakpoint attributes[] at ${path}.breakpoints.${breakpoint}`
				).to.equal(false);

				if (
					breakpointAttrs &&
					typeof breakpointAttrs === 'object' &&
					!Array.isArray(breakpointAttrs)
				) {
					expect(
						Object.keys(breakpointAttrs).length,
						`${blockName} empty breakpoint attributes object at ${path}.breakpoints.${breakpoint}`
					).to.be.greaterThan(0);
				}
			});
		}
	});

	if ('style' in attributes) {
		assertNoEmptyJsonCollections(
			attributes.style,
			`${blockName}.style`,
			'PHP/Gutenberg empty style leftover'
		);
	}
}

const UNUSED_ORIGIN_STRING_PATTERNS = [
	/"blockeraTransform(?:Self|Child)Origin"\s*:\s*\{\s*"value"\s*:\s*\{\s*"top"\s*:\s*""\s*,\s*"left"\s*:\s*""/,
	/"blockeraTransform(?:Self|Child)Origin"\s*:\s*\{\s*"value"\s*:\s*\{\s*"left"\s*:\s*""\s*,\s*"top"\s*:\s*""/,
	/"blockeraTransform(?:Self|Child)Origin"\s*:\s*\{\s*"top"\s*:\s*""\s*,\s*"left"\s*:\s*""/,
	/"blockeraTransform(?:Self|Child)Origin"\s*:\s*\{\s*"left"\s*:\s*""\s*,\s*"top"\s*:\s*""/,
];

/**
 * Rules for saved markup after legacy migrate + unused-attribute cleanup.
 *
 * @param {string} content Serialized post content.
 * @param {{ id?: string, cleanedMustInclude?: string[], cleanedMustNotInclude?: string[] }} [chunk]
 */
export function assertCleanedBlockeraSavedMarkup(content, chunk = {}) {
	const chunkId = chunk.id || 'markup';

	assertExcludesAll(
		content,
		chunk.cleanedMustNotInclude || [
			'blockeraPropsId',
			'blockeraCompatId',
			'"attributes":[]',
			'"color":[]',
			'"spacing":[]',
			'"elements":{"link":{"color":[]}}',
		],
		'cleaned markup must not include',
		chunkId
	);

	assertIncludesAll(
		content,
		chunk.cleanedMustInclude || [],
		'cleaned markup must keep user value',
		chunkId
	);

	UNUSED_ORIGIN_STRING_PATTERNS.forEach((pattern) => {
		expect(
			content,
			`unused origin serialization ${pattern} [${chunkId}]`
		).to.not.match(pattern);
	});

	const blocks = parseBlockCommentAttributes(content);

	expect(blocks.length, `parsed block comments [${chunkId}]`).to.be.greaterThan(
		0
	);

	blocks.forEach(({ blockName, attributes }) => {
		assertCleanedBlockAttributes(attributes, blockName);
	});
}
