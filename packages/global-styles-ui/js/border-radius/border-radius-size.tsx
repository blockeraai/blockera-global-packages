/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import { memo, useContext } from '@wordpress/element';

/**
 * Blockera dependencies
 */
import {
	Flex,
	InputControl,
	RepeaterContext,
	useControlContext,
	ControlContextProvider,
} from '@blockera/controls';

/**
 * Internal dependencies
 */
import BorderRadiusPresetPreview from './border-radius-preset-preview';
import {
	PresetEditorFields,
	SharedPresetControls,
	useDeferredPresetItemCommit,
	useDeferredScalarPresetField,
	useLatestPresetItem,
} from '../components';
import { type VariableType } from '../components/types';
import { getAllVariableSlugs as getAllBorderRadiusSlugs } from '../components/utils';

export type BorderRadiusDefaultPresetValue = {
	size: string;
	deletable: boolean;
	cloneable: boolean;
	isVisible: boolean;
	visibilitySupport: boolean;
};

function BorderRadiusSizeComponent({
	origin,
	borderRadiusSize,
	presetId,
}: {
	origin: string | string[];
	presetId: string | number;
	borderRadiusSize: VariableType & BorderRadiusDefaultPresetValue;
}) {
	const getItem = useLatestPresetItem(borderRadiusSize);
	const { slug } = borderRadiusSize;

	const {
		controlInfo: { name: controlId },
		dispatch: { changeRepeaterItem },
	} = useControlContext();
	const {
		onChange,
		repeaterId,
		valueCleanup,
		repeaterItems: sizes,
	} = useContext(RepeaterContext) as {
		disableRegenerateId?: boolean;
		onChange: (newValue: any) => void;
		valueCleanup: (value: any) => any;
		repeaterId: string | null | undefined;
		repeaterItems:
			| Record<
					string,
					Array<VariableType & BorderRadiusDefaultPresetValue>
			  >
			| undefined;
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

	const persistedSize =
		typeof borderRadiusSize.size === 'number'
			? String(borderRadiusSize.size)
			: borderRadiusSize.size;

	const {
		draft,
		onChange: handleRadiusChange,
		onFieldsBlur,
	} = useDeferredScalarPresetField({
		persistedValue: persistedSize,
		fieldKey: 'size',
		stagePatch,
		flush,
	});

	if (!origin || !slug) {
		return null;
	}

	const sizeForPreview = draft ?? '';

	const borderRadiusValueControls = (
		<ControlContextProvider
				value={{
					name: `border-radius-size-${slug}`,
					value: draft,
					attribute: 'blockeraBorderRadiusSize',
					blockName: 'global-styles',
				}}
			>
				<InputControl
					data-test="border-radius-size-input"
					label={__('Radius', 'blockera')}
					controlAddonTypes={[]}
					columns="1.2fr 3fr"
					min={0}
					unitType="essential"
					placeholder="0"
					labelDescription={
						<>
							<p>
								{__(
									'Sets the border radius preset value used in border controls across the site.',
									'blockera'
								)}
							</p>
							<p>
								{__(
									'Stored in theme.json as border.radiusSizes (size field). Use lengths such as px, rem, %, or fluid values like clamp().',
									'blockera'
								)}
							</p>
						</>
					}
					onChange={(newValue: string | undefined) =>
						handleRadiusChange(newValue ?? '')
					}
				/>
			</ControlContextProvider>
	);

	return (
		<Flex direction="column" gap="15px">
			<BorderRadiusPresetPreview size={sizeForPreview} />

			<SharedPresetControls
				itemId={presetId}
				variable={borderRadiusSize}
				name={borderRadiusSize.name}
				slug={borderRadiusSize.slug}
				allSlugs={getAllBorderRadiusSlugs(sizes)}
				onValueFieldsBlur={onFieldsBlur}
			>
				<PresetEditorFields signature={{ slug, draft }}>
					{borderRadiusValueControls}
				</PresetEditorFields>
			</SharedPresetControls>
		</Flex>
	);
}

export const BorderRadiusSize = memo(BorderRadiusSizeComponent);
