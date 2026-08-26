import { truncateCommentBody } from '../truncate-comment-body';

describe('truncateCommentBody', () => {
	test('prepends the title when missing and keeps the marker', () => {
		expect(
			truncateCommentBody(
				'# Title',
				'table\n\n compressed-size-action ',
				64000
			)
		).toBe('# Title\n\ntable\n\n compressed-size-action ');
	});

	test('does not duplicate an existing title', () => {
		expect(
			truncateCommentBody(
				'# Title',
				'# Title\n\ntable\n\n compressed-size-action ',
				64000
			)
		).toBe('# Title\n\ntable\n\n compressed-size-action ');
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
		expect(out.startsWith('# Title\n\n')).toBe(true);
		expect(out).toContain('truncated to fit GitHub');
		expect(out).toContain('compressed-size-action');
		expect(out.length).toBeLessThanOrEqual(400);
		expect(out).toContain('library-ui/icons');
	});
});
