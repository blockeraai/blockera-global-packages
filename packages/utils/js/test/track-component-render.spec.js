import {
	BLOCK_BASE_RENDER_DEBUG_KEY,
	PERF_COUNTERS_KEY,
	RENDER_DEBUG_KEY,
	RENDER_STATS_KEY,
	shouldTrackComponentRender,
	trackComponentRender,
	trackPerfCounter,
} from '../track-component-render';

describe('trackComponentRender', () => {
	beforeEach(() => {
		delete window[RENDER_DEBUG_KEY];
		delete window[BLOCK_BASE_RENDER_DEBUG_KEY];
		delete window[RENDER_STATS_KEY];
		delete window[PERF_COUNTERS_KEY];
		delete window.__BLOCKERA_BLOCK_BASE_RENDER_STATS__;
	});

	test('is a no-op when no window debug flag is set', () => {
		expect(shouldTrackComponentRender()).toBe(false);
		trackComponentRender('InputControl', { id: 'x' });
		expect(window[RENDER_STATS_KEY]).toBeUndefined();
	});

	test('counts InputControl only when the shared render flag is set', () => {
		window[RENDER_DEBUG_KEY] = true;
		expect(shouldTrackComponentRender()).toBe(true);

		trackComponentRender('InputControl', { id: 'font-size' });
		trackComponentRender('InputControl', { id: 'font-size' });

		expect(window[RENDER_STATS_KEY].total).toBe(2);
		expect(window[RENDER_STATS_KEY].byComponent.InputControl.total).toBe(2);
		expect(
			window[RENDER_STATS_KEY].byComponent.InputControl.byKey['font-size']
				.count
		).toBe(2);
	});

	test('BlockBase legacy flag does not enable InputControl tracking', () => {
		window[BLOCK_BASE_RENDER_DEBUG_KEY] = true;
		expect(shouldTrackComponentRender()).toBe(false);
		expect(shouldTrackComponentRender('BlockBase')).toBe(true);

		trackComponentRender('InputControl', { id: 'x' });
		trackComponentRender('BlockBase', {
			clientId: 'abc',
			name: 'core/paragraph',
			isSelected: true,
			insideBlockInspector: true,
		});

		expect(window[RENDER_STATS_KEY]?.byComponent?.InputControl).toBeUndefined();
		expect(window.__BLOCKERA_BLOCK_BASE_RENDER_STATS__.total).toBe(1);
		expect(window.__BLOCKERA_BLOCK_BASE_RENDER_STATS__.byClientId.abc.count).toBe(
			1
		);
	});

	test('trackPerfCounter is a no-op without the shared render flag', () => {
		trackPerfCounter('gs.mergeConfigs', { outcome: 'rebuilt' });
		expect(window[PERF_COUNTERS_KEY]).toBeUndefined();
	});

	test('trackPerfCounter counts totals and outcomes when the flag is set', () => {
		window[RENDER_DEBUG_KEY] = true;
		trackPerfCounter('gs.mergeConfigs', { outcome: 'retained' });
		trackPerfCounter('gs.mergeConfigs', { outcome: 'rebuilt' });
		trackPerfCounter('gs.editEntityRecord');

		expect(window[PERF_COUNTERS_KEY].byName['gs.mergeConfigs'].total).toBe(2);
		expect(window[PERF_COUNTERS_KEY].byName['gs.mergeConfigs'].retained).toBe(
			1
		);
		expect(window[PERF_COUNTERS_KEY].byName['gs.mergeConfigs'].rebuilt).toBe(1);
		expect(window[PERF_COUNTERS_KEY].byName['gs.editEntityRecord'].total).toBe(
			1
		);
	});
});
