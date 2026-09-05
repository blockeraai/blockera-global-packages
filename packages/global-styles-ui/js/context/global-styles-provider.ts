/**
 * External dependencies
 */
import { useSelect, useDispatch } from '@wordpress/data';
import { useMemo, useCallback } from '@wordpress/element';
import { store as coreStore } from '@wordpress/core-data';

/**
 * Blockera dependencies
 */
import { prepare } from '@blockera/data-editor';

/**
 * Internal dependencies
 */
import { cleanEmptyObject } from '../theme-json-utils';
import {
	retainMergedBaseAndUserConfigs,
	retainUserGlobalStylesRecord,
} from './global-styles-config';

export { mergeBaseAndUserConfigs } from './global-styles-config';

export type GlobalStylesUserConfigSetter = (
	callbackOrObject:
		| ((current: Record<string, unknown>) => Record<string, unknown>)
		| Record<string, unknown>,
	options?: Record<string, unknown>
) => void;

export type GlobalStylesContextValue = {
	single: unknown;
	setUserConfig: GlobalStylesUserConfigSetter;
	user: Record<string, unknown>;
	base: Record<string, unknown>;
	merged: Record<string, unknown>;
	isReady: boolean;
	canEditGlobalStyles: boolean;
};

function useGlobalStylesUserConfig(): [
	boolean,
	Record<string, unknown>,
	GlobalStylesUserConfigSetter,
	boolean,
] {
	const {
		globalStylesId,
		isReady,
		settings,
		styles,
		_links,
		canEditGlobalStyles,
	} = useSelect((selectStore) => {
		const {
			getEntityRecord,
			getEditedEntityRecord,
			hasFinishedResolution,
			canUser,
		} = selectStore(coreStore);
		const _globalStylesId =
			selectStore(coreStore).__experimentalGetCurrentGlobalStylesId();

		let record: Record<string, unknown> | undefined;

		const userCanEditGlobalStyles = _globalStylesId
			? canUser('update', {
					kind: 'root',
					name: 'globalStyles',
					id: _globalStylesId,
				})
			: null;

		if (_globalStylesId && typeof userCanEditGlobalStyles === 'boolean') {
			if (userCanEditGlobalStyles) {
				record = getEditedEntityRecord(
					'root',
					'globalStyles',
					_globalStylesId
				) as Record<string, unknown> | undefined;
			} else {
				record = getEntityRecord(
					'root',
					'globalStyles',
					_globalStylesId,
					{ context: 'view' }
				) as Record<string, unknown> | undefined;
			}
		}

		let hasResolved = false;
		if (hasFinishedResolution('__experimentalGetCurrentGlobalStylesId')) {
			if (_globalStylesId) {
				hasResolved = userCanEditGlobalStyles
					? hasFinishedResolution('getEditedEntityRecord', [
							'root',
							'globalStyles',
							_globalStylesId,
						])
					: hasFinishedResolution('getEntityRecord', [
							'root',
							'globalStyles',
							_globalStylesId,
							{ context: 'view' },
						]);
			} else {
				hasResolved = true;
			}
		}

		return {
			globalStylesId: _globalStylesId,
			isReady: hasResolved,
			settings: record?.settings,
			styles: record?.styles,
			_links: record?._links,
			canEditGlobalStyles: userCanEditGlobalStyles === true,
		};
	}, []);

	const { getEditedEntityRecord } = useSelect(coreStore);
	const { editEntityRecord } = useDispatch(coreStore);
	const config = useMemo(
		() => retainUserGlobalStylesRecord(settings, styles, _links),
		[settings, styles, _links]
	);

	const setConfig = useCallback(
		(
			callbackOrObject:
				| ((
						current: Record<string, unknown>
				  ) => Record<string, unknown>)
				| Record<string, unknown>,
			options: Record<string, unknown> = {}
		) => {
			if (!globalStylesId || !canEditGlobalStyles) {
				return;
			}

			const record = getEditedEntityRecord(
				'root',
				'globalStyles',
				globalStylesId
			) as Record<string, unknown> | undefined;

			const currentConfig = {
				styles: (record?.styles as Record<string, unknown>) ?? {},
				settings: (record?.settings as Record<string, unknown>) ?? {},
				_links: (record?._links as Record<string, unknown>) ?? {},
			};

			const updatedConfig =
				typeof callbackOrObject === 'function'
					? callbackOrObject(currentConfig)
					: callbackOrObject;

			editEntityRecord(
				'root',
				'globalStyles',
				globalStylesId,
				{
					styles:
						(cleanEmptyObject(updatedConfig.styles) as Record<
							string,
							unknown
						>) || {},
					settings:
						(cleanEmptyObject(updatedConfig.settings) as Record<
							string,
							unknown
						>) || {},
					_links:
						(cleanEmptyObject(updatedConfig._links) as Record<
							string,
							unknown
						>) || {},
				},
				options
			);
		},
		[
			globalStylesId,
			canEditGlobalStyles,
			editEntityRecord,
			getEditedEntityRecord,
		]
	);

	return [isReady, config, setConfig, canEditGlobalStyles];
}

function useGlobalStylesBaseConfig(): [boolean, Record<string, unknown>] {
	const baseConfig = useSelect(
		(selectStore) =>
			selectStore(
				coreStore
			).__experimentalGetCurrentThemeBaseGlobalStyles() as
				Record<string, unknown> | undefined,
		[]
	);
	return [!!baseConfig, baseConfig ?? {}];
}

type UseGlobalStylesContextOptions = {
	path?: string;
	single?: boolean;
	from?: 'merged' | 'base' | 'user';
};

export function useGlobalStylesContext(
	options: UseGlobalStylesContextOptions & { single: true }
): Record<string, unknown>;
export function useGlobalStylesContext(
	options?: UseGlobalStylesContextOptions
): GlobalStylesContextValue;
export function useGlobalStylesContext({
	path = '',
	single: returnSingleSlice = false,
	from = 'merged',
}: UseGlobalStylesContextOptions = {}):
	| GlobalStylesContextValue
	| Record<string, unknown> {
	const [isUserConfigReady, userConfig, setUserConfig, canEditGlobalStyles] =
		useGlobalStylesUserConfig();
	const [isBaseConfigReady, baseConfig] = useGlobalStylesBaseConfig();

	const mergedConfig = useMemo(() => {
		if (!baseConfig || !userConfig) {
			return {};
		}

		return retainMergedBaseAndUserConfigs(baseConfig, userConfig);
	}, [userConfig, baseConfig]);

	const context = useMemo(() => {
		let valueAtPath: unknown = {};

		if (path) {
			switch (from) {
				case 'merged':
					valueAtPath = prepare(path, mergedConfig);
					break;
				case 'base':
					valueAtPath = prepare(path, baseConfig);
					break;
				case 'user':
					valueAtPath = prepare(path, userConfig);
					break;
			}
		}

		return {
			single: valueAtPath,
			setUserConfig,
			user: userConfig,
			base: baseConfig,
			merged: mergedConfig,
			isReady: isUserConfigReady && isBaseConfigReady,
			canEditGlobalStyles,
		};
	}, [
		path,
		from,
		userConfig,
		baseConfig,
		mergedConfig,
		setUserConfig,
		isUserConfigReady,
		isBaseConfigReady,
		canEditGlobalStyles,
	]);

	return returnSingleSlice
		? (context.single as Record<string, unknown>)
		: context;
}
