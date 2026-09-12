/**
 * Nested attribute path helpers (`head[].cells[].content`).
 *
 * @package
 */

/**
 * @param {string} path
 * @return {Array<{ key: string, array: boolean }>}
 */
export function parsePath(path) {
	if (!path) {
		return [];
	}

	return path.split('.').map((segment) => {
		const array = segment.endsWith('[]');
		return {
			key: array ? segment.slice(0, -2) : segment,
			array,
		};
	});
}

/**
 * Collect concrete leaves for a path pattern.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} path Path pattern.
 * @return {Array<{ loc: Array<string|number>, value: * }>}
 */
export function collectLeaves(attributes, path) {
	const parts = parsePath(path);

	const walk = (value, remaining, loc) => {
		if (!remaining.length) {
			return [{ loc, value }];
		}

		const [head, ...rest] = remaining;
		const next = value?.[head.key];

		if (head.array) {
			if (!Array.isArray(next)) {
				return [];
			}
			return next.flatMap((item, index) =>
				walk(item, rest, [...loc, head.key, index])
			);
		}

		if (next === undefined || next === null) {
			if (!rest.length && value && head.key in value) {
				return [{ loc: [...loc, head.key], value: next }];
			}
			if (!rest.length) {
				return [];
			}
			return [];
		}

		return walk(next, rest, [...loc, head.key]);
	};

	return walk(attributes, parts, []);
}

/**
 * Set a value at a concrete location list.
 *
 * @param {Object} attributes
 * @param {Array<string|number>} loc
 * @param {*} nextValue
 * @return {Object} Cloned attributes.
 */
export function setAtLocation(attributes, loc, nextValue) {
	if (!loc.length) {
		return nextValue;
	}

	const clone = Array.isArray(attributes)
		? [...attributes]
		: { ...attributes };
	const [head, ...rest] = loc;

	if (!rest.length) {
		clone[head] = nextValue;
		return clone;
	}

	clone[head] = setAtLocation(clone[head] ?? {}, rest, nextValue);
	return clone;
}

/**
 * Last segment of a path pattern (RichText identifier).
 *
 * @param {string} path
 * @return {string}
 */
export function pathIdentifier(path) {
	const parts = parsePath(path);
	return parts[parts.length - 1]?.key || path;
}
