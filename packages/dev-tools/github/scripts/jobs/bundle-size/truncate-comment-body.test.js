const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { truncateCommentBody } = require('./truncate-comment-body');

describe('truncateCommentBody', () => {
	test('prepends the title when missing and keeps the marker', () => {
		assert.equal(
			truncateCommentBody('# Title', 'table\n\n compressed-size-action ', 64000),
			'# Title\n\ntable\n\n compressed-size-action '
		);
	});

	test('does not duplicate an existing title', () => {
		assert.equal(
			truncateCommentBody(
				'# Title',
				'# Title\n\ntable\n\n compressed-size-action ',
				64000
			),
			'# Title\n\ntable\n\n compressed-size-action '
		);
	});

	test('truncates oversized tables at a line boundary and keeps the marker', () => {
		const rows = Array.from(
			{ length: 80 },
			(_, i) =>
				`| \`packages/icons/js/library-ui/icons/icon-${i}.svg\` | 1 kB | +1 B |`
		).join('\n');
		const out = truncateCommentBody(
			'# Title',
			`${rows}\n\n compressed-size-action `,
			400
		);
		assert.ok(out.startsWith('# Title\n\n'));
		assert.ok(out.includes('truncated to fit GitHub'));
		assert.ok(out.includes('compressed-size-action'));
		assert.ok(out.length <= 400);
		assert.equal(out.includes('library-ui/icons'), true);
	});
});
