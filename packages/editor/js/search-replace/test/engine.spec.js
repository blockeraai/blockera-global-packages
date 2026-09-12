/**
 * Search/replace engine tests: matcher, map completeness, search + replace per path.
 */

import { CORE_BLOCK_SEARCH_ATTRIBUTES } from '../maps/core-block-search-attributes';
import { classifyBlockType } from '../classify';
import { buildMatcher, findMatchesInText, applyReplacement } from '../matcher';
import { collectLeaves } from '../paths';
import { searchBlocks } from '../search';
import {
	replaceAllInAttributes,
	replaceMatchInAttributes,
} from '../replace';
import { toPlainText } from '../text';

function setNeedleAtPath(path, needle) {
	const parts = path.split('.').map((segment) => ({
		key: segment.endsWith('[]') ? segment.slice(0, -2) : segment,
		array: segment.endsWith('[]'),
	}));

	const build = (index) => {
		if (index >= parts.length) {
			return needle;
		}
		const part = parts[index];
		if (part.array) {
			return { [part.key]: [build(index + 1)] };
		}
		return { [part.key]: build(index + 1) };
	};

	return build(0);
}

function uniqueNeedle(blockName, path, kind) {
	return `sr_${blockName.replace(/\W/g, '_')}_${path.replace(/\W/g, '_')}_${kind}`;
}

const searchableEntries = Object.entries(CORE_BLOCK_SEARCH_ATTRIBUTES).filter(
	([, spec]) => !spec.skip
);

describe('search-replace matcher', () => {
	it('finds case-insensitive matches by default', () => {
		const matcher = buildMatcher({ query: 'Hello' });
		expect(findMatchesInText('say hello there', matcher)).toEqual([
			{ start: 4, end: 9, text: 'hello' },
		]);
	});

	it('respects match case', () => {
		const matcher = buildMatcher({ query: 'Hello', matchCase: true });
		expect(findMatchesInText('say hello there', matcher)).toEqual([]);
		expect(findMatchesInText('say Hello there', matcher)).toHaveLength(1);
	});

	it('matches whole words', () => {
		const matcher = buildMatcher({ query: 'cat', wholeWord: true });
		expect(findMatchesInText('catapult and cat', matcher)).toEqual([
			{ start: 13, end: 16, text: 'cat' },
		]);
	});

	it('supports regular expressions', () => {
		const matcher = buildMatcher({ query: 'hel+o', useRegex: true });
		expect(findMatchesInText('helllo', matcher)).toHaveLength(1);
	});

	it('combines regex with match case', () => {
		const matcher = buildMatcher({
			query: 'Hel+o',
			useRegex: true,
			matchCase: true,
		});
		expect(findMatchesInText('Helllo hello', matcher)).toEqual([
			{ start: 0, end: 6, text: 'Helllo' },
		]);
	});

	it('combines regex with whole word', () => {
		const matcher = buildMatcher({
			query: 'ca[tp]',
			useRegex: true,
			wholeWord: true,
		});
		expect(findMatchesInText('cat catapult cap', matcher)).toEqual([
			{ start: 0, end: 3, text: 'cat' },
			{ start: 13, end: 16, text: 'cap' },
		]);
	});

	it('combines regex, match case, and whole word', () => {
		const matcher = buildMatcher({
			query: 'Ca[t]',
			useRegex: true,
			matchCase: true,
			wholeWord: true,
		});
		expect(findMatchesInText('Cat cat CAT catapult', matcher)).toEqual([
			{ start: 0, end: 3, text: 'Cat' },
		]);
	});

	it('applies regex capture groups on a single match', () => {
		expect(
			applyReplacement('item 12', {
				query: 'item (\\d+)',
				useRegex: true,
			}, 'entry $1')
		).toBe('entry 12');
	});

	it('keeps $1 literal when regex is off', () => {
		expect(
			applyReplacement('hello', { query: 'hello' }, '$1')
		).toBe('$1');
	});

	it('returns null for invalid regex', () => {
		expect(buildMatcher({ query: '(unclosed', useRegex: true })).toBeNull();
	});

	it('matches className tokens', () => {
		const matcher = buildMatcher({ query: 'hero-banner' });
		expect(
			findMatchesInText('wp-block-group hero-banner is-style', matcher)
		).toHaveLength(1);
	});
});

