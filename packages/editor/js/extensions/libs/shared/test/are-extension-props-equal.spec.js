import { areExtensionPropsEqual } from '../are-extension-props-equal';

describe('areExtensionPropsEqual', () => {
	const handle = () => {};

	it('skips when sliced values match despite new object identities', () => {
		const prev = {
			values: { blockeraFontSize: { value: '16px' } },
			extensionConfig: { status: true },
			handleOnChangeAttributes: handle,
			currentState: 'normal',
		};
		const next = {
			values: { blockeraFontSize: { value: '16px' } },
			extensionConfig: { status: true },
			handleOnChangeAttributes: handle,
			currentState: 'normal',
		};

		expect(areExtensionPropsEqual(prev, next)).toBe(true);
	});

	it('invalidates when the owned value slice changes', () => {
		const prev = {
			values: { blockeraFontSize: { value: '16px' } },
			handleOnChangeAttributes: handle,
		};
		const next = {
			values: { blockeraFontSize: { value: '18px' } },
			handleOnChangeAttributes: handle,
		};

		expect(areExtensionPropsEqual(prev, next)).toBe(false);
	});

	it('invalidates when a callback identity changes', () => {
		const prev = {
			values: { blockeraFontSize: { value: '16px' } },
			handleOnChangeAttributes: handle,
		};
		const next = {
			values: { blockeraFontSize: { value: '16px' } },
			handleOnChangeAttributes: () => {},
		};

		expect(areExtensionPropsEqual(prev, next)).toBe(false);
	});
});
