// @flow

/**
 * External dependencies
 */
import type { ComponentType, MixedElement } from 'react';
import { memo } from '@wordpress/element';

type StyleProps = {
	declarations: string,
};

const StyleComponent = ({
	declarations,
}: StyleProps): MixedElement => {
	if (!declarations) {
		return <></>;
	}

	return <style>{declarations}</style>;
};

export const Style: ComponentType<StyleProps> = memo(
	StyleComponent,
	(prev: StyleProps, next: StyleProps): boolean =>
		prev.declarations === next.declarations
);
