import { dispatch } from '@wordpress/data';
import {
	applySearchHighlights,
	clearSearchHighlights,
	getClickedMatchIndex,
} from '../highlights';
import {
	ANNOTATION_SOURCE,
	ANNOTATION_SOURCE_CURRENT,
} from '../store/constants';

jest.mock('@wordpress/data', () => ({
	dispatch: jest.fn(),
	select: jest.fn(),
}));

jest.mock(
	'@wordpress/annotations',
	() => ({
		store: 'core/annotations',
	}),
	{ virtual: true }
);

describe('search-replace highlights', () => {
	let addAnnotation;
	let removeBySource;

	beforeEach(() => {
		addAnnotation = jest.fn();
		removeBySource = jest.fn();
		dispatch.mockReturnValue({
			__experimentalAddAnnotation: addAnnotation,
			__experimentalRemoveAnnotationsBySource: removeBySource,
		});
	});

	it('uses a darker source only for the current visible match', () => {
		applySearchHighlights(
			[
				{
					kind: 'visible',
					clientId: 'a',
					identifier: 'content',
					start: 0,
					end: 4,
				},
				{
					kind: 'visible',
					clientId: 'a',
					identifier: 'content',
					start: 10,
					end: 14,
				},
				{
					kind: 'attribute',
					clientId: 'b',
					identifier: 'alt',
					start: 0,
					end: 3,
				},
			],
			1
		);

		expect(removeBySource).toHaveBeenCalledWith(ANNOTATION_SOURCE);
		expect(removeBySource).toHaveBeenCalledWith(ANNOTATION_SOURCE_CURRENT);
		expect(addAnnotation).toHaveBeenCalledTimes(2);
		expect(addAnnotation.mock.calls[0][0].source).toBe(
			ANNOTATION_SOURCE
		);
		expect(addAnnotation.mock.calls[0][0].range).toEqual({
			start: 0,
			end: 4,
		});
		expect(addAnnotation.mock.calls[1][0].source).toBe(
			ANNOTATION_SOURCE_CURRENT
		);
		expect(addAnnotation.mock.calls[1][0].range).toEqual({
			start: 10,
			end: 14,
		});
		expect(addAnnotation.mock.calls[0][0].id).toBe('bsr-0');
		expect(addAnnotation.mock.calls[1][0].id).toBe('bsr-1');
	});

	it('clears both highlight sources', () => {
		clearSearchHighlights();
		expect(removeBySource).toHaveBeenCalledWith(ANNOTATION_SOURCE);
		expect(removeBySource).toHaveBeenCalledWith(ANNOTATION_SOURCE_CURRENT);
	});

	it('reads the match index from a clicked highlight mark', () => {
		const mark = document.createElement('mark');
		mark.className = 'annotation-text-blockera-search-replace';
		mark.id = 'annotation-text-bsr-3';
		expect(getClickedMatchIndex({ target: mark })).toBe(3);
		expect(getClickedMatchIndex({ target: document.createElement('span') })).toBe(
			-1
		);
	});
});
