/**
 * Internal dependencies
 */
import { stopRepeaterItemClick } from '../utils';

describe('stopRepeaterItemClick', () => {
	it('stops a DOM/React click without throwing', () => {
		const event = {
			stopPropagation: jest.fn(),
			preventDefault: jest.fn(),
			nativeEvent: {
				stopImmediatePropagation: jest.fn(),
			},
		};

		stopRepeaterItemClick(event);

		expect(event.stopPropagation).toHaveBeenCalled();
		expect(event.preventDefault).toHaveBeenCalled();
		expect(event.nativeEvent.stopImmediatePropagation).toHaveBeenCalled();
	});

	it('does not throw when the confirm-delete modal passes a repeater item', () => {
		expect(() =>
			stopRepeaterItemClick({
				slug: 'e-2-e-picker-delete-fs',
				name: 'E2E Picker Delete FS',
				deletable: true,
			})
		).not.toThrow();
	});
});
