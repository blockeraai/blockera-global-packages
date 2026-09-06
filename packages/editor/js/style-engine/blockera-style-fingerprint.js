// @flow

/**
 * Stable fingerprint of Blockera-controlled attributes for style-engine memoization.
 * Stringify is skipped when the same attributes object (and inlineStyles ref) is reused.
 * Nested objects use identity tokens so color-only updates do not re-serialize
 * unchanged Image & Gradient (or other) trees.
 */

const fingerprintByAttributes: WeakMap<
	Object,
	{ inline: Object | null | void, fingerprint: string }
> = new WeakMap();

const objectIdentityTokens: WeakMap<Object, number> = new WeakMap();
let nextObjectIdentityToken: number = 1;

function fingerprintValue(value: mixed): string {
	if (value !== null && typeof value === 'object') {
		const objectValue: Object = value;
		let token = objectIdentityTokens.get(objectValue);

		if (token === undefined) {
			token = nextObjectIdentityToken++;
			objectIdentityTokens.set(objectValue, token);
		}

		return '@' + String(token);
	}

	if (value === undefined) {
		return 'undefined';
	}

	const encoded: string | void = JSON.stringify(value);

	return encoded ?? String(value);
}

/**
 * @param {Object|null|void} attributes Block attributes.
 * @param {Object|null|void} inlineStyles Optional inline style overrides.
 * @return {string} Fingerprint string.
 */
export function getBlockeraStyleFingerprint(
	attributes: Object | null | void,
	inlineStyles?: Object | null
): string {
	if (!attributes) {
		return '';
	}

	const cached = fingerprintByAttributes.get(attributes);
	if (cached && cached.inline === inlineStyles) {
		return cached.fingerprint;
	}

	const parts: Array<string> = [];

	for (const key of Object.keys(attributes).sort()) {
		if (key === 'className' || key.startsWith('blockera')) {
			parts.push(`${key}:${fingerprintValue(attributes[key])}`);
		}
	}

	if (inlineStyles && Object.keys(inlineStyles).length) {
		parts.push(`inline:${fingerprintValue(inlineStyles)}`);
	}

	const fingerprint = parts.join('|');
	fingerprintByAttributes.set(attributes, {
		inline: inlineStyles,
		fingerprint,
	});

	return fingerprint;
}

/**
 * @param {Object} props StateStyle props.
 * @param {Array<string>} states Resolved state list.
 * @param {Object} breakpoints Breakpoint map.
 * @return {string} Composite fingerprint for StateStyle memoization.
 */
export function getStateStyleFingerprint(
	props: Object,
	states: Array<string>,
	breakpoints: Object
): string {
	return [
		props.clientId,
		props.blockName,
		props.currentBlock,
		props.currentState,
		props.currentBreakpoint,
		props.currentInnerBlockState,
		props.isGlobalStylesWrapper ? '1' : '0',
		JSON.stringify(props.disabledStyles || []),
		states.join(','),
		Object.keys(breakpoints || {})
			.sort()
			.join(','),
		getBlockeraStyleFingerprint(props.attributes, props.inlineStyles),
	].join('\0');
}
