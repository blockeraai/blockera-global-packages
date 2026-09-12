import { getDeferredPresetFieldSignature } from '../use-deferred-scalar-preset-field';

describe('getDeferredPresetFieldSignature', () => {
	it('matches object values by contents, not identity', () => {
		expect(
			getDeferredPresetFieldSignature({
				width: '2px',
				style: 'solid',
				color: '#111',
			})
		).toBe(
			getDeferredPresetFieldSignature({
				width: '2px',
				style: 'solid',
				color: '#111',
			})
		);
	});

	it('changes when object contents change', () => {
		expect(
			getDeferredPresetFieldSignature({
				width: '2px',
				style: 'solid',
				color: '#111',
			})
		).not.toBe(
			getDeferredPresetFieldSignature({
				width: '4px',
				style: 'solid',
				color: '#111',
			})
		);
	});
});
