/**
 * @jest-environment node
 */
describe('formatHeadingRight', () => {
	const { formatHeadingRight } = require('../section-heading');

	it('places the session clock before the watching marker', () => {
		expect(formatHeadingRight('watching', 0, '13s')).toBe(
			'13s  ● watching'
		);
		expect(formatHeadingRight('watching', 1)).toBe('○ watching');
	});

	it('returns the status as-is when not watching', () => {
		expect(formatHeadingRight('booted')).toBe('booted');
		expect(formatHeadingRight('building', 3, '13s')).toBe('building');
	});
});
