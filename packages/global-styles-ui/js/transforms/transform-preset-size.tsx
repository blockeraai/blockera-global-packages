/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { memo, useCallback, useContext, useMemo } from '@wordpress/element';

/**
 * Blockera dependencies
 */
import {
	BaseControl,
	TransformControl,
	RepeaterContext,
	useControlContext,
	ControlContextProvider,
} from '@blockera/controls';

/**
 * Internal dependencies
 */
import {
	PresetEditorFields,
	SharedPresetControls,
	useLatestPresetItem,
	useNestedPresetRepeaterCommit,
} from '../components';
import { type VariableType } from '../components/types';
import { getAllVariableSlugs as getAllTransformSlugs } from '../components/utils';
import {
	itemsToRepeaterRecord,
	repeaterRecordToItems,
	type WpTransformPreset,
	type TransformPresetItem,
} from './utils';

export type TransformDefaultPresetValue = {
	items: TransformPresetItem[];
	deletable: boolean;
	cloneable: boolean;
	isVisible: boolean;
	visibilitySupport: boolean;
};

/** Matches TransformControl’s default row shape; defined once to avoid new object identity on each render. */
const TRANSFORM_PRESET_REPEATER_DEFAULT = {
	type: 'move' as const,
	'move-x': '0px',
	'move-y': '0px',
	'move-z': '0px',
	scale: '100%',
	'rotate-x': '0deg',
	'rotate-y': '0deg',
	'rotate-z': '0deg',
	'skew-x': '0deg',
	'skew-y': '0deg',
	isVisible: true,
};

function TransformPresetSizeComponent({
	origin,
	transformPreset,
	presetId,
}: {
	origin: string | string[];
	transformPreset: VariableType &
		TransformDefaultPresetValue &
		WpTransformPreset;
	presetId: string | number;
}) {
	const getItem = useLatestPresetItem(transformPreset);
	const { slug } = transformPreset;

	const {
		controlInfo: { name: controlId },
		dispatch: { changeRepeaterItem },
	} = useControlContext();
	const {
		onChange,
		repeaterId,
		valueCleanup,
		repeaterItems: presets,
	} = useContext(RepeaterContext) as {
		disableRegenerateId?: boolean;
		onChange: (newValue: unknown) => void;
		valueCleanup: (value: unknown) => unknown;
		repeaterId: string | null | undefined;
		repeaterItems:
			| Record<
					string,
					Array<
						VariableType &
							TransformDefaultPresetValue &
							WpTransformPreset
					>
			  >
			| undefined;
		itemIdGenerator?: (itemId: string | number) => string;
	};

	const repeaterItems = useMemo(
		() => itemsToRepeaterRecord(transformPreset.items || []),
		[transformPreset.items]
	);

	const { commitNestedChange, liveRecord } = useNestedPresetRepeaterCommit({
		changeRepeaterItem,
		onChange,
		valueCleanup,
		controlId,
		repeaterId,
		itemId: presetId,
		getItem,
		initialRecord: repeaterItems as unknown as Record<string, unknown>,
		persistedSignature: transformPreset.items,
	});

	const handleTransformChange = useCallback(
		(newValue: Record<string, Record<string, unknown>>) => {
			const items = repeaterRecordToItems(newValue);
			commitNestedChange(newValue, { items });
		},
		[commitNestedChange]
	);

	const editorSignature = useMemo(
		() => ({ slug, liveRecord }),
		[slug, liveRecord]
	);

	if (!origin || !slug) {
		return null;
	}

	const transformPresetValueControls = (
		<ControlContextProvider
			value={{
				name: `transform-preset-${slug}`,
				value: liveRecord,
				attribute: 'blockeraTransformPreset',
				blockName: 'global-styles-transforms',
			}}
			storeName="blockera/controls/repeater"
		>
			<BaseControl
				controlName={`transform-preset-${slug}`}
				columns="columns-1"
			>
				<TransformControl
					key={slug}
					withoutValueAddons
					id={`transform-preset-${slug}`}
					label={__('Transforms', 'blockera')}
					labelDescription={
						<>
							<p>
								{__(
									'Defines the transform preset used in effects transform controls across the site.',
									'blockera'
								)}
							</p>
							<p>
								{__(
									'Stored in theme.json as settings.transform.presets (items array per preset).',
									'blockera'
								)}
							</p>
						</>
					}
					defaultRepeaterItemValue={TRANSFORM_PRESET_REPEATER_DEFAULT}
					defaultValue={liveRecord}
					onChange={handleTransformChange}
				/>
			</BaseControl>
		</ControlContextProvider>
	);

	return (
		<SharedPresetControls
			itemId={presetId}
			variable={transformPreset}
			name={transformPreset.name}
			slug={transformPreset.slug}
			allSlugs={getAllTransformSlugs(presets)}
		>
			<PresetEditorFields signature={editorSignature}>
				{transformPresetValueControls}
			</PresetEditorFields>
		</SharedPresetControls>
	);
}

export const TransformPresetSize = memo(TransformPresetSizeComponent);
