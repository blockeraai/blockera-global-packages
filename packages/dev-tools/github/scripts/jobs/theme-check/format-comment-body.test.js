const fs = require('fs');
const os = require('os');
const path = require('path');
const { describe, test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const {
	formatCommentBody,
	MARKER,
} = require('./format-comment-body');
const { truncateCommentBody } = require('./truncate-comment-body');

describe('formatCommentBody', { concurrency: 1 }, () => {
	let tmpDir;

	function writeLog(relativePath, contents) {
		const fullPath = path.join(tmpDir, relativePath);
		fs.mkdirSync(path.dirname(fullPath), { recursive: true });
		fs.writeFileSync(fullPath, contents);
	}

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-check-comment-'));
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	test('reports passed when all log files are empty', () => {
		writeLog('structure-check-errors.txt', '');
		writeLog('structure-check-warnings.txt', '');
		writeLog('theme-check/errors.txt', '');
		writeLog('theme-check/warnings.txt', '');
		writeLog('ui-check-errors.txt', '');
		writeLog('ui-check-warnings.txt', '');

		const body = formatCommentBody(tmpDir, {
			runUrl: 'https://example.com/run/1',
		});

		assert.match(body, /✅ \*\*Passed\*\*/);
		assert.match(body, /\[View workflow run\]\(https:\/\/example\.com\/run\/1\)/);
		assert.match(body, /blockera-theme-check/);
	});

	test('reports failed when errors exist', () => {
		writeLog('structure-check-errors.txt', 'Missing screenshot.png');
		writeLog('structure-check-warnings.txt', '');
		writeLog('theme-check/errors.txt', '');
		writeLog('theme-check/warnings.txt', '');
		writeLog('ui-check-errors.txt', '');
		writeLog('ui-check-warnings.txt', '');

		const body = formatCommentBody(tmpDir);

		assert.match(body, /❌ \*\*Failed\*\*/);
		assert.match(body, /Missing screenshot\.png/);
	});

	test('handles missing logs directory', () => {
		const body = formatCommentBody('/path/does/not/exist');

		assert.match(body, /Incomplete/);
		assert.ok(body.includes('blockera-theme-check'));
	});
});

describe('truncateCommentBody', () => {
	test('preserves marker when under limit', () => {
		const body = '# Title\n\nHello\n\n blockera-theme-check ';
		assert.equal(truncateCommentBody(body, 1000), body);
	});

	test('truncates oversized reports and keeps marker', () => {
		const body = `# Title\n\n${'x'.repeat(70000)}\n\n blockera-theme-check `;
		const next = truncateCommentBody(body, 64000);

		assert.ok(next.length <= 64000);
		assert.match(next, /blockera-theme-check/);
		assert.match(next, /truncated/i);
	});
});
