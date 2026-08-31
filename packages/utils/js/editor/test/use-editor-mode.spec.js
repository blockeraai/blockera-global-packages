/**
 * External dependencies
 */
import { renderHook } from '@testing-library/react';

/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import { useEditorMode } from '../use-editor-mode';

jest.mock('@wordpress/data', () => ({
	useSelect: jest.fn(),
}));

jest.mock('@wordpress/editor', () => ({
	store: 'core/editor',
}));

describe('useEditorMode', () => {
	afterEach(() => {
		useSelect.mockReset();
	});

	function mockEditorMode(mode) {
		useSelect.mockImplementation((mapSelect) =>
			mapSelect(() => ({
				getEditorMode: () => mode,
			}))
		);
	}

	it('returns visual by default when getEditorMode is missing', () => {
		useSelect.mockImplementation((mapSelect) => mapSelect(() => ({})));

		const { result } = renderHook(() => useEditorMode());

		expect(result.current).toBe('visual');
	});

	it('returns the current editor mode', () => {
		mockEditorMode('text');

		const { result } = renderHook(() => useEditorMode());

		expect(result.current).toBe('text');
	});
});
