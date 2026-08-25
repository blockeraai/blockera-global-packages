/**
 * Shared defaults for the block-markup pipeline.
 *
 * Products deep-merge `.block-markup.config.js` on top. Token maps merge by
 * key; `enabled: false` on a parent disables children at runtime.
 *
 * Prettier post-process flags (override from the product config):
 * - indentGutenbergComments
 * - collapseTextOnlyTags
 * - quoteJsonHtmlAttributes
 * - indentSvgElements
 * - wrapMixedInlineParents
 * - breakFormControlTags
 */

const STEPS = Object.freeze(['prettier', 'sanitize', 'localize']);

const baseConfig = {
	steps: {
		patterns: ['prettier', 'sanitize', 'localize'],
		templates: ['prettier', 'sanitize'],
	},
	globs: {
		patterns: '**/*.php',
		templates: '**/*.html',
	},
	prettier: {
		enabled: true,
		skipWhenMarkupHasPhp: true,
		indentGutenbergComments: true,
		collapseTextOnlyTags: true,
		quoteJsonHtmlAttributes: true,
		indentSvgElements: true,
		wrapMixedInlineParents: true,
		breakFormControlTags: true,
	},
	sanitize: {
		enabled: true,
		metadata: {
			enabled: true,
			token: 'copied-pattern-metadata',
			keys: ['patternName', 'description', 'categories'],
			stripTitleWithPatternName: true,
		},
		blockeraIdentity: {
			enabled: true,
			token: 'blockera-identity',
		},
		blocks: {
			'core/query': {
				enabled: true,
				attrs: {
					queryId: { enabled: true, token: 'core/query.queryId' },
					perPage: {
						enabled: true,
						token: 'core/query.query.perPage',
						path: 'query.perPage',
						// Dictionary form: every `section/posts-listing:<variant>` matches.
						stamps: ['section/posts-listing'],
					},
				},
			},
		},
	},
	localize: {
		enabled: true,
		text: {
			enabled: true,
			htmlFn: 'esc_html_e',
			attrFn: 'esc_attr_e',
		},
		skipStamps: {
			enabled: true,
			token: 'skip-stamps',
			stamps: ['meta-separator'],
		},
		images: {
			enabled: true,
			token: 'static-image-urls',
		},
		html: {
			imgAlt: { enabled: true, token: 'img.alt' },
			ariaLabel: { enabled: true, token: 'aria-label' },
			textNodes: { enabled: true, token: 'text-nodes' },
		},
		blockAttrs: {
			enabled: true,
			attrs: {
				label: { enabled: true, isAttr: false, token: 'block.label' },
				placeholder: {
					enabled: true,
					isAttr: true,
					token: 'block.placeholder',
				},
				buttonText: {
					enabled: true,
					isAttr: false,
					token: 'block.buttonText',
				},
				content: {
					enabled: true,
					isAttr: false,
					token: 'block.content',
				},
				ariaLabel: {
					enabled: true,
					isAttr: true,
					token: 'block.ariaLabel',
				},
			},
		},
	},
};

module.exports = {
	STEPS,
	baseConfig,
};
