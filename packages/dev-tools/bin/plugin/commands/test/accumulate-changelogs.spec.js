/**
 * External dependencies
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Internal dependencies
 */
const {
	normalizeVersionKey,
	parseVersionSections,
	extractChangedSections,
	prependRootChangelog,
	listConsumerChangelogFiles,
	accumulateProductChangelogs,
	isPrereleaseVersion,
	latestStableTag,
	resolveLastReleaseRef,
} = require('../accumulate-changelogs');
const { setPluginConfig } = require('../../config-store');
const {
	unreleasedBodyHasEntries,
	foldUnreleasedContent,
	assertUnreleasedEmpty,
	dedupeChangelogMarkdown,
	collectPackageChangelogPaths,
	foldUnreleasedTree,
} = require('../changelog-md');

describe('accumulate-changelogs', () => {
	describe('parseVersionSections', () => {
		it('parses bracket Keep a Changelog headings', () => {
			const sections = parseVersionSections(
				'## [1.2.0] - 2025-01-01\n\n### Added\n- One\n\n## [1.1.0] - 2024-12-01\n\n### Fixed\n- Two\n'
			);

			expect(sections.map((section) => section.key)).toEqual([
				'1.2.0',
				'1.1.0',
			]);
			expect(sections[0].body).toContain('### Added');
		});

		it('parses legacy ## 1.2.3 (date) headings', () => {
			const sections = parseVersionSections(
				'## 1.3.3 (2025-07-16)\n\n### Improvements\n- Item\n'
			);

			expect(sections[0].key).toBe('1.3.3');
			expect(normalizeVersionKey('1.3.3 (2025-07-16)')).toBe('1.3.3');
		});

		it('keeps ## Unreleased as an inbox section', () => {
			const sections = parseVersionSections(
				'## Unreleased\n\n### Added\n- Pending\n\n## [1.0.0] - 2024-01-01\n\n### Fixed\n- Done\n'
			);

			expect(sections.map((section) => section.key)).toEqual([
				'__unreleased__',
				'1.0.0',
			]);
			expect(unreleasedBodyHasEntries(sections[0].body)).toBe(true);
		});
	});

	describe('extractChangedSections', () => {
		const oldContent = `## [1.1.0] - 2024-12-01

### Fixed
- Old fix
`;

		it('includes all sections when the file is new', () => {
			const changed = extractChangedSections(
				'',
				`## [1.2.0] - 2025-01-01

### Added
- New API
`
			);

			expect(changed).toContain('### Added');
			expect(changed).toContain('- New API');
		});

		it('includes only new version headings', () => {
			const changed = extractChangedSections(
				oldContent,
				`## [1.2.0] - 2025-01-01

### Added
- New API

${oldContent}`
			);

			expect(changed).toContain('- New API');
			expect(changed).not.toContain('- Old fix');
		});

		it('stops at the previous pin top heading (exclusive)', () => {
			const changed = extractChangedSections(
				oldContent,
				`## [1.1.0] - 2024-12-01

### Fixed
- Old fix
- Extra bullet
`
			);

			expect(changed).toBe('');
		});

		it('takes GP folded versions after Unreleased is dropped', () => {
			const changed = extractChangedSections(
				'## Unreleased\n\n### Added\n- Pending\n\n## [1.0.0] - 2024-01-01\n\n### Fixed\n- Old\n',
				'## [2.0.0] - 2026-08-26\n\n### Added\n- Pending\n\n## [1.0.0] - 2024-01-01\n\n### Fixed\n- Old\n'
			);

			expect(changed).toContain('- Pending');
			expect(changed).not.toContain('- Old');
		});

		it('includes new Unreleased bullets only', () => {
			const changed = extractChangedSections(
				'## Unreleased\n\n### Added\n- Old note\n',
				'## Unreleased\n\n### Added\n- Old note\n- New note\n'
			);

			expect(changed).toContain('- New note');
			expect(changed).not.toContain('- Old note');
		});

		it('skips a package whose version did not change', () => {
			const changelog = `## [1.1.6] - 2025-07-16

### Fixed
- Old fix
`;
			const changed = extractChangedSections(changelog, changelog, {
				previousVersion: '1.1.6',
				currentVersion: '1.1.6',
			});

			expect(changed).toBe('');
		});

		it('uses the previous package.json version even when old changelog content is missing', () => {
			const changed = extractChangedSections(
				'',
				`## [1.2.0] - 2026-08-26

### Added
- New API

## 1.1.6 (2025-07-16)

### Fixed
- Old fix

## 1.0.0 (2024-12-08)

### Added
- Ancient
`,
				{
					previousVersion: '1.1.6',
					currentVersion: '1.2.0',
				}
			);

			expect(changed).toContain('- New API');
			expect(changed).not.toContain('- Old fix');
			expect(changed).not.toContain('- Ancient');
		});

		it('includes dated cuts between the previous and current package versions', () => {
			const changed = extractChangedSections(
				'## [1.0.0]\n\n### Fixed\n- Old\n',
				`## [2.0.0] - 2026-08-26

### Added
- Versioned

## [2026-08-25]

### Added
- Dated cut

## [1.0.0]

### Fixed
- Old
`,
				{
					previousVersion: '1.0.0',
					currentVersion: '2.0.0',
				}
			);

			expect(changed).toContain('- Versioned');
			expect(changed).toContain('- Dated cut');
			expect(changed).not.toContain('- Old');
		});

		it('includes only the current version for a newly added package', () => {
			const changed = extractChangedSections(
				'',
				`## Unreleased

### Added
- Inbox note

## [1.2.0] - 2026-08-26

### Added
- New package API

## 1.1.6 (2025-07-16)

### Fixed
- History
`,
				{
					currentVersion: '1.2.0',
				}
			);

			expect(changed).toContain('- Inbox note');
			expect(changed).toContain('- New package API');
			expect(changed).not.toContain('- History');
		});

		it('includes Unreleased together with new version headings', () => {
			const changed = extractChangedSections(
				'## [1.0.0]\n\n### Fixed\n- Old\n',
				`## Unreleased

### Added
- Still open

## [2.0.0] - 2026-08-26

### Added
- Bump

## [1.0.0]

### Fixed
- Old
`,
				{
					previousVersion: '1.0.0',
					currentVersion: '2.0.0',
				}
			);

			expect(changed).toContain('- Still open');
			expect(changed).toContain('- Bump');
			expect(changed).not.toContain('- Old');
		});
	});

	describe('foldUnreleased', () => {
		it('moves Unreleased into a dated cut and leaves an empty inbox', () => {
			const folded = foldUnreleasedContent(
				'## Unreleased\n\n### Added\n- New API\n\n## [1.0.0]\n\n### Fixed\n- Old\n',
				{ date: '2026-08-25' }
			);

			expect(folded.folded).toBe(true);
			expect(folded.key).toBe('2026-08-25');
			expect(folded.content).toContain('## Unreleased');
			expect(folded.content).toContain('## [2026-08-25]');
			expect(folded.content).toContain('- New API');
			expect(folded.content).toMatch(
				/## Unreleased\s+## \[2026-08-25\]/s
			);
			expect(() => assertUnreleasedEmpty(folded.content)).not.toThrow();
		});

		it('disambiguates same-day cuts with a suffix', () => {
			const folded = foldUnreleasedContent(
				'## Unreleased\n\n### Added\n- Second\n\n## [2026-08-25]\n\n### Added\n- First\n',
				{ date: '2026-08-25', suffix: 'abc1234' }
			);

			expect(folded.key).toBe('2026-08-25+abc1234');
		});

		it('folds consumer Unreleased into a product version heading', () => {
			const folded = foldUnreleasedContent(
				'## Unreleased\n\n### Fixed\n- Theme frame\n',
				{ heading: '## [1.12.3] - 2026-08-25' }
			);

			expect(folded.key).toBe('1.12.3');
			expect(folded.content).toContain('## [1.12.3] - 2026-08-25');
			expect(folded.content).toContain('- Theme frame');
		});

		it('is a no-op when Unreleased is empty', () => {
			const source = '## Unreleased\n\n## [1.0.0]\n\n### Fixed\n- Old\n';
			const folded = foldUnreleasedContent(source, {
				date: '2026-08-25',
			});
			expect(folded.folded).toBe(false);
		});

		it('drops the Unreleased heading after folding when requested', () => {
			const folded = foldUnreleasedContent(
				'## Unreleased\n\n### Added\n- New API\n\n## [1.0.0]\n\n### Fixed\n- Old\n',
				{ heading: '## [2.0.0] - 2026-08-26', dropUnreleased: true }
			);

			expect(folded.folded).toBe(true);
			expect(folded.content).not.toContain('## Unreleased');
			expect(folded.content).toContain('## [2.0.0] - 2026-08-26');
			expect(folded.content).toContain('- New API');
		});

		it('removes an empty Unreleased heading when dropUnreleased is set', () => {
			const folded = foldUnreleasedContent(
				'## Unreleased\n\n## [1.0.0]\n\n### Fixed\n- Old\n',
				{ dropUnreleased: true }
			);

			expect(folded.folded).toBe(true);
			expect(folded.content).not.toContain('## Unreleased');
			expect(folded.content).toContain('## [1.0.0]');
		});
	});

	describe('assertUnreleasedEmpty', () => {
		it('fails when GP Unreleased still has bullets', () => {
			expect(() =>
				assertUnreleasedEmpty(
					'## Unreleased\n\n### Added\n- Pending\n',
					'packages/utils/CHANGELOG.md'
				)
			).toThrow(/Fold Unreleased/);
		});
	});

	describe('dedupeChangelogMarkdown', () => {
		it('drops bullets already in the previous product changelog', () => {
			const next = dedupeChangelogMarkdown(
				'### Features\n- New API\n- Extra\n',
				'## [1.0.0]\n\n### Features\n- New API\n'
			);

			expect(next).toContain('- Extra');
			expect(next).not.toContain('- New API');
		});
	});

	describe('prependRootChangelog', () => {
		it('prepends a product version heading', () => {
			const next = prependRootChangelog(
				'## [1.0.0] - 2024-01-01\n\n### Fixed\n- Old\n',
				'1.1.0',
				'2025-08-25',
				'### Added\n- New'
			);

			expect(next.startsWith('## [1.1.0] - 2025-08-25')).toBe(true);
			expect(next).toContain('### Added');
			expect(next).toContain('## [1.0.0]');
		});

		it('replaces an existing heading for the same version', () => {
			const next = prependRootChangelog(
				'## [1.1.0] - 2025-08-01\n\n### Added\n- Stale\n\n## [1.0.0] - 2024-01-01\n\n### Fixed\n- Old\n',
				'1.1.0',
				'2025-08-25',
				'### Added\n- Fresh'
			);

			expect(next).toContain('- Fresh');
			expect(next).not.toContain('- Stale');
			expect(next).toContain('## [1.0.0]');
		});
	});

	describe('listConsumerChangelogFiles', () => {
		it('ignores changelogs under packages/global-packages', async () => {
			const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changelogs-'));
			fs.mkdirSync(path.join(dir, 'packages', 'theme-pkg'), {
				recursive: true,
			});
			fs.mkdirSync(
				path.join(dir, 'packages', 'global-packages', 'packages', 'gp'),
				{ recursive: true }
			);
			fs.writeFileSync(
				path.join(dir, 'packages', 'theme-pkg', 'CHANGELOG.md'),
				'## Unreleased\n'
			);
			fs.writeFileSync(
				path.join(
					dir,
					'packages',
					'global-packages',
					'packages',
					'gp',
					'CHANGELOG.md'
				),
				'## Unreleased\n'
			);

			const previous = process.env.BLOCKERA_CHANGELOG_CONSUMER_GLOBS;
			process.env.BLOCKERA_CHANGELOG_CONSUMER_GLOBS =
				'packages/**/CHANGELOG.md';
			try {
				const files = await listConsumerChangelogFiles(dir);
				expect(files).toHaveLength(1);
				expect(files[0]).toContain('theme-pkg');
			} finally {
				if (previous === undefined) {
					delete process.env.BLOCKERA_CHANGELOG_CONSUMER_GLOBS;
				} else {
					process.env.BLOCKERA_CHANGELOG_CONSUMER_GLOBS = previous;
				}
				fs.rmSync(dir, { recursive: true, force: true });
			}
		});

		it('returns no files for a global-packages-only tree with the default glob', async () => {
			const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changelogs-'));
			fs.mkdirSync(
				path.join(dir, 'packages', 'global-packages', 'packages', 'gp'),
				{ recursive: true }
			);
			fs.writeFileSync(
				path.join(
					dir,
					'packages',
					'global-packages',
					'packages',
					'gp',
					'CHANGELOG.md'
				),
				'## Unreleased\n'
			);

			const previous = process.env.BLOCKERA_CHANGELOG_CONSUMER_GLOBS;
			delete process.env.BLOCKERA_CHANGELOG_CONSUMER_GLOBS;
			try {
				const files = await listConsumerChangelogFiles(dir);
				expect(files).toHaveLength(0);
			} finally {
				if (previous === undefined) {
					delete process.env.BLOCKERA_CHANGELOG_CONSUMER_GLOBS;
				} else {
					process.env.BLOCKERA_CHANGELOG_CONSUMER_GLOBS = previous;
				}
				fs.rmSync(dir, { recursive: true, force: true });
			}
		});
	});

	describe('accumulateProductChangelogs', () => {
		function restoreEnv(key, previous) {
			if (previous === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = previous;
			}
		}

		it('accumulates GP-only products when no consumer CHANGELOG.md files exist', async () => {
			const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changelogs-'));
			fs.mkdirSync(
				path.join(dir, 'packages', 'global-packages', 'packages', 'gp'),
				{ recursive: true }
			);
			fs.writeFileSync(
				path.join(
					dir,
					'packages',
					'global-packages',
					'packages',
					'gp',
					'CHANGELOG.md'
				),
				'## Unreleased\n'
			);

			const previousGlobs = process.env.BLOCKERA_CHANGELOG_CONSUMER_GLOBS;
			const previousFold = process.env.BLOCKERA_CHANGELOG_REQUIRE_FOLDED_GP;
			delete process.env.BLOCKERA_CHANGELOG_CONSUMER_GLOBS;
			process.env.BLOCKERA_CHANGELOG_REQUIRE_FOLDED_GP = '0';
			setPluginConfig({
				name: 'Blockera',
				changelog: {
					archiveUrl: 'https://example.com/releases',
					includeCommitCount: false,
				},
			});

			try {
				await accumulateProductChangelogs({
					cwd: dir,
					version: '1.12.3-rc.1',
					publishDate: '2026-08-26',
				});
				expect(console).toHaveLogged();
				expect(
					fs.existsSync(path.join(dir, 'CHANGELOG.md'))
				).toBe(true);
				expect(
					fs.existsSync(path.join(dir, 'changelog.txt'))
				).toBe(true);
			} finally {
				restoreEnv('BLOCKERA_CHANGELOG_CONSUMER_GLOBS', previousGlobs);
				restoreEnv(
					'BLOCKERA_CHANGELOG_REQUIRE_FOLDED_GP',
					previousFold
				);
				fs.rmSync(dir, { recursive: true, force: true });
			}
		});

		it('accumulates GP Unreleased for GP-only products without a gitlink', async () => {
			const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changelogs-'));
			const gpPkg = path.join(
				dir,
				'packages',
				'global-packages',
				'packages',
				'gp'
			);
			fs.mkdirSync(gpPkg, { recursive: true });
			fs.writeFileSync(
				path.join(gpPkg, 'package.json'),
				JSON.stringify({ name: '@blockera/gp', version: '1.2.0' })
			);
			fs.writeFileSync(
				path.join(gpPkg, 'CHANGELOG.md'),
				`## Unreleased

### Added
- Pending GP note

## [1.2.0] - 2026-08-26

### Added
- Versioned note

## [1.0.0] - 2024-12-08

### Fixed
- Ancient
`
			);

			const previousGlobs = process.env.BLOCKERA_CHANGELOG_CONSUMER_GLOBS;
			const previousFold = process.env.BLOCKERA_CHANGELOG_REQUIRE_FOLDED_GP;
			const previousFrom = process.env.BLOCKERA_CHANGELOG_FROM_REF;
			delete process.env.BLOCKERA_CHANGELOG_CONSUMER_GLOBS;
			delete process.env.BLOCKERA_CHANGELOG_REQUIRE_FOLDED_GP;
			process.env.BLOCKERA_CHANGELOG_FROM_REF = 'no-such-ref';
			setPluginConfig({
				name: 'Blockera',
				changelog: {
					archiveUrl: 'https://example.com/releases',
					includeCommitCount: false,
				},
			});

			try {
				await accumulateProductChangelogs({
					cwd: dir,
					version: '2.0.0-rc.1',
					publishDate: '2026-08-27',
				});
				expect(console).toHaveLogged();
				const root = fs.readFileSync(
					path.join(dir, 'CHANGELOG.md'),
					'utf8'
				);
				expect(root).toContain('- Pending GP note');
				expect(root).toContain('- Versioned note');
				expect(root).not.toContain('- Ancient');
			} finally {
				restoreEnv('BLOCKERA_CHANGELOG_CONSUMER_GLOBS', previousGlobs);
				restoreEnv(
					'BLOCKERA_CHANGELOG_REQUIRE_FOLDED_GP',
					previousFold
				);
				restoreEnv('BLOCKERA_CHANGELOG_FROM_REF', previousFrom);
				fs.rmSync(dir, { recursive: true, force: true });
			}
		});

		it('throws when BLOCKERA_CHANGELOG_REQUIRE_FOLDED_GP=1 and GP Unreleased has bullets', async () => {
			const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changelogs-'));
			fs.mkdirSync(
				path.join(dir, 'packages', 'global-packages', 'packages', 'gp'),
				{ recursive: true }
			);
			fs.writeFileSync(
				path.join(
					dir,
					'packages',
					'global-packages',
					'packages',
					'gp',
					'CHANGELOG.md'
				),
				'## Unreleased\n\n### Added\n- Pending\n'
			);

			const previousGlobs = process.env.BLOCKERA_CHANGELOG_CONSUMER_GLOBS;
			const previousFold = process.env.BLOCKERA_CHANGELOG_REQUIRE_FOLDED_GP;
			delete process.env.BLOCKERA_CHANGELOG_CONSUMER_GLOBS;
			process.env.BLOCKERA_CHANGELOG_REQUIRE_FOLDED_GP = '1';

			try {
				await expect(
					accumulateProductChangelogs({
						cwd: dir,
						version: '2.0.0-rc.1',
						publishDate: '2026-08-27',
					})
				).rejects.toThrow(/Fold Unreleased/);
				expect(console).toHaveLogged();
			} finally {
				restoreEnv('BLOCKERA_CHANGELOG_CONSUMER_GLOBS', previousGlobs);
				restoreEnv(
					'BLOCKERA_CHANGELOG_REQUIRE_FOLDED_GP',
					previousFold
				);
				fs.rmSync(dir, { recursive: true, force: true });
			}
		});

		it('throws when BLOCKERA_CHANGELOG_CONSUMER_GLOBS is set and matches nothing', async () => {
			const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changelogs-'));
			const previousGlobs = process.env.BLOCKERA_CHANGELOG_CONSUMER_GLOBS;
			const previousFold = process.env.BLOCKERA_CHANGELOG_REQUIRE_FOLDED_GP;
			process.env.BLOCKERA_CHANGELOG_CONSUMER_GLOBS =
				'packages/missing/CHANGELOG.md';
			process.env.BLOCKERA_CHANGELOG_REQUIRE_FOLDED_GP = '0';

			try {
				await expect(
					accumulateProductChangelogs({
						cwd: dir,
						version: '1.12.3-rc.1',
						publishDate: '2026-08-26',
					})
				).rejects.toThrow(
					'no consumer package CHANGELOG.md files matched BLOCKERA_CHANGELOG_CONSUMER_GLOBS'
				);
				expect(console).toHaveLogged();
			} finally {
				restoreEnv('BLOCKERA_CHANGELOG_CONSUMER_GLOBS', previousGlobs);
				restoreEnv(
					'BLOCKERA_CHANGELOG_REQUIRE_FOLDED_GP',
					previousFold
				);
				fs.rmSync(dir, { recursive: true, force: true });
			}
		});
	});

	describe('foldUnreleasedTree', () => {
		it('skips the global-packages checkout in a consumer tree', () => {
			const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fold-tree-'));
			fs.mkdirSync(path.join(dir, 'packages', 'theme-pkg'), {
				recursive: true,
			});
			fs.mkdirSync(
				path.join(dir, 'packages', 'global-packages', 'packages', 'gp'),
				{ recursive: true }
			);
			fs.writeFileSync(
				path.join(dir, 'packages', 'theme-pkg', 'CHANGELOG.md'),
				'## Unreleased\n\n### Added\n- Theme note\n'
			);
			fs.writeFileSync(
				path.join(
					dir,
					'packages',
					'global-packages',
					'packages',
					'gp',
					'CHANGELOG.md'
				),
				'## Unreleased\n\n### Added\n- GP note\n'
			);

			try {
				expect(collectPackageChangelogPaths(dir)).toHaveLength(1);
				const result = foldUnreleasedTree(dir, {
					heading: '## [1.0.0] - 2026-08-25',
				});
				expect(result.changed).toBe(true);
				expect(
					fs.readFileSync(
						path.join(
							dir,
							'packages',
							'global-packages',
							'packages',
							'gp',
							'CHANGELOG.md'
						),
						'utf8'
					)
				).toContain('- GP note');
				expect(
					fs.readFileSync(
						path.join(dir, 'packages', 'theme-pkg', 'CHANGELOG.md'),
						'utf8'
					)
				).toContain('## [1.0.0] - 2026-08-25');
			} finally {
				fs.rmSync(dir, { recursive: true, force: true });
			}
		});
	});

	describe('resolveLastReleaseRef', () => {
		const { execFileSync } = require('child_process');

		it('treats rc versions as prerelease', () => {
			expect(isPrereleaseVersion('2.0.0-rc.1')).toBe(true);
			expect(isPrereleaseVersion('v2.0.0-rc.1')).toBe(true);
			expect(isPrereleaseVersion('2.0.0')).toBe(false);
		});

		it('skips a prerelease PREVIOUS_VERSION and uses the last stable tag', () => {
			const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'changelogs-'));
			const git = (args) =>
				execFileSync('git', args, { cwd: dir, stdio: 'pipe' });
			const prev = process.env.BLOCKERA_CHANGELOG_PREVIOUS_VERSION;
			const fromRef = process.env.BLOCKERA_CHANGELOG_FROM_REF;
			try {
				git(['init']);
				git(['config', 'user.email', 'dev@example.com']);
				git(['config', 'user.name', 'Dev']);
				fs.writeFileSync(path.join(dir, 'README.md'), 'a\n');
				git(['add', '.']);
				git(['commit', '-m', 'init']);
				git(['tag', 'v1.12.2']);
				fs.writeFileSync(path.join(dir, 'README.md'), 'b\n');
				git(['add', '.']);
				git(['commit', '-m', 'rc']);
				git(['tag', 'v2.0.0-rc.1']);

				expect(latestStableTag(dir)).toBe('v1.12.2');

				delete process.env.BLOCKERA_CHANGELOG_FROM_REF;
				process.env.BLOCKERA_CHANGELOG_PREVIOUS_VERSION = '2.0.0-rc.1';
				expect(resolveLastReleaseRef(dir)).toBe('v1.12.2');

				process.env.BLOCKERA_CHANGELOG_PREVIOUS_VERSION = '1.12.2';
				expect(resolveLastReleaseRef(dir)).toBe('v1.12.2');
			} finally {
				if (prev === undefined) {
					delete process.env.BLOCKERA_CHANGELOG_PREVIOUS_VERSION;
				} else {
					process.env.BLOCKERA_CHANGELOG_PREVIOUS_VERSION = prev;
				}
				if (fromRef === undefined) {
					delete process.env.BLOCKERA_CHANGELOG_FROM_REF;
				} else {
					process.env.BLOCKERA_CHANGELOG_FROM_REF = fromRef;
				}
				fs.rmSync(dir, { recursive: true, force: true });
			}
		});
	});
});
