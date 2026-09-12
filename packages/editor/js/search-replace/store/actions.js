export function openPanel() {
	return { type: 'OPEN_PANEL' };
}

export function closePanel() {
	return { type: 'CLOSE_PANEL' };
}

export function setQuery(query) {
	return { type: 'SET_QUERY', query };
}

export function setReplaceValue(replaceValue) {
	return { type: 'SET_REPLACE_VALUE', replaceValue };
}

export function setMatchCase(matchCase) {
	return { type: 'SET_MATCH_CASE', matchCase };
}

export function setWholeWord(wholeWord) {
	return { type: 'SET_WHOLE_WORD', wholeWord };
}

export function setUseRegex(useRegex) {
	return { type: 'SET_USE_REGEX', useRegex };
}

export function setScope(scope) {
	return { type: 'SET_SCOPE', scope };
}

export function setResults(results, currentIndex = 0) {
	return { type: 'SET_RESULTS', results, currentIndex };
}

export function setCurrentIndex(currentIndex) {
	return { type: 'SET_CURRENT_INDEX', currentIndex };
}

export function setUpgradeOpen(upgradeOpen) {
	return { type: 'SET_UPGRADE_OPEN', upgradeOpen };
}
