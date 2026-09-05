import {
	resolveIframeMountObserverRoot,
	shouldSkipGlobalStylesEditorSettingsUpdate,
} from '../should-skip-editor-settings-sync';

describe('shouldSkipGlobalStylesEditorSettingsUpdate', () => {
	it('does not skip the first write', () => {
		expect(
			shouldSkipGlobalStylesEditorSettingsUpdate(
				null,
				{ color: {} },
				'',
				':root { --x: 1; }'
			)
		).toBe(false);
	});

	it('skips when features and supplemental CSS are unchanged', () => {
		const features = { color: { palette: [] } };

		expect(
			shouldSkipGlobalStylesEditorSettingsUpdate(
				features,
				{ color: { palette: [] } },
				':root { --x: 1; }',
				':root { --x: 1; }'
			)
		).toBe(true);
	});

	it('does not skip when supplemental CSS changes', () => {
		const features = { color: {} };

		expect(
			shouldSkipGlobalStylesEditorSettingsUpdate(
				features,
				features,
				':root { --x: 1; }',
				':root { --x: 2; }'
			)
		).toBe(false);
	});
});

describe('resolveIframeMountObserverRoot', () => {
	it('prefers the interface skeleton over document.body', () => {
		const doc = document.implementation.createHTMLDocument('');
		const skeleton = doc.createElement('div');
		skeleton.className = 'interface-interface-skeleton';
		doc.body.appendChild(skeleton);

		expect(resolveIframeMountObserverRoot(doc)).toBe(skeleton);
	});

	it('falls back to body when the skeleton is missing', () => {
		const doc = document.implementation.createHTMLDocument('');

		expect(resolveIframeMountObserverRoot(doc)).toBe(doc.body);
	});
});
