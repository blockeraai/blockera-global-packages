import {
	mutationsAddedIframe,
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
	it('prefers the visual editor over the interface skeleton', () => {
		const doc = document.implementation.createHTMLDocument('');
		const skeleton = doc.createElement('div');
		skeleton.className = 'interface-interface-skeleton';
		const visual = doc.createElement('div');
		visual.className = 'edit-site-visual-editor';
		skeleton.appendChild(visual);
		doc.body.appendChild(skeleton);

		expect(resolveIframeMountObserverRoot(doc)).toBe(visual);
	});

	it('prefers canvas content over the full skeleton', () => {
		const doc = document.implementation.createHTMLDocument('');
		const skeleton = doc.createElement('div');
		skeleton.className = 'interface-interface-skeleton';
		const content = doc.createElement('div');
		content.className = 'interface-interface-skeleton__content';
		skeleton.appendChild(content);
		doc.body.appendChild(skeleton);

		expect(resolveIframeMountObserverRoot(doc)).toBe(content);
	});

	it('falls back to the interface skeleton over document.body', () => {
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

describe('mutationsAddedIframe', () => {
	it('detects a direct iframe node without querying descendants', () => {
		const iframe = document.createElement('iframe');
		const mutation = {
			addedNodes: [iframe],
		};

		expect(mutationsAddedIframe([mutation])).toBe(true);
	});

	it('ignores inspector nodes that do not include an iframe', () => {
		const panel = document.createElement('div');
		panel.className = 'components-panel';
		panel.appendChild(document.createElement('input'));
		const mutation = {
			addedNodes: [panel],
		};

		expect(mutationsAddedIframe([mutation])).toBe(false);
	});
});
