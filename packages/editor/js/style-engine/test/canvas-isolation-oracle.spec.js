import {
	areBlockStylePropsEqual,
	shouldPrintBlockeraBlockStyles,
} from '../components/block-style';
import {
	getBlockeraStyleFingerprint,
	getStateStyleFingerprint,
} from '../blockera-style-fingerprint';

/**
 * Phase 0 CSS/behavior oracle.
 *
 * Profiler (manual): type in Typography, drag spacing, switch breakpoint with
 * many blocks, switch the selected block. BlockStyle must not follow another
 * block’s inner-target / breakpoint via the extensions UI store.
 *
 * These tests freeze: print gates, fingerprint keys, and BlockStyle memo
 * equality so sibling UI state does not look like a CSS input change.
 */
describe('style-engine canvas isolation oracle', () => {
	const schemaDefaults = {
		blockeraBorder: { type: 'object', default: { value: '' } },
	};

	const baseProps = {
		clientId: 'c-canvas',
		blockName: 'core/paragraph',
		customCss: '',
		activeDeviceType: 'desktop',
		hasPresetPreviewPatch: false,
		isGlobalStylesWrapper: false,
		currentBlock: 'master',
		currentState: 'normal',
		currentBreakpoint: 'desktop',
		currentInnerBlockState: 'normal',
		supports: {},
		selectors: {},
		additional: {},
		defaultAttributes: schemaDefaults,
		attributes: {
			blockeraId: 'abc123',
			blockeraFontSize: { value: '16px' },
			content: 'Hello',
		},
		inlineStyles: {},
	};

	it('prints when identity is present and skips empty blocks', () => {
		expect(
			shouldPrintBlockeraBlockStyles({
				clientId: 'c1',
				attributes: {},
				defaultAttributes: schemaDefaults,
			})
		).toBe(false);
		expect(
			shouldPrintBlockeraBlockStyles({
				clientId: 'c1',
				attributes: { blockeraId: 'abc123' },
				defaultAttributes: schemaDefaults,
			})
		).toBe(true);
	});

	it('fingerprints Blockera attrs and ignores WP content', () => {
		const a = getBlockeraStyleFingerprint(baseProps.attributes);
		const b = getBlockeraStyleFingerprint({
			...baseProps.attributes,
			content: 'Changed in the editor',
		});

		expect(a).toBe(b);
		expect(a).toContain('blockeraFontSize');
		expect(a).not.toContain('Hello');
	});

	it('StateStyle fingerprint changes only for this block’s current* and attrs', () => {
		const states = ['normal', 'hover'];
		const breakpoints = { desktop: {}, tablet: {} };
		const same = getStateStyleFingerprint(baseProps, states, breakpoints);
		const otherInner = getStateStyleFingerprint(
			{ ...baseProps, currentBlock: 'elements/link' },
			states,
			breakpoints
		);
		const otherAttrs = getStateStyleFingerprint(
			{
				...baseProps,
				attributes: {
					...baseProps.attributes,
					blockeraFontSize: { value: '20px' },
				},
			},
			states,
			breakpoints
		);

		expect(same).not.toBe(otherInner);
		expect(same).not.toBe(otherAttrs);
	});

	it('areBlockStylePropsEqual treats pinned unselected current* as stable', () => {
		const pinned = { ...baseProps };
		const siblingUiWouldHaveBeen = {
			...baseProps,
			currentBlock: 'elements/link',
			currentBreakpoint: 'tablet',
		};

		expect(areBlockStylePropsEqual(pinned, { ...pinned })).toBe(true);
		expect(areBlockStylePropsEqual(pinned, siblingUiWouldHaveBeen)).toBe(
			false
		);

		const contentOnly = {
			...baseProps,
			attributes: {
				...baseProps.attributes,
				content: 'Unrelated WP text',
			},
		};
		expect(areBlockStylePropsEqual(pinned, contentOnly)).toBe(true);
	});

	it('areBlockStylePropsEqual invalidates on Blockera attribute edits', () => {
		const next = {
			...baseProps,
			attributes: {
				...baseProps.attributes,
				blockeraFontSize: { value: '18px' },
			},
		};

		expect(areBlockStylePropsEqual(baseProps, next)).toBe(false);
	});
});
