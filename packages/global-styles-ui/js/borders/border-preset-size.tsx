/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { memo, useContext, useMemo } from '@wordpress/element';

/**
 * Blockera dependencies
 */
import {
	Flex,
	BorderControl,
	RepeaterContext,
	useControlContext,
	ControlContextProvider,
} from '@blockera/controls';

/**
 * Internal dependencies
 */
import BorderPresetPreview from './border-preset-preview';
import {
	PresetEditorFields,
	SharedPresetControls,
	useDeferredPresetItemCommit,
	useDeferredScalarPresetField,
	useLatestPresetItem,
} from '../components';
import { type VariableType } from '../components/types';
import { getAllVariableSlugs as getAllBorderPresetSlugs } from '../components/utils';
import type { BorderPresetStoredSide } from './utils';
import { coerceBorderPresetSide, getDefaultStoredBorderSide } from './utils';

export type BorderBoxDefaultPresetValue = VariableType & {
	border: BorderPresetStoredSide;
	deletable: boolean;
	cloneable: boolean;
	isVisible: boolean;
	visibilitySupport: boolean;
};

const DEFAULT_STORED_BORDER_SIDE = getDefaultStoredBorderSide();

function BorderPresetSizeComponent({
	origin,
	borderPreset,
	presetId,
}: {
	origin: string | string[];
	presetId: string | number;
	borderPreset: BorderBoxDefaultPresetValue;
}) {
	const getItem = useLatestPresetItem(borderPreset);
	const { slug } = borderPreset;

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
			Record<string, Array<BorderBoxDefaultPresetValue>> | undefined;
		itemIdGenerator?: (itemId: string | number) => string;
	};

	const { stagePatch, flush } = useDeferredPresetItemCommit({
		changeRepeaterItem,
		onChange,
		valueCleanup,
		controlId,
		repeaterId,
		itemId: presetId,
		getItem,
	});

	const persistedBorder = useMemo(
		() => coerceBorderPresetSide(borderPreset.border),
		[borderPreset.border]
	);

	const {
		draft,
		onChange: handleBorderChange,
		onFieldsBlur,
	} = useDeferredScalarPresetField<BorderPresetStoredSide>({
		persistedValue: persistedBorder,
		fieldKey: 'border',
		stagePatch,
		flush,
	});

	const borderControlContextValue = useMemo(
		() => ({
			name: `border-preset-${slug}`,
			value: draft,
			attribute: 'blockeraBorderPreset',
			blockName: 'global-styles',
		}),
		[slug, draft]
	);

	if (!origin || !slug) {
		return null;
	}

	const borderPresetValueControls = (
		<ControlContextProvider value={borderControlContextValue}>
				<BorderControl
					columns="1.2fr 3fr"
					controlAddonTypes={[]}
					variableTypes={[]}
					label={__('Border', 'blockera')}
					labelDescription={
						<>
							<p>
								{__(
									'Defines this named border preset for use across the site.',
									'blockera'
								)}
							</p>
						</>
					}
					onChange={handleBorderChange}
					defaultValue={DEFAULT_STORED_BORDER_SIDE}
					customMenuPosition="top"
				/>
			</ControlContextProvider>
	);

	return (
		<Flex direction="column" gap="15px">
			<BorderPresetPreview border={draft} />

			<SharedPresetControls
				itemId={presetId}
				variable={borderPreset}
				name={borderPreset.name}
				slug={borderPreset.slug}
				allSlugs={getAllBorderPresetSlugs(presets)}
				onValueFieldsBlur={onFieldsBlur}
			>
				<PresetEditorFields signature={{ slug, draft }}>
					{borderPresetValueControls}
				</PresetEditorFields>
			</SharedPresetControls>
		</Flex>
	);
}

export const BorderPresetSize = memo(BorderPresetSizeComponent);
