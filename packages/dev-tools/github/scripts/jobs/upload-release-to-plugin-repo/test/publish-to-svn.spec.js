/**
 * External dependencies
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SCRIPT = path.join(__dirname, '../publish-to-svn.sh');

function writeExec(file, body) {
	fs.writeFileSync(file, body, { mode: 0o755 });
}

function runPublish(dir, extraEnv) {
	const bin = path.join(dir, 'bin');
	const log = path.join(dir, 'svn.log');
	const zip = path.join(dir, 'asset.zip');
	const extract = path.join(dir, 'extract');
	const trunk = path.join(dir, 'trunk');

	fs.mkdirSync(bin, { recursive: true });

	writeExec(
		path.join(bin, 'svn'),
		`#!/usr/bin/env bash
set -euo pipefail
echo "svn $*" >> "${log}"
cmd="$1"
shift
case "$cmd" in
	checkout)
		mkdir -p "\$2/.svn"
		;;
	st)
		if [[ -f readme.txt ]]; then
			echo "?       readme.txt"
		fi
		if [[ -f style.css ]]; then
			echo "?       style.css"
		fi
		;;
	ls)
		exit 1
		;;
	import|copy|commit|add|rm)
		;;
	*)
		exit 0
		;;
esac
`
	);

	writeExec(
		path.join(bin, 'curl'),
		`#!/usr/bin/env bash
set -euo pipefail
dest=""
while [[ \$# -gt 0 ]]; do
	case "\$1" in
		-o)
			dest="\$2"
			shift 2
			;;
		-L|--fail)
			shift
			;;
		*)
			shift
			;;
	esac
done
cp "${zip}" "\$dest"
`
	);

	writeExec(
		path.join(bin, 'sudo'),
		`#!/usr/bin/env bash
echo "sudo $*" >> "${log}"
`
	);

	const fixture = path.join(dir, 'fixture');
	fs.mkdirSync(fixture);
	fs.writeFileSync(path.join(fixture, 'readme.txt'), 'Stable tag: V.V.V\n');
	fs.writeFileSync(path.join(fixture, 'style.css'), '/* Theme Name: Test */\n');
	execFileSync('zip', ['-q', '-r', zip, 'readme.txt', 'style.css'], {
		cwd: fixture,
	});

	execFileSync('bash', [SCRIPT], {
		cwd: dir,
		env: {
			...process.env,
			PATH: `${bin}:${process.env.PATH}`,
			PLUGIN_URL: 'https://example.test/asset.zip',
			VERSION: '1.2.3',
			SVN_USERNAME: 'user',
			SVN_PASSWORD: 'pass',
			BLOCKERA_UPLOAD_SKIP_APT: 'true',
			BLOCKERA_UPLOAD_SVN_BIN: path.join(bin, 'svn'),
			BLOCKERA_UPLOAD_CURL_BIN: path.join(bin, 'curl'),
			BLOCKERA_UPLOAD_TRUNK_DIR: trunk,
			BLOCKERA_UPLOAD_EXTRACT_DIR: extract,
			BLOCKERA_UPLOAD_ZIP_NAME: 'release.zip',
			...extraEnv,
		},
	});

	return fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '';
}

describe('publish-to-svn', () => {
	let dir;

	beforeEach(() => {
		dir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-svn-'));
	});

	afterEach(() => {
		fs.rmSync(dir, { recursive: true, force: true });
	});

	test('plugin layout checks out trunk, commits, and copies a tag', () => {
		const log = runPublish(dir, {
			BLOCKERA_UPLOAD_SVN_LAYOUT: 'plugin',
			BLOCKERA_UPLOAD_SVN_REPO_URL: 'https://plugins.svn.wordpress.org/example',
		});

		expect(log).toContain(
			'svn checkout https://plugins.svn.wordpress.org/example/trunk'
		);
		expect(log).toContain(
			'svn copy https://plugins.svn.wordpress.org/example/trunk https://plugins.svn.wordpress.org/example/tags/1.2.3'
		);
		expect(log).toContain('svn commit -m Committing version 1.2.3');
		expect(fs.readFileSync(path.join(dir, 'trunk', 'readme.txt'), 'utf8')).toContain(
			'Stable tag: 1.2.3'
		);
	});

	test('theme layout imports a version directory and skips trunk/tags', () => {
		const log = runPublish(dir, {
			BLOCKERA_UPLOAD_SVN_LAYOUT: 'theme',
			BLOCKERA_UPLOAD_SVN_REPO_URL: 'https://themes.svn.wordpress.org/example',
		});

		expect(log).toContain(
			'svn ls https://themes.svn.wordpress.org/example/1.2.3'
		);
		expect(log).toContain(
			'svn import ' +
				path.join(dir, 'extract') +
				' https://themes.svn.wordpress.org/example/1.2.3'
		);
		expect(log).not.toContain('/trunk');
		expect(log).not.toContain('/tags/');
		expect(fs.existsSync(path.join(dir, 'extract'))).toBe(false);
	});

	test('theme layout requires an SVN repo URL', () => {
		expect(() =>
			runPublish(dir, {
				BLOCKERA_UPLOAD_SVN_LAYOUT: 'theme',
			})
		).toThrow();
	});
});
