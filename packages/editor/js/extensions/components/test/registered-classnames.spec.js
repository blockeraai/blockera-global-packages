/**
 * Internal dependencies
 */
import {
	clearRegisteredClassNames,
	getBlockeraClassTokens,
	isClassNameDuplicate,
	registerClassName,
} from '../registered-classnames';

describe('getBlockeraClassTokens', () => {
	it('returns unique blockera-block tokens including legacy double-hyphen', () => {
		expect(
			getBlockeraClassTokens(
				'wp-block-group blockera-block blockera-block--ugr1p5 extra'
			)
		).toEqual(['blockera-block--ugr1p5']);
	});

	it('returns canonical unique tokens', () => {
		expect(
			getBlockeraClassTokens(
				'blockera-block blockera-block-7stufb is-style-plain'
			)
		).toEqual(['blockera-block-7stufb']);
	});

	it('returns an empty list for missing or non-string class names', () => {
		expect(getBlockeraClassTokens(undefined)).toEqual([]);
		expect(getBlockeraClassTokens(null)).toEqual([]);
		expect(getBlockeraClassTokens('')).toEqual([]);
		expect(getBlockeraClassTokens(12)).toEqual([]);
	});
});

describe('isClassNameDuplicate with registered tokens', () => {
	afterEach(() => {
		clearRegisteredClassNames();
	});

	it('treats a class used by another clientId as a duplicate', () => {
		registerClassName('a', 'blockera-block-7stufb');
		registerClassName('b', 'blockera-block-7stufb');

		expect(isClassNameDuplicate('a', 'blockera-block-7stufb')).toBe(true);
		expect(isClassNameDuplicate('c', 'blockera-block-7stufb')).toBe(true);
	});

	it('does not flag a class used only by this clientId', () => {
		registerClassName('a', 'blockera-block-7stufb');

		expect(isClassNameDuplicate('a', 'blockera-block-7stufb')).toBe(false);
	});
});
