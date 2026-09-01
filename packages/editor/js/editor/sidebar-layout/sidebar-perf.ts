export type SidebarPerfAction = {
	t: number;
	name: string;
	data?: Record<string, unknown>;
};

export type SidebarPerfSnapshot = {
	pointerMoves: number;
	layoutNotifies: number;
	positionNotifies: number;
	dockRenders: { left: number; right: number };
	overlaySyncs: number;
	hoverChanges: number;
	drops: number;
	dragStartedAt: number | null;
	lastDragMs: number | null;
	actions: SidebarPerfAction[];
};

const MAX_ACTIONS = 80;

const snapshot: SidebarPerfSnapshot = {
	pointerMoves: 0,
	layoutNotifies: 0,
	positionNotifies: 0,
	dockRenders: { left: 0, right: 0 },
	overlaySyncs: 0,
	hoverChanges: 0,
	drops: 0,
	dragStartedAt: null,
	lastDragMs: null,
	actions: [],
};

function publish(): void {
	if (typeof window === 'undefined') {
		return;
	}

	window.__BLOCKERA_SIDEBAR_PERF__ = snapshot;
}

export function resetSidebarPerf(): void {
	snapshot.pointerMoves = 0;
	snapshot.layoutNotifies = 0;
	snapshot.positionNotifies = 0;
	snapshot.dockRenders.left = 0;
	snapshot.dockRenders.right = 0;
	snapshot.overlaySyncs = 0;
	snapshot.hoverChanges = 0;
	snapshot.drops = 0;
	snapshot.dragStartedAt = null;
	snapshot.lastDragMs = null;
	snapshot.actions = [];
	publish();
}

export function logSidebarPerf(
	name: string,
	data?: Record<string, unknown>
): void {
	if (snapshot.actions.length < MAX_ACTIONS) {
		snapshot.actions.push({
			t: performance.now(),
			name,
			data,
		});
	}

	publish();
}

export function countSidebarPerf(
	key: Exclude<
		keyof SidebarPerfSnapshot,
		'actions' | 'dockRenders' | 'dragStartedAt' | 'lastDragMs'
	>
): void {
	snapshot[key] += 1;
	publish();
}

export function countDockRender(dock: 'left' | 'right'): void {
	snapshot.dockRenders[dock] += 1;
	publish();
}

export function markSidebarDragStart(data?: Record<string, unknown>): void {
	resetSidebarPerf();
	snapshot.dragStartedAt = performance.now();
	logSidebarPerf('start', data);
}

export function markSidebarDragDrop(data?: Record<string, unknown>): void {
	snapshot.drops += 1;
	if (snapshot.dragStartedAt !== null) {
		snapshot.lastDragMs = Math.round(
			performance.now() - snapshot.dragStartedAt
		);
	}
	logSidebarPerf('drop', { ...data, dragMs: snapshot.lastDragMs });
}

export function getSidebarPerfSnapshot(): SidebarPerfSnapshot {
	return snapshot;
}

declare global {
	interface Window {
		__BLOCKERA_SIDEBAR_PERF__?: SidebarPerfSnapshot;
	}
}
