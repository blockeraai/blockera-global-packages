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
	RepeaterContext,
	useControlContext,
	GradientBarControl,
	ControlContextProvider,
} from '@blockera/controls';

/**
 * Internal dependencies
 */
import {
	PresetEditorFields,
	SharedPresetControls,
	useDeferredPresetItemCommit,
	useDeferredScalarPresetField,
	useLatestPresetItem,
} from '../components';
import { type VariableType } from '../components/types';
import { getAllVariableSlugs as getAllGradientSlugs } from '../components/utils';
import GradientPreview from './gradient-preview';

interface GradientPresetFieldsProps {
	origin: string | string[];
	presetId: string | number;
	gradientItem: VariableType & { gradient?: string };
	gradientType: 'linear-gradient' | 'radial-gradient';
}

function GradientPresetFieldsComponent({
	origin,
	presetId,
	gradientType,
	gradientItem,
}: GradientPresetFieldsProps) {
	const getItem = useLatestPresetItem(gradientItem);
	const { slug } = gradientItem;

	const {
		controlInfo: { name: controlId },
		dispatch: { changeRepeaterItem },
	} = useControlContext();
	const {
		onChange,
		repeaterId,
		valueCleanup,
		repeaterItems: gradients,
	} = useContext(RepeaterContext) as {
		onChange: (newValue: any) => void;
		valueCleanup: (value: any) => any;
		repeaterId: string | null | undefined;
		repeaterItems: (VariableType & { gradient?: string })[];
		getControlId?: (itemId: string | number, key: string) => string;
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
		onChange: handleGradientChange,
		onFieldsBlur,
	} = useDeferredScalarPresetField<string | undefined>({
		persistedValue: gradientItem.gradient,
		fieldKey: 'gradient',
		stagePatch,
		flush,
	});

	if (!origin || !slug) {
		return null;
	}

	const label =
		gradientType === 'linear-gradient'
			? __('Linear Gradient', 'blockera')
			: __('Radial Gradient', 'blockera');

	const gradientValueControls = (
		<ControlContextProvider
				value={{
					name: `gradient-value-${slug}`,
					value: draft,
					attribute: 'blockeraGradient',
					blockName: 'global-styles',
				}}
			>
				<GradientBarControl
					label={label}
					field="gradient-bar"
					height={40}
					columns="1.2fr 3fr"
					onChange={handleGradientChange}
				/>
			</ControlContextProvider>
	);

	return (
		<Flex direction="column" gap={15}>
			<GradientPreview gradient={draft} />

			<SharedPresetControls
				itemId={presetId}
				variable={gradientItem}
				name={gradientItem.name}
				slug={gradientItem.slug}
				allSlugs={getAllGradientSlugs(gradients as any)}
				onValueFieldsBlur={onFieldsBlur}
			>
				<PresetEditorFields signature={{ slug, draft, gradientType }}>
					{gradientValueControls}
				</PresetEditorFields>
			</SharedPresetControls>
		</Flex>
	);
}

export const GradientPresetFields = memo(GradientPresetFieldsComponent);
