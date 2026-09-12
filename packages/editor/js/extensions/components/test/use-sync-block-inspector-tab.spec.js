import {
	blockInspectorTabPersistence,
	getInspectorTabActivationPlan,
} from '../use-sync-block-inspector-tab';

function createInspector({ tabs, selected }) {
	const inspector = document.createElement('div');
	inspector.className = 'block-editor-block-inspector';
	const tabsRoot = document.createElement('div');
	tabsRoot.className = 'block-editor-block-inspector__tabs';

	tabs.forEach((name) => {
		const tab = document.createElement('button');
		tab.setAttribute('role', 'tab');
		tab.setAttribute('data-tab-id', name);
		tab.setAttribute('aria-selected', name === selected ? 'true' : 'false');
		tabsRoot.appendChild(tab);
	});

	inspector.appendChild(tabsRoot);
	document.body.appendChild(inspector);

	return inspector;
}

describe('getInspectorTabActivationPlan', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('defaults to Styles on first open when WP also has a Content tab', () => {
		const inspector = createInspector({
			tabs: ['settings', 'styles', 'content'],
			selected: 'settings',
		});

		expect(
			getInspectorTabActivationPlan({
				persistenceKey: 'core/accordion-heading::',
				inspector,
				isInnerBlock: false,
				isFirstBlockTypeSelection: true,
				allowMultiTabDomRead: true,
			})
		).toEqual({
			tab: 'styles',
			syncWordPress: true,
			mode: 'two-tab-default',
		});
	});

	it('follows the WP tab when re-selecting a multi-tab block with no persist', () => {
		const inspector = createInspector({
			tabs: ['settings', 'styles', 'content'],
			selected: 'content',
		});

		expect(
			getInspectorTabActivationPlan({
				persistenceKey: 'core/accordion-heading::reselect',
				inspector,
				isInnerBlock: false,
				isFirstBlockTypeSelection: false,
				allowMultiTabDomRead: true,
			})
		).toEqual({
			tab: 'content',
			syncWordPress: false,
			mode: 'wordpress-default',
		});
	});

	it('restores a persisted tab before reading the WP default', () => {
		blockInspectorTabPersistence.setByKey(
			'core/accordion-heading::saved',
			'setting'
		);

		const inspector = createInspector({
			tabs: ['settings', 'styles', 'content'],
			selected: 'styles',
		});

		expect(
			getInspectorTabActivationPlan({
				persistenceKey: 'core/accordion-heading::saved',
				inspector,
				isInnerBlock: false,
				isFirstBlockTypeSelection: true,
				allowMultiTabDomRead: true,
			})
		).toEqual({
			tab: 'setting',
			syncWordPress: true,
			mode: 'persisted',
		});
	});
});
