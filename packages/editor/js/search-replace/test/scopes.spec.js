import { getSearchReplaceScopes } from '../scopes';

describe('search-replace scopes', () => {
	it('locks attributes and all by default', () => {
		const scopes = getSearchReplaceScopes();
		expect(scopes.find((item) => item.value === 'visible').locked).toBe(
			false
		);
		expect(scopes.find((item) => item.value === 'attributes').locked).toBe(
			true
		);
		expect(scopes.find((item) => item.value === 'all').locked).toBe(true);
	});
});
