import FontFamilyControl from '..';
import { nanoid } from 'nanoid';
import { getControlValue } from '../../../store/selectors';

const OPTIONS = [
	{ label: 'Default', value: '' },
	{ label: 'Inter', value: 'inter' },
	{ label: 'Cardo', value: 'cardo' },
];

describe('font-family-control component testing', () => {
	beforeEach(() => {
		cy.viewport(1280, 720);
	});

	it('render correctly', () => {
		cy.withDataProvider({
			component: <FontFamilyControl options={OPTIONS} />,
			value: '',
		});
		cy.get('select').should('exist');
		cy.contains('Font Family');
		cy.get('select option').should('have.length', 3);
	});

	it('change font family option', () => {
		const name = nanoid();
		cy.withDataProvider({
			component: <FontFamilyControl options={OPTIONS} />,
			value: '',
			name,
		});

		cy.get('select').select('inter');
		cy.get('select').should('have.value', 'inter');

		cy.get('select').then(() => {
			expect(getControlValue(name)).to.equal('inter');
		});
	});
});
