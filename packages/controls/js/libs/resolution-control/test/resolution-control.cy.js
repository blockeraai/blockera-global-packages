import ResolutionControl from '..';
import { nanoid } from 'nanoid';
import { getControlValue } from '../../../store/selectors';

describe('resolution-control component testing', () => {
	beforeEach(() => {
		cy.viewport(1280, 720);
	});

	it('render correctly', () => {
		cy.withDataProvider({
			component: <ResolutionControl />,
			value: 'full',
		});
		cy.get('select').should('exist');
		cy.contains('Resolution');
		cy.get('select option').should('have.length', 4);
		cy.get('select option').then(($opts) => {
			expect([...$opts].map((el) => el.value)).to.deep.equal([
				'thumbnail',
				'medium',
				'large',
				'full',
			]);
		});
	});

	it('render with default full value', () => {
		cy.withDataProvider({
			component: <ResolutionControl />,
			value: 'full',
		});
		cy.get('select').should('have.value', 'full');
	});

	it('change resolution option', () => {
		const name = nanoid();
		cy.withDataProvider({
			component: <ResolutionControl />,
			value: 'full',
			name,
		});

		cy.get('select').select('large');
		cy.get('select').should('have.value', 'large');

		cy.get('select').then(() => {
			expect(getControlValue(name)).to.equal('large');
		});
	});

	it('render custom options', () => {
		cy.withDataProvider({
			component: (
				<ResolutionControl
					options={[
						{ value: 'post-thumbnail', label: 'Post Thumbnail' },
						{ value: 'full', label: 'Full Size' },
					]}
				/>
			),
			value: 'post-thumbnail',
		});
		cy.get('select').should('have.value', 'post-thumbnail');
		cy.get('select option').should('have.length', 2);
	});
});
