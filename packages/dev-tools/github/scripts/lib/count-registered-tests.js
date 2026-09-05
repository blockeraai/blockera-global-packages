/**
 * Count Mocha/Cypress test registrations in a spec source string.
 *
 * `it(` inside `[...].forEach` (or a same-file const array `.forEach`) is
 * multiplied by the array length. `.forEach` inside an `it` body is ignored.
 */

function isIdentChar(char) {
	return /[A-Za-z0-9_$]/.test(char);
}

function skipString(source, start) {
	const quote = source[start];
	let i = start + 1;

	if (quote === '`') {
		while (i < source.length) {
			if (source[i] === '\\') {
				i += 2;
				continue;
			}
			if (source[i] === '`') {
				return i + 1;
			}
			i += 1;
		}
		return source.length;
	}

	while (i < source.length) {
		if (source[i] === '\\') {
			i += 2;
			continue;
		}
		if (source[i] === quote) {
			return i + 1;
		}
		i += 1;
	}

	return source.length;
}

function skipTrivia(source, start) {
	let i = start;

	while (i < source.length) {
		const char = source[i];
		const next = source[i + 1];

		if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
			i += 1;
			continue;
		}

		if (char === '/' && next === '/') {
			i += 2;
			while (i < source.length && source[i] !== '\n') {
				i += 1;
			}
			continue;
		}

		if (char === '/' && next === '*') {
			i += 2;
			while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
				i += 1;
			}
			i = Math.min(i + 2, source.length);
			continue;
		}

		break;
	}

	return i;
}

function skipTriviaBack(source, start) {
	let i = start;

	while (i >= 0) {
		const char = source[i];

		if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
			i -= 1;
			continue;
		}

		if (char === '/' && i > 0 && source[i - 1] === '*') {
			i -= 2;
			while (i >= 0 && !(source[i] === '*' && source[i - 1] === '/')) {
				i -= 1;
			}
			i -= 2;
			continue;
		}

		if (char === '/' && source.slice(0, i + 1).includes('//')) {
			const lineStart = source.lastIndexOf('\n', i);
			const maybeComment = source.lastIndexOf('//', i);
			if (maybeComment >= lineStart) {
				i = maybeComment - 1;
				continue;
			}
		}

		break;
	}

	return i;
}

function skipValue(source, start) {
	let i = skipTrivia(source, start);

	if (i >= source.length) {
		return i;
	}

	const char = source[i];

	if (char === '"' || char === "'" || char === '`') {
		return skipString(source, i);
	}

	if (char === '/' && source[i + 1] && source[i + 1] !== '/' && source[i + 1] !== '*') {
		i += 1;
		while (i < source.length) {
			if (source[i] === '\\') {
				i += 2;
				continue;
			}
			if (source[i] === '/') {
				return i + 1;
			}
			i += 1;
		}
		return source.length;
	}

	if (char === '[' || char === '{' || char === '(') {
		const close = char === '[' ? ']' : char === '{' ? '}' : ')';
		let depth = 1;
		i += 1;
		while (i < source.length && depth > 0) {
			const current = source[i];
			if (current === '"' || current === "'" || current === '`') {
				i = skipString(source, i);
				continue;
			}
			if (current === '/' && source[i + 1] === '/') {
				i = skipTrivia(source, i);
				continue;
			}
			if (current === '/' && source[i + 1] === '*') {
				i = skipTrivia(source, i);
				continue;
			}
			if (current === char) {
				depth += 1;
			} else if (current === close) {
				depth -= 1;
			}
			i += 1;
		}
		return i;
	}

	while (i < source.length && isIdentChar(source[i])) {
		i += 1;
	}

	return Math.max(i, start + 1);
}

function countTopLevelArrayElements(source, openIndex) {
	let i = openIndex + 1;
	i = skipTrivia(source, i);

	if (source[i] === ']') {
		return 0;
	}

	let count = 0;

	while (i < source.length) {
		i = skipTrivia(source, i);
		if (source[i] === ']') {
			return count;
		}

		count += 1;
		i = skipValue(source, i);
		i = skipTrivia(source, i);

		if (source[i] === ',') {
			i += 1;
			continue;
		}

		if (source[i] === ']') {
			return count;
		}

		break;
	}

	return count;
}

function isUnescapedQuote(source, index) {
	let slashes = 0;
	let i = index - 1;

	while (i >= 0 && source[i] === '\\') {
		slashes += 1;
		i -= 1;
	}

	return slashes % 2 === 0;
}

