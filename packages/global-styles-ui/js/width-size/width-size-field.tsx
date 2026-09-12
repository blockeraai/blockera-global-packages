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
import {
	PresetEditorFields,
	SharedPresetControls,
	useCanEditGlobalStyles,
	useDeferredPresetItemCommit,
	useDeferredScalarPresetField,
	useLatestPresetItem,
} from '../components';
import { type VariableType } from '../components/types';
import { getAllVariableSlugs as getAllWidthSizeSlugs } from '../components/utils';

export type WidthSizeDefaultPresetValue = {
	size: string;
	isVisible: boolean;
	deletable: boolean;
	cloneable: boolean;
	visibilitySupport: boolean;
};

function WidthSizeFieldComponent({
	origin,
	widthSize,
	presetId,
}: {
	origin: string | string[];
	presetId: string | number;
	widthSize: VariableType & WidthSizeDefaultPresetValue;
}) {
	const getItem = useLatestPresetItem(widthSize);
	const { slug } = widthSize;
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
		onChange: (newValue: unknown) => void;
		valueCleanup: (value: unknown) => unknown;
		repeaterId: string | null | undefined;
		repeaterItems:
			| Record<string, VariableType & WidthSizeDefaultPresetValue>
			| undefined;
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
		persistedValue: widthSize.size,
		fieldKey: 'size',
		stagePatch,
		flush,
	});

	if (!origin || !slug) {
		return null;
	}

	const widthSizeValueControls = (
		<ControlContextProvider
				value={{
					name: `width-size-${slug}`,
					value: draft,
					attribute: 'blockeraWidthSize',
					blockName: 'global-styles',
				}}
			>
				<InputControl
					data-test="width-size-input"
					label={__('Size', 'blockera')}
					readOnly={!canEditGlobalStyles}
					controlAddonTypes={[]}
					labelDescription={
						<>
							<p>
								{__(
									'Sets the width size preset value used for width and height controls across the site.',
									'blockera'
								)}
							</p>
							<p>
								{__(
									'Stored in theme.json as layout.widthSizes (size field). Use lengths such as px, rem, %, or clamp().',
									'blockera'
								)}
							</p>
						</>
					}
					columns="1.2fr 3fr"
					unitType="general"
					min={0}
					onChange={handleSizeChange}
				/>
			</ControlContextProvider>
	);

	return (
		<Flex direction="column" gap="15px">
			<SharedPresetControls
				itemId={presetId}
				variable={widthSize}
				name={widthSize.name}
				slug={widthSize.slug}
				allSlugs={getAllWidthSizeSlugs(sizes)}
				onValueFieldsBlur={onFieldsBlur}
			>
				<PresetEditorFields signature={{ slug, draft }}>
					{widthSizeValueControls}
				</PresetEditorFields>
			</SharedPresetControls>
		</Flex>
	);
}

export const WidthSizeField = memo(WidthSizeFieldComponent);
