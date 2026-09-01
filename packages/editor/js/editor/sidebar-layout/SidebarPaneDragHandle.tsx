/**
 * WordPress dependencies
 */
import { Icon } from '@wordpress/components';
import { forwardRef } from '@wordpress/element';
import { dragHandle } from '@wordpress/icons';

type SidebarPaneDragHandleProps = {
	className: string;
	'aria-label': string;
	'data-test': string;
	onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
};

const SidebarPaneDragHandle = forwardRef<
	HTMLButtonElement,
	SidebarPaneDragHandleProps
>(function SidebarPaneDragHandle(
	{ className, onPointerDown, 'aria-label': ariaLabel, 'data-test': dataTest },
	ref
) {
	return (
		<button
			ref={ref}
			type="button"
			className={className}
			data-test={dataTest}
			onPointerDown={onPointerDown}
			aria-label={ariaLabel}
		>
			<Icon icon={dragHandle} size={20} aria-hidden />
		</button>
	);
});

export default SidebarPaneDragHandle;
