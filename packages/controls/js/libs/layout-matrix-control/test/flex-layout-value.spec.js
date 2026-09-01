/**
 * Internal dependencies
 */
import {
	isLegacyFlexLayout,
	migrateFlexLayoutToStored,
	resolveFlexLayoutCssAxes,
} from '../flex-layout-value';

describe('flex-layout-value', () => {
	describe('isLegacyFlexLayout', () => {
		it('detects old keys without new keys', () => {
			expect(
				isLegacyFlexLayout({
					direction: 'row',
					alignItems: 'center',
					justifyContent: 'flex-start',
				})
			).toBe(true);
		});

		it('treats empty new keys mixed with old keys as legacy', () => {
			expect(
				isLegacyFlexLayout({
					direction: 'column',
					alignItems: 'center',
					justifyContent: 'flex-start',
					flexAlign: '',
					flexJustify: '',
				})
			).toBe(true);
		});

		it('does not treat flexAlign/flexJustify as legacy', () => {
			expect(
				isLegacyFlexLayout({
					direction: 'column',
					flexAlign: 'flex-start',
					flexJustify: 'center',
				})
			).toBe(false);
		});
	});

	describe('migrateFlexLayoutToStored', () => {
		it('copies row legacy keys into flexAlign/flexJustify', () => {
			expect(
				migrateFlexLayoutToStored({
					direction: 'row',
					alignItems: 'center',
					justifyContent: 'flex-start',
					dense: false,
				})
			).toEqual({
				direction: 'row',
				flexAlign: 'center',
				flexJustify: 'flex-start',
				dense: false,
			});
		});

		it('swaps column legacy keys into flexAlign/flexJustify', () => {
			expect(
				migrateFlexLayoutToStored({
					direction: 'column',
					alignItems: 'center',
					justifyContent: 'flex-start',
				})
			).toEqual({
				direction: 'column',
				flexAlign: 'flex-start',
				flexJustify: 'center',
			});
		});

		it('does not swap column legacy keys when alignItems is stretch', () => {
			expect(
				migrateFlexLayoutToStored({
					direction: 'column',
					alignItems: 'stretch',
					justifyContent: 'flex-start',
				})
			).toEqual({
				direction: 'column',
				flexAlign: 'stretch',
				flexJustify: 'flex-start',
			});
		});

		it.each(['space-around', 'space-between'])(
			'does not swap column legacy keys when justifyContent is %s',
			(justifyContent) => {
				expect(
					migrateFlexLayoutToStored({
						direction: 'column',
						alignItems: 'center',
						justifyContent,
					})
				).toEqual({
					direction: 'column',
					flexAlign: 'center',
					flexJustify: justifyContent,
				});
			}
		);

		it('passes through already-stored new keys', () => {
			expect(
				migrateFlexLayoutToStored({
					direction: 'column',
					flexAlign: 'flex-start',
					flexJustify: 'center',
				})
			).toEqual({
				direction: 'column',
				flexAlign: 'flex-start',
				flexJustify: 'center',
			});
		});
	});

	describe('resolveFlexLayoutCssAxes', () => {
		it('resolves legacy row 1:1', () => {
			expect(
				resolveFlexLayoutCssAxes({
					direction: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
				})
			).toEqual({
				flexAlign: 'center',
				flexJustify: 'space-between',
			});
		});

		it('resolves the same row with new keys', () => {
			expect(
				resolveFlexLayoutCssAxes({
					direction: 'row',
					flexAlign: 'center',
					flexJustify: 'space-between',
				})
			).toEqual({
				flexAlign: 'center',
				flexJustify: 'space-between',
			});
		});

		it('swaps legacy column axes', () => {
			expect(
				resolveFlexLayoutCssAxes({
					direction: 'column',
					alignItems: 'center',
					justifyContent: 'flex-start',
				})
			).toEqual({
				flexAlign: 'flex-start',
				flexJustify: 'center',
			});
		});

		it('resolves the same column with new keys', () => {
			expect(
				resolveFlexLayoutCssAxes({
					direction: 'column',
					flexAlign: 'flex-start',
					flexJustify: 'center',
				})
			).toEqual({
				flexAlign: 'flex-start',
				flexJustify: 'center',
			});
		});

		it('does not swap legacy column when alignItems is stretch', () => {
			expect(
				resolveFlexLayoutCssAxes({
					direction: 'column',
					alignItems: 'stretch',
					justifyContent: 'space-between',
				})
			).toEqual({
				flexAlign: 'stretch',
				flexJustify: 'space-between',
			});
		});

		it('resolves the same stretch column with new keys', () => {
			expect(
				resolveFlexLayoutCssAxes({
					direction: 'column',
					flexAlign: 'stretch',
					flexJustify: 'space-between',
				})
			).toEqual({
				flexAlign: 'stretch',
				flexJustify: 'space-between',
			});
		});

		it.each(['space-around', 'space-between'])(
			'does not swap legacy column when justifyContent is %s',
			(justifyContent) => {
				expect(
					resolveFlexLayoutCssAxes({
						direction: 'column',
						alignItems: 'center',
						justifyContent,
					})
				).toEqual({
					flexAlign: 'center',
					flexJustify: justifyContent,
				});
			}
		);

		it.each(['space-around', 'space-between'])(
			'resolves the same %s column with new keys',
			(flexJustify) => {
				expect(
					resolveFlexLayoutCssAxes({
						direction: 'column',
						flexAlign: 'center',
						flexJustify,
					})
				).toEqual({
					flexAlign: 'center',
					flexJustify,
				});
			}
		);
	});
});
