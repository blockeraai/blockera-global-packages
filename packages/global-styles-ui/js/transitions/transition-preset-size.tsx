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
	TransitionControl,
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
import { getAllVariableSlugs as getAllTransitionSlugs } from '../components/utils';
import {
	itemsToRepeaterRecord,
	repeaterRecordToItems,
	type WpTransitionPreset,
	type TransitionPresetItem,
} from './utils';

export type TransitionDefaultPresetValue = {
	items: TransitionPresetItem[];
	deletable: boolean;
	cloneable: boolean;
	isVisible: boolean;
	visibilitySupport: boolean;
};

const TRANSITION_PRESET_REPEATER_DEFAULT = {
	type: 'all' as const,
	duration: '500ms',
	timing: 'ease',
	delay: '0ms',
	isVisible: true,
};

function TransitionPresetSizeComponent({
	origin,
	transitionPreset,
	presetId,
}: {
	origin: string | string[];
	transitionPreset: VariableType &
		TransitionDefaultPresetValue &
		WpTransitionPreset;
	presetId: string | number;
}) {
	const getItem = useLatestPresetItem(transitionPreset);
	const { slug } = transitionPreset;

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
							TransitionDefaultPresetValue &
							WpTransitionPreset
					>
			  >
			| undefined;
		itemIdGenerator?: (itemId: string | number) => string;
	};

	const repeaterItems = useMemo(
		() => itemsToRepeaterRecord(transitionPreset.items || []),
		[transitionPreset.items]
	);

	const buildPersistPatch = useCallback(
		(record: Record<string, unknown>) => ({
			items: repeaterRecordToItems(
				record as Record<string, Record<string, unknown>>
			),
		}),
		[]
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
		persistedSignature: transitionPreset.items,
		buildPersistPatch,
	});

	const handleTransitionChange = useCallback(
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

	const transitionPresetValueControls = (
		<ControlContextProvider
			value={{
				name: `transition-preset-${slug}`,
				value: liveRecord,
				attribute: 'blockeraTransitionPreset',
				blockName: 'global-styles-transitions',
			}}
			storeName="blockera/controls/repeater"
		>
			<BaseControl
				controlName={`transition-preset-${slug}`}
				columns="columns-1"
			>
				<TransitionControl
					key={slug}
					withoutValueAddons
					id={`transition-preset-${slug}`}
					label={__('Transitions', 'blockera')}
					labelDescription={
						<>
							<p>
								{__(
									'Defines the transition preset used in effects transition controls across the site.',
									'blockera'
								)}
							</p>
							<p>
								{__(
									'Stored in theme.json as settings.transition.presets (items array per preset).',
									'blockera'
								)}
							</p>
						</>
					}
					defaultRepeaterItemValue={TRANSITION_PRESET_REPEATER_DEFAULT}
					defaultValue={liveRecord}
					onChange={handleTransitionChange}
				/>
			</BaseControl>
		</ControlContextProvider>
	);

	return (
		<SharedPresetControls
			itemId={presetId}
			variable={transitionPreset}
			name={transitionPreset.name}
			slug={transitionPreset.slug}
			allSlugs={getAllTransitionSlugs(presets)}
		>
			<PresetEditorFields signature={editorSignature}>
				{transitionPresetValueControls}
			</PresetEditorFields>
		</SharedPresetControls>
	);
}

export const TransitionPresetSize = memo(TransitionPresetSizeComponent);
