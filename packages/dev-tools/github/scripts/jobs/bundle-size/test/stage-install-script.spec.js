/**
 * External dependencies
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '../stage-install-script.sh');

describe('stage-install-script', () => {
	let dir;

	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bundle-size-npm-ci-'));
	});

	afterEach(() => {
		fs.rmSync(dir, { recursive: true, force: true });
	});

	test('copies retry-npm-ci and retry.sh and writes the install-script command', () => {
		const stage = path.join(dir, 'stage');
		const output = path.join(dir, 'github-output');

		execFileSync('bash', [SCRIPT], {
			env: {
				...process.env,
				BLOCKERA_BUNDLE_SIZE_NPM_CI_DIR: stage,
				GITHUB_OUTPUT: output,
				RUNNER_TEMP: dir,
			},
		});

		expect(fs.existsSync(path.join(stage, 'retry-npm-ci.sh'))).toBe(true);
		expect(fs.existsSync(path.join(stage, 'lib', 'retry.sh'))).toBe(true);
		expect(fs.readFileSync(output, 'utf8').trim()).toBe(
			`command=bash ${stage}/retry-npm-ci.sh`
		);
	});
});
