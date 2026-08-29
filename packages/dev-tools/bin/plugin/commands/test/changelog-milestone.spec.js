/**
 * Internal dependencies
 */
const { resolveMilestoneTitle } = require('../changelog');
const { pickMilestoneByTitle } = require('../../lib/milestone');

const config = {
	name: 'Acme',
	versionMilestoneFormat: '%(name)s %(major)s.%(minor)s',
};

describe('resolveMilestoneTitle', () => {
	it('keeps a full milestone title', () => {
		expect(
			resolveMilestoneTitle(
				{ milestone: 'Acme 2.0', version: '2.0.0-rc.1' },
				config,
				{ version: '1.12.2' }
			)
		).toBe('Acme 2.0');
	});

	it('completes a truncated title from the RC version', () => {
		expect(
			resolveMilestoneTitle(
				{ milestone: 'Acme', version: '2.0.0-rc.1' },
				config,
				{ version: '1.12.2' }
			)
		).toBe('Acme 2.0');
	});

	it('uses the release version when milestone is omitted', () => {
		expect(
			resolveMilestoneTitle({ version: '2.0.0-rc.1' }, config, {
				version: '1.12.2',
			})
		).toBe('Acme 2.0');
	});
});

describe('pickMilestoneByTitle', () => {
	const titles = (...list) => list.map((title) => ({ title }));

	it('returns an exact title match', () => {
		expect(
			pickMilestoneByTitle(
				'Acme Theme 0.1',
				titles('Acme Theme 0.1', 'Acme Theme 0.1.0')
			)?.title
		).toBe('Acme Theme 0.1');
	});

	it('matches major.minor to a unique major.minor.patch title', () => {
		expect(
			pickMilestoneByTitle(
				'Acme Theme 0.1',
				titles('Acme Theme 0.1.0', 'Other 0.1.0'),
				'0.1.1-rc.1'
			)?.title
		).toBe('Acme Theme 0.1.0');
	});

	it('prefers the release core version when several series titles exist', () => {
		expect(
			pickMilestoneByTitle(
				'Acme Theme 0.1',
				titles('Acme Theme 0.1.0', 'Acme Theme 0.1.1'),
				'0.1.1-rc.1'
			)?.title
		).toBe('Acme Theme 0.1.1');
	});

	it('does not treat 0.1 as the same series as 0.10', () => {
		expect(
			pickMilestoneByTitle(
				'Acme 0.1',
				titles('Acme 0.10.0', 'Other 0.1.0')
			)
		).toBeUndefined();
	});

	it('ignores a different display-name prefix', () => {
		expect(
			pickMilestoneByTitle(
				'Acme Theme 0.1',
				titles('Acme 0.1.0', 'Acme Theme Extra 0.1.0')
			)
		).toBeUndefined();
	});

	it('normalizes extra whitespace', () => {
		expect(
			pickMilestoneByTitle(
				'Acme Theme  0.1',
				titles('Acme Theme 0.1.0')
			)?.title
		).toBe('Acme Theme 0.1.0');
	});
});
