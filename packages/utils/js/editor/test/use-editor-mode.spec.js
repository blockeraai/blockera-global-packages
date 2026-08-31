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

describe('useEditorMode', () => {
	afterEach(() => {
		useSelect.mockReset();
	});

	function mockEditorMode(mode) {
		useSelect.mockImplementation((mapSelect) =>
			mapSelect((storeName) => {
				expect(storeName).toBe('core/editor');

				return {
					getEditorMode: () => mode,
				};
			})
		);
	}

	it('returns visual by default when getEditorMode is missing', () => {
		useSelect.mockImplementation((mapSelect) =>
			mapSelect((storeName) => {
				expect(storeName).toBe('core/editor');

				return {};
			})
		);

		const { result } = renderHook(() => useEditorMode());

		expect(result.current).toBe('visual');
	});

	it('returns the current editor mode', () => {
		mockEditorMode('text');

		const { result } = renderHook(() => useEditorMode());

		expect(result.current).toBe('text');
	});
});
