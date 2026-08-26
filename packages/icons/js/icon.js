// @flow

/**
 * External dependencies
 */
import { useEffect, useState } from '@wordpress/element';
import type { MixedElement } from 'react';

/**
 * Blockera dependencies
 */
import { isFunction, isUndefined } from '@blockera/utils';

/**
 * Internal dependencies
 */
import { WPIcon } from './library-wp/index';
import { BlockeraIcon } from './library-blockera/index';
import { BlockeraUIIcon } from './library-ui/index';
import { CursorIcon } from './library-cursor/index';
import { BrandsIcon } from './library-brands/index';
import {
	arePickerLibrariesLoaded,
	getDeferredIconRenderer,
	getIconLibraryIcons,
	isValidIconLibrary,
} from './icon-library';
import { isDeferredIconLibrary } from './deferred-libraries';
import { ensureIconPickerLibraries } from './load-picker-libraries';
import type { IconProps, IconLibraryTypes } from './types';

function IconPlaceholder({
	iconSize,
}: {
	iconSize?: number,
}): MixedElement {
	const size = iconSize || 20;

	return (
		<span
			className="blockera-icon-loading"
			aria-busy="true"
			aria-hidden="true"
			style={{
				display: 'inline-block',
				width: size,
				height: size,
			}}
		/>
	);
}

function DeferredLibraryIcon({
	library,
	...props
}: IconProps): MixedElement {
	const [ready, setReady] = useState(arePickerLibrariesLoaded);

	useEffect(() => {
		if (ready) {
			return undefined;
		}

		let cancelled = false;

		ensureIconPickerLibraries()
			.then((isReady) => {
				if (!cancelled && isReady) {
					setReady(true);
				}
			})
			.catch(() => {});

		return () => {
			cancelled = true;
		};
	}, [ready]);

	if (!ready) {
		return <IconPlaceholder iconSize={props.iconSize} />;
	}

	if (!library) {
		return <></>;
	}

	const Renderer = getDeferredIconRenderer(library);

	if (!Renderer) {
		return <></>;
	}

	return <Renderer library={library} {...props} />;
}

export function Icon({
	library = 'ui',
	uploadSVG,
	...props
}: IconProps): MixedElement {
	if (uploadSVG) {
		return <img alt={uploadSVG.title} src={uploadSVG.url} />;
	}

	if (!props.icon || !library) {
		return <></>;
	}

	if (isDeferredIconLibrary(library)) {
		return <DeferredLibraryIcon library={library} {...props} />;
	}

	switch (library) {
		case 'ui':
			return <BlockeraUIIcon library={library} {...props} />;

		case 'blockera':
			return <BlockeraIcon library={library} {...props} />;

		case 'cursor':
			return <CursorIcon library={library} {...props} />;

		case 'brands':
			return <BrandsIcon library={library} {...props} />;

		default:
			return <WPIcon library={library} {...props} />;
	}
}

export function getIcon(
	iconName: string,
	libraryName: IconLibraryTypes = 'ui',
	standardize: boolean = true
): null | Object {
	if (!isValidIconLibrary(libraryName)) {
		/* @debug-ignore */
		console.warn(
			`Icon library is not correct or not found. Library: '${libraryName}', Icon: '${iconName}'`
		);
		return null;
	}

	if (
		isDeferredIconLibrary(libraryName) &&
		!arePickerLibrariesLoaded()
	) {
		return null;
	}

	if (
		9 === iconName.length &&
		iconName.startsWith('word') &&
		iconName.endsWith('press')
	) {
		if ('wp' === libraryName) {
			iconName = 'wordpress-logo';
		} else if ('fabrands' === libraryName) {
			iconName = 'fa-wordpress';
		}
	}

	const lib = getIconLibraryIcons(libraryName);

	if (!isUndefined(lib[iconName])) {
		if (standardize) {
			return createStandardIconObject(
				iconName,
				libraryName,
				lib[iconName]
			);
		}

		return { iconName, library: libraryName, icon: lib[iconName] };
	}

	/* @debug-ignore */
	console.warn(
		`Icon id is not correct or not found. Icon: '${iconName}', Library: '${libraryName}'`
	);
	return null;
}

export function isValidIcon(icon: any, key: void | string): boolean {
	const excluded = ['Icon'];

	if (null === icon) {
		return false;
	}

	if (key && excluded.includes(key)) {
		return false;
	}

	return !isFunction(icon);
}

export function createStandardIconObject(
	iconName: string,
	library: IconLibraryTypes = 'ui',
	icon: Object
): Object {
	// use getIcon if the icon shape did not provide
	if (icon === null) {
		return getIcon(iconName, library, false);
	}

	if (library === 'wp') {
		if (!icon?.icon) {
			return getIcon(iconName, library, false);
		}

		if (icon?.icon) {
			return {
				icon: icon.icon,
				iconName,
				library,
			};
		}

		return {
			icon: '',
			iconName,
			library,
		};
	}

	if (
		['blockera', 'ui', 'cursor', 'brands', 'essentials'].includes(library)
	) {
		if (isFunction(icon)) {
			return {
				icon,
				iconName,
				library,
			};
		}

		if (!icon?.icon) {
			return getIcon(iconName, library, false);
		}
	}

	if (['faregular', 'fabrands', 'fasolid'].includes(library)) {
		return {
			icon,
			library,
			iconName,
		};
	}

	if (
		['feather', 'lucide', 'untitledui', 'tabler', 'tabler-filled'].includes(
			library
		)
	) {
		if (
			typeof icon === 'function' ||
			typeof icon === 'string' ||
			icon?.toSvg
		) {
			return {
				icon,
				library,
				iconName,
			};
		}

		return getIcon(iconName, library, false);
	}

	if (icon?.icon) {
		return {
			icon: icon.icon,
			iconName,
			library,
		};
	}

	return {
		icon,
		iconName,
		library,
	};
}
