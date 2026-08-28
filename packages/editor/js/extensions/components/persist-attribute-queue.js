// @flow

/**
 * Queue BlockBase attribute persists so one Gutenberg store notification
 * covers every block that needs a write in the same layout-effect wave.
 */

type PersistJob = () => void;
type BatchFn = (callback: () => void) => void;

let jobs: Array<PersistJob> = [];
let scheduled: boolean = false;
let batchImpl: ?BatchFn = null;

export function enqueueBlockAttributePersist(
	registry: ?{ batch?: BatchFn },
	job: PersistJob
): void {
	if (registry && typeof registry.batch === 'function') {
		batchImpl = registry.batch.bind(registry);
	}

	jobs.push(job);

	if (scheduled) {
		return;
	}

	scheduled = true;
	queueMicrotask(flushBlockAttributePersistQueue);
}

function flushBlockAttributePersistQueue(): void {
	scheduled = false;
	const pending = jobs;
	jobs = [];
	const batch = batchImpl;
	batchImpl = null;

	if (!pending.length) {
		return;
	}

	const run = () => {
		for (let i = 0; i < pending.length; i++) {
			pending[i]();
		}
	};

	if (batch) {
		batch(run);
	} else {
		run();
	}
}
