import { applyFilters } from '@wordpress/hooks';
import { createAppendStylesRunner } from '../create-append-styles-runner';
import { getBlockeraStyleFingerprint } from '../blockera-style-fingerprint';

jest.mock('@wordpress/hooks', () => {
	const actual = jest.requireActual('@wordpress/hooks');
	return {
		...actual,
		applyFilters: jest.fn((hook, value) => value),
	};
});

describe('createAppendStylesRunner', () => {
	beforeEach(() => {
		applyFilters.mockClear();
		applyFilters.mockImplementation((hook, value) => ({
			Alpha: (settings) => [
				{ selector: '.a', declarations: [settings.mark] },
			],
			Beta: (settings) => [
				{ selector: '.b', declarations: [settings.mark] },
			],
		}));
	});

	it('calls applyFilters once for many appendStyles invocations', () => {
		const appendStyles = createAppendStylesRunner({});

		appendStyles({ mark: 'one' });
		appendStyles({ mark: 'two' });
		appendStyles({ mark: 'three' });

		expect(applyFilters).toHaveBeenCalledTimes(1);
		expect(applyFilters).toHaveBeenCalledWith(
			'blockera.editor.styleEngine.generators',
			expect.any(Object)
		);
	});

	it('emits the same rule shape as running every enabled generator', () => {
		const appendStyles = createAppendStylesRunner({});
		const rules = appendStyles({ mark: 'x' });

		expect(rules).toEqual([
			{ selector: '.a', declarations: ['x'] },
			{ selector: '.b', declarations: ['x'] },
		]);
	});

	it('omits disabled generator names', () => {
		const appendStyles = createAppendStylesRunner({}, ['Beta']);
		const rules = appendStyles({ mark: 'x' });

		expect(rules).toEqual([{ selector: '.a', declarations: ['x'] }]);
	});
});

describe('getBlockeraStyleFingerprint identity cache', () => {
	it('returns the same string for the same attributes object', () => {
		const attributes = {
			blockeraId: 'abc123',
			blockeraFontSize: { value: '16px' },
			content: 'Hello',
		};

		const first = getBlockeraStyleFingerprint(attributes);
		const second = getBlockeraStyleFingerprint(attributes);

		expect(first).toBe(second);
		expect(first).toContain('blockeraFontSize');
		expect(first).not.toContain('Hello');
	});

	it('recomputes when a new attributes object has different Blockera values', () => {
		const first = getBlockeraStyleFingerprint({
			blockeraFontSize: { value: '16px' },
		});
		const second = getBlockeraStyleFingerprint({
			blockeraFontSize: { value: '18px' },
		});

		expect(first).not.toBe(second);
	});

	it('does not re-serialize unchanged nested trees when only a primitive changes', () => {
		const layers = { item: { type: 'image', image: 'x.png' } };
		const first = getBlockeraStyleFingerprint({
			blockeraBackground: layers,
			blockeraBackgroundColor: '#aaa',
		});
		const second = getBlockeraStyleFingerprint({
			blockeraBackground: layers,
			blockeraBackgroundColor: '#bbb',
		});
		const sameColor = getBlockeraStyleFingerprint({
			blockeraBackground: layers,
			blockeraBackgroundColor: '#aaa',
		});

		expect(first).not.toBe(second);
		expect(first).toBe(sameColor);
		expect(first).toContain('blockeraBackground');
	});
});
