import {
	appendBlocks,
	createPost,
	getWPDataObject,
} from '@blockera/dev-cypress/js/helpers';

const FIND = 'blockera-search-replace-find-input';
const REPLACE = 'blockera-search-replace-replace-input';
const PANEL = 'blockera-search-replace-panel';
const HEADER = 'blockera-search-replace-header-button';
const RESULTS = 'blockera-search-replace-results';
const TOOLBAR = 'blockera-search-replace-result-toolbar';
const CURRENT_MARK = '.annotation-text-blockera-search-replace-current';
const OTHER_MARK = '.annotation-text-blockera-search-replace';

function openSearch() {
	cy.getByDataTest(HEADER, { timeout: 30000 }).click();
	cy.getByDataTest(PANEL).should('be.visible');
	cy.getByDataTest(FIND).should('be.focused');
}

function typeFind(value) {
	cy.getByDataTest(FIND).clear().type(value, { delay: 0 });
}

function setToggle(testId, pressed) {
	cy.getByDataTest(testId).then(($button) => {
		const isPressed = $button.attr('aria-pressed') === 'true';
		if (isPressed !== pressed) {
			cy.wrap($button).click();
		}
	});
	cy.getByDataTest(testId).should(
		'have.attr',
		'aria-pressed',
		String(pressed)
	);
}

function documentText() {
	return getWPDataObject().then((data) => {
		const blocks = data.select('core/block-editor').getBlocks();
		return blocks.map(blockText).join(' ');
	});
}

function blockText(block) {
	const content = block?.attributes?.content;
	return content?.text || String(content || '');
}

function expectSelectedText(fragment) {
	getWPDataObject().then((data) => {
		const selected = data.select('core/block-editor').getSelectedBlock();
		expect(blockText(selected)).to.contain(fragment);
	});
}

function canvasDocument() {
	return cy.get('body').then(($body) => {
		const iframe = $body.find(
			'iframe[name="editor-canvas"], iframe.editor-canvas__iframe'
		)[0];
		if (iframe?.contentDocument?.body) {
			return cy.wrap(iframe.contentDocument);
		}
		return cy.wrap(Cypress.$(document)[0]);
	});
}

function canvasMarks(selector) {
	return canvasDocument().then((doc) =>
		cy.wrap(doc.querySelectorAll(selector))
	);
}

function clickCanvasMark(selector, index = 0) {
	canvasDocument().then((doc) => {
		const marks = doc.querySelectorAll(selector);
		expect(marks.length).to.be.greaterThan(index);
		marks[index].dispatchEvent(
			new MouseEvent('click', { bubbles: true, cancelable: true })
		);
	});
}

