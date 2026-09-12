/**
 * External dependencies
 */
import deepmerge from 'deepmerge';
import { isPlainObject } from 'is-plain-object';

/**
 * Blockera dependencies
 */
import { trackPerfCounter } from '@blockera/utils';

const EMPTY_RECORD: Record<string, unknown> = {};

function isRetainablePlainObject(
	value: unknown
): value is Record<string, unknown> {
	return isPlainObject(value);
}

/**
 * Reuse previous object/array identities when nested values are unchanged.
 * Sibling origin arrays (theme/default) keep the same reference after a
 * custom-preset persist so PresetGroup memo can skip those lists.
 */
export function retainEqualSubtrees(previous: unknown, next: unknown): unknown {
	if (Object.is(previous, next)) {
		return previous;
	}

	if (previous == null || next == null) {
		return next;
	}

	if (Array.isArray(previous) && Array.isArray(next)) {
		if (previous.length !== next.length) {
			return next.map((item, index) =>
				retainEqualSubtrees(previous[index], item)
			);
		}

		let allSameAsPrevious = true;
		const retained = next.map((item, index) => {
			const nextItem = retainEqualSubtrees(previous[index], item);

			if (nextItem !== previous[index]) {
				allSameAsPrevious = false;
			}

			return nextItem;
		});

		return allSameAsPrevious ? previous : retained;
	}

	if (isRetainablePlainObject(previous) && isRetainablePlainObject(next)) {
		const previousKeys = Object.keys(previous);
		const nextKeys = Object.keys(next);

		let allSameAsPrevious = previousKeys.length === nextKeys.length;
		const retained: Record<string, unknown> = {};

		for (let i = 0; i < nextKeys.length; i++) {
			const key = nextKeys[i];

			if (
				allSameAsPrevious &&
				!Object.prototype.hasOwnProperty.call(previous, key)
			) {
				allSameAsPrevious = false;
			}

			const nextValue = retainEqualSubtrees(previous[key], next[key]);
			retained[key] = nextValue;

			if (nextValue !== previous[key]) {
				allSameAsPrevious = false;
			}
		}

		return allSameAsPrevious ? previous : retained;
	}

	return next;
}

export type GlobalStylesUserRecord = {
	settings: Record<string, unknown>;
	styles: Record<string, unknown>;
	_links: Record<string, unknown>;
};

type UserRecordCache = {
	settings: unknown;
	styles: unknown;
	_links: unknown;
	record: GlobalStylesUserRecord;
};

type MergedConfigCache = {
	base: Record<string, unknown>;
	user: Record<string, unknown>;
	merged: Record<string, unknown>;
};

let userRecordCache: UserRecordCache | null = null;
let mergedConfigCache: MergedConfigCache | null = null;

export function mergeBaseAndUserConfigs(
	base: Record<string, unknown>,
	user: Record<string, unknown>
): Record<string, unknown> {
	return deepmerge(base, user, {
		isMergeableObject: isPlainObject,
		customMerge: (key) => {
			if (key === 'backgroundImage') {
				return (_baseConfig: unknown, userConfig: unknown) =>
					userConfig;
			}
			return undefined;
		},
	}) as Record<string, unknown>;
}

/**
 * Keep one `{ settings, styles, _links }` object while entity slices are
 * referentially unchanged (many useGlobalSetting calls per screen).
 */
export function retainUserGlobalStylesRecord(
	settings: unknown,
	styles: unknown,
	_links: unknown
): GlobalStylesUserRecord {
	const nextSettings =
		(settings as Record<string, unknown> | undefined) ?? EMPTY_RECORD;
	const nextStyles =
		(styles as Record<string, unknown> | undefined) ?? EMPTY_RECORD;
	const nextLinks =
		(_links as Record<string, unknown> | undefined) ?? EMPTY_RECORD;

	if (
		userRecordCache &&
		userRecordCache.settings === settings &&
		userRecordCache.styles === styles &&
		userRecordCache._links === _links
	) {
		return userRecordCache.record;
	}

	const retainedSettings = userRecordCache
		? (retainEqualSubtrees(
				userRecordCache.record.settings,
				nextSettings
			) as Record<string, unknown>)
		: nextSettings;
	const retainedStyles = userRecordCache
		? (retainEqualSubtrees(
				userRecordCache.record.styles,
				nextStyles
			) as Record<string, unknown>)
		: nextStyles;
	const retainedLinks = userRecordCache
		? (retainEqualSubtrees(userRecordCache.record._links, nextLinks) as Record<
				string,
				unknown
			>)
		: nextLinks;

	const record: GlobalStylesUserRecord = {
		settings: retainedSettings,
		styles: retainedStyles,
		_links: retainedLinks,
	};

	userRecordCache = {
		settings,
		styles,
		_links,
		record,
	};

	return record;
}

/**
 * One deepmerge of theme.json per user/base identity, shared across hooks.
 */
export function retainMergedBaseAndUserConfigs(
	base: Record<string, unknown>,
	user: Record<string, unknown>
): Record<string, unknown> {
	if (
		mergedConfigCache &&
		mergedConfigCache.base === base &&
		mergedConfigCache.user === user
	) {
		trackPerfCounter('gs.mergeConfigs', { outcome: 'retained' });
		return mergedConfigCache.merged;
	}

	trackPerfCounter('gs.mergeConfigs', { outcome: 'rebuilt' });
	const merged = mergeBaseAndUserConfigs(base, user);
	const retained = mergedConfigCache
		? (retainEqualSubtrees(mergedConfigCache.merged, merged) as Record<
				string,
				unknown
			>)
		: merged;
	mergedConfigCache = { base, user, merged: retained };
	return retained;
}

export function resetGlobalStylesConfigRetainersForTests(): void {
	userRecordCache = null;
	mergedConfigCache = null;
}
