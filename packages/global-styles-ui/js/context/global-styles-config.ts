/**
 * External dependencies
 */
import deepmerge from 'deepmerge';
import { isPlainObject } from 'is-plain-object';

const EMPTY_RECORD: Record<string, unknown> = {};

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

	const record: GlobalStylesUserRecord = {
		settings: nextSettings,
		styles: nextStyles,
		_links: nextLinks,
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
		return mergedConfigCache.merged;
	}

	const merged = mergeBaseAndUserConfigs(base, user);
	mergedConfigCache = { base, user, merged };
	return merged;
}

export function resetGlobalStylesConfigRetainersForTests(): void {
	userRecordCache = null;
	mergedConfigCache = null;
}
