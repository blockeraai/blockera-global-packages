/**
 * WordPress dependencies
 */
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { displayShortcut } from '@wordpress/keycodes';

/**
 * SVG icon for the primary (right) sidebar toggle button.
 */
const PrimarySidebarIcon = () => (
	<svg
		width="24"
		height="24"
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path
			fillRule="evenodd"
			clipRule="evenodd"
			d="M18.5 4H6.5C5.4 4 4.5 4.9 4.5 6V18C4.5 19.1 5.4 20 6.5 20H18.5C19.6 20 20.5 19.1 20.5 18V6C20.5 4.9 19.6 4 18.5 4ZM14.5 5.5H6.5C6.2 5.5 6 5.7 6 6V18C6 18.3 6.2 18.5 6.5 18.5H14.5V5.5ZM18 18C18 18.3 17.8 18.5 17.5 18.5H15V5.5H17.5C17.8 5.5 18 5.7 18 6V18Z"
		/>
	</svg>
);

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
			icon={<PrimarySidebarIcon />}
			onClick={onToggle}
			isPressed={isVisible}
			label={label}
			aria-label={label}
			className="blockera-primary-sidebar-toggle"
			size="compact"
		/>
	);
}
