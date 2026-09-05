/**
 * External dependencies
 */
import { useMemo, useCallback } from '@wordpress/element';

/**
 * Blockera dependencies
 */
import { omit, setImmutably } from '@blockera/utils';

/**
 * Internal dependencies
 */
import { useGlobalStylesContext } from './global-styles-provider';
import {
	getValueFromObjectPath,
	getValueFromVariable,
} from '../theme-json-utils';

const EMPTY_DEFAULT_STYLES: Record<string, unknown> = {};

export function useGlobalSetting<T = unknown>(
	propertyPath: string,
	blockName = '',
	source = 'all'
): [T, (newValue: T) => void] {
	const { setUserConfig, merged, user, base } = useGlobalStylesContext();
	const appendedBlockPath = blockName ? '.blocks.' + blockName : '';
	const appendedPropertyPath = propertyPath ? '.' + propertyPath : '';
	const contextualPath = `settings${appendedBlockPath}${appendedPropertyPath}`;
	const globalPath = `settings${appendedPropertyPath}`;
	const configToUse =
		source === 'all' || source === 'merged'
			? merged
			: source === 'base'
				? base
				: source === 'user'
					? user
					: undefined;

	const settingValue = useMemo(() => {
		if (!configToUse) {
			throw 'Unsupported source';
		}

		if (propertyPath) {
			return (
				getValueFromObjectPath(configToUse, contextualPath) ??
				getValueFromObjectPath(configToUse, globalPath)
			);
		}

		return (
			getValueFromObjectPath(configToUse, contextualPath) ??
			getValueFromObjectPath(configToUse, 'settings') ??
			{}
		);
	}, [configToUse, globalPath, propertyPath, contextualPath]);

	const setSetting = useCallback(
		(newValue: unknown): void => {
			setUserConfig((currentConfig: Record<string, unknown>) =>
				setImmutably(currentConfig, contextualPath.split('.'), newValue)
			);
		},
		[setUserConfig, contextualPath]
	);
	return [settingValue as T, setSetting as (newValue: T) => void];
}

export function useGlobalStyle(
	path: string,
	blockName: string,
	source = 'all',
	{
		shouldDecodeEncode = true,
		defaultStylesValue = EMPTY_DEFAULT_STYLES,
	}: {
		shouldDecodeEncode?: boolean;
		defaultStylesValue?: Record<string, unknown>;
	} = {}
): [
	Record<string, unknown>,
	Record<string, unknown>,
	(newValue: unknown) => void,
	Record<string, unknown>,
	Record<string, unknown>,
] {
	const {
		merged: mergedConfig,
		base: baseConfig,
		user: userConfig,
		setUserConfig,
	} = useGlobalStylesContext();

	const appendedPath = path ? '.' + path : '';
	const finalPath = !blockName
		? `styles${appendedPath}`
		: `styles.blocks.${blockName}${appendedPath}`;

	const setStyle = useCallback(
		(newValue: unknown) => {
			setUserConfig((currentConfig: Record<string, unknown>) =>
				setImmutably(currentConfig, finalPath.split('.'), newValue)
			);
		},
		[finalPath, setUserConfig]
	);

	const { style, blockRootStyleWithoutVariation } = useMemo(() => {
		let rawResult: unknown;
		let result: unknown;
		switch (source) {
			case 'all':
				rawResult = getValueFromObjectPath(
					mergedConfig as Record<string, unknown>,
					finalPath
				);
				result = shouldDecodeEncode
					? getValueFromVariable(
							mergedConfig as Record<string, unknown>,
							blockName,
							rawResult as string | Record<string, unknown>
						)
					: rawResult;
				break;
			case 'user':
				rawResult = getValueFromObjectPath(
					userConfig as Record<string, unknown>,
					finalPath
				);
				result = shouldDecodeEncode
					? getValueFromVariable(
							mergedConfig as Record<string, unknown>,
							blockName,
							rawResult as string | Record<string, unknown>
						)
					: rawResult;
				break;
			case 'base':
				rawResult = getValueFromObjectPath(
					baseConfig as Record<string, unknown>,
					finalPath
				);
				result = shouldDecodeEncode
					? getValueFromVariable(
							baseConfig as Record<string, unknown>,
							blockName,
							rawResult as string | Record<string, unknown>
						)
					: rawResult;
				break;
			default:
				throw 'Unsupported source';
		}

		let blockRoot: Record<string, unknown> = {};

		if (blockName) {
			rawResult = getValueFromObjectPath(
				mergedConfig as Record<string, unknown>,
				finalPath.replace(appendedPath, '')
			);
			blockRoot = omit(
				shouldDecodeEncode
					? (getValueFromVariable(
							mergedConfig as Record<string, unknown>,
							blockName,
							rawResult as string | Record<string, unknown>
						) as Record<string, unknown>) || {}
					: (rawResult as Record<string, unknown>) || {},
				['variations']
			) as Record<string, unknown>;
		}

		return {
			style: {
				...defaultStylesValue,
				...(typeof result === 'string'
					? {}
					: (result as Record<string, unknown>)),
			},
			blockRootStyleWithoutVariation: blockRoot,
		};
	}, [
		source,
		finalPath,
		blockName,
		baseConfig,
		userConfig,
		appendedPath,
		mergedConfig,
		defaultStylesValue,
		shouldDecodeEncode,
	]);

	return [
		style,
		blockRootStyleWithoutVariation,
		setStyle,
		userConfig as Record<string, unknown>,
		baseConfig as Record<string, unknown>,
	];
}
