import { Snackbar } from '..';

describe('snackbar component testing', () => {
	beforeEach(() => {
		cy.viewport(1280, 720);
	});

	it('renders the message and the Blockera brand icon by default', () => {
		cy.withDataProvider({
			component: <Snackbar>Settings updated.</Snackbar>,
		});

		cy.contains('Settings updated.').should('exist');
		cy.get('.components-snackbar__icon').should('exist');

		cy.get('.components-snackbar__icon').then(($icon) => {
			const iconBox = $icon[0].getBoundingClientRect();
			const snackbarBox = $icon
				.closest('.components-snackbar')[0]
				.getBoundingClientRect();
			const iconCenter = iconBox.top + iconBox.height / 2;
			const snackbarCenter = snackbarBox.top + snackbarBox.height / 2;

			expect(Math.abs(iconCenter - snackbarCenter)).to.be.lessThan(2);
		});
	});
});
