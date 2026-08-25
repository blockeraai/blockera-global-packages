import { shouldPrintBlockeraBlockStyles } from '../components/block-style';

describe('shouldPrintBlockeraBlockStyles', () => {
	const schemaDefaults = {
		blockeraBorder: { type: 'object', default: { value: '' } },
	};

	it('skips empty blocks with no identity', () => {
		expect(
			shouldPrintBlockeraBlockStyles({
				clientId: 'c1',
				attributes: {},
				defaultAttributes: schemaDefaults,
			})
		).toBe(false);
	});

	it('prints when blockeraId is present', () => {
		expect(
			shouldPrintBlockeraBlockStyles({
				clientId: 'c1',
				attributes: { blockeraId: 'abc123' },
				defaultAttributes: schemaDefaults,
			})
		).toBe(true);
	});

	it('prints hover-preview feature attrs without identity', () => {
		expect(
			shouldPrintBlockeraBlockStyles({
				clientId: 'c1',
				attributes: {
					blockeraBorder: { value: '2px solid #111' },
				},
				defaultAttributes: schemaDefaults,
			})
		).toBe(true);
	});

	it('prints overlay border shape without identity', () => {
		expect(
			shouldPrintBlockeraBlockStyles({
				clientId: 'c1',
				attributes: {
					blockeraBorder: {
						all: { width: '2px', style: 'solid', color: '#111' },
						type: 'all',
					},
				},
				defaultAttributes: schemaDefaults,
			})
		).toBe(true);
	});

	it('prints when overlay patch is active even if features look unused', () => {
		expect(
			shouldPrintBlockeraBlockStyles({
				clientId: 'c1',
				attributes: {
					blockeraBorder: { value: '', all: {}, type: 'all' },
				},
				defaultAttributes: schemaDefaults,
				hasPresetPreviewPatch: true,
			})
		).toBe(true);
	});
});
