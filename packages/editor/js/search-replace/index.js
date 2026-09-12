/**
 * WordPress dependencies
 */
import { useEffect } from '@wordpress/element';
import { registerPlugin } from '@wordpress/plugins';

/**
 * Internal dependencies
 */
import './store';
import './style.scss';
import SearchReplaceButton from './components/search-replace-button';
import SearchReplacePanel from './components/search-replace-panel';
import SearchReplaceResultToolbar from './components/search-replace-result-toolbar';
import { SEARCH_REPLACE_TEST_ID } from './store/constants';
import { useSearchReplaceController } from './hooks/use-search-replace-controller';

function focusFindInput() {
	document
		.querySelector(`[data-test="${SEARCH_REPLACE_TEST_ID.findInput}"]`)
		?.focus();
}

function SearchReplaceApp() {
	const controller = useSearchReplaceController();

	useEffect(() => {
		const onKeyDown = (event) => {
			const isFind =
				(event.metaKey || event.ctrlKey) &&
				!event.shiftKey &&
				(event.key === 'f' || event.key === 'F');

			if (isFind) {
				event.preventDefault();
				if (!controller.isOpen) {
					controller.openPanel();
				} else {
					focusFindInput();
				}
				return;
			}

			if (event.key === 'Escape' && controller.isOpen) {
				event.preventDefault();
				controller.close();
			}
		};

		window.addEventListener('keydown', onKeyDown, true);
		return () => window.removeEventListener('keydown', onKeyDown, true);
	}, [controller.isOpen, controller.openPanel, controller.close]);

	return (
		<>
			<SearchReplaceButton
				isOpen={controller.isOpen}
				onToggle={() =>
					controller.isOpen
						? controller.close()
						: controller.openPanel()
				}
			/>
			{controller.isOpen && (
				<SearchReplacePanel
					query={controller.query}
					replaceValue={controller.replaceValue}
					matchCase={controller.matchCase}
					wholeWord={controller.wholeWord}
					useRegex={controller.useRegex}
					scope={controller.scope}
					results={controller.results}
					currentIndex={controller.currentIndex}
					upgradeOpen={controller.upgradeOpen}
					onQueryChange={controller.setQuery}
					onReplaceValueChange={controller.setReplaceValue}
					onMatchCase={controller.setMatchCase}
					onWholeWord={controller.setWholeWord}
					onUseRegex={controller.setUseRegex}
					onScopeChange={controller.setScope}
					onClose={controller.close}
					onPrev={() => controller.goTo(-1)}
					onNext={() => controller.goTo(1)}
					onReplace={controller.replaceCurrent}
					onReplaceAll={controller.replaceAll}
					onUpgradeClose={controller.setUpgradeOpen}
				/>
			)}
			{controller.isOpen && <SearchReplaceResultToolbar />}
		</>
	);
}

registerPlugin('blockera-search-replace', {
	render: SearchReplaceApp,
	icon: null,
});

export { bootstrapSearchReplace } from './bootstrap';
export { SEARCH_REPLACE_SCOPES_FILTER } from './scopes';
