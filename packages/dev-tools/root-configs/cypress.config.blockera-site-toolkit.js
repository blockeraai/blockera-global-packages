// Edit packages/global-packages/packages/dev-tools/root-configs/cypress.config.blockera-site-toolkit.js
// project:bootstrap copies this to the host repo root for --project=blockera-site-toolkit.
module.exports =
	require('./packages/global-packages/packages/dev-tools/js/cypress/config')({
		rootDir: __dirname,
		projectId: 'blockera-site-toolkit',
		// Uncategorized: *.toolkit.e2e.cy.js
		// Categorized (CI matrix): *.toolkit.{category}.e2e.cy.js
		e2eSpecPattern: [
			'packages/site-toolkit/**/*.toolkit.e2e.cy.js',
			'packages/site-toolkit/**/*.toolkit.*.e2e.cy.js',
		],
		e2eExcludeSpecPattern: [],
		alwaysExcludeSpecPattern: ['packages/**/*.build.e2e.js'],
	});
