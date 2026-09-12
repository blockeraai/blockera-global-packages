import {
	enqueueControlRegistration,
	flushQueuedControlRegistrations,
	resetControlRegistrationQueueForTests,
} from '../enqueue-control-registration';

jest.mock('../../api', () => ({
	registerControl: jest.fn(),
}));

const { registerControl } = require('../../api');

describe('enqueueControlRegistration', () => {
	beforeEach(() => {
		resetControlRegistrationQueueForTests();
		registerControl.mockClear();
	});

	it('does not call registerControl until flush', () => {
		enqueueControlRegistration({ name: 'a', type: 'blockera/controls' });

		expect(registerControl).not.toHaveBeenCalled();

		flushQueuedControlRegistrations();

		expect(registerControl).toHaveBeenCalledTimes(1);
		expect(registerControl).toHaveBeenCalledWith({
			name: 'a',
			type: 'blockera/controls',
		});
	});

	it('flushes many payloads in one batch callback', () => {
		enqueueControlRegistration({ name: 'a', type: 'blockera/controls' });
		enqueueControlRegistration({ name: 'b', type: 'blockera/controls' });

		const batch = jest.fn((run) => run());
		flushQueuedControlRegistrations(batch);

		expect(batch).toHaveBeenCalledTimes(1);
		expect(registerControl).toHaveBeenCalledTimes(2);
	});

	it('is a no-op when the queue is empty', () => {
		const batch = jest.fn();
		flushQueuedControlRegistrations(batch);

		expect(batch).not.toHaveBeenCalled();
		expect(registerControl).not.toHaveBeenCalled();
	});
});
