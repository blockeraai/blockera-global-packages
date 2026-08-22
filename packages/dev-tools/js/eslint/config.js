const ignorePatterns = require('./ignore');
const restrictedImports = require('./restricted-imports');

module.exports = {
	ignorePatterns,
	parser: 'hermes-eslint',
	extends: [
		'plugin:@wordpress/eslint-plugin/recommended',
		'plugin:cypress/recommended',
		'plugin:ft-flow/recommended',
	],
	settings: {
		'import/extensions': ['.js', '.jsx', '.txt', '.html'],
		'import/resolver': {
			node: {
				extensions: [
					'.ts',
					'.tsx',
					'.js',
					'.jsx',
					'.json',
					'.txt',
					'.html',
				],
			},
		},
	},
	rules: {
		// Let prettier/prettier auto-discover .prettierrc.js
		// This ensures ESLint uses the same config as the editor's Prettier extension
		'prettier/prettier': 'error',
		'ft-flow/space-after-type-colon': 'off',
		'@wordpress/i18n-no-collapsible-whitespace': 'off',
		'import/no-extraneous-dependencies': 'off',
		'import/no-unresolved': [
			'error',
			{
				ignore: [
					'\\.txt$',
					'\\.html$',
					'^@blockera/experimental-config$',
				],
			},
		],
		'@wordpress/no-unsafe-wp-apis': 'off',
		'@wordpress/no-base-control-with-label-without-id': 'off',
		'jsdoc/check-line-alignment': 'off',
		'jsdoc/require-param': 'off',
		'jsdoc/require-param-type': 'off',
		'jsdoc/check-param-names': 'off',
		'no-shadow': 'off',
		'no-console': 'off',
		'no-restricted-globals': [
			'error',
			{
				name: 'localStorage',
				message:
					'Do not use native localStorage. Import { localStorage } from @blockera/storage so keys are site/user scoped.',
			},
			{
				name: 'sessionStorage',
				message:
					'Do not use native sessionStorage. Import { sessionStorage } from @blockera/storage so keys are site/user scoped.',
			},
		],
		'no-restricted-syntax': [
			'error',
			{
				selector:
					"CallExpression[callee.object.name='console'][callee.property.name!=/^(log|warn|error|info|trace)$/]",
				message: 'Unexpected property on console object was called',
			},
			{
				selector:
					"MemberExpression[object.name='window'][property.name='localStorage']",
				message:
					'Do not use window.localStorage. Import { localStorage } from @blockera/storage so keys are site/user scoped.',
			},
			{
				selector:
					"MemberExpression[object.name='window'][property.name='sessionStorage']",
				message:
					'Do not use window.sessionStorage. Import { sessionStorage } from @blockera/storage so keys are site/user scoped.',
			},
		],
		'jsx-a11y/no-static-element-interactions': 'off',
		'jsx-a11y/click-events-have-key-events': 'off',
		'no-restricted-imports': [
			'error',
			{
				paths: restrictedImports,
			},
		],
		'@wordpress/i18n-text-domain': [
			'error',
			{
				allowedTextDomain: ['blockera'],
			},
		],
		// Disable import/named to avoid TypeScript resolver issues
		// TypeScript and Flow handle type checking, so this rule is redundant
		'import/named': 'off',
		'import/namespace': 'off',
		'import/default': 'off',
		'import/no-named-as-default-member': 'off',
	},
	overrides: [
		{
			// Only @blockera/storage may touch native browser storage backends.
			files: [
				'packages/storage/js/**',
				'packages/global-packages/packages/storage/js/**',
			],
			rules: {
				'no-restricted-globals': 'off',
				'no-restricted-syntax': [
					'error',
					{
						selector:
							"CallExpression[callee.object.name='console'][callee.property.name!=/^(log|warn|error|info|trace)$/]",
						message:
							'Unexpected property on console object was called',
					},
				],
			},
		},
		{
			// Cypress / Jest harnesses clear or seed native storage via win.localStorage.
			files: [
				'packages/dev-cypress/**',
				'packages/global-packages/packages/dev-cypress/**',
				'**/*.spec.js',
				'**/*.spec.ts',
				'**/*.test.js',
				'**/*.test.ts',
				'**/*.e2e.cy.js',
				'**/test/**',
			],
			rules: {
				'no-restricted-globals': 'off',
				'no-restricted-syntax': [
					'error',
					{
						selector:
							"CallExpression[callee.object.name='console'][callee.property.name!=/^(log|warn|error|info|trace)$/]",
						message:
							'Unexpected property on console object was called',
					},
				],
			},
		},
		{
			files: [
				'packages/classnames/js/**',
				'packages/global-packages/packages/classnames/js/**',
			],
			rules: {
				'no-restricted-imports': [
					'error',
					// The `clsx` us used inside the `@blockera/classnames`, hence why importing this
					// dependency should be allowed in the classnames package.
					{
						paths: restrictedImports.filter(
							({ name }) => 'clsx' !== name
						),
					},
				],
			},
		},
		{
			files: ['**/*.ts', '**/*.tsx'],
			parser: '@typescript-eslint/parser',
			parserOptions: {
				ecmaVersion: 2021,
				sourceType: 'module',
				ecmaFeatures: {
					jsx: true,
				},
			},
			settings: {
				'import/resolver': {
					node: {
						extensions: [
							'.ts',
							'.tsx',
							'.js',
							'.jsx',
							'.json',
							'.txt',
							'.html',
						],
					},
				},
			},
			rules: {
				'ft-flow/no-types-missing-file-annotation': 'off',
				'import/named': 'off',
				'import/namespace': 'off',
				'import/default': 'off',
				'import/no-named-as-default-member': 'off',
			},
		},
	],
	env: {
		jest: true,
	},
};
