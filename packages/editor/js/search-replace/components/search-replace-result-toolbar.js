/**
 * WordPress dependencies
 */
import {
	store as blockEditorStore,
	__unstableBlockToolbarLastItem as BlockToolbarLastItem,
} from '@wordpress/block-editor';
import { Button } from '@wordpress/components';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import { store as blocksStore } from '@wordpress/blocks';
import { useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Blockera dependencies
 */
import { Icon } from '@blockera/icons';
import { Flex } from '@blockera/controls';

/**
 * Internal dependencies
 */
import { STORE_NAME, SEARCH_REPLACE_TEST_ID } from '../store/constants';
import { searchBlocks } from '../search';
import { replaceMatchInAttributes } from '../replace';
import SearchReplaceCount from './search-replace-count';

export default function SearchReplaceResultToolbar() {
	const registry = useRegistry();
	const { setCurrentIndex, setResults } = useDispatch(STORE_NAME);
	const { updateBlockAttributes, selectBlock, stopTyping } =
		useDispatch(blockEditorStore);

	const state = useSelect((select) => {
		const sr = select(STORE_NAME);
		if (!sr || typeof sr.isOpen !== 'function' || !sr.isOpen()) {
			return null;
		}

		const selectedClientId =
			select(blockEditorStore).getSelectedBlockClientId();
		const results = sr.getResults();
		const currentIndex = sr.getCurrentIndex();
		const current = results[currentIndex];
		const matchIndex =
			current?.clientId === selectedClientId
				? currentIndex
				: results.findIndex(
						(result) => result.clientId === selectedClientId
					);
		const match = matchIndex === -1 ? null : results[matchIndex];

		if (!match) {
			return null;
		}

		return {
			match,
			replaceValue: sr.getReplaceValue(),
			results,
			selectedClientId,
			currentIndex: matchIndex,
			query: sr.getQuery(),
			matchCase: sr.getMatchCase(),
			wholeWord: sr.getWholeWord(),
			useRegex: sr.getUseRegex(),
			scope: sr.getScope(),
			blockTitle:
				select(blocksStore).getBlockType(match.blockName)?.title ||
				match.blockName,
		};
	}, []);

	const goTo = useCallback(
		(direction) => {
			if (!state?.results.length) {
				return;
			}
			const nextIndex =
				(state.currentIndex + direction + state.results.length) %
				state.results.length;
			const match = state.results[nextIndex];
			setCurrentIndex(nextIndex);
			if (match?.clientId) {
				selectBlock(match.clientId, null);
				stopTyping(true);
			}
		},
		[state, setCurrentIndex, selectBlock, stopTyping]
	);

	const replaceCurrent = useCallback(() => {
		if (!state?.match) {
			return;
		}

		const block = registry
			.select(blockEditorStore)
			.getBlock(state.match.clientId);

		if (!block) {
			return;
		}

		const nextAttributes = replaceMatchInAttributes(
			block.attributes,
			state.match,
			state.replaceValue,
			{
				query: state.query,
				matchCase: state.matchCase,
				wholeWord: state.wholeWord,
				useRegex: state.useRegex,
			}
		);
		const rootKey = state.match.loc?.[0];
		updateBlockAttributes(
			state.match.clientId,
			rootKey ? { [rootKey]: nextAttributes[rootKey] } : nextAttributes
		);

		const nextResults = searchBlocks(
			registry.select(blockEditorStore).getBlocks(),
			{
				query: state.query,
				matchCase: state.matchCase,
				wholeWord: state.wholeWord,
				useRegex: state.useRegex,
				scope: state.scope,
				getBlockType: registry.select(blocksStore).getBlockType,
			}
		);
		const nextIndex = nextResults.length
			? state.currentIndex >= nextResults.length
				? 0
				: state.currentIndex
			: 0;
		setResults(nextResults, nextIndex);

		const nextMatch = nextResults[nextIndex];
		if (nextMatch?.clientId) {
			selectBlock(nextMatch.clientId, null);
			stopTyping(true);
		}
	}, [state, registry, updateBlockAttributes, setResults, selectBlock, stopTyping]);

	if (!state?.match) {
		return null;
	}

	const { match, replaceValue, results, currentIndex, blockTitle } = state;
	const hasReplace = replaceValue !== '';
	const isAttribute = match.kind === 'attribute';

	return (
		<BlockToolbarLastItem>
			<div
				className="blockera-search-replace-toolbar"
				data-test={SEARCH_REPLACE_TEST_ID.resultToolbar}
			>
				<div className="blockera-search-replace-toolbar__body">
					<strong>{__('Search:', 'blockera')}</strong>

					{isAttribute && (
						<>
							<span className="blockera-search-replace-toolbar__pill">
								{blockTitle}
								<span aria-hidden="true"> → </span>
								{match.identifier}
							</span>
							<span aria-hidden="true">:</span>
						</>
					)}

					<mark className="blockera-search-replace-toolbar__match">
						{match.matchText}
					</mark>

					{hasReplace && (
						<>
							<span aria-hidden="true">→</span>
							<mark className="blockera-search-replace-toolbar__replace">
								{replaceValue}
							</mark>
						</>
					)}
				</div>
				{hasReplace && (
					<div className="blockera-search-replace-toolbar__replace-wrap">
						<Button
							className="blockera-search-replace-toolbar__replace-button"
							variant="secondary"
							size="compact"
							onClick={replaceCurrent}
							data-test={SEARCH_REPLACE_TEST_ID.toolbarReplace}
						>
							{__('Replace', 'blockera')}
						</Button>
					</div>
				)}
				<div className="blockera-search-replace-toolbar__nav">
					<SearchReplaceCount
						className="blockera-search-replace-toolbar__count"
						current={currentIndex + 1}
						total={results.length}
					/>
					<Flex direction="row" gap={8}>
						<Button
							className="blockera-search-replace-toolbar__nav-button"
							icon={
								<Icon
									icon={'chevron-down'}
									library="wp"
									iconSize={24}
								/>
							}
							size="compact"
							label={__('Next match', 'blockera')}
							onClick={() => goTo(1)}
							data-test={SEARCH_REPLACE_TEST_ID.toolbarNext}
						/>
						<Button
							className="blockera-search-replace-toolbar__nav-button"
							icon={
								<Icon
									icon={'chevron-up'}
									library="wp"
									iconSize={24}
								/>
							}
							size="compact"
							label={__('Previous match', 'blockera')}
							onClick={() => goTo(-1)}
							data-test={SEARCH_REPLACE_TEST_ID.toolbarPrev}
						/>
					</Flex>
				</div>
			</div>
		</BlockToolbarLastItem>
	);
}