describe('search-replace core map completeness', () => {
	it('covers every inventoried core block name', () => {
		const names = Object.keys(CORE_BLOCK_SEARCH_ATTRIBUTES).sort();
		expect(names.length).toBeGreaterThanOrEqual(100);
		expect(names.every((name) => name.startsWith('core/'))).toBe(true);
		expect(names).toEqual([...new Set(names)].sort());
	});

	it('skip entries have a reason and no paths', () => {
		for (const [name, spec] of Object.entries(
			CORE_BLOCK_SEARCH_ATTRIBUTES
		)) {
			if (!spec.skip) {
				continue;
			}
			expect(spec.reason).toBeTruthy();
			expect(spec.visible).toBeUndefined();
			expect(name.startsWith('core/')).toBe(true);
		}
	});

	it('non-skip entries only list string paths', () => {
		for (const [, spec] of searchableEntries) {
			expect(Array.isArray(spec.visible)).toBe(true);
			expect(Array.isArray(spec.attributes)).toBe(true);
			expect(spec.visible.length + spec.attributes.length).toBeGreaterThan(
				0
			);
		}
	});

	it('classifies paragraph like the committed map', () => {
		const spec = classifyBlockType({
			name: 'core/paragraph',
			attributes: {
				content: { type: 'rich-text', source: 'rich-text' },
			},
			supports: { customClassName: true },
		});
		expect(spec.visible).toEqual(['content']);
		expect(spec.attributes).toContain('className');
	});
});

describe('search-replace does not search annotations', () => {
	it('ignores annotation attributes on a block', () => {
		const results = searchBlocks(
			[
				{
					clientId: 'ann-1',
					name: 'core/paragraph',
					attributes: {
						content: 'safe text',
						annotations: 'secret-needle',
					},
					innerBlocks: [],
				},
			],
			{ query: 'secret-needle', scope: 'all' }
		);

		expect(results).toEqual([]);
	});
});

describe('search-replace regex replace', () => {
	it('replaces one match with capture groups', () => {
		const attributes = { content: 'item 12 stays' };
		const hits = searchBlocks(
			[
				{
					clientId: 'p1',
					name: 'core/paragraph',
					attributes,
					innerBlocks: [],
				},
			],
			{ query: 'item (\\d+)', useRegex: true, scope: 'visible' }
		);

		expect(hits).toHaveLength(1);
		const next = replaceMatchInAttributes(
			attributes,
			hits[0],
			'entry $1',
			{ query: 'item (\\d+)', useRegex: true }
		);
		expect(toPlainText(next.content)).toBe('entry 12 stays');
	});

	it('replace all honors match case and whole word', () => {
		const attributes = { content: 'Cat catapult cat Cat' };
		const next = replaceAllInAttributes(
			attributes,
			['content'],
			{ query: 'Cat', matchCase: true, wholeWord: true },
			'Kitten'
		);
		expect(toPlainText(next.content)).toBe('Kitten catapult cat Kitten');
	});

	it('replace all applies regex capture groups', () => {
		const attributes = { content: 'item 1 and item 22' };
		const next = replaceAllInAttributes(
			attributes,
			['content'],
			{ query: 'item (\\d+)', useRegex: true },
			'entry $1'
		);
		expect(toPlainText(next.content)).toBe('entry 1 and entry 22');
	});
});

describe('search-replace map search and replace', () => {
	it.each(
		searchableEntries.flatMap(([blockName, spec]) => {
			const cases = [];
			for (const path of spec.visible || []) {
				cases.push([blockName, path, 'visible']);
			}
			for (const path of spec.attributes || []) {
				cases.push([blockName, path, 'attribute']);
			}
			return cases;
		})
	)('%s %s (%s) search and replace', (blockName, path, kind) => {
		const needle = uniqueNeedle(blockName, path, kind);
		const replacement = 'REPLACED';
		const attributes = setNeedleAtPath(path, needle);
		const block = {
			clientId: `${blockName}-${path}-${kind}`,
			name: blockName,
			attributes,
			innerBlocks: [],
		};

		const visibleHits = searchBlocks([block], {
			query: needle,
			scope: 'visible',
			matchCase: true,
		});
		const attributeHits = searchBlocks([block], {
			query: needle,
			scope: 'attributes',
			matchCase: true,
		});

		if (kind === 'visible') {
			expect(visibleHits).toHaveLength(1);
			expect(attributeHits).toHaveLength(0);
			expect(visibleHits[0].path).toBe(path);
			expect(visibleHits[0].kind).toBe('visible');
		} else {
			expect(attributeHits).toHaveLength(1);
			expect(visibleHits).toHaveLength(0);
			expect(attributeHits[0].path).toBe(path);
			expect(attributeHits[0].kind).toBe('attribute');
		}

		const hit = kind === 'visible' ? visibleHits[0] : attributeHits[0];
		const nextAttributes = replaceMatchInAttributes(
			attributes,
			hit,
			replacement
		);
		const nextPlain = toPlainText(
			collectLeaves(nextAttributes, path)[0]?.value
		);

		expect(nextPlain).toContain(replacement);
		expect(nextPlain).not.toContain(needle);

		const allReplaced = replaceAllInAttributes(
			attributes,
			[path],
			{ query: needle, matchCase: true },
			replacement
		);
		expect(
			toPlainText(collectLeaves(allReplaced, path)[0]?.value)
		).toContain(replacement);
	});
});
