/// <reference types="Cypress" />

import { nanoid } from 'nanoid';
import { select } from '@wordpress/data';

import StepperControl from '..';
import { getControlValue } from '../../../store/selectors';
import { controlReducer } from '../../../store/reducers/control-reducer';
import { modifyControlValue } from '../../../store/actions';

describe('stepper-control component testing', () => {
	beforeEach(() => {
		cy.viewport(1280, 720);
	});

	const name = 'stepper-control';
	const defaultProps = {
		field: 'stepper',
	};

	it('should render correctly', () => {
		cy.withDataProvider({
			component: <StepperControl {...defaultProps} />,
			value: 0,
			name,
		});

		cy.getByDataTest('stepper-control').should('exist');
		cy.getByDataTest('stepper-minus').should('exist');
		cy.getByDataTest('stepper-plus').should('exist');
		cy.getByDataTest('stepper-input').should('exist');
	});

	it('should render correctly with label', () => {
		cy.withDataProvider({
			component: (
				<StepperControl {...defaultProps} label="Stepper Control" />
			),
			value: 0,
			name,
		});

		cy.contains('Stepper Control');
	});

	it('should hide buttons when showButtons is false', () => {
		cy.withDataProvider({
			component: (
				<StepperControl {...defaultProps} showButtons={false} />
			),
			value: 0,
			name,
		});

		cy.getByDataTest('stepper-input').should('exist');
		cy.getByDataTest('stepper-minus').should('not.exist');
		cy.getByDataTest('stepper-plus').should('not.exist');
	});

	it('should render prefix and suffix', () => {
		cy.withDataProvider({
			component: (
				<StepperControl
					{...defaultProps}
					prefix="min"
					suffix="posts"
				/>
			),
			value: 3,
			name,
		});

		cy.contains('min');
		cy.contains('posts');
	});

	describe('interaction test :', () => {
		it('should increment and decrement with buttons', () => {
			const name = nanoid();
			cy.withDataProvider({
				component: <StepperControl {...defaultProps} />,
				value: 0,
				name,
			});

			cy.getByDataTest('stepper-plus').click();
			cy.getByDataTest('stepper-input').should('have.value', '1');
			cy.then(() => {
				expect(getControlValue(name)).to.eq(1);
			});

			cy.getByDataTest('stepper-minus').click();
			cy.getByDataTest('stepper-minus').click();
			cy.getByDataTest('stepper-input').should('have.value', '-1');
			cy.then(() => {
				expect(getControlValue(name)).to.eq(-1);
			});
		});

		it('should respect step', () => {
			const name = nanoid();
			cy.withDataProvider({
				component: <StepperControl {...defaultProps} step={5} />,
				value: 0,
				name,
			});

			cy.getByDataTest('stepper-plus').click();
			cy.getByDataTest('stepper-input').should('have.value', '5');
			cy.then(() => {
				expect(getControlValue(name)).to.eq(5);
			});
		});

		it('should multiply step when Shift is held', () => {
			const name = nanoid();
			cy.withDataProvider({
				component: (
					<StepperControl
						{...defaultProps}
						step={1}
						shiftStep={10}
					/>
				),
				value: 0,
				name,
			});

			cy.getByDataTest('stepper-plus').click({ shiftKey: true });
			cy.getByDataTest('stepper-input').should('have.value', '10');
			cy.then(() => {
				expect(getControlValue(name)).to.eq(10);
			});
		});

		it('should disable buttons at min and max', () => {
			const name = nanoid();
			cy.withDataProvider({
				component: (
					<StepperControl {...defaultProps} min={0} max={3} />
				),
				value: 0,
				name,
			});

			cy.getByDataTest('stepper-minus').should('be.disabled');

			cy.getByDataTest('stepper-plus').click();
			cy.getByDataTest('stepper-plus').click();
			cy.getByDataTest('stepper-plus').click();
			cy.getByDataTest('stepper-plus').should('be.disabled');
			cy.getByDataTest('stepper-input').should('have.value', '3');
			cy.then(() => {
				expect(getControlValue(name)).to.eq(3);
			});
		});

		it('should wrap from max to min', () => {
			const name = nanoid();
			cy.withDataProvider({
				component: (
					<StepperControl
						{...defaultProps}
						min={1}
						max={3}
						wrap={true}
					/>
				),
				value: 3,
				name,
			});

			cy.getByDataTest('stepper-plus').should('not.be.disabled');
			cy.getByDataTest('stepper-plus').click();
			cy.getByDataTest('stepper-input').should('have.value', '1');
			cy.then(() => {
				expect(getControlValue(name)).to.eq(1);
			});

			cy.getByDataTest('stepper-minus').click();
			cy.getByDataTest('stepper-input').should('have.value', '3');
			cy.then(() => {
				expect(getControlValue(name)).to.eq(3);
			});
		});

		it('should clamp typed value on blur', () => {
			const name = nanoid();
			cy.withDataProvider({
				component: (
					<StepperControl {...defaultProps} min={1} max={10} />
				),
				value: 5,
				name,
			});

			cy.getByDataTest('stepper-input').clear();
			cy.getByDataTest('stepper-input').type('99');
			cy.getByDataTest('stepper-input').blur();
			cy.getByDataTest('stepper-input').should('have.value', '10');
			cy.then(() => {
				expect(getControlValue(name)).to.eq(10);
			});
		});

		it('should allow empty when allowEmpty is true', () => {
			const name = nanoid();
			cy.withDataProvider({
				component: (
					<StepperControl {...defaultProps} allowEmpty={true} />
				),
				value: 4,
				name,
			});

			cy.getByDataTest('stepper-input').clear();
			cy.getByDataTest('stepper-input').blur();
			cy.getByDataTest('stepper-input').should('have.value', '');
			cy.then(() => {
				expect(getControlValue(name)).to.eq('');
			});
		});

		it('should restore a number on blur when empty is not allowed', () => {
			const name = nanoid();
			cy.withDataProvider({
				component: (
					<StepperControl
						{...defaultProps}
						allowEmpty={false}
						defaultValue={2}
					/>
				),
				value: 4,
				name,
			});

			cy.getByDataTest('stepper-input').clear();
			cy.getByDataTest('stepper-input').blur();
			cy.getByDataTest('stepper-input').should('have.value', '4');
			cy.then(() => {
				expect(getControlValue(name)).to.eq(4);
			});
		});

		it('should support float values', () => {
			const name = nanoid();
			cy.withDataProvider({
				component: (
					<StepperControl
						{...defaultProps}
						float={true}
						step={0.5}
					/>
				),
				value: 1,
				name,
			});

			cy.getByDataTest('stepper-plus').click();
			cy.getByDataTest('stepper-input').should('have.value', '1.5');
			cy.then(() => {
				expect(getControlValue(name)).to.eq(1.5);
			});
		});

		it('should not commit values rejected by validator', () => {
			const name = nanoid();
			cy.withDataProvider({
				component: (
					<StepperControl
						{...defaultProps}
						validator={(next) =>
							typeof next === 'number' ? next % 2 === 0 : false
						}
					/>
				),
				value: 2,
				name,
			});

			cy.getByDataTest('stepper-plus').click();
			cy.getByDataTest('stepper-input').should('have.value', '2');
			cy.then(() => {
				expect(getControlValue(name)).to.eq(2);
			});
		});

		it('should disable the control', () => {
			cy.withDataProvider({
				component: <StepperControl {...defaultProps} disabled={true} />,
				value: 2,
				name,
			});

			cy.getByDataTest('stepper-input').should('be.disabled');
			cy.getByDataTest('stepper-minus').should('be.disabled');
			cy.getByDataTest('stepper-plus').should('be.disabled');
		});

		it('should change value with keyboard arrows', () => {
			const name = nanoid();
			cy.withDataProvider({
				component: <StepperControl {...defaultProps} />,
				value: 0,
				name,
			});

			cy.getByDataTest('stepper-input').focus();
			cy.getByDataTest('stepper-input').trigger('keydown', {
				key: 'ArrowUp',
			});
			cy.getByDataTest('stepper-input').should('have.value', '1');

			cy.getByDataTest('stepper-input').trigger('keydown', {
				key: 'ArrowDown',
				shiftKey: true,
			});
			cy.getByDataTest('stepper-input').should('have.value', '-9');
			cy.then(() => {
				expect(getControlValue(name)).to.eq(-9);
			});
		});

		it('should jump to min and max with Home and End', () => {
			const name = nanoid();
			cy.withDataProvider({
				component: (
					<StepperControl {...defaultProps} min={1} max={8} />
				),
				value: 4,
				name,
			});

			cy.getByDataTest('stepper-input').focus();
			cy.getByDataTest('stepper-input').trigger('keydown', {
				key: 'Home',
			});
			cy.getByDataTest('stepper-input').should('have.value', '1');

			cy.getByDataTest('stepper-input').trigger('keydown', {
				key: 'End',
			});
			cy.getByDataTest('stepper-input').should('have.value', '8');
			cy.then(() => {
				expect(getControlValue(name)).to.eq(8);
			});
		});

		it('should onChange fire when interacting with component', () => {
			const props = {
				field: 'stepper',
				onChange: (value) => {
					controlReducer(
						select('blockera/controls').getControl(name),
						modifyControlValue({
							value,
							controlId: name,
						})
					);
				},
			};

			cy.stub(props, 'onChange').as('onChange');
			cy.withDataProvider({
				component: <StepperControl {...props} />,
				value: 0,
				name,
			});

			cy.getByDataTest('stepper-plus').click();
			cy.get('@onChange').should('have.been.called');
		});
	});

	describe('test useControlContext :', () => {
		it('should render defaultValue when: defaultValue OK && id !OK && value is undefined', () => {
			const name = nanoid();
			cy.withDataProvider({
				component: (
					<StepperControl {...defaultProps} defaultValue={50} />
				),
				name,
			});

			cy.getByDataTest('stepper-input').should('have.value', '50');
		});

		it('should render value when: defaultValue OK && id OK && value is OK', () => {
			const name = nanoid();
			cy.withDataProvider({
				component: (
					<StepperControl
						{...defaultProps}
						defaultValue={50}
						id="[1]"
					/>
				),
				name,
				value: [25, 20],
			});

			cy.getByDataTest('stepper-input').should('have.value', '20');
		});

		it('should render default value when: defaultValue OK && id is ok, value is invalid', () => {
			const name = nanoid();
			cy.withDataProvider({
				component: (
					<StepperControl
						{...defaultProps}
						defaultValue={70}
						id="[0].value"
					/>
				),
				value: [{ value: undefined }],
				name,
			});

			cy.getByDataTest('stepper-input').should('have.value', '70');
		});

		it('should render default value when: defaultValue OK && id is invalid, value ok', () => {
			const name = nanoid();
			cy.withDataProvider({
				component: (
					<StepperControl
						{...defaultProps}
						defaultValue={30}
						id="[0].x"
					/>
				),
				value: [{ value: 10 }],
				name,
			});

			cy.getByDataTest('stepper-input').should('have.value', '30');
		});

		it('should render value when: defaultValue !OK && id is !Ok, value ok', () => {
			const name = nanoid();
			cy.withDataProvider({
				component: <StepperControl {...defaultProps} />,
				value: 20,
				name,
			});

			cy.getByDataTest('stepper-input').should('have.value', '20');
		});
	});
});
