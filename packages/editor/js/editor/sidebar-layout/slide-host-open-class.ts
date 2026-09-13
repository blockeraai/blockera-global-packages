const PRIMARY_SLIDE_HOST_SELECTOR =
	'.interface-interface-skeleton__primary-sidebar-blockera';
const SECONDARY_SLIDE_HOST_SELECTOR =
	'.interface-interface-skeleton__secondary-sidebar-blockera';

export const SLIDE_HOST_OPEN_CLASS = 'is-open';

/**
 * Drive dock clip width from a host class instead of :has(.is-visible).
 */
export function syncSlideHostOpenClass(
	host: HTMLElement | null,
	isOpen: boolean
): void {
	if (!host) {
		return;
	}

	host.classList.toggle(SLIDE_HOST_OPEN_CLASS, isOpen);
}

export function findPrimarySlideHost(): HTMLElement | null {
	return document.querySelector(
		PRIMARY_SLIDE_HOST_SELECTOR
	) as HTMLElement | null;
}

export function findSecondarySlideHost(): HTMLElement | null {
	return document.querySelector(
		SECONDARY_SLIDE_HOST_SELECTOR
	) as HTMLElement | null;
}

/**
 * Slot hosts can appear after the dock's first layout. Keep watching until
 * the node exists so a persisted-open dock is not clipped at width 0.
 */
export function subscribeSlideHostOpenClass(
	findHost: () => HTMLElement | null,
	isOpen: boolean
): () => void {
	let observer: MutationObserver | null = null;

	const apply = (): boolean => {
		const host = findHost();
		if (!host) {
			return false;
		}

		syncSlideHostOpenClass(host, isOpen);
		return true;
	};

	if (!apply() && isOpen && typeof MutationObserver !== 'undefined') {
		observer = new MutationObserver(() => {
			if (apply()) {
				observer?.disconnect();
				observer = null;
			}
		});
		observer.observe(document.body, { childList: true, subtree: true });
	}

	return () => {
		observer?.disconnect();
		syncSlideHostOpenClass(findHost(), false);
	};
}
