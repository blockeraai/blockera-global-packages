/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import type {
	FluidTypographySettings,
	FluidTypographyConfig,
} from '@wordpress/global-styles-engine';
import {
	useCallback,
	memo,
	useContext,
	useEffect,
	useState,
} from '@wordpress/element';

/**
 * Blockera dependencies
 */
import {
	Flex,
	InputControl,
	ToggleControl,
	RepeaterContext,
	useControlContext,
	ControlContextProvider,
	isFocusLeavingElement,
} from '@blockera/controls';
import { shouldTrackComponentRender, trackComponentRender } from '@blockera/utils';

/**
 * Internal dependencies
 */
import type { DefaultPresetValue } from '.';
import FontSizePreview from './font-size-preview';
import {
	PresetEditorFields,
	SharedPresetControls,
	useDeferredPresetItemCommit,
	useLatestPresetItem,
} from '../../components';
import { useGlobalSetting } from '../../context/global-style-hooks';
import { type VariableType } from '../../components/types';
import { getAllVariableSlugs as getAllFontSizeSlugs } from '../../components/utils';

function FontSizeComponent({
	origin,
	fontSize,
	presetId,
}: {
	origin: string | string[];
	presetId: string | number;
	fontSize: VariableType & DefaultPresetValue;
}) {
	if (shouldTrackComponentRender()) {
		trackComponentRender('FontSizePresetFields', {
			id: fontSize?.slug,
			name: fontSize?.slug,
		});
	}

	const getItem = useLatestPresetItem(fontSize);
	const { slug } = fontSize;

	const [globalFluid] = useGlobalSetting<
		boolean | FluidTypographySettings | undefined
	>('typography.fluid');

	// Whether the font size is fluid. If not defined, use the global fluid value of the theme.
	const isFluid =
		fontSize?.fluid !== undefined ? !!fontSize.fluid : !!globalFluid;

	// Whether custom fluid values are used.
	const isCustomFluid = typeof fontSize?.fluid === 'object';

	// Use RepeaterContext and changeRepeaterItem for updates (single source of truth via repeater store).
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
			| Record<string, Array<VariableType & DefaultPresetValue>>
			| undefined;
		itemIdGenerator?: (itemId: string | number) => string;
	};

	const { stagePatch, commitPatch, flush } = useDeferredPresetItemCommit({
		changeRepeaterItem,
		onChange,
		valueCleanup,
		controlId,
		repeaterId,
		itemId: presetId,
		getItem,
	});

	const [draftSize, setDraftSize] = useState(fontSize.size);
	const persistedFluidMin =
		typeof fontSize.fluid === 'object' ? fontSize.fluid?.min : undefined;
	const persistedFluidMax =
		typeof fontSize.fluid === 'object' ? fontSize.fluid?.max : undefined;
	const [draftFluidMin, setDraftFluidMin] = useState(persistedFluidMin);
	const [draftFluidMax, setDraftFluidMax] = useState(persistedFluidMax);

	useEffect(() => {
		setDraftSize(fontSize.size);
	}, [fontSize.size]);

	useEffect(() => {
		setDraftFluidMin(persistedFluidMin);
	}, [persistedFluidMin]);

	useEffect(() => {
		setDraftFluidMax(persistedFluidMax);
	}, [persistedFluidMax]);

	const handleFontSizeChange = useCallback(
		(value: string | undefined) => {
			setDraftSize(value);
			stagePatch({ size: value });
		},
		[stagePatch]
	);

	const handleFontSizeFieldsBlur = useCallback(
		(event: {
			currentTarget: EventTarget;
			relatedTarget: EventTarget | null;
		}) => {
			if (!isFocusLeavingElement(event)) {
				return;
			}

			flush();
		},
		[flush]
	);

	const updateFontSizeViaRepeater = useCallback(
		(key: string, value: any) => {
			commitPatch({ [key]: value });
		},
		[commitPatch]
	);

	const handleFluidChange = useCallback(
		(value: boolean) => {
			updateFontSizeViaRepeater('fluid', value);
		},
		[updateFontSizeViaRepeater]
	);

	const handleCustomFluidValues = useCallback(
		(value: boolean) => {
			const current = getItem();
			if (value) {
				updateFontSizeViaRepeater('fluid', {
					min: current.size,
					max: current.size,
				});
			} else {
				updateFontSizeViaRepeater('fluid', true);
			}
		},
		[updateFontSizeViaRepeater, getItem]
	);

	const handleMinChange = useCallback(
		(value: string | undefined) => {
			const current = getItem();
			const fluid: FluidTypographyConfig =
				typeof current.fluid === 'object' ? current.fluid : {};
			setDraftFluidMin(value);
			stagePatch({ fluid: { ...fluid, min: value } });
		},
		[stagePatch, getItem]
	);

	const handleMaxChange = useCallback(
		(value: string | undefined) => {
			const current = getItem();
			const fluid: FluidTypographyConfig =
				typeof current.fluid === 'object' ? current.fluid : {};
			setDraftFluidMax(value);
			stagePatch({ fluid: { ...fluid, max: value } });
		},
		[stagePatch, getItem]
	);

	if (!origin || !slug) {
		return null;
	}

	const fontSizeValueControls = (
		<>
			<ControlContextProvider
				value={{
					name: `font-size-size-${slug}`,
					value: !isCustomFluid ? draftSize : undefined,
					attribute: 'blockeraFontSize',
					blockName: 'global-styles',
				}}
			>
				<InputControl
					label={__('Font Size', 'blockera')}
					controlAddonTypes={[]}
					labelDescription={
						<>
							<p>
								{__(
									'It sets the size of the font for text content, allowing customization of text appearance for readability and aesthetic appeal in various contexts.',
									'blockera'
								)}
							</p>
							<p>
								{__(
									'Relative units like "em" and "rem" are recommended for responsive designs as they adjust based on parent font size or root font size, respectively.',
									'blockera'
								)}
							</p>
						</>
					}
					columns="1.2fr 3fr"
					unitType="essential"
					min={0}
					onChange={(newValue: string | undefined) =>
						handleFontSizeChange(newValue)
					}
					disabled={isCustomFluid}
				>
					<ControlContextProvider
						value={{
							name: `font-size-is-fluid-${slug}`,
							value: isFluid,
							attribute: 'blockeraFontSizeIsFluid',
							blockName: 'global-styles',
						}}
					>
						<ToggleControl
							labelType={'self'}
							label={__('Fluid', 'blockera')}
							onChange={handleFluidChange}
						/>
					</ControlContextProvider>

					{isFluid && (
						<ControlContextProvider
							value={{
								name: `font-size-${slug}-custom-fluid`,
								value: isCustomFluid,
								attribute: 'blockeraFontSizeCustomFluid',
								blockName: 'global-styles',
							}}
						>
							<ToggleControl
								labelType={'self'}
								label={__('Custom Fluid', 'blockera')}
								onChange={handleCustomFluidValues}
							/>
						</ControlContextProvider>
					)}

					{isCustomFluid && (
						<>
							<ControlContextProvider
								value={{
									name: `font-size-min-${slug}`,
									value: draftFluidMin,
									attribute: 'blockeraFontSize',
									blockName: 'global-styles',
								}}
							>
								<InputControl
									label={__('Min Size', 'blockera')}
									columns="2fr 2fr"
									controlAddonTypes={[]}
									unitType="essential"
									min={0}
									onChange={(newValue: string | undefined) =>
										handleMinChange(newValue)
									}
									style={{ margin: '0px' }}
								/>
							</ControlContextProvider>

							<ControlContextProvider
								value={{
									name: `font-size-max-${slug}`,
									value: draftFluidMax,
									attribute: 'blockeraFontSize',
									blockName: 'global-styles',
								}}
							>
								<InputControl
									label={__('Max Size', 'blockera')}
									columns="2fr 2fr"
									unitType="essential"
									min={0}
									onChange={(newValue: string | undefined) =>
										handleMaxChange(newValue)
									}
									controlAddonTypes={[]}
									style={{ margin: '0px' }}
								/>
							</ControlContextProvider>
						</>
					)}
				</InputControl>
			</ControlContextProvider>
		</>
	);

	return (
		<Flex direction="column" gap={15}>
			<FontSizePreview fontSize={{ ...fontSize, size: draftSize }} />

			<SharedPresetControls
				itemId={presetId}
				variable={fontSize}
				name={fontSize.name}
				slug={fontSize.slug}
				allSlugs={getAllFontSizeSlugs(sizes)}
				onValueFieldsBlur={handleFontSizeFieldsBlur}
			>
				<PresetEditorFields
					signature={{
						slug,
						draftSize,
						draftFluidMin,
						draftFluidMax,
						isFluid,
						isCustomFluid,
					}}
				>
					{fontSizeValueControls}
				</PresetEditorFields>
			</SharedPresetControls>
		</Flex>
	);
}

export const FontSize = memo(FontSizeComponent);