describe('Search and replace', () => {
	beforeEach(() => {
		createPost();
	});

	it('opens from the header button and closes from X and Escape', () => {
		openSearch();
		cy.getByDataTest('blockera-search-replace-close').click();
		cy.getByDataTest(PANEL).should('not.exist');

		openSearch();
		cy.get('body').type('{esc}');
		cy.getByDataTest(PANEL).should('not.exist');
	});

	it('keeps match toggles inside the find field and has no native clear control', () => {
		openSearch();

		cy.getByDataTest(FIND).should('have.attr', 'type', 'text');
		cy.getByDataTest(FIND)
			.closest('.blockera-search-replace-panel__field')
			.as('findField');
		cy.get('@findField')
			.find('[data-test="blockera-search-replace-match-case"]')
			.should('exist');
		cy.get('@findField')
			.find('[data-test="blockera-search-replace-whole-word"]')
			.should('exist');
		cy.get('@findField')
			.find('[data-test="blockera-search-replace-use-regex"]')
			.should('exist');

		cy.getByDataTest(PANEL)
			.find('[data-test="blockera-search-replace-next"]')
			.parent()
			.find('button')
			.then(($buttons) => {
				const tests = [...$buttons].map((el) =>
					el.getAttribute('data-test')
				);
				expect(tests.indexOf('blockera-search-replace-next')).to.be.lessThan(
					tests.indexOf('blockera-search-replace-prev')
				);
			});
	});

	it('opens from the find keyboard shortcut and focuses the find field', () => {
		cy.getByDataTest(HEADER, { timeout: 30000 }).should('be.visible');

		cy.window().then((win) => {
			const isMac = Cypress.platform === 'darwin';
			win.document.dispatchEvent(
				new win.KeyboardEvent('keydown', {
					key: 'f',
					code: 'KeyF',
					bubbles: true,
					cancelable: true,
					metaKey: isMac,
					ctrlKey: !isMac,
				})
			);
		});

		cy.getByDataTest(PANEL).should('be.visible');
		cy.getByDataTest(FIND).should('be.focused');

		cy.getByDataTest(FIND).blur();
		cy.window().then((win) => {
			const isMac = Cypress.platform === 'darwin';
			win.document.dispatchEvent(
				new win.KeyboardEvent('keydown', {
					key: 'f',
					code: 'KeyF',
					bubbles: true,
					cancelable: true,
					metaKey: isMac,
					ctrlKey: !isMac,
				})
			);
		});
		cy.getByDataTest(FIND).should('be.focused');
	});

	it('finds visible text live, selects the first match, and shows the result toolbar', () => {
		appendBlocks(`<!-- wp:paragraph -->
<p>alpha keyword one</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>alpha keyword two</p>
<!-- /wp:paragraph -->`);

		openSearch();
		cy.getByDataTest(RESULTS)
			.should('contain', 'No results')
			.and('not.have.class', 'blockera-search-replace-count--empty');
		cy.getByDataTest('blockera-search-replace-replace').should(
			'be.disabled'
		);

		typeFind('keyword');
		cy.getByDataTest(RESULTS).should('contain', '1 of 2');
		expectSelectedText('keyword one');

		cy.getByDataTest(TOOLBAR).should('be.visible').and('contain', 'Search:');
		cy.getByDataTest(TOOLBAR).should('contain', 'keyword');
		cy.get('body').should(
			'have.class',
			'blockera-search-replace-match-toolbar'
		);
		cy.getByDataTest('blockera-search-replace-toolbar-next').should(
			'have.attr',
			'aria-label',
			'Next match'
		);
		cy.getByDataTest('blockera-search-replace-toolbar-prev').should(
			'have.attr',
			'aria-label',
			'Previous match'
		);
		cy.getByDataTest('blockera-search-replace-next').should(
			'have.attr',
			'aria-label',
			'Next match'
		);
	});

	it('navigates matches from the panel and toolbar', () => {
		appendBlocks(`<!-- wp:paragraph -->
<p>alpha keyword one</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>alpha keyword two</p>
<!-- /wp:paragraph -->`);

		openSearch();
		typeFind('keyword');
		cy.getByDataTest(RESULTS).should('contain', '1 of 2');

		cy.getByDataTest('blockera-search-replace-next').click();
		cy.getByDataTest(RESULTS).should('contain', '2 of 2');
		expectSelectedText('keyword two');

		cy.getByDataTest('blockera-search-replace-prev').click();
		cy.getByDataTest(RESULTS).should('contain', '1 of 2');
		expectSelectedText('keyword one');

		cy.getByDataTest('blockera-search-replace-toolbar-next').click();
		cy.getByDataTest(RESULTS).should('contain', '2 of 2');
		expectSelectedText('keyword two');
	});

	it('marks the current canvas highlight darker and switches current on click', () => {
		appendBlocks(`<!-- wp:paragraph -->
<p>keyword alpha keyword beta</p>
<!-- /wp:paragraph -->`);

		openSearch();
		typeFind('keyword');
		cy.getByDataTest(RESULTS).should('contain', '1 of 2');

		canvasMarks(CURRENT_MARK).should('have.length', 1);
		canvasMarks(OTHER_MARK).should('have.length', 1);

		clickCanvasMark(OTHER_MARK);
		cy.getByDataTest(RESULTS).should('contain', '2 of 2');
		cy.getByDataTest(TOOLBAR).should('contain', 'keyword');
		canvasMarks(CURRENT_MARK).should('have.length', 1);
	});

	it('navigates from the find field with Enter and Shift+Enter', () => {
		appendBlocks(`<!-- wp:paragraph -->
<p>alpha keyword one</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>alpha keyword two</p>
<!-- /wp:paragraph -->`);

		openSearch();
		typeFind('keyword');
		cy.getByDataTest(RESULTS).should('contain', '1 of 2');

		cy.getByDataTest(FIND).type('{enter}');
		cy.getByDataTest(RESULTS).should('contain', '2 of 2');
		expectSelectedText('keyword two');

		cy.getByDataTest(FIND).type('{shift}{enter}');
		cy.getByDataTest(RESULTS).should('contain', '1 of 2');
		expectSelectedText('keyword one');
	});

	it('replaces from the replace field with Enter and Shift+Enter', () => {
		appendBlocks(`<!-- wp:paragraph -->
<p>alpha keyword one</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>alpha keyword two</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>alpha keyword three</p>
<!-- /wp:paragraph -->`);

		openSearch();
		typeFind('keyword');
		cy.getByDataTest(RESULTS).should('contain', '1 of 3');
		cy.getByDataTest(FIND).type('{enter}');
		cy.getByDataTest(RESULTS).should('contain', '2 of 3');
		expectSelectedText('keyword two');

		cy.getByDataTest(REPLACE).type('gone', { delay: 0 });
		cy.getByDataTest(REPLACE).type('{shift}{enter}');

		cy.getByDataTest(RESULTS).should('contain', '1 of 2');
		expectSelectedText('keyword one');
	});

	it('replaces from the find bar and then moves to the next match', () => {
		appendBlocks(`<!-- wp:paragraph -->
<p>alpha keyword one</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>alpha keyword two</p>
<!-- /wp:paragraph -->`);

		openSearch();
		typeFind('keyword');
		cy.getByDataTest(REPLACE).type('term', { delay: 0 });
		cy.getByDataTest('blockera-search-replace-replace').should(
			'not.be.disabled'
		);
		cy.getByDataTest('blockera-search-replace-replace').click();

		cy.getByDataTest(RESULTS).should('contain', '1 of 1');
		expectSelectedText('keyword two');

		getWPDataObject().then((data) => {
			const blocks = data.select('core/block-editor').getBlocks();
			const text = blocks.map(blockText).join(' ');
			expect(text).to.contain('term one');
			expect(text).to.contain('keyword two');
		});
	});

	it('replaces from the result toolbar and then moves to the next match', () => {
		appendBlocks(`<!-- wp:paragraph -->
<p>alpha keyword one</p>
<!-- /wp:paragraph -->
<!-- wp:paragraph -->
<p>alpha keyword two</p>
<!-- /wp:paragraph -->`);

		openSearch();
		typeFind('keyword');
		cy.getByDataTest(REPLACE).type('term', { delay: 0 });
		cy.getByDataTest(TOOLBAR).should('be.visible');
		cy.getByDataTest('blockera-search-replace-toolbar-replace').click();

		cy.getByDataTest(RESULTS).should('contain', '1 of 1');
		expectSelectedText('keyword two');
	});

	it('replace all updates every visible match', () => {
		appendBlocks(`<!-- wp:heading -->
<h2 class="wp-block-heading">shared word</h2>
<!-- /wp:heading -->
<!-- wp:paragraph -->
<p>shared word again</p>
<!-- /wp:paragraph -->`);

		openSearch();
		typeFind('shared word');
		cy.getByDataTest(RESULTS).should('contain', '1 of 2');
		cy.getByDataTest(REPLACE).type('updated phrase', { delay: 0 });
		cy.getByDataTest('blockera-search-replace-replace-all').click();
		cy.getByDataTest(RESULTS).should('contain', 'No results');

		getWPDataObject().then((data) => {
			const blocks = data.select('core/block-editor').getBlocks();
			const text = blocks.map(blockText).join(' ');
			expect(text).to.contain('updated phrase');
			expect(text).not.to.contain('shared word');
		});
	});

	it('match case finds and replaces only exact case', () => {
		appendBlocks(`<!-- wp:paragraph -->
<p>Hello hello HELLO</p>
<!-- /wp:paragraph -->`);

		openSearch();
		typeFind('Hello');
		cy.getByDataTest(RESULTS).should('contain', '1 of 3');

		setToggle('blockera-search-replace-match-case', true);
		cy.getByDataTest(RESULTS).should('contain', '1 of 1');
		expectSelectedText('Hello hello HELLO');

		cy.getByDataTest(REPLACE).type('Hi', { delay: 0 });
		cy.getByDataTest('blockera-search-replace-replace-all').click();
		cy.getByDataTest(RESULTS).should('contain', 'No results');

		documentText().then((text) => {
			expect(text).to.contain('Hi hello HELLO');
			expect(text).not.to.contain('Hello hello');
		});
	});

	it('whole word finds and replaces only full words', () => {
		appendBlocks(`<!-- wp:paragraph -->
<p>cat catapult cat</p>
<!-- /wp:paragraph -->`);

		openSearch();
		typeFind('cat');
		cy.getByDataTest(RESULTS).should('contain', '1 of 3');

		setToggle('blockera-search-replace-whole-word', true);
		cy.getByDataTest(RESULTS).should('contain', '1 of 2');

		cy.getByDataTest(REPLACE).type('feline', { delay: 0 });
		cy.getByDataTest('blockera-search-replace-replace-all').click();
		cy.getByDataTest(RESULTS).should('contain', 'No results');

		documentText().then((text) => {
			expect(text).to.contain('feline catapult feline');
			expect(text).not.to.contain('cat catapult');
		});
	});

	it('regex finds matches, shows an example placeholder, and replace uses capture groups', () => {
		appendBlocks(`<!-- wp:paragraph -->
<p>item 1 and item 22</p>
<!-- /wp:paragraph -->`);

		openSearch();
		setToggle('blockera-search-replace-use-regex', true);
		cy.getByDataTest(FIND).should(
			'have.attr',
			'placeholder',
			'e.g. \\$\\d+ — prices like $19'
		);

		typeFind('item (\\d+)');
		cy.getByDataTest(RESULTS).should('contain', '1 of 2');

		cy.getByDataTest(REPLACE).type('entry $1', { delay: 0 });
		cy.getByDataTest('blockera-search-replace-replace').click();
		cy.getByDataTest(RESULTS).should('contain', '1 of 1');

		documentText().then((text) => {
			expect(text).to.contain('entry 1 and item 22');
		});

		cy.getByDataTest('blockera-search-replace-replace-all').click();
		cy.getByDataTest(RESULTS).should('contain', 'No results');

		documentText().then((text) => {
			expect(text).to.contain('entry 1 and entry 22');
		});
	});

	it('regex with match case and whole word together', () => {
		appendBlocks(`<!-- wp:paragraph -->
<p>Cat cat CAT catapult</p>
<!-- /wp:paragraph -->`);

		openSearch();
		setToggle('blockera-search-replace-use-regex', true);
		setToggle('blockera-search-replace-match-case', true);
		setToggle('blockera-search-replace-whole-word', true);
		typeFind('Ca[t]');
		cy.getByDataTest(RESULTS).should('contain', '1 of 1');

		cy.getByDataTest(REPLACE).type('Kitten', { delay: 0 });
		cy.getByDataTest('blockera-search-replace-replace-all').click();
		cy.getByDataTest(RESULTS).should('contain', 'No results');

		documentText().then((text) => {
			expect(text).to.contain('Kitten cat CAT catapult');
		});
	});

	it('invalid regex shows no results', () => {
		appendBlocks(`<!-- wp:paragraph -->
<p>Cat catapult cat</p>
<!-- /wp:paragraph -->`);

		openSearch();
		setToggle('blockera-search-replace-use-regex', true);
		typeFind('(unclosed');
		cy.getByDataTest(RESULTS)
			.should('contain', 'No results')
			.and('have.class', 'blockera-search-replace-count--empty');
	});

	it('keeps Attributes and All locked in free and does not search image alt', () => {
		appendBlocks(`<!-- wp:image {"alt":"secret-alt-text","url":"https://example.com/p.png"} -->
<figure class="wp-block-image"><img alt="secret-alt-text" src="https://example.com/p.png"/></figure>
<!-- /wp:image -->
<!-- wp:paragraph -->
<p>visible copy</p>
<!-- /wp:paragraph -->`);

		openSearch();
		cy.getByDataTest('blockera-search-replace-scope').should(
			'contain',
			'Search in:'
		);
		cy.getByDataTest('blockera-search-replace-scope').should(
			'contain',
			'Pro'
		);

		typeFind('secret-alt-text');
		cy.getByDataTest(RESULTS).should('contain', 'No results');

		cy.getByDataTest('blockera-search-replace-scope')
			.find('select')
			.select('attributes');

		cy.get('.blockera-component-upgrade-prompt', {
			timeout: 10000,
		}).should('exist');
	});
});
