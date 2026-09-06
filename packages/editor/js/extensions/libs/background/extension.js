// @flow
/**
 * External dependencies
 */
import { __ } from '@wordpress/i18n';
import type { MixedElement, ComponentType } from 'react';

/**
 * Blockera dependencies
 */
import { PanelBodyControl } from '@blockera/controls';
import { extensionClassNames } from '@blockera/classnames';
import { Icon } from '@blockera/icons';

/**
 * Internal dependencies
 */
import { isShowField, isActiveExtension } from '../../api/utils';
import { ExtensionSettings } from '../settings';
import { EditorFeatureWrapper } from '../../..';
import { useBlockSection } from '../../components';
import { useFeatureSearch } from '../../components/feature-search-context';
import type { TBackgroundProps } from './types/background-props';
import {
	BackgroundClipping,
	BackgroundColorField,
	BackgroundLayersField,
	Blending,
} from './components';

export const BackgroundExtension: ComponentType<TBackgroundProps> = ({
	block,
	values,
	attributes,
	extensionConfig,
	handleOnChangeAttributes,
	extensionProps,
	setSettings,
}: TBackgroundProps): MixedElement => {
	const { initialOpen, onToggle } = useBlockSection('backgroundConfig');
	const { activeSearchMode } = useFeatureSearch();

	if (!isActiveExtension(extensionConfig)) {
		return <></>;
	}

	const {
		blockeraBackground,
		blockeraBackgroundColor,
		blockeraBackgroundClip,
	} = extensionConfig;

	const isShowBackground = isShowField(
		extensionConfig.blockeraBackground,
		values.blockeraBackground,
		attributes.blockeraBackground.default
	);
	const isShowBackgroundColor = isShowField(
		extensionConfig.blockeraBackgroundColor,
		values.blockeraBackgroundColor,
		attributes.blockeraBackgroundColor.default
	);
	const isShowBackgroundClip = isShowField(
		extensionConfig.blockeraBackgroundClip,
		values.blockeraBackgroundClip,
		attributes.blockeraBackgroundClip.default
	);
	const isShowBlendMode = isShowField(
		extensionConfig.blockeraBlendMode,
		values?.blockeraBlendMode,
		attributes.blockeraBlendMode.default
	);

	if (
		!isShowBackground &&
		!isShowBackgroundColor &&
		!isShowBackgroundClip &&
		!isShowBlendMode
	) {
		return <></>;
	}

	return (
		<PanelBodyControl
			title={__('Background', 'blockera')}
			initialOpen={initialOpen}
			icon={<Icon icon="extension-background" />}
			className={extensionClassNames('background')}
			onToggle={onToggle}
		>
			{!activeSearchMode && (
				<ExtensionSettings
					buttonLabel={__('More Background Settings', 'blockera')}
					features={extensionConfig}
					update={(newSettings) => {
						setSettings(newSettings, 'backgroundConfig');
					}}
				/>
			)}

			<EditorFeatureWrapper
				isActive={isShowBackground}
				config={blockeraBackground}
			>
				<BackgroundLayersField
					block={block}
					value={values.blockeraBackground}
					defaultValue={attributes.blockeraBackground.default}
					onChange={handleOnChangeAttributes}
					{...extensionProps.blockeraBackground}
				/>
			</EditorFeatureWrapper>

			<EditorFeatureWrapper
				isActive={isShowBackgroundColor}
				config={blockeraBackgroundColor}
			>
				<BackgroundColorField
					block={block}
					value={values.blockeraBackgroundColor}
					defaultValue={attributes.blockeraBackgroundColor.default}
					onChange={handleOnChangeAttributes}
					{...extensionProps.blockeraBackgroundColor}
				/>
			</EditorFeatureWrapper>

			<EditorFeatureWrapper
				isActive={isShowBackgroundClip}
				config={blockeraBackgroundClip}
			>
				<BackgroundClipping
					block={block}
					value={values.blockeraBackgroundClip}
					backgroundItems={values.blockeraBackground}
					backgroundColor={values.blockeraBackgroundColor}
					onChange={handleOnChangeAttributes}
					defaultValue={attributes.blockeraBackgroundClip.default}
					options={blockeraBackgroundClip?.config?.options}
					{...extensionProps.blockeraBackgroundClip}
				/>
			</EditorFeatureWrapper>

			<EditorFeatureWrapper
				isActive={isShowBlendMode}
				config={extensionConfig.blockeraBlendMode}
			>
				<Blending
					blendMode={values.blockeraBlendMode}
					block={block}
					handleOnChangeAttributes={handleOnChangeAttributes}
					defaultValue={attributes.blockeraBlendMode.default}
					{...extensionProps.blockeraBlendMode}
				/>
			</EditorFeatureWrapper>
		</PanelBodyControl>
	);
};
