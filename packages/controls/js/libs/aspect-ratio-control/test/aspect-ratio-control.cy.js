import AspectRatioControl from '..';
import { nanoid } from 'nanoid';
import { getControlValue } from '../../../store/selectors';

describe('aspect-ratio-control component testing', () => {
	beforeEach(() => {
		cy.viewport(1280, 720);
	});

	it('render correctly', () => {
		cy.withDataProvider({
			component: <AspectRatioControl />,
			value: {
				val: '',
				width: '',
				height: '',
			},
		});
		cy.get('select').should('exist');
	});

	it('render correctly with label', () => {
		cy.withDataProvider({
			component: <AspectRatioControl label="Aspect Ratio Control" />,
			value: {
				val: '',
				width: '',
				height: '',
			},
		});
		cy.contains('Aspect Ratio Control');
	});

	it('render original (empty) value', () => {
		cy.withDataProvider({
			component: <AspectRatioControl />,
			value: {
				val: '',
				width: '',
				height: '',
			},
		});
		cy.get('select').should('have.value', '');
		cy.getByDataTest('aspect-ratio-width').should('not.exist');
	});

	it('change to a preset ratio', () => {
		const name = nanoid();
		cy.withDataProvider({
			component: <AspectRatioControl />,
			value: {
				val: '',
				width: '',
				height: '',
			},
			name,
		});

		cy.get('select').select('1');
		cy.get('select').should('have.value', '1');

		cy.get('select').then(() => {
			expect(getControlValue(name).val).to.equal('1');
			expect(getControlValue(name).width).to.equal('');
			expect(getControlValue(name).height).to.equal('');
		});
	});

	it('switch to custom and show width/height inputs', () => {
		const name = nanoid();
		cy.withDataProvider({
			component: <AspectRatioControl />,
			value: {
				val: '16/9',
				width: '',
				height: '',
			},
			name,
		});

		cy.get('select').select('custom');
		cy.getByDataTest('aspect-ratio-width').should('exist');
		cy.getByDataTest('aspect-ratio-height').should('exist');

		cy.get('select').then(() => {
			expect(getControlValue(name).val).to.equal('custom');
			expect(getControlValue(name).width).to.equal('16');
			expect(getControlValue(name).height).to.equal('9');
		});
	});

	it('change custom width and height', () => {
		const name = nanoid();
		cy.withDataProvider({
			component: <AspectRatioControl />,
			value: {
				val: 'custom',
				width: '4',
				height: '3',
			},
			name,
		});

		cy.getByDataTest('aspect-ratio-width').clear({ force: true });
		cy.getByDataTest('aspect-ratio-width').type('21', { force: true });
		cy.getByDataTest('aspect-ratio-height').clear({ force: true });
		cy.getByDataTest('aspect-ratio-height').type('9', { force: true });

		cy.getByDataTest('aspect-ratio-width').then(() => {
			expect(getControlValue(name).width).to.equal('21');
			expect(getControlValue(name).height).to.equal('9');
		});
	});

	it('reset to original', () => {
		const name = nanoid();
		cy.withDataProvider({
			component: <AspectRatioControl />,
			value: {
				val: '1',
				width: '',
				height: '',
			},
			name,
		});

		cy.get('select').select('');
		cy.get('select').should('have.value', '');

		cy.get('select').then(() => {
			expect(getControlValue(name).val).to.equal('');
		});
	});
});
