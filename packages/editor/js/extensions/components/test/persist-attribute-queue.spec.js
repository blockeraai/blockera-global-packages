/**
 * Internal dependencies
 */
import { enqueueBlockAttributePersist } from '../persist-attribute-queue';

function flushMicrotasks() {
	return new Promise((resolve) => {
		queueMicrotask(resolve);
	});
}

describe('enqueueBlockAttributePersist', () => {
	it('runs queued jobs inside a single registry.batch', async () => {
		const calls = [];
		const registry = {
			batch: (callback) => {
				calls.push('batch');
				callback();
			},
		};

		enqueueBlockAttributePersist(registry, () => {
			calls.push('a');
		});
		enqueueBlockAttributePersist(registry, () => {
			calls.push('b');
		});

		expect(calls).toEqual([]);

		await flushMicrotasks();

		expect(calls).toEqual(['batch', 'a', 'b']);
	});

	it('runs jobs without batch when the registry has none', async () => {
		const calls = [];

		enqueueBlockAttributePersist(null, () => {
			calls.push('a');
		});

		await flushMicrotasks();

		expect(calls).toEqual(['a']);
	});
});
