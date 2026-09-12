/**
 * Internal dependencies
 */
import {
	splitConflictingBackgroundStyle,
	splitConflictingBackgroundWrapperProps,
} from '../split-background-style';

describe('splitConflictingBackgroundStyle', () => {
	it('leaves styles without a background shorthand unchanged', () => {
		const style = { backgroundColor: '#ffdfdf', color: '#111' };

		expect(splitConflictingBackgroundStyle(style)).toBe(style);
		expect(splitConflictingBackgroundStyle(undefined)).toBe(undefined);
		expect(splitConflictingBackgroundStyle(null)).toBe(null);
	});

	it('does not rewrite gradient-only or WP sentinel shorthands', () => {
		const gradientOnly = {
			background:
				'linear-gradient(135deg,rgb(135,254,56) 1%,rgb(255,147,147) 97%)',
		};
		const noneOnly = { background: 'none' };
		const transparentNone = { background: 'transparent none' };

		expect(splitConflictingBackgroundStyle(gradientOnly)).toBe(gradientOnly);
		expect(splitConflictingBackgroundStyle(noneOnly)).toBe(noneOnly);
		expect(splitConflictingBackgroundStyle(transparentNone)).toBe(
			transparentNone
		);
	});

	it('moves a gradient shorthand onto backgroundImage and keeps backgroundColor', () => {
		expect(
			splitConflictingBackgroundStyle({
				backgroundColor: '#ffdfdf',
				background:
					'linear-gradient(135deg,rgb(135,254,56) 1%,rgb(255,147,147) 97%)',
				color: '#111',
			})
		).toEqual({
			backgroundColor: '#ffdfdf',
			backgroundImage:
				'linear-gradient(135deg,rgb(135,254,56) 1%,rgb(255,147,147) 97%)',
			color: '#111',
		});
	});

	it('prepends the shorthand in front of an existing backgroundImage', () => {
		expect(
			splitConflictingBackgroundStyle({
				backgroundColor: '#fff',
				background: 'linear-gradient(red, blue)',
				backgroundImage: "url('https://example.com/a.png')",
			})
		).toEqual({
			backgroundColor: '#fff',
			backgroundImage:
				"linear-gradient(red, blue), url('https://example.com/a.png')",
		});
	});

	it('maps WP none sentinels to backgroundImage when a color is also set', () => {
		expect(
			splitConflictingBackgroundStyle({
				backgroundColor: 'transparent',
				background: 'transparent none',
			})
		).toEqual({
			backgroundColor: 'transparent',
			backgroundImage: 'none',
		});
	});
});

describe('splitConflictingBackgroundWrapperProps', () => {
	it('returns the same wrapper when style does not need a rewrite', () => {
		const wrapperProps = { className: 'has-background' };

		expect(splitConflictingBackgroundWrapperProps(wrapperProps)).toBe(
			wrapperProps
		);
	});

	it('rewrites wrapper style without mutating the original', () => {
		const wrapperProps = {
			className: 'has-background',
			style: {
				backgroundColor: '#fff',
				background: 'linear-gradient(red, blue)',
			},
		};

		expect(splitConflictingBackgroundWrapperProps(wrapperProps)).toEqual({
			className: 'has-background',
			style: {
				backgroundColor: '#fff',
				backgroundImage: 'linear-gradient(red, blue)',
			},
		});
		expect(wrapperProps.style.background).toBe(
			'linear-gradient(red, blue)'
		);
	});

	it('returns a stable wrapper identity for the same input object', () => {
		const wrapperProps = {
			className: 'has-background',
			style: {
				backgroundColor: '#fff',
				background: 'linear-gradient(red, blue)',
			},
		};

		expect(splitConflictingBackgroundWrapperProps(wrapperProps)).toBe(
			splitConflictingBackgroundWrapperProps(wrapperProps)
		);
	});
});
