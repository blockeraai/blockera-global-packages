import { useCallback, useEffect, useRef } from '@wordpress/element';
import { useDispatch, useRegistry, useSelect } from '@wordpress/data';
import { store as blockEditorStore } from '@wordpress/block-editor';
import { store as blocksStore } from '@wordpress/blocks';
import { STORE_NAME } from '../store/constants';
import { searchBlocks } from '../search';
import {
	replaceAllInAttributes,
	replaceMatchInAttributes,
} from '../replace';
import { getBlockSearchSpec, getPathsForScope } from '../get-block-search-spec';
import {
	applySearchHighlights,
	clearSearchHighlights,
	getClickedMatchIndex,
	getCanvasDocuments,
} from '../highlights';
import { flattenBlocks } from '../flatten-blocks';

const SEARCH_DEBOUNCE_MS = 150;

export function useSearchReplaceController() {
	const registry = useRegistry();
	const {
		openPanel,
		closePanel,
		setQuery,
		setReplaceValue,
		setMatchCase,
		setWholeWord,
		setUseRegex,
		setScope,
		setResults,
		setCurrentIndex,
		setUpgradeOpen,
	} = useDispatch(STORE_NAME);
	const { selectBlock, updateBlockAttributes, stopTyping } =
		useDispatch(blockEditorStore);

	const {
		isOpen,
		query,
		replaceValue,
		matchCase,
		wholeWord,
		useRegex,
		scope,
		results,
		currentIndex,
		upgradeOpen,
		selectedClientId,
	} = useSelect((select) => {
		const sr = select(STORE_NAME);
		const blockEditor = select(blockEditorStore);
		const empty = {
			isOpen: false,
			query: '',
			replaceValue: '',
			matchCase: false,
			wholeWord: false,
			useRegex: false,
			scope: 'visible',
			results: [],
			currentIndex: 0,
			upgradeOpen: false,
			selectedClientId: null,
		};

		if (!sr || typeof sr.isOpen !== 'function') {
			return empty;
		}

		const panelOpen = sr.isOpen();

		return {
			isOpen: panelOpen,
			query: sr.getQuery(),
			replaceValue: sr.getReplaceValue(),
			matchCase: sr.getMatchCase(),
			wholeWord: sr.getWholeWord(),
			useRegex: sr.getUseRegex(),
			scope: sr.getScope(),
			results: sr.getResults(),
			currentIndex: sr.getCurrentIndex(),
			upgradeOpen: sr.isUpgradeOpen(),
			selectedClientId: panelOpen
				? blockEditor.getSelectedBlockClientId()
				: null,
		};
	}, []);

	const currentMatch = results[currentIndex] || null;

	const runSearch = useCallback(() => {
		if (!isOpen || !query) {
			setResults([], 0);
			clearSearchHighlights();
			return;
		}

		const getBlockType = registry.select(blocksStore).getBlockType;
		const nextBlocks = registry.select(blockEditorStore).getBlocks();
		const nextResults = searchBlocks(nextBlocks, {
			query,
			matchCase,
			wholeWord,
			useRegex,
			scope,
			getBlockType,
		});
		setResults(nextResults, 0);

		const firstMatch = nextResults[0];
		const selected = registry
			.select(blockEditorStore)
			.getSelectedBlockClientId();
		if (firstMatch?.clientId && firstMatch.clientId !== selected) {
			selectBlock(firstMatch.clientId, null);
			stopTyping(true);
		}
	}, [
		isOpen,
		query,
		matchCase,
		wholeWord,
		useRegex,
		scope,
		setResults,
		registry,
		selectBlock,
		stopTyping,
	]);

	const selectedClientIdRef = useRef(selectedClientId);
	const debounceRef = useRef(0);

	useEffect(() => {
		if (!isOpen) {
			clearSearchHighlights();
			return;
		}

		window.clearTimeout(debounceRef.current);
		debounceRef.current = window.setTimeout(runSearch, SEARCH_DEBOUNCE_MS);

		return () => window.clearTimeout(debounceRef.current);
	}, [isOpen, runSearch]);

	useEffect(() => {
		if (!isOpen) {
			document.body.classList.remove('blockera-search-replace-active');
			document.body.classList.remove(
				'blockera-search-replace-match-toolbar'
			);
			clearSearchHighlights();
			return;
		}

		document.body.classList.add('blockera-search-replace-active');
		applySearchHighlights(results, currentIndex);

		return () => {
			document.body.classList.remove('blockera-search-replace-active');
		};
	}, [isOpen, results, currentIndex]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const onClick = (event) => {
			const index = getClickedMatchIndex(event);
			if (index < 0 || !results[index]) {
				return;
			}

			event.preventDefault();
			setCurrentIndex(index);
			if (results[index].clientId) {
				selectBlock(results[index].clientId, null);
				stopTyping(true);
			}
		};

		const docs = getCanvasDocuments();
		docs.forEach((doc) => {
			doc.addEventListener('click', onClick, true);
		});

		return () => {
			docs.forEach((doc) => {
				doc.removeEventListener('click', onClick, true);
			});
		};
	}, [isOpen, results, setCurrentIndex, selectBlock, stopTyping]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const matchIndex = selectedClientId
			? results.findIndex((result) => result.clientId === selectedClientId)
			: -1;
		const hasMatchOnSelected = matchIndex !== -1;
		const selectionChanged =
			selectedClientIdRef.current !== selectedClientId;
		selectedClientIdRef.current = selectedClientId;

		document.body.classList.toggle(
			'blockera-search-replace-match-toolbar',
			hasMatchOnSelected
		);

		if (
			selectionChanged &&
			hasMatchOnSelected &&
			results[currentIndex]?.clientId !== selectedClientId
		) {
			setCurrentIndex(matchIndex);
		}
	}, [
		isOpen,
		selectedClientId,
		results,
		currentIndex,
		setCurrentIndex,
	]);

	const goTo = useCallback(
		(direction) => {
			if (!results.length) {
				return;
			}
			const nextIndex =
				(currentIndex + direction + results.length) % results.length;
			const match = results[nextIndex];
			setCurrentIndex(nextIndex);
			if (match?.clientId) {
				selectBlock(match.clientId, null);
				stopTyping(true);
			}
		},
		[results, currentIndex, setCurrentIndex, selectBlock, stopTyping]
	);

	const replaceCurrent = useCallback(
		(direction = 1) => {
			if (!currentMatch) {
				return;
			}

			const block = registry
				.select(blockEditorStore)
				.getBlock(currentMatch.clientId);

			if (!block) {
				return;
			}

			const nextAttributes = replaceMatchInAttributes(
				block.attributes,
				currentMatch,
				replaceValue,
				{
					query,
					matchCase,
					wholeWord,
					useRegex,
				}
			);
			const rootKey = currentMatch.loc?.[0];
			updateBlockAttributes(
				currentMatch.clientId,
				rootKey
					? { [rootKey]: nextAttributes[rootKey] }
					: nextAttributes
			);

			const getBlockType = registry.select(blocksStore).getBlockType;
			const searchOptions = {
				query,
				matchCase,
				wholeWord,
				useRegex,
				scope,
				getBlockType,
			};
			const nextBlocks = registry.select(blockEditorStore).getBlocks();
			const nextResults = searchBlocks(nextBlocks, searchOptions);
			let nextIndex = 0;
			if (nextResults.length) {
				if (direction < 0) {
					nextIndex =
						currentIndex <= 0
							? nextResults.length - 1
							: currentIndex - 1;
				} else {
					nextIndex =
						currentIndex >= nextResults.length ? 0 : currentIndex;
				}
			}
			setResults(nextResults, nextIndex);

			const nextMatch = nextResults[nextIndex];
			if (nextMatch?.clientId) {
				selectBlock(nextMatch.clientId, null);
				stopTyping(true);
			}
		},
		[
			currentMatch,
			registry,
			replaceValue,
			updateBlockAttributes,
			query,
			matchCase,
			wholeWord,
			useRegex,
			scope,
			currentIndex,
			setResults,
			selectBlock,
			stopTyping,
		]
	);

	const replaceAll = useCallback(() => {
		if (!query || !results.length) {
			return;
		}

		const getBlockType = registry.select(blocksStore).getBlockType;
		const searchOptions = {
			query,
			matchCase,
			wholeWord,
			useRegex,
			scope,
			getBlockType,
		};

		registry.batch(() => {
			const all = flattenBlocks(
				registry.select(blockEditorStore).getBlocks()
			);

			for (const block of all) {
				const spec = getBlockSearchSpec(
					block.name,
					getBlockType(block.name)
				);
				const paths = getPathsForScope(spec, scope).map(
					({ path }) => path
				);
				if (!paths.length) {
					continue;
				}

				const nextAttributes = replaceAllInAttributes(
					block.attributes,
					paths,
					searchOptions,
					replaceValue
				);

				const changed = {};
				for (const path of paths) {
					const key = path.split('.')[0].replace(/\[\]/g, '');
					if (nextAttributes[key] !== block.attributes[key]) {
						changed[key] = nextAttributes[key];
					}
				}

				if (Object.keys(changed).length) {
					updateBlockAttributes(block.clientId, changed);
				}
			}
		});

		const nextBlocks = registry.select(blockEditorStore).getBlocks();
		setResults(searchBlocks(nextBlocks, searchOptions), 0);
	}, [
		query,
		results.length,
		registry,
		scope,
		matchCase,
		wholeWord,
		useRegex,
		replaceValue,
		updateBlockAttributes,
		setResults,
	]);

	const close = useCallback(() => {
		clearSearchHighlights();
		document.body.classList.remove('blockera-search-replace-active');
		document.body.classList.remove('blockera-search-replace-match-toolbar');
		closePanel();
	}, [closePanel]);

	return {
		isOpen,
		query,
		replaceValue,
		matchCase,
		wholeWord,
		useRegex,
		scope,
		results,
		currentIndex,
		currentMatch,
		upgradeOpen,
		openPanel,
		close,
		setQuery,
		setReplaceValue,
		setMatchCase,
		setWholeWord,
		setUseRegex,
		setScope,
		setUpgradeOpen,
		goTo,
		replaceCurrent,
		replaceAll,
	};
}
