/**
 * WordPress dependencies
 */
import { Button, Fill, SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { chevronDown, chevronUp, closeSmall, search } from '@wordpress/icons';
import { useLayoutEffect, useRef } from '@wordpress/element';

/**
 * Blockera dependencies
 */
import { UpgradePrompt, Flex } from '@blockera/controls';
import { Icon } from '@blockera/icons';
/**
 * Internal dependencies
 */
import { SEARCH_REPLACE_TEST_ID } from '../store/constants';
import { getSearchReplaceScopes } from '../scopes';
import SearchReplaceCount from './search-replace-count';

export default function SearchReplacePanel({
	query,
	replaceValue,
	matchCase,
	wholeWord,
	useRegex,
	scope,
	results,
	currentIndex,
	upgradeOpen,
	onQueryChange,
	onReplaceValueChange,
	onMatchCase,
	onWholeWord,
	onUseRegex,
	onScopeChange,
	onClose,
	onPrev,
	onNext,
	onReplace,
	onReplaceAll,
	onUpgradeClose,
}) {
	const findRef = useRef(null);
	const scopes = getSearchReplaceScopes();
	const canReplace = Boolean(query) && results.length > 0;
	const findPlaceholder = useRegex
		? __('e.g. \\$\\d+ — prices like $19', 'blockera')
		: __('Search the document…', 'blockera');

	const onFindKeyDown = (event) => {
		if (event.key !== 'Enter' || event.isComposing) {
			return;
		}
		event.preventDefault();
		if (event.shiftKey) {
			onPrev();
			return;
		}
		onNext();
	};

	const onReplaceKeyDown = (event) => {
		if (event.key !== 'Enter' || event.isComposing) {
			return;
		}
		event.preventDefault();
		if (!canReplace) {
			return;
		}
		onReplace(event.shiftKey ? -1 : 1);
	};

	useLayoutEffect(() => {
		const focus = () => findRef.current?.focus();
		focus();
		const frame = window.requestAnimationFrame(focus);
		return () => window.cancelAnimationFrame(frame);
	}, []);

	return (
		<Fill name="blockera/slots/editor-below-workspace-tabs">
			<div
				className="blockera-search-replace-panel"
				data-test={SEARCH_REPLACE_TEST_ID.panel}
			>
				<div className="blockera-search-replace-panel__row">
					<Flex
						alignItems="center"
						direction="row"
						gap={8}
						style={{ width: '100%', maxWidth: '50%' }}
					>
						<span className="blockera-search-replace-panel__label">
							{__('Find', 'blockera')}
						</span>
						<div className="blockera-search-replace-panel__field">
							<span
								className="blockera-search-replace-panel__field-icon"
								aria-hidden="true"
							>
								<Icon
									icon={'search'}
									iconSize={22}
									library={'ui'}
								/>
							</span>
							<input
								ref={findRef}
								type="text"
								className="blockera-search-replace-panel__input"
								placeholder={findPlaceholder}
								autoFocus
								value={query}
								onChange={(event) =>
									onQueryChange(event.target.value)
								}
								onKeyDown={onFindKeyDown}
								data-test={SEARCH_REPLACE_TEST_ID.findInput}
							/>
							<div className="blockera-search-replace-panel__toggles">
								<Button
									className="blockera-search-replace-panel__toggle"
									size="compact"
									type="button"
									isPressed={matchCase}
									aria-pressed={matchCase}
									label={__('Match case', 'blockera')}
									onClick={() => onMatchCase(!matchCase)}
									data-test={SEARCH_REPLACE_TEST_ID.matchCase}
								>
									<Icon
										icon={'search-match-case'}
										iconSize={22}
										library={'ui'}
									/>
								</Button>
								<Button
									className="blockera-search-replace-panel__toggle"
									size="compact"
									type="button"
									isPressed={wholeWord}
									aria-pressed={wholeWord}
									label={__('Match whole word', 'blockera')}
									onClick={() => onWholeWord(!wholeWord)}
									data-test={SEARCH_REPLACE_TEST_ID.wholeWord}
								>
									<Icon
										icon={'search-match-word'}
										iconSize={22}
										library={'ui'}
									/>
								</Button>
								<Button
									className="blockera-search-replace-panel__toggle"
									size="compact"
									type="button"
									isPressed={useRegex}
									aria-pressed={useRegex}
									label={__(
										'Use regular expression',
										'blockera'
									)}
									onClick={() => onUseRegex(!useRegex)}
									data-test={SEARCH_REPLACE_TEST_ID.useRegex}
								>
									<Icon
										icon={'search-regex'}
										iconSize={22}
										library={'ui'}
									/>
								</Button>
							</div>
						</div>
					</Flex>

					<div
						className="blockera-search-replace-panel__scope"
						data-test={SEARCH_REPLACE_TEST_ID.scope}
					>
						<span className="blockera-search-replace-panel__scope-label">
							{__('Search in:', 'blockera')}
						</span>
						<SelectControl
							hideLabelFromVision
							label={__('Search in', 'blockera')}
							__nextHasNoMarginBottom
							__next40pxDefaultSize={false}
							className="blockera-search-replace-panel__scope-select"
							value={scope}
							options={scopes.map((item) => ({
								value: item.value,
								label: item.locked
									? `${item.label} (Pro)`
									: item.label,
							}))}
							onChange={(next) => {
								const selected = scopes.find(
									(item) => item.value === next
								);
								if (selected?.locked) {
									onScopeChange('visible');
									onUpgradeClose(true);
									return;
								}
								onScopeChange(next);
							}}
						/>
					</div>

					<Flex
						alignItems="center"
						direction="row"
						gap={8}
						grow={1}
						justifyContent="flex-end"
					>
						<SearchReplaceCount
							className="blockera-search-replace-panel__count"
							data-test={SEARCH_REPLACE_TEST_ID.results}
							current={currentIndex + 1}
							total={results.length}
							query={query}
							emptyLabel={__('No results', 'blockera')}
						/>
						<Button
							className="blockera-search-replace-panel__nav"
							icon={chevronDown}
							size="compact"
							label={__('Next match', 'blockera')}
							disabled={!results.length}
							onClick={onNext}
							data-test={SEARCH_REPLACE_TEST_ID.next}
						/>
						<Button
							className="blockera-search-replace-panel__nav"
							icon={chevronUp}
							size="compact"
							label={__('Previous match', 'blockera')}
							disabled={!results.length}
							onClick={onPrev}
							data-test={SEARCH_REPLACE_TEST_ID.prev}
						/>
					</Flex>

					<Button
						className="blockera-search-replace-panel__close"
						icon={closeSmall}
						size="compact"
						label={__('Close search', 'blockera')}
						onClick={onClose}
						data-test={SEARCH_REPLACE_TEST_ID.close}
					/>
				</div>
				<div className="blockera-search-replace-panel__row">
					<Flex alignItems="center" direction="row" gap={8} grow={1}>
						<span className="blockera-search-replace-panel__label">
							{__('Replace', 'blockera')}
						</span>
						<div className="blockera-search-replace-panel__field blockera-search-replace-panel__field--replace">
							<span
								className="blockera-search-replace-panel__field-icon"
								aria-hidden="true"
							>
								<Icon
									icon={'search-replace'}
									iconSize={24}
									library={'ui'}
								/>
							</span>
							<input
								type="text"
								className="blockera-search-replace-panel__input"
								placeholder={__('Replace with…', 'blockera')}
								value={replaceValue}
								onChange={(event) =>
									onReplaceValueChange(event.target.value)
								}
								onKeyDown={onReplaceKeyDown}
								data-test={SEARCH_REPLACE_TEST_ID.replaceInput}
							/>
						</div>
					</Flex>

					<Button
						className="blockera-search-replace-panel__action"
						variant="secondary"
						size="compact"
						disabled={!canReplace}
						onClick={() => onReplace(1)}
						data-test={SEARCH_REPLACE_TEST_ID.replace}
					>
						{__('Replace', 'blockera')}
					</Button>
					<Button
						className="blockera-search-replace-panel__action"
						variant="secondary"
						size="compact"
						disabled={!canReplace}
						onClick={onReplaceAll}
						data-test={SEARCH_REPLACE_TEST_ID.replaceAll}
					>
						{__('Replace All', 'blockera')}
					</Button>
				</div>
				{upgradeOpen && (
					<UpgradePrompt
						isOpen={upgradeOpen}
						onClose={() => onUpgradeClose(false)}
						type="modal"
						lockedFeature={{
							title: __('Search in attributes', 'blockera'),
							description: __(
								'Searching block attributes and All (text + attributes) is available in Blockera Pro.',
								'blockera'
							),
						}}
					/>
				)}
			</div>
		</Fill>
	);
}
