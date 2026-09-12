const DEFAULT_STATE = {
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
};

export default function reducer(state = DEFAULT_STATE, action = {}) {
	switch (action.type) {
		case 'OPEN_PANEL':
			return { ...state, isOpen: true };
		case 'CLOSE_PANEL':
			return {
				...DEFAULT_STATE,
			};
		case 'SET_QUERY':
			return { ...state, query: action.query };
		case 'SET_REPLACE_VALUE':
			return { ...state, replaceValue: action.replaceValue };
		case 'SET_MATCH_CASE':
			return { ...state, matchCase: !!action.matchCase };
		case 'SET_WHOLE_WORD':
			return { ...state, wholeWord: !!action.wholeWord };
		case 'SET_USE_REGEX':
			return { ...state, useRegex: !!action.useRegex };
		case 'SET_SCOPE':
			return { ...state, scope: action.scope };
		case 'SET_RESULTS':
			return {
				...state,
				results: action.results || [],
				currentIndex: action.currentIndex || 0,
			};
		case 'SET_CURRENT_INDEX':
			return { ...state, currentIndex: action.currentIndex };
		case 'SET_UPGRADE_OPEN':
			return { ...state, upgradeOpen: !!action.upgradeOpen };
		default:
			return state;
	}
}