function findMatchingOpen(source, closeIndex, openChar, closeChar) {
	let depth = 1;
	let i = closeIndex - 1;
	let inString = null;

	while (i >= 0 && depth > 0) {
		const char = source[i];

		if (inString) {
			if (char === inString && isUnescapedQuote(source, i)) {
				inString = null;
			}
			i -= 1;
			continue;
		}

		if (
			(char === '"' || char === "'" || char === '`') &&
			isUnescapedQuote(source, i)
		) {
			inString = char;
			i -= 1;
			continue;
		}

		if (char === closeChar) {
			depth += 1;
		} else if (char === openChar) {
			depth -= 1;
			if (depth === 0) {
				return i;
			}
		}

		i -= 1;
	}

	return -1;
}

function readIdentBack(source, endIndex) {
	let i = endIndex;

	if (i < 0 || !isIdentChar(source[i])) {
		return null;
	}

	while (i >= 0 && isIdentChar(source[i])) {
		i -= 1;
	}

	return source.slice(i + 1, endIndex + 1);
}

function collectNamedArrayLengths(source) {
	const lengths = new Map();
	const pattern = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\[/g;
	let match;

	while ((match = pattern.exec(source))) {
		lengths.set(
			match[1],
			countTopLevelArrayElements(source, match.index + match[0].length - 1)
		);
	}

	return lengths;
}

function resolveForEachLength(source, dotIndex, namedArrays) {
	const before = skipTriviaBack(source, dotIndex - 1);

	if (before < 0) {
		return 1;
	}

	if (source[before] === ']') {
		const open = findMatchingOpen(source, before, '[', ']');
		if (open < 0) {
			return 1;
		}
		return countTopLevelArrayElements(source, open);
	}

	const name = readIdentBack(source, before);
	if (name && namedArrays.has(name)) {
		return namedArrays.get(name);
	}

	return 1;
}

function matchAtIdent(source, index, word) {
	if (index > 0 && isIdentChar(source[index - 1])) {
		return false;
	}

	if (!source.startsWith(word, index)) {
		return false;
	}

	const after = source[index + word.length];
	return !isIdentChar(after);
}

function skipCallOpen(source, start) {
	let i = skipTrivia(source, start);
	if (source[i] === '(') {
		return i;
	}
	return -1;
}

/**
 * @param {string} source Spec file contents.
 * @return {number} Registered `it` / `it.only` tests after forEach expansion.
 */
function countRegisteredTests(source) {
	const namedArrays = collectNamedArrayLengths(source);
	let i = 0;
	let paren = 0;
	let count = 0;
	let itDepth = 0;
	const itParens = [];
	const forEachStack = [];

	function popClosed() {
		while (forEachStack.length && paren < forEachStack[forEachStack.length - 1].paren) {
			forEachStack.pop();
		}
		while (itParens.length && paren < itParens[itParens.length - 1]) {
			itParens.pop();
			itDepth = Math.max(0, itDepth - 1);
		}
	}

	function currentMultiplier() {
		return forEachStack.reduce((product, frame) => product * frame.multiplier, 1);
	}

	while (i < source.length) {
		const trivia = skipTrivia(source, i);
		if (trivia !== i) {
			i = trivia;
			continue;
		}

		const char = source[i];

		if (char === '"' || char === "'" || char === '`') {
			i = skipString(source, i);
			continue;
		}

		if (source.startsWith('.forEach', i)) {
			const callOpen = skipCallOpen(source, i + '.forEach'.length);
			if (callOpen !== -1) {
				if (itDepth === 0) {
					const length = resolveForEachLength(source, i, namedArrays);
					forEachStack.push({
						multiplier: length > 0 ? length : 0,
						paren: paren + 1,
					});
				}
				i = callOpen;
				continue;
			}
		}

		if (matchAtIdent(source, i, 'it')) {
			const afterIt = i + 2;
			const skipped = source.startsWith('.skip', afterIt);
			const only = source.startsWith('.only', afterIt);
			const nameEnd = skipped || only ? afterIt + 5 : afterIt;
			const callOpen = skipCallOpen(source, nameEnd);

			if (callOpen !== -1) {
				if (itDepth === 0 && !skipped) {
					count += currentMultiplier();
				}
				itParens.push(paren + 1);
				itDepth += 1;
				i = callOpen;
				continue;
			}
		}

		if (char === '(') {
			paren += 1;
		} else if (char === ')') {
			paren = Math.max(0, paren - 1);
			popClosed();
		}

		i += 1;
	}

	return count;
}

function countItsInFile(filePath, fsModule = require('fs')) {
	return countRegisteredTests(fsModule.readFileSync(filePath, 'utf8'));
}

module.exports = {
	countItsInFile,
	countRegisteredTests,
	countTopLevelArrayElements,
};
