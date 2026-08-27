/**
 * Internal dependencies
 */
const { resolveMilestoneTitle } = require('../changelog');

const config = {
	name: 'Blockera',
	versionMilestoneFormat: '%(name)s %(major)s.%(minor)s',
};

describe('resolveMilestoneTitle', () => {
	it('keeps a full milestone title', () => {
		expect(
			resolveMilestoneTitle(
				{ milestone: 'Blockera 2.0', version: '2.0.0-rc.1' },
				config,
				{ version: '1.12.2' }
			)
		).toBe('Blockera 2.0');
	});

	it('completes a truncated title from the RC version', () => {
		expect(
			resolveMilestoneTitle(
				{ milestone: 'Blockera', version: '2.0.0-rc.1' },
				config,
				{ version: '1.12.2' }
			)
		).toBe('Blockera 2.0');
	});

	it('uses the release version when milestone is omitted', () => {
		expect(
			resolveMilestoneTitle({ version: '2.0.0-rc.1' }, config, {
				version: '1.12.2',
			})
		).toBe('Blockera 2.0');
	});
});
