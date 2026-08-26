/**
 * Internal dependencies
 */
const {
	shouldUpdatePackage,
	sectionForCommitSubject,
	changelogBodyFromCommitSubjects,
	insertVersionSection,
	stripUnreleasedSection,
	resolveMasterMergeRange,
} = require('../update-package-changelogs');

describe('update-package-changelogs', () => {
	describe('shouldUpdatePackage', () => {
		it('updates when Unreleased has notes even if files did not change', () => {
			expect(
				shouldUpdatePackage({
					hasUnreleasedEntries: true,
					changelogChanged: false,
					packageFilesChanged: false,
				})
			).toBe(true);
		});

		it('updates when package files changed and CHANGELOG.md did not', () => {
			expect(
				shouldUpdatePackage({
					hasUnreleasedEntries: false,
					changelogChanged: false,
					packageFilesChanged: true,
				})
			).toBe(true);
		});

		it('skips when nothing in the package changed and Unreleased is empty', () => {
			expect(
				shouldUpdatePackage({
					hasUnreleasedEntries: false,
					changelogChanged: false,
					packageFilesChanged: false,
				})
			).toBe(false);
		});

		it('skips a CHANGELOG-only change with no Unreleased bullets', () => {
			expect(
				shouldUpdatePackage({
					hasUnreleasedEntries: false,
					changelogChanged: true,
					packageFilesChanged: false,
				})
			).toBe(false);
		});
	});

	describe('changelogBodyFromCommitSubjects', () => {
		it('groups feat/fix/other subjects and skips merge noise', () => {
			const body = changelogBodyFromCommitSubjects([
				'feat: add grid settings',
				'fix: correct spacing',
				'refactor: tidy store selectors',
				'Merge pull request #12',
				'Update Changelog for 2.0.0',
			]);

			expect(body).toContain('### Added');
			expect(body).toContain('- Add grid settings.');
			expect(body).toContain('### Fixed');
			expect(body).toContain('- Correct spacing.');
			expect(body).toContain('### Changed');
			expect(body).toContain('- Tidy store selectors.');
			expect(body).not.toContain('Merge pull request');
			expect(body).not.toContain('Update Changelog');
		});

		it('falls back when no usable subjects remain', () => {
			expect(
				changelogBodyFromCommitSubjects(['Merge pull request #1'])
			).toBe('### Changed\n- Internal updates.');
		});
	});

	describe('sectionForCommitSubject', () => {
		it('maps conventional prefixes', () => {
			expect(sectionForCommitSubject('feat(editor): add search')).toBe(
				'Added'
			);
			expect(sectionForCommitSubject('fix: crash')).toBe('Fixed');
			expect(sectionForCommitSubject('chore: deps')).toBe('Changed');
			expect(sectionForCommitSubject('submodule: bump')).toBe(null);
		});
	});

	describe('insertVersionSection', () => {
		it('prepends a version heading and drops Unreleased', () => {
			const next = insertVersionSection(
				'## Unreleased\n\n## [1.0.0] - 2024-01-01\n\n### Fixed\n- Old\n',
				'## [2.0.0] - 2026-08-26',
				'### Changed\n- Internal updates.'
			);

			expect(next).not.toContain('## Unreleased');
			expect(next).toContain('## [2.0.0] - 2026-08-26');
			expect(next).toContain('- Internal updates.');
			expect(next).toContain('## [1.0.0] - 2024-01-01');
		});
	});

	describe('stripUnreleasedSection', () => {
		it('removes an empty Unreleased inbox', () => {
			const next = stripUnreleasedSection(
				'## Unreleased\n\n## [1.0.0]\n\n### Fixed\n- Old\n'
			);
			expect(next).not.toContain('## Unreleased');
			expect(next).toContain('## [1.0.0]');
		});
	});

	describe('resolveMasterMergeRange', () => {
		it('returns an explicit from/to pair', () => {
			expect(
				resolveMasterMergeRange({
					from: 'abc',
					to: 'def',
					eventName: 'push',
				})
			).toEqual({ from: 'abc', to: 'def' });
		});
	});
});
