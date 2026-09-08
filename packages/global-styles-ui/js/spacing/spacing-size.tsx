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
import SpacingSizePreview from './spacing-size-preview';
import {
	PresetEditorFields,
	SharedPresetControls,
	useCanEditGlobalStyles,
	useDeferredPresetItemCommit,
	useDeferredScalarPresetField,
	useLatestPresetItem,
} from '../components';
import { type VariableType } from '../components/types';
import { getAllVariableSlugs as getAllSpacingSlugs } from '../components/utils';

export type SpacingDefaultPresetValue = {
	size: string;
	isVisible: boolean;
	deletable: boolean;
	cloneable: boolean;
	visibilitySupport: boolean;
};

function SpacingSizeComponent({
	origin,
	spacingSize,
	presetId,
}: {
	origin: string | string[];
	presetId: string | number;
	spacingSize: VariableType & SpacingDefaultPresetValue;
}) {
	const getItem = useLatestPresetItem(spacingSize);
	const { slug } = spacingSize;
	const canEditGlobalStyles = useCanEditGlobalStyles();

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
			| Record<string, Array<VariableType & SpacingDefaultPresetValue>>
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

	const {
		draft,
		onChange: handleSizeChange,
		onFieldsBlur,
	} = useDeferredScalarPresetField({
		persistedValue: spacingSize.size,
		fieldKey: 'size',
		stagePatch,
		flush,
	});

	if (!origin || !slug) {
		return null;
	}

	const spacingSizeValueControls = (
		<ControlContextProvider
				value={{
					name: `spacing-size-${slug}`,
					value: draft,
					attribute: 'blockeraSpacingSize',
					blockName: 'global-styles',
				}}
			>
				<InputControl
					data-test="spacing-size-input"
					label={__('Size', 'blockera')}
					readOnly={!canEditGlobalStyles}
					controlAddonTypes={[]}
					labelDescription={
						<>
							<p>
								{__(
									'Sets the spacing preset value used for margin, padding, and gap controls across the site.',
									'blockera'
								)}
							</p>
							<p>
								{__(
									'You can use fixed lengths (px, rem), percentages, viewport units, or fluid values such as clamp().',
									'blockera'
								)}
							</p>
						</>
					}
					columns="1.2fr 3fr"
					unitType="general"
					min={0}
					onChange={(newValue: string | undefined) =>
						handleSizeChange(newValue as string)
					}
				/>
			</ControlContextProvider>
	);

	return (
		<Flex direction="column" gap="15px">
			<SpacingSizePreview size={draft} />

			<SharedPresetControls
				itemId={presetId}
				variable={spacingSize}
				name={spacingSize.name}
				slug={spacingSize.slug}
				allSlugs={getAllSpacingSlugs(sizes)}
				onValueFieldsBlur={onFieldsBlur}
			>
				<PresetEditorFields signature={{ slug, draft }}>
					{spacingSizeValueControls}
				</PresetEditorFields>
			</SharedPresetControls>
		</Flex>
	);
}

export const SpacingSize = memo(SpacingSizeComponent);
