/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Blockera dependencies
 */
import { Tabs } from '@blockera/controls';

/**
 * Internal dependencies
 */
import CodeEditorSidebarNotice from './CodeEditorSidebarNotice';

const INSERTER_TEXT_MODE_TABS = [
	{
		name: 'blocks',
		title: __('Blocks', 'blockera'),
	},
	{
		name: 'patterns',
		title: __('Patterns', 'blockera'),
	},
	{
		name: 'media',
		title: __('Media', 'blockera'),
	},
];

function getInserterTextModePanel() {
	return (
		<CodeEditorSidebarNotice dataTest="blockera-code-editor-inserter-notice">
			{__('Not available in code editor.', 'blockera')}
		</CodeEditorSidebarNotice>
	);
}

/**
 * Inserter chrome for Gutenberg code editor mode: Blocks, Patterns, and Media
 * stay selectable, and every tab body is an empty notice.
 */
export default function InserterTextModePanel() {
	return (
		<Tabs
			className="blockera-tabbed-sidebar"
			activeTab="blocks"
			design="modern"
			fitWidthTabs={false}
			tabs={INSERTER_TEXT_MODE_TABS}
			getPanel={getInserterTextModePanel}
		/>
	);
}
