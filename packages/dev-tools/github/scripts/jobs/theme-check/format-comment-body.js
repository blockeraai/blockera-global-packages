/**
 * Build a readable markdown PR comment from theme-review-action log files.
 *
 * @param {string} logsDir  Path to theme-review-action/logs
 * @param {object} options
 * @param {string} [options.title]
 * @param {string} [options.runUrl]
 * @return {string}
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_TITLE = '# 🎨 WordPress Theme Review Report';
const MARKER = '\n\n blockera-theme-check ';

const SECTIONS = [
	{
		key: 'structure',
		label: 'Structure check',
		errorFile: 'structure-check-errors.txt',
		warningFile: 'structure-check-warnings.txt',
	},
	{
		key: 'theme-check',
		label: 'Theme Check plugin',
		errorFile: path.join('theme-check', 'errors.txt'),
		warningFile: path.join('theme-check', 'warnings.txt'),
	},
	{
		key: 'ui',
		label: 'UI & accessibility',
		errorFile: 'ui-check-errors.txt',
		warningFile: 'ui-check-warnings.txt',
	},
];

function readLogFile(logsDir, relativePath) {
	const filePath = path.join(logsDir, relativePath);

	try {
		if (!fs.existsSync(filePath)) {
			return '';
		}

		const stat = fs.lstatSync(filePath);
		if (!stat.isFile()) {
			return '';
		}

		return fs.readFileSync(filePath, 'utf8').trim();
	} catch {
		return '';
	}
}

function countLines(text) {
	if (!text) {
		return 0;
	}

	return text.split('\n').filter((line) => line.trim().length > 0).length;
}

function formatBlock(label, text) {
	if (!text) {
		return `### ${label}\n\n_none_\n`;
	}

	return `### ${label}\n\n\`\`\`text\n${text}\n\`\`\`\n`;
}

function formatStatus(totalErrors, totalWarnings) {
	if (totalErrors > 0) {
		return '❌ **Failed** — errors were reported.';
	}

	if (totalWarnings > 0) {
		return '⚠️ **Passed with warnings** — review the items below.';
	}

	return '✅ **Passed** — no errors or warnings.';
}

function formatCommentBody(logsDir, options = {}) {
	const title = options.title || DEFAULT_TITLE;
	const runUrl = options.runUrl || '';

	if (!logsDir || !fs.existsSync(logsDir)) {
		let body = `${title}\n\n`;
		body += '⚠️ **Incomplete** — theme review logs were not found. The job may have failed before checks finished.\n';
		if (runUrl) {
			body += `\n[View workflow run](${runUrl})\n`;
		}
		return `${body}${MARKER}`;
	}

	const rows = [];
	let totalErrors = 0;
	let totalWarnings = 0;
	const sectionBlocks = [];

	for (const section of SECTIONS) {
		const errors = readLogFile(logsDir, section.errorFile);
		const warnings = readLogFile(logsDir, section.warningFile);
		const errorCount = countLines(errors);
		const warningCount = countLines(warnings);

		totalErrors += errorCount;
		totalWarnings += warningCount;

		rows.push(
			`| ${section.label} | ${errorCount || '0'} | ${warningCount || '0'} |`
		);

		// Keep clean passes to the summary table only — no empty detail headings.
		if (errorCount === 0 && warningCount === 0) {
			continue;
		}

		sectionBlocks.push(`## ${section.label}\n`);
		if (errorCount > 0) {
			sectionBlocks.push(formatBlock('Errors', errors));
		}
		if (warningCount > 0) {
			sectionBlocks.push(formatBlock('Warnings', warnings));
		}
	}

	let body = `${title}\n\n`;
	body += `${formatStatus(totalErrors, totalWarnings)}\n\n`;
	body += '| Section | Errors | Warnings |\n';
	body += '| --- | ---: | ---: |\n';
	body += `${rows.join('\n')}\n`;
	if (sectionBlocks.length > 0) {
		body += `\n${sectionBlocks.join('\n')}`;
	}

	if (runUrl) {
		body += `\n---\n[View workflow run](${runUrl})\n`;
	}

	return `${body}${MARKER}`;
}

module.exports = { formatCommentBody, readLogFile, MARKER, DEFAULT_TITLE };

if (require.main === module) {
	const logsDir = process.argv[2] || '';
	const title = process.argv[3] || DEFAULT_TITLE;
	const runUrl = process.argv[4] || '';
	process.stdout.write(formatCommentBody(logsDir, { title, runUrl }));
}
