/**
 * WordPress dependencies
 */
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { displayShortcut } from '@wordpress/keycodes';

/**
 * Blockera dependencies
 */
import { Icon } from '@blockera/icons';

interface ToggleButtonProps {
	isVisible: boolean;
	onToggle: () => void;
}

/**
 * Toggle button for showing/hiding the primary (right) sidebar.
 */
export default function PrimaryToggleButton({
	isVisible,
	onToggle,
}: ToggleButtonProps) {
	const label =
		__('Primary sidebar', 'blockera') +
		' ' +
		displayShortcut.primaryShift('.');

	return (
		<Button
			data-test="blockera-primary-sidebar-toggle"
			icon={<Icon icon="drawer-right" library="wp" />}
			onClick={onToggle}
			isPressed={isVisible}
			label={label}
			aria-label={label}
			className="blockera-primary-sidebar-toggle"
			size="compact"
		/>
	);
}
