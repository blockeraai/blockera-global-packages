// @flow

/**
 * Stable fingerprint of Blockera-controlled attributes for style-engine memoization.
 *
 * The attributes object is cached by identity. Nested values are path-scoped:
 * each object is memoized, and a cloned wrapper with the same child refs (or
 * the same primitive leaves) keeps the same string so color-only updates do
 * not re-serialize unchanged Image & Gradient trees.
 */

const fingerprintByAttributes: WeakMap<
	Object,
	{ inline: Object | null | void, fingerprint: string }
> = new WeakMap();

const nestedFingerprintByObject: WeakMap<Object, string> = new WeakMap();

function fingerprintPrimitive(value: mixed): string {
	if (value === undefined) {
		return 'undefined';
	}

	const encoded: string | void = JSON.stringify(value);

	return encoded ?? String(value);
}

function fingerprintValue(value: mixed): string {
	if (value === null) {
		return 'null';
	}

	if (typeof value !== 'object') {
		return fingerprintPrimitive(value);
	}

	const objectValue: Object = value;
	const cached = nestedFingerprintByObject.get(objectValue);

	if (cached !== undefined) {
		return cached;
	}

	// Break cycles before walking children.
	nestedFingerprintByObject.set(objectValue, '#');

	let result: string;

	if (Array.isArray(objectValue)) {
		const parts: Array<string> = [];

		for (let i = 0; i < objectValue.length; i++) {
			parts.push(fingerprintValue(objectValue[i]));
		}

		result = '[' + parts.join(',') + ']';
	} else {
		const keys = Object.keys(objectValue).sort();
		const parts: Array<string> = [];

		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			parts.push(key + ':' + fingerprintValue(objectValue[key]));
		}

		result = '{' + parts.join(',') + '}';
	}

	nestedFingerprintByObject.set(objectValue, result);

	return result;
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
