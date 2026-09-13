/**
 * Internal dependencies
 */
import {
	applyInserterCategoryPanelClass,
	clearInserterCategoryPanelClass,
	observeInserterCategoryPanelClass,
} from '../inserter-category-panel-class';
import { syncSlideHostOpenClass } from '../slide-host-open-class';

describe('syncSlideHostOpenClass', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('toggles is-open on the slide host', () => {
		document.body.innerHTML = `
			<div class="interface-interface-skeleton__primary-sidebar-blockera"></div>
		`;
		const host = document.querySelector(
			'.interface-interface-skeleton__primary-sidebar-blockera'
		);

		syncSlideHostOpenClass(host, true);
		expect(host.classList.contains('is-open')).toBe(true);

		syncSlideHostOpenClass(host, false);
		expect(host.classList.contains('is-open')).toBe(false);
	});
});

describe('applyInserterCategoryPanelClass', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('mirrors show-panel onto the dock, content, and slide host', () => {
		document.body.innerHTML = `
			<div class="interface-interface-skeleton__secondary-sidebar-blockera">
				<div class="blockera-secondary-sidebar-content">
					<div class="blockera-sidebar-dock">
						<div class="block-editor-inserter__menu show-panel"></div>
					</div>
				</div>
			</div>
		`;
		const dock = document.querySelector('.blockera-sidebar-dock');

		expect(applyInserterCategoryPanelClass(dock)).toBe(true);
		expect(dock.classList.contains('has-inserter-category-panel')).toBe(
			true
		);
		expect(
			document
				.querySelector('.blockera-secondary-sidebar-content')
				.classList.contains('has-inserter-category-panel')
		).toBe(true);
		expect(
			document
				.querySelector(
					'.interface-interface-skeleton__secondary-sidebar-blockera'
				)
				.classList.contains('has-inserter-category-panel')
		).toBe(true);
	});

	it('clears the class when a remounted menu no longer has show-panel', async () => {
		document.body.innerHTML = `
			<div class="interface-interface-skeleton__secondary-sidebar-blockera">
				<div class="blockera-secondary-sidebar-content">
					<div class="blockera-sidebar-dock">
						<div data-test="blockera-sidebar-pane-inserter">
							<div class="block-editor-inserter__menu show-panel"></div>
						</div>
					</div>
				</div>
			</div>
		`;
		const dock = document.querySelector('.blockera-sidebar-dock');
		const pane = document.querySelector(
			'[data-test="blockera-sidebar-pane-inserter"]'
		);
		const disconnect = observeInserterCategoryPanelClass(dock);

		expect(dock.classList.contains('has-inserter-category-panel')).toBe(
			true
		);

		pane.innerHTML = '<div class="block-editor-inserter__menu"></div>';
		await Promise.resolve();
		await Promise.resolve();

		expect(dock.classList.contains('has-inserter-category-panel')).toBe(
			false
		);
		expect(
			document
				.querySelector(
					'.interface-interface-skeleton__secondary-sidebar-blockera'
				)
				.classList.contains('has-inserter-category-panel')
		).toBe(false);

		disconnect();
	});

	it('clears the class from a nested close target', () => {
		document.body.innerHTML = `
			<div class="interface-interface-skeleton__primary-sidebar-blockera has-inserter-category-panel">
				<div class="blockera-primary-sidebar-content has-inserter-category-panel">
					<div class="blockera-sidebar-dock has-inserter-category-panel">
						<div class="block-editor-inserter__menu show-panel"></div>
					</div>
				</div>
			</div>
		`;
		const menu = document.querySelector('.block-editor-inserter__menu');

		clearInserterCategoryPanelClass(menu);

		expect(
			document
				.querySelector('.blockera-sidebar-dock')
				.classList.contains('has-inserter-category-panel')
		).toBe(false);
		expect(
			document
				.querySelector(
					'.interface-interface-skeleton__primary-sidebar-blockera'
				)
				.classList.contains('has-inserter-category-panel')
		).toBe(false);
	});

	it('clears the class when the category column is closed', () => {
		document.body.innerHTML = `
			<div class="interface-interface-skeleton__secondary-sidebar-blockera has-inserter-category-panel">
				<div class="blockera-secondary-sidebar-content has-inserter-category-panel">
					<div class="blockera-sidebar-dock has-inserter-category-panel">
						<div class="block-editor-inserter__menu"></div>
					</div>
				</div>
			</div>
		`;
		const dock = document.querySelector('.blockera-sidebar-dock');

		expect(applyInserterCategoryPanelClass(dock)).toBe(false);
		expect(dock.classList.contains('has-inserter-category-panel')).toBe(
			false
		);
		expect(
			document
				.querySelector('.blockera-secondary-sidebar-content')
				.classList.contains('has-inserter-category-panel')
		).toBe(false);
		expect(
			document
				.querySelector(
					'.interface-interface-skeleton__secondary-sidebar-blockera'
				)
				.classList.contains('has-inserter-category-panel')
		).toBe(false);
	});
});
