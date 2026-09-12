/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	useCallback,
	memo,
	useContext,
	useMemo,
	useState,
	useEffect,
} from '@wordpress/element';

/**
 * Blockera dependencies
 */
import {
	Flex,
	BaseControl,
	BoxShadowControl,
	RepeaterContext,
	useControlContext,
	ControlContextProvider,
} from '@blockera/controls';
import { shouldTrackComponentRender, trackComponentRender } from '@blockera/utils';

/**
 * Internal dependencies
 */
import ShadowPresetPreview from './shadow-preset-preview';
import {
	PresetEditorFields,
	SharedPresetControls,
	useLatestPresetItem,
	useNestedPresetRepeaterCommit,
} from '../components';
import { type VariableType } from '../components/types';
import { getAllVariableSlugs as getAllShadowSlugs } from '../components/utils';
import {
	repeaterRecordToShadowItems,
	shadowCssFromPreset,
	shadowItemsFromRaw,
	shadowItemsToRepeaterRecord,
	shadowPresetItemsToCss,
	type WpShadowPreset,
} from './utils';

export type ShadowDefaultPresetValue = {
	shadow: string;
	isVisible: boolean;
	deletable: boolean;
	cloneable: boolean;
	visibilitySupport: boolean;
};

const SHADOW_PRESET_REPEATER_DEFAULT = {
	type: 'outer' as const,
	x: '10px',
	y: '10px',
	blur: '10px',
	spread: '0px',
	color: '#000000ab',
	isVisible: true,
};

function ShadowPresetSizeComponent({
	origin,
	shadowPreset,
	presetId,
}: {
	origin: string | string[];
	presetId: string | number;
	shadowPreset: VariableType & ShadowDefaultPresetValue & WpShadowPreset;
}) {
	if (shouldTrackComponentRender()) {
		trackComponentRender('ShadowPresetFields', {
			id: shadowPreset?.slug,
			name: shadowPreset?.slug,
		});
	}

	const getItem = useLatestPresetItem(shadowPreset);
	const { slug } = shadowPreset;

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
		onChange: (newValue: any) => void;
		valueCleanup: (value: any) => any;
		repeaterId: string | null | undefined;
		repeaterItems:
			| Record<
					string,
					Array<
						VariableType & ShadowDefaultPresetValue & WpShadowPreset
					>
			  >
			| undefined;
		itemIdGenerator?: (itemId: string | number) => string;
	};

	const repeaterItems = useMemo(() => {
		const raw = shadowPreset as unknown as Record<string, unknown>;
		return shadowItemsToRepeaterRecord(shadowItemsFromRaw(raw));
	}, [shadowPreset.shadow]);

	const buildPersistPatch = useCallback(
		(record: Record<string, unknown>) => ({
			shadow: shadowPresetItemsToCss(
				repeaterRecordToShadowItems(
					record as Record<string, Record<string, unknown>>
				)
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
		persistedSignature: shadowPreset.shadow,
		buildPersistPatch,
	});

	const [draftShadow, setDraftShadow] = useState(() =>
		shadowCssFromPreset(shadowPreset as unknown as Record<string, unknown>)
	);

	useEffect(() => {
		setDraftShadow(
			shadowCssFromPreset(
				shadowPreset as unknown as Record<string, unknown>
			)
		);
	}, [shadowPreset.shadow]);

	const handleBoxShadowChange = useCallback(
		(newValue: Record<string, Record<string, unknown>>) => {
			const items = repeaterRecordToShadowItems(newValue);
			const shadow = shadowPresetItemsToCss(items);
			setDraftShadow(shadow);
			commitNestedChange(newValue, { shadow });
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

	const shadowPresetValueControls = (
		<ControlContextProvider
			value={{
				name: `shadow-preset-${slug}`,
				value: liveRecord,
				attribute: 'blockeraShadowPreset',
				blockName: 'global-styles-shadows',
			}}
			storeName="blockera/controls/repeater"
		>
			<BaseControl
				controlName={`shadow-preset-box-${slug}`}
				columns="columns-1"
			>
				<BoxShadowControl
					key={slug}
					withoutValueAddons
					id={`shadow-preset-box-${slug}`}
					defaultRepeaterItemValue={SHADOW_PRESET_REPEATER_DEFAULT}
					label={__('Box shadow', 'blockera')}
					labelDescription={
						<>
							<p>
								{__(
									'Defines the shadow preset used in box shadow controls across the site.',
									'blockera'
								)}
							</p>
							<p>
								{__(
									'Stored in theme.json as settings.shadow.presets (slug, name, and shadow CSS per preset).',
									'blockera'
								)}
							</p>
						</>
					}
					defaultValue={liveRecord}
					onChange={handleBoxShadowChange}
				/>
			</BaseControl>
		</ControlContextProvider>
	);

	return (
		<Flex direction="column" gap="15px">
			<ShadowPresetPreview shadow={draftShadow} />

			<SharedPresetControls
				itemId={presetId}
				variable={shadowPreset}
				name={shadowPreset.name}
				slug={shadowPreset.slug}
				allSlugs={getAllShadowSlugs(presets)}
			>
				<PresetEditorFields signature={editorSignature}>
					{shadowPresetValueControls}
				</PresetEditorFields>
			</SharedPresetControls>
		</Flex>
	);
}

export const ShadowPresetSize = memo(ShadowPresetSizeComponent);
