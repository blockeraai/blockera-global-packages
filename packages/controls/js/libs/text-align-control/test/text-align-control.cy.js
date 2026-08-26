import TextAlignControl from '..';
import { nanoid } from 'nanoid';
import { getControlValue } from '../../../store/selectors';

describe('text-align-control component testing', () => {
	beforeEach(() => {
		cy.viewport(1280, 720);
	});

	it('render correctly', () => {
		cy.withDataProvider({
			component: <TextAlignControl />,
			value: 'left',
		});
		cy.get('[role="radiogroup"]').should('exist');
		cy.contains('Text Align');
		cy.get('[role="radio"]').should('have.length', 5);
		cy.get('[data-value="left"]').should('exist');
		cy.get('[data-value="center"]').should('exist');
		cy.get('[data-value="right"]').should('exist');
		cy.get('[data-value="justify"]').should('exist');
		cy.get('[data-value="initial"]').should('exist');
	});

	it('selects a value', () => {
		const name = nanoid();
		cy.withDataProvider({
			component: <TextAlignControl />,
			value: 'left',
			name,
		});

		cy.get('[data-value="center"]').click();
		cy.get('[data-value="center"]').should(
			'have.attr',
			'aria-pressed',
			'true'
		);

		cy.get('[data-value="center"]').then(() => {
			expect(getControlValue(name)).to.equal('center');
		});
	});

	it('deselects the active value', () => {
		const name = nanoid();
		cy.withDataProvider({
			component: <TextAlignControl />,
			value: 'right',
			name,
		});

		cy.get('[data-value="right"]').click();
		cy.get('[data-value="right"]').then(() => {
			expect(getControlValue(name)).to.be.oneOf([undefined, '']);
		});
	});
});
