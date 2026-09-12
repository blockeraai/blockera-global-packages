export function isOpen(state) {
	return state.isOpen;
}

export function getQuery(state) {
	return state.query;
}

export function getReplaceValue(state) {
	return state.replaceValue;
}

export function getMatchCase(state) {
	return state.matchCase;
}

export function getWholeWord(state) {
	return state.wholeWord;
}

export function getUseRegex(state) {
	return state.useRegex;
}

export function getScope(state) {
	return state.scope;
}

export function getResults(state) {
	return state.results;
}

export function getCurrentIndex(state) {
	return state.currentIndex;
}

export function getCurrentMatch(state) {
	return state.results[state.currentIndex] || null;
}

export function isUpgradeOpen(state) {
	return state.upgradeOpen;
}
