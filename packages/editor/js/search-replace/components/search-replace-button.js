/**
 * WordPress dependencies
 */
import { Button, Fill } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { search } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import { SEARCH_REPLACE_TEST_ID } from '../store/constants';

export default function SearchReplaceButton({ isOpen, onToggle }) {
	return (
		<Fill name="blockera/slots/editor-header-settings">
			<div className="blockera-search-replace-header-button-wrapper">
				<Button
					icon={search}
					label={__('Search and replace', 'blockera')}
					size="compact"
					isPressed={isOpen}
					onClick={onToggle}
					data-test={SEARCH_REPLACE_TEST_ID.headerButton}
				/>
			</div>
		</Fill>
	);
}
