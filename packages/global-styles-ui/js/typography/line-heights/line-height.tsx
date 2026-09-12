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
import type { DefaultPresetValue } from '.';
import LineHeightPreview from './line-height-preview';
import {
	PresetEditorFields,
	SharedPresetControls,
	useDeferredPresetItemCommit,
	useDeferredScalarPresetField,
	useLatestPresetItem,
} from '../../components';
import { type VariableType } from '../../components/types';
import { getAllVariableSlugs as getAllLineHeightSlugs } from '../../components/utils';

function LineHeightComponent({
	origin,
	lineHeight,
	presetId,
}: {
	origin: string | string[];
	presetId: string | number;
	lineHeight: VariableType & DefaultPresetValue;
}) {
	const getItem = useLatestPresetItem(lineHeight);
	const { slug } = lineHeight;

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
		onChange: (newValue: any) => void;
		valueCleanup: (value: any) => any;
		repeaterId: string | null | undefined;
		repeaterItems:
			| Record<string, Array<VariableType & DefaultPresetValue>>
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
		onChange: handleLineHeightChange,
		onFieldsBlur,
	} = useDeferredScalarPresetField({
		persistedValue: lineHeight.size,
		fieldKey: 'size',
		stagePatch,
		flush,
	});

	if (!origin || !slug) {
		return null;
	}

	const lineHeightValueControls = (
		<ControlContextProvider
				value={{
					name: `line-height-size-${slug}`,
					value: draft,
					attribute: 'blockeraLineHeight',
					blockName: 'global-styles',
				}}
			>
				<InputControl
					label={__('Line Height', 'blockera')}
					controlAddonTypes={[]}
					labelDescription={
						<>
							<p>
								{__(
									'It sets the height of a line box, crucial for determining the vertical spacing within text content, enhancing readability and text flow.',
									'blockera'
								)}
							</p>
							<p>
								{__(
									'Line height can be specified without a unit, as a multiplier of the font size (1.5), or with length units like pixels (px), ems (em).',
									'blockera'
								)}
							</p>
						</>
					}
					columns="1.2fr 3fr"
					unitType="line-height"
					min={0}
					onChange={(newValue: string | undefined) =>
						handleLineHeightChange(newValue as string)
					}
				/>
			</ControlContextProvider>
	);

	return (
		<Flex direction="column" gap={15}>
			<LineHeightPreview lineHeight={{ ...lineHeight, size: draft }} />

			<SharedPresetControls
				itemId={presetId}
				variable={lineHeight}
				name={lineHeight.name}
				slug={lineHeight.slug}
				allSlugs={getAllLineHeightSlugs(sizes)}
				onValueFieldsBlur={onFieldsBlur}
			>
				<PresetEditorFields signature={{ slug, draft }}>
					{lineHeightValueControls}
				</PresetEditorFields>
			</SharedPresetControls>
		</Flex>
	);
}

export const LineHeight = memo(LineHeightComponent);
