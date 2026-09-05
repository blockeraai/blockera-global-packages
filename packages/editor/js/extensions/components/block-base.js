// @flow

/**
 * External dependencies
 */
import { ErrorBoundary } from 'react-error-boundary';
import type { Element, ComponentType, MixedElement } from 'react';
import { select, dispatch, useDispatch, useRegistry } from '@wordpress/data';
import {
	createContext,
	useContext,
	useRef,
	useMemo,
	useState,
	useEffect,
	useLayoutEffect,
	useCallback,
	memo,
	// StrictMode,
} from '@wordpress/element';
import { arePropsEqual } from '../../hooks/use-trace-update';

/**
 * Blockera dependencies
 */
import {
	BaseControlContext,
	BlockInjectedSlotContext,
	PresetCanvasPreviewContext,
	PreviewInjectableStylesContext,
} from '@blockera/controls';
import { useBlockFeatures } from '@blockera/features-core';
import {
	isEquals,
	cloneObject,
	mergeObject,
	getBlockeraId,
	isBlockeraBlockModeBasic,
	hasBlockeraFeatureAttributes,
	needsLegacyBlockeraIdMigrate,
	migrateLegacyBlockeraIds,
	remintBlockeraIdentity,
	stripBlockeraBlockClasses,
	stripBlockeraIdentity,
	withBlockeraBlockClassFromId,
	withoutBlockeraIdentityIfUnused,
	withCleanedWpStyle,
} from '@blockera/utils';
import { classNames } from '@blockera/classnames';
import { generalBlockFeatures } from '@blockera/blocks-core/js/libs/general-block-features';

/**
 * Internal dependencies
 */
import { BlockStyle, StylesWrapper } from '../../style-engine';
import { BlockEditContextProvider } from '.';
import { useAttributes } from '../../hooks/use-attributes';
import { useInnerBlocksInfo } from '../../hooks/use-inner-blocks-info';
import { useCalculateCurrentAttributes } from '../../hooks/use-calculate-current-attributes';
import { useDisplayBlockControls } from '../../hooks/use-display-block-controls';
import { getBlockVariationSupport } from '../../editor/global-styles/panel/block-variation-support';
import { isInnerBlock } from './utils';
import { isBaseBreakpoint } from '../..';
import { SideEffect } from '../libs/base';
import { BlockeraTextAlignToolbar } from '../libs/typography/components/blockera-text-align-toolbar';
import { BlockeraLayoutToolbar } from '../libs/layout/components/blockera-layout-toolbar';
import { BlockPartials } from './block-partials';
import { BlockFillPartials } from './block-fill-partials';
import { sanitizeBlockAttributes } from '../hooks/utils';
import {
	buildPresetPreviewAttributePatch,
	mergeAttributesWithPresetPreviewPatch,
} from '../libs/preset-preview-attributes';
import { BlockInspectorEditContent } from './block-inspector-edit-content';
import { BlockInspectorTabSync } from './block-inspector-tab-sync';
import { BlockBaseInspectorBundle } from './block-base-inspector-bundle';
import { useBlockBaseStoreSelect } from './use-block-base-store-select';
import { trackBlockBaseRender } from './track-block-base-render';
import { enqueueBlockAttributePersist } from './persist-attribute-queue';
import { shouldFlushGlobalStylesEntityNow } from './should-flush-global-styles-entity';
import { blockInspectorTabPersistence } from './use-sync-block-inspector-tab';
import type { UpdateBlockEditorSettings } from '../libs/types';
import { ErrorBoundaryFallback } from '../hooks/block-settings';
import { getAttributesWithIds } from '../../hooks/use-attributes';
import { useCleanupStyles } from '../../hooks/use-cleanup-styles';
import { isVirtualBlock } from '../libs/block-card/inner-blocks/utils';
import {
	unstableBootstrapBlockStatesDefinitions,
	unstableBootstrapInnerBlockStatesDefinitions,
} from '../libs/block-card/block-states/bootstrap';
import {
	generalBlockStates,
	generalInnerBlockStates,
} from '../libs/block-card/block-states/states';
import {
	getCompatibleAttributes,
	shouldRunWpToBlockeraHydrate,
	unwrapBlockeraStoredValue,
} from './get-compatible-attributes';
import { isBlockeraEngineSkippedForClient } from './is-blockera-engine-skipped';
import { getBlockCSSSelector } from '../../style-engine/get-block-css-selector';
import { useGlobalStylesPanelContext } from '../../editor/global-styles/panel/context';
import {
	EditorFeatureWrapper,
	EditorAdvancedLabelControl,
} from '../../components';
import {
	registerClassName,
	isClassNameDuplicate,
	unregisterClassName,
	hasRegisteredClassName,
	removeRegisteredClassName,
	getBlocksClassNamesFromStore,
	getBlockeraClassTokens,
	BLOCKERA_BLOCK_REGEX,
} from './registered-classnames';

const BLOCKERA_DELAY_EXPECTED_TIME = 1000;

function remintAndRegisterIdentity(
	clientId: string,
	attributes: Object
): Object {
	const reminted = remintBlockeraIdentity(cloneObject(attributes));
	registerClassName(
		clientId,
		`blockera-block-${String(reminted.blockeraId)}`
	);
	return reminted;
}

function getBlockeraPersistSchema(
	availableAttributes: ?Object,
	originDefaultAttributes: ?Object
): ?Object {
	if (
		availableAttributes?.blockeraId ||
		availableAttributes?.blockeraPropsId
	) {
		return availableAttributes;
	}

	return originDefaultAttributes;
}

function storedLayoutFieldDiffers(left: mixed, right: mixed): boolean {
	return !isEquals(
		unwrapBlockeraStoredValue(left),
		unwrapBlockeraStoredValue(right)
	);
}

const GlobalStylesPanelBaseControlConfigContext: Object = createContext({
	name: '',
	clientId: '',
	getAttributes: () => ({}),
});

const GlobalStylesFeatureWrapper = memo((props: Object): MixedElement => {
	const { name, clientId } = useContext(
		GlobalStylesPanelBaseControlConfigContext
	);
	return <EditorFeatureWrapper {...props} name={name} clientId={clientId} />;
});

const GlobalStylesAdvancedLabelControl = memo((props: Object): MixedElement => {
	const { getAttributesRef, clientId } = useContext(
		GlobalStylesPanelBaseControlConfigContext
	);
	return (
		<EditorAdvancedLabelControl
			{...props}
			inGlobalStylesPanel={true}
			getAttributesRef={getAttributesRef}
			clientId={clientId}
		/>
	);
});

const GLOBAL_STYLES_BASE_CONTROL_COMPONENTS = {
	FeatureWrapper: GlobalStylesFeatureWrapper,
	AdvancedLabelControl: GlobalStylesAdvancedLabelControl,
};

const BlockBaseImpl = (_props: Object): Element<any> | null => {
	const {
		currentBlockStyleVariation,
		setCurrentBlockStyleVariation,
		handleOnChangeStyleInLocalState,
		extensionsUiContext,
	} = useGlobalStylesPanelContext();
	const {
		name,
		clientId,
		children,
		isSelected,
		additional,
		defaultAttributes,
		originDefaultAttributes,
		attributes: blockAttributes,
		insideBlockInspector = true,
		setAttributes: setBlockAttributes,
		...props
	} = _props;

	const registry = useRegistry();

	// No-op unless window.__BLOCKERA_BLOCK_BASE_RENDER_DEBUG__ is set
	// (Cypress BlockBase re-render spec). Counts this render for idle /
	// sibling-edit budgets; iframe instances report to the parent window.
	trackBlockBaseRender({
		clientId,
		name,
		isSelected,
		insideBlockInspector,
	});

	const [notice, setNotice] = useState(null);
	const [extraPreviewCss, setExtraPreviewCss] = useState('');
	const [presetPreviewAttributePatch, setPresetPreviewAttributePatch] =
		useState(null);
	const [isReportingErrorCompleted, setIsReportingErrorCompleted] =
		useState(false);
	const inspectorTabPersistenceRef = useRef({
		blockName: name,
		blockVariation: '',
	});

	const [currentTab, _setCurrentTab] = useState(() => {
		const persistedTab = blockInspectorTabPersistence.get(name, '');

		// Persisted tab or Styles default for two-tab blocks; >2-tab defaults are
		// resolved when the selected block mounts (see useSyncBlockInspectorTab).
		return persistedTab || 'styles';
	});

	const setCurrentTab = useCallback(
		(nextTab) => {
			if (typeof nextTab !== 'string' || !nextTab) {
				return;
			}

			if (insideBlockInspector) {
				const { blockName, blockVariation } =
					inspectorTabPersistenceRef.current;

				blockInspectorTabPersistence.set(
					blockName,
					blockVariation,
					nextTab
				);
			}

			_setCurrentTab((previousTab) =>
				previousTab === nextTab ? previousTab : nextTab
			);
		},
		[insideBlockInspector]
	);

	// Match InspectorControls: mount inspector UI only for the selected block (or homogenous multi-select).
	const displayBlockControls = useDisplayBlockControls();
	const changesetsBridgeRef = useRef({
		setChangesets: () => {},
	});
	const inspectorTabSetterRef = useRef(setCurrentTab);

	inspectorTabSetterRef.current = setCurrentTab;

	const setInspectorTab = useCallback((nextTab) => {
		inspectorTabSetterRef.current(nextTab);
	}, []);

	const registerInspectorTabSetter = useCallback((setter) => {
		inspectorTabSetterRef.current = setter;
	}, []);

	const {
		deviceType,
		currentBlock,
		currentState,
		currentBreakpoint,
		currentInnerBlockState,
		editorSelectedBlockEvent,
		supports,
		selectors,
		blockVariations,
		availableAttributes,
		activeBlockVariation,
	} = useBlockBaseStoreSelect({
		clientId,
		name,
		isSelected,
		insideBlockInspector,
		attributes: blockAttributes,
	});

	const getActiveBlockVariation = useCallback(
		(blockName: string, blockAttrs: Object) =>
			select('core/blocks').getActiveBlockVariation(
				blockName,
				blockAttrs
			),
		[]
	);

	inspectorTabPersistenceRef.current = {
		blockName: name,
		blockVariation: activeBlockVariation?.name || '',
	};

	// Stable getter for blockera class names from all blocks' attributes (for duplicate detection).
	// Uses select() on demand instead of useSelect to avoid subscribing to block-editor store
	// and triggering re-renders on every block change.
	const getBlocksClassNames = useCallback(() => {
		const blockEditor = select('core/block-editor');
		return getBlocksClassNamesFromStore(
			() => blockEditor.getBlocks(),
			(id) => blockEditor.getBlockAttributes(id) || {}
		);
	}, []);

	const blockAttributesRef = useRef(blockAttributes);
	blockAttributesRef.current = blockAttributes;
	const pendingReturnCompatRef = useRef(false);
	const persistReturnCompatRef = useRef(false);
	const resetPendingAttributesRef = useRef(() => {});
	const isTreeSkipped = isBlockeraEngineSkippedForClient(
		clientId,
		blockAttributes
	);
	const isActive = !isTreeSkipped;
	const setActive = useCallback(
		(nextActive: boolean) => {
			const next = cloneObject(blockAttributesRef.current);
			if (nextActive) {
				if (isBlockeraBlockModeBasic(next)) {
					pendingReturnCompatRef.current = true;
					persistReturnCompatRef.current = true;
				}
				next.blockeraBlockMode = 'advanced';
				const id = getBlockeraId(next);
				if (id) {
					const restored = withBlockeraBlockClassFromId({
						...next,
						blockeraId: id,
					});
					next.className = restored.className;
				}
			} else {
				next.blockeraBlockMode = 'basic';
				if (typeof next.className === 'string') {
					next.className = stripBlockeraBlockClasses(next.className);
				}
			}
			// Drop the overlay so WP→Blockera on return-to-advanced can persist.
			resetPendingAttributesRef.current();
			setBlockAttributes(next);
		},
		[setBlockAttributes]
	);

	const {
		changeExtensionCurrentBlock: changeExtensionCurrentBlockDispatch,
		changeExtensionCurrentBlockState: setCurrentState,
		changeExtensionInnerBlockState: setInnerBlockState,
	} = useDispatch('blockera/extensions') || {};

	const setCurrentBlock = useCallback(
		(value) => {
			const uiContext = insideBlockInspector
				? undefined
				: extensionsUiContext;

			changeExtensionCurrentBlockDispatch(value, uiContext);
		},
		[
			insideBlockInspector,
			extensionsUiContext,
			changeExtensionCurrentBlockDispatch,
		]
	);

	const masterIsNormalState = useCallback(
		(): boolean =>
			'normal' === currentState && isBaseBreakpoint(deviceType),
		[currentState, deviceType]
	);

	const isNormalState = useCallback((): boolean => {
		if (isInnerBlock(currentBlock)) {
			return (
				'normal' === currentInnerBlockState &&
				isBaseBreakpoint(deviceType)
			);
		}

		return masterIsNormalState();
	}, [currentBlock, currentInnerBlockState, deviceType, masterIsNormalState]);

	const args = useMemo(
		() => ({
			blockId: name,
			blockClientId: clientId,
			insideBlockInspector,
			editorSelectedBlockEvent,
			isMasterNormalState: masterIsNormalState(),
			isNormalState: isNormalState(),
			isMasterBlock: !isInnerBlock(currentBlock),
			isBaseBreakpoint: isBaseBreakpoint(currentBreakpoint),
			currentBreakpoint,
			currentBlock,
			currentState: isInnerBlock(currentBlock)
				? currentInnerBlockState
				: currentState,
			blockVariations,
			activeBlockVariation,
			getActiveBlockVariation,
			blockAttributes: originDefaultAttributes,
			innerBlocks: additional?.blockeraInnerBlocks,
		}),
		[
			name,
			clientId,
			currentBlock,
			currentState,
			isNormalState,
			blockVariations,
			currentBreakpoint,
			masterIsNormalState,
			activeBlockVariation,
			insideBlockInspector,
			currentInnerBlockState,
			getActiveBlockVariation,
			originDefaultAttributes,
			editorSelectedBlockEvent,
			additional?.blockeraInnerBlocks,
		]
	);

	// Store the unique classname for this block instance.
	// Generate it once on mount using useMemo (runs during render, memoized by clientId).
	const uniqueClassName = useMemo(() => {
		if (isBlockeraEngineSkippedForClient(clientId, blockAttributes)) {
			return '';
		}

		const tokens = getBlockeraClassTokens(blockAttributes?.className);
		const id = getBlockeraId(blockAttributes);
		const fromId = id ? `blockera-block-${String(id)}` : '';

		for (let i = 0; i < tokens.length; i++) {
			registerClassName(clientId, tokens[i]);
		}
		if (fromId && tokens.indexOf(fromId) === -1) {
			registerClassName(clientId, fromId);
		}

		return tokens[0] || fromId;
	}, [
		clientId,
		isTreeSkipped,
		blockAttributes?.blockeraId,
		blockAttributes?.blockeraPropsId,
		blockAttributes?.blockeraCompatId,
		blockAttributes?.className,
	]);

	// Track if this is the first calculation to ensure unique classname on mount
	const isFirstCalculationRef = useRef(true);
	const previousClientIdRef = useRef(clientId);
	const compatibleAttributesRef = useRef(null);

	// Reset first calculation flag when clientId changes (e.g., block copied)
	if (previousClientIdRef.current !== clientId) {
		isFirstCalculationRef.current = true;
		previousClientIdRef.current = clientId;
	}

	// Cleanup: unregister the classname when component unmounts.
	useEffect(() => {
		return () => {
			if (uniqueClassName) {
				unregisterClassName(clientId, uniqueClassName);
			}
		};
	}, [clientId, uniqueClassName]);

	const compatibleAttributes = useMemo(() => {
		const sourceAttributes = cloneObject(blockAttributes);

		const hasFeatures = hasBlockeraFeatureAttributes(
			sourceAttributes,
			originDefaultAttributes
		);
		const shouldRunWpToBlockera = shouldRunWpToBlockeraHydrate({
			isActive,
			pendingReturn: pendingReturnCompatRef.current,
			hasFeatures,
			insideBlockInspector,
		});

		if (pendingReturnCompatRef.current && isActive) {
			pendingReturnCompatRef.current = false;
		}

		const compatibleAttributes = getCompatibleAttributes({
			args,
			isActive,
			availableAttributes,
			runWpToBlockera: shouldRunWpToBlockera,
			stampIdentity:
				Boolean(getBlockeraId(sourceAttributes)) ||
				persistReturnCompatRef.current ||
				hasFeatures,
			attributes: sourceAttributes,
			defaultAttributes: originDefaultAttributes,
		});

		if (!isActive) {
			isFirstCalculationRef.current = false;
			return compatibleAttributes;
		}

		const classNameStr = compatibleAttributes?.className || '';
		const isFirstCalculation = isFirstCalculationRef.current;

		// On first calculation (mount), ensure unique classname is properly set
		// only after identity exists in the Gutenberg store.
		if (isFirstCalculation) {
			isFirstCalculationRef.current = false;

			if (!uniqueClassName) {
				return compatibleAttributes;
			}

			// Extract existing blockera-block classnames from className
			const classNameParts = classNameStr.split(/\s+/).filter(Boolean);
			let generatedClassname = '';

			classNameParts.forEach((part) => {
				if (BLOCKERA_BLOCK_REGEX.test(part)) {
					const token = uniqueClassName || part;
					if (part !== token && hasRegisteredClassName(part)) {
						removeRegisteredClassName(part);
					}
					if (
						generatedClassname &&
						-1 !== generatedClassname.indexOf(token)
					) {
						return;
					}
					generatedClassname += !generatedClassname
						? token
						: ` ${token}`;
				} else {
					// Add the classname to the new classname if it's not a blockera-block classname.
					generatedClassname += !generatedClassname
						? part
						: ` ${part}`;
				}
			});

			// If block default classname is empty.
			if (!generatedClassname) {
				if (!uniqueClassName) {
					return compatibleAttributes;
				}
				return {
					...compatibleAttributes,
					className: classNames('blockera-block', {
						[uniqueClassName]: true,
					}),
				};
			}

			return {
				...compatibleAttributes,
				// Build the new className with unique classname and other classes
				className:
					-1 === generatedClassname.indexOf('blockera-block ')
						? `blockera-block ${generatedClassname}`
						: generatedClassname,
			};
		} else if (
			uniqueClassName &&
			!classNameStr.match(BLOCKERA_BLOCK_REGEX)?.[0]
		) {
			return {
				...compatibleAttributes,
				className: classNameStr
					? `${classNameStr} blockera-block ${uniqueClassName}`
					: `blockera-block ${uniqueClassName}`,
			};
		}

		return compatibleAttributes;
	}, [
		args,
		isActive,
		blockAttributes,
		uniqueClassName,
		availableAttributes,
		originDefaultAttributes,
		insideBlockInspector,
	]);

	// Single source of truth: compatibleAttributes (derived from blockAttributes).
	// pendingAttributes is only set during user edits; cleared when derived value updates.
	const [pendingAttributes, setPendingAttributes] = useState(null);
	resetPendingAttributesRef.current = () => setPendingAttributes(null);
	const attributes = pendingAttributes ?? compatibleAttributes;
	const attributesRef = useRef(attributes);
	attributesRef.current = attributes;
	const { className } = attributes;

	useLayoutEffect(() => {
		let next = blockAttributes;
		let didLegacyId = false;
		let didWpStyle = false;
		let didRemint = false;
		let didLayoutFields = false;

		if (needsLegacyBlockeraIdMigrate(next)) {
			const persistSchema = getBlockeraPersistSchema(
				availableAttributes,
				originDefaultAttributes
			);
			const migrated = withoutBlockeraIdentityIfUnused(
				migrateLegacyBlockeraIds(cloneObject(next)),
				persistSchema
			);
			// cloneObject drops `undefined`; Gutenberg merge needs explicit unset.
			migrated.blockeraPropsId = undefined;
			migrated.blockeraCompatId = undefined;
			if (blockAttributes.style && !migrated.style) {
				migrated.style = undefined;
			}

			if (!isEquals(migrated, next)) {
				next = migrated;
				didLegacyId = true;
			}
		}

		if (next?.style) {
			const cleaned = withCleanedWpStyle(next);

			if (!isEquals(cleaned.style, next.style)) {
				next = {
					...next,
					style: cleaned.style,
				};
				didWpStyle = true;
			}
		}

		const id = getBlockeraId(next);
		const fromId = id ? `blockera-block-${String(id)}` : '';
		const classTokens = getBlockeraClassTokens(next?.className);
		const classIsDuplicate = classTokens.some((token) =>
			isClassNameDuplicate(clientId, token)
		);
		const idIsDuplicate = Boolean(
			fromId && isClassNameDuplicate(clientId, fromId)
		);

		// Gutenberg Duplicate clones identity onto a new clientId; remint so
		// selectors do not collide. Also remint pasted blocks that share a
		// unique class token even when blockeraId already differs.
		if (
			(classIsDuplicate || idIsDuplicate) &&
			!isBlockeraEngineSkippedForClient(clientId, next)
		) {
			next = remintAndRegisterIdentity(clientId, next);
			didRemint = true;
		}

		const persistedId = getBlockeraId(next);
		if (persistedId && (didLegacyId || didRemint)) {
			registerClassName(
				clientId,
				`blockera-block-${String(persistedId)}`
			);
		}

		const layoutPatch: { [string]: mixed } = {};
		if (
			isActive &&
			!isBlockeraEngineSkippedForClient(clientId, blockAttributes) &&
			(getBlockeraId(blockAttributes) ||
				getBlockeraId(compatibleAttributes))
		) {
			if (
				storedLayoutFieldDiffers(
					compatibleAttributes?.blockeraDisplay,
					blockAttributes?.blockeraDisplay
				)
			) {
				layoutPatch.blockeraDisplay =
					compatibleAttributes.blockeraDisplay;
			}

			if (
				storedLayoutFieldDiffers(
					compatibleAttributes?.blockeraFlexLayout,
					blockAttributes?.blockeraFlexLayout
				)
			) {
				layoutPatch.blockeraFlexLayout =
					compatibleAttributes.blockeraFlexLayout;
			}

			if (Object.keys(layoutPatch).length) {
				next = {
					...next,
					...layoutPatch,
				};
				didLayoutFields = true;
			}
		}

		if (!didLegacyId && !didWpStyle && !didRemint && !didLayoutFields) {
			return;
		}

		if (didLayoutFields || didRemint) {
			setPendingAttributes(null);
		}

		const persistPayload =
			didLayoutFields && !didLegacyId && !didWpStyle && !didRemint
				? layoutPatch
				: didWpStyle && !didLegacyId && !didRemint && !didLayoutFields
					? { style: next.style }
					: next;

		enqueueBlockAttributePersist(registry, () => {
			setBlockAttributes(persistPayload);
		});
	}, [
		isActive,
		clientId,
		registry,
		blockAttributes,
		compatibleAttributes,
		setBlockAttributes,
		availableAttributes,
		originDefaultAttributes,
	]);

	/**
	 * Set the attributes state and the attributes ref.
	 *
	 * @param {Object} value the compatible attributes arrived from the handleOnChangeAttributes function.
	 * @param {boolean} shouldUpdateClassName whether to update the classname. useful when save all customizing style variation.
	 *
	 * @return {void}
	 */
	const setAttributes = useCallback(
		(
			value: any,
			{
				ref,
				shouldUpdateClassName = true,
			}: {
				ref?: Object,
				shouldUpdateClassName?: boolean,
			} = {
				shouldUpdateClassName: true,
			}
		) => {
			const classNameStr = value?.className ?? '';
			const match = BLOCKERA_BLOCK_REGEX.exec(classNameStr);
			const keepBlockeraIdentity = Boolean(getBlockeraId(value));
			const needsClassNameRewrite =
				(shouldUpdateClassName &&
					keepBlockeraIdentity &&
					/^is-(?:style|size)-/.test(classNameStr) &&
					!/\s/g.test(classNameStr)) ||
				(match &&
					isClassNameDuplicate(
						clientId,
						match[0],
						getBlocksClassNames()
					));

			let valueToStore = value;

			if (needsClassNameRewrite) {
				valueToStore = cloneObject(value);
			}

			const storedClassName = valueToStore.className ?? '';
			const storedMatch = BLOCKERA_BLOCK_REGEX.exec(storedClassName);

			// We should update classname with unique generate classname while customizing style variation.
			if (
				shouldUpdateClassName &&
				keepBlockeraIdentity &&
				uniqueClassName &&
				/^is-(?:style|size)-/.test(storedClassName) &&
				!/\s/g.test(storedClassName)
			) {
				valueToStore.className = classNames(storedClassName, {
					'blockera-block': true,
					[uniqueClassName]: true,
				});
				registerClassName(clientId, uniqueClassName);
			} else if (
				shouldUpdateClassName &&
				keepBlockeraIdentity &&
				storedMatch &&
				isClassNameDuplicate(
					clientId,
					storedMatch[0],
					getBlocksClassNames()
				)
			) {
				valueToStore = remintAndRegisterIdentity(
					clientId,
					valueToStore
				);
			} else if (
				shouldUpdateClassName &&
				keepBlockeraIdentity &&
				uniqueClassName &&
				storedMatch &&
				storedMatch[0] !== uniqueClassName
			) {
				const prevClassName = storedClassName
					.replace(BLOCKERA_BLOCK_REGEX, '')
					.replace(/\bblockera-block\b/gi, '');
				valueToStore.className = classNames(prevClassName.trim(), {
					'blockera-block': true,
					[uniqueClassName]: true,
				});

				registerClassName(clientId, uniqueClassName);
			} else if (storedMatch && shouldUpdateClassName) {
				registerClassName(clientId, storedMatch[0]);
			}

			if (
				!['save-customizations', 'detach-style'].includes(
					ref?.current?.action
				) &&
				select('blockera/editor').getEditorSelectedBlockEvent() !==
					undefined
			) {
				// Reset the editor selected block event to undefined.
				dispatch('blockera/editor').setEditorSelectedBlockEvent(
					undefined
				);
			}

			// Sync with the new value for attributes state.
			compatibleAttributesRef.current = valueToStore;

			setPendingAttributes((prev) =>
				isEquals(prev, valueToStore) ? prev : valueToStore
			);

			// Global styles: write userStyles in this tick. Headed Cypress can
			// clear `pendingAttributes` before the attributes effect runs, so
			// delete never reaches SET_BLOCK_STYLES and merged reads keep the
			// previous WP backgroundPosition.
			if (
				false === insideBlockInspector &&
				typeof handleOnChangeStyleInLocalState === 'function'
			) {
				const persistableAttributes = withoutBlockeraIdentityIfUnused(
					valueToStore,
					getBlockeraPersistSchema(
						availableAttributes,
						originDefaultAttributes
					)
				);
				const currentUserBlock = select(
					'blockera/editor'
				).getGlobalStyles?.()?.userStyles?.styles?.blocks?.[name];
				if (!isEquals(currentUserBlock, persistableAttributes)) {
					handleOnChangeStyleInLocalState(
						cloneObject(persistableAttributes)
					);
				}

				const shouldPersistEntityNow =
					shouldFlushGlobalStylesEntityNow(
						persistableAttributes,
						currentUserBlock
					);

				if (shouldPersistEntityNow) {
					setBlockAttributes(cloneObject(persistableAttributes));
				}
			}
		},
		[
			clientId,
			name,
			uniqueClassName,
			getBlocksClassNames,
			insideBlockInspector,
			handleOnChangeStyleInLocalState,
			availableAttributes,
			originDefaultAttributes,
			setBlockAttributes,
		]
	);

	// Debounce updates to parent state to avoid unnecessary re-renders.
	useEffect(() => {
		const isIdentityCleanup =
			Boolean(getBlockeraId(blockAttributes)) &&
			!getBlockeraId(attributes);

		// Skip the effect if the block is not a blockera block and not has metadata.
		if (
			!getBlockeraId(attributes) &&
			!isIdentityCleanup &&
			!attributes.hasOwnProperty('metadata') &&
			!['save-customizations', 'detach-style', 'disable-style'].includes(
				editorSelectedBlockEvent
			)
		) {
			return;
		}

		// TODO: In the future, review all custom hooks and child components used in this block
		// to determine which ones might alter the original `attributes` object reference directly.
		// This helps ensure that updates to `attributes` remain predictable, and mutation side-effects
		// are properly managed or avoided (consider use of cloneObject as needed).
		const clonedAttributes = cloneObject(attributes);

		if (isIdentityCleanup) {
			// cloneObject drops `undefined`. Restore className from the store so
			// non-Blockera tokens (e.g. is-style-*) survive fingerprint cleanup.
			const stripped = stripBlockeraIdentity({
				...clonedAttributes,
				className:
					(typeof clonedAttributes.className === 'string' &&
						clonedAttributes.className) ||
					blockAttributes.className,
			});
			clonedAttributes.blockeraId = undefined;
			clonedAttributes.blockeraPropsId = undefined;
			clonedAttributes.blockeraCompatId = undefined;
			clonedAttributes.className = stripped.className;
		}

		const persistableAttributes = withoutBlockeraIdentityIfUnused(
			clonedAttributes,
			getBlockeraPersistSchema(
				availableAttributes,
				originDefaultAttributes
			)
		);

		if (
			'function' === typeof handleOnChangeStyleInLocalState &&
			!isEquals(compatibleAttributes, attributes) &&
			false === insideBlockInspector &&
			!['save-customizations', 'detach-style'].includes(
				editorSelectedBlockEvent
			)
		) {
			// It just will be called if outside of the block inspector. (See: canvas-editor/components/block-global-styles-panel-screen/context.js)
			handleOnChangeStyleInLocalState(persistableAttributes);
		}

		// If inside the block inspector, update the parent state immediately.
		const shouldPersistUserEdit = !isEquals(
			compatibleAttributes,
			attributes
		);
		const shouldPersistReturn =
			persistReturnCompatRef.current &&
			!isEquals(attributes, blockAttributes);

		if (insideBlockInspector) {
			if (shouldPersistUserEdit || shouldPersistReturn) {
				setBlockAttributes(persistableAttributes);
				persistReturnCompatRef.current = false;
			}

			return;
		}

		const timeoutId = setTimeout(() => {
			if (shouldPersistUserEdit || shouldPersistReturn) {
				setBlockAttributes(persistableAttributes);
				persistReturnCompatRef.current = false;
			}
		}, BLOCKERA_DELAY_EXPECTED_TIME);

		return () => clearTimeout(timeoutId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [attributes]);

	// When derived value (compatibleAttributes) changes, clear pending overlay.
	// This adopts the single source of truth and prevents bidirectional sync.
	useEffect(() => {
		if (isInnerBlock(currentBlock)) {
			return;
		}
		if (
			false === insideBlockInspector &&
			!currentBlockStyleVariation?.name
		) {
			return;
		}
		if (
			pendingAttributes !== null &&
			isEquals(pendingAttributes, compatibleAttributes)
		) {
			setPendingAttributes(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [compatibleAttributes]);

	// When the current block style variation changes,
	// clear the pending attributes just when outside of the block inspector.
	useEffect(() => {
		if (
			null !== pendingAttributes &&
			false === insideBlockInspector &&
			currentBlockStyleVariation?.hasOwnProperty('name')
		) {
			setPendingAttributes(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentBlockStyleVariation]);

	const sanitizedAttributes = useMemo(
		// TODO: In the future, review all custom hooks and child components used in this block
		// to determine which ones might alter the original `attributes` object reference directly.
		// This helps ensure that updates to `attributes` remain predictable, and mutation side-effects
		// are properly managed or avoided (consider use of cloneObject as needed).
		() => sanitizeBlockAttributes(cloneObject(attributes)),
		[attributes]
	);

	const { currentInnerBlock, blockeraInnerBlocks } = useInnerBlocksInfo({
		additional,
		currentBlock,
		currentState,
		currentBreakpoint,
		defaultAttributes,
		currentInnerBlockState,
		attributes: sanitizedAttributes,
	});

	const { edit: BlockEditComponent } = additional;

	const getAttributes = useCallback(
		(key: string = ''): any => {
			if (key && sanitizedAttributes[key]) {
				return sanitizedAttributes[key];
			}

			return sanitizedAttributes;
		},
		[sanitizedAttributes]
	);

	const { hasStyleVariations, hasSizeVariations } = useMemo(
		() => getBlockVariationSupport(additional),
		[additional]
	);

	const styleVariationsConfig = useMemo(
		() => ({
			clientId,
			blockName: name,
			storedAttributes: cloneObject(attributes),
			defaultAttributes: availableAttributes,
			inGlobalStylesPanel: !insideBlockInspector,
		}),
		[clientId, name, attributes, availableAttributes, insideBlockInspector]
	);

	const usesStyleVariationHooks = hasStyleVariations || hasSizeVariations;

	const { handleOnChangeAttributes } = useAttributes(setAttributes, {
		clientId,
		blockId: name,
		isNormalState,
		currentBlock,
		currentState,
		blockVariations,
		defaultAttributes,
		originDefaultAttributes,
		currentBreakpoint,
		availableAttributes,
		masterIsNormalState,
		blockeraInnerBlocks,
		insideBlockInspector,
		activeBlockVariation,
		currentInnerBlockState,
		getActiveBlockVariation,
		// TODO: In the future, review all custom hooks and child components used in this block
		// to determine which ones might alter the original `attributes` object reference directly.
		// This helps ensure that updates to `attributes` remain predictable, and mutation side-effects
		// are properly managed or avoided (consider use of cloneObject as needed).
		getAttributes: () => cloneObject(attributesRef.current),
		innerBlocks: additional?.blockeraInnerBlocks,
		setChangesets: (flag: boolean) => {
			if (insideBlockInspector && !displayBlockControls) {
				return;
			}
			changesetsBridgeRef.current.setChangesets(flag);
		},
	});

	const updateBlockEditorSettings: UpdateBlockEditorSettings = useCallback(
		(key: string, value: any): void => {
			switch (key) {
				case 'current-block':
					setCurrentBlock(value);
					break;
				case 'current-state':
					if (isInnerBlock(currentBlock)) {
						return setInnerBlockState(value);
					}

					setCurrentState(value);
					break;
				case 'current-block-style-variation':
					setCurrentBlockStyleVariation(value);
					break;
			}
		},
		[
			currentBlock,
			setCurrentBlock,
			setCurrentState,
			setInnerBlockState,
			setCurrentBlockStyleVariation,
		]
	);

	const currentAttributes = useCalculateCurrentAttributes({
		currentBlock,
		currentState,
		currentBreakpoint,
		currentInnerBlock,
		blockeraInnerBlocks,
		attributes: sanitizedAttributes,
		blockAttributes: defaultAttributes,
	});

	// Boot loading the block features.
	const { BlockFeaturesInlineStyles, ContextualToolbarComponents } =
		useBlockFeatures({
			name,
			clientId,
			attributes: currentAttributes,
			blockFeatures: mergeObject(
				generalBlockFeatures,
				additional?.blockFeatures
			),
			getBlockCSSSelector,
		});

	const inlineStyles = useCleanupStyles({ clientId }, [name, attributes]);

	const previewInjectableStylesValue = useMemo(
		() =>
			insideBlockInspector
				? {
						extraPreviewCss,
						setExtraPreviewCss,
					}
				: null,
		[insideBlockInspector, extraPreviewCss]
	);

	const availableStates =
		additional?.availableBlockStates || generalBlockStates;
	const availableInnerStates = useMemo(() => {
		let blockStates =
			((additional?.blockeraInnerBlocks || {})[currentBlock] || {})
				?.availableBlockStates || generalInnerBlockStates;

		if (isInnerBlock(currentBlock)) {
			if (!isVirtualBlock(currentBlock)) {
				const { availableBlockStates } =
					select('blockera/extensions').getBlockExtensionBy(
						'targetBlock',
						currentBlock
					) || {};

				if (Object.keys(availableBlockStates || {}).length) {
					blockStates = availableBlockStates;
				}
			}
		}

		return blockStates;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentBlock, additional]);

	useEffect(() => {
		if (isInnerBlock(currentBlock)) {
			unstableBootstrapInnerBlockStatesDefinitions(availableInnerStates);
		} else {
			unstableBootstrapBlockStatesDefinitions(availableStates);
		}
	}, [currentBlock, availableStates, availableInnerStates]);

	const activeDeviceType = deviceType;

	const primePresetHover = useCallback(() => {
		if (false === insideBlockInspector) {
			return;
		}

		if (isBlockeraEngineSkippedForClient(clientId, blockAttributes)) {
			return;
		}

		const hasBlockeraId = Boolean(getBlockeraId(blockAttributes));
		const partial: Object = {};

		if (!hasBlockeraId) {
			if (
				!hasBlockeraFeatureAttributes(
					blockAttributes,
					originDefaultAttributes
				)
			) {
				return;
			}
			const withId = getAttributesWithIds(
				cloneObject(blockAttributes),
				'blockeraId',
				false
			);
			if (withId.blockeraId) {
				partial.blockeraId = withId.blockeraId;
			}
			if (withId.className) {
				partial.className = withId.className;
				registerClassName(
					clientId,
					`blockera-block-${String(withId.blockeraId)}`
				);
			}
		} else {
			const aligned = withBlockeraBlockClassFromId(
				cloneObject(blockAttributes)
			);
			if (aligned.className !== blockAttributes.className) {
				partial.className = aligned.className;
				registerClassName(
					clientId,
					`blockera-block-${String(getBlockeraId(blockAttributes))}`
				);
			}
		}

		if (Object.keys(partial).length) {
			setBlockAttributes(partial);
		}
	}, [
		clientId,
		blockAttributes,
		setBlockAttributes,
		insideBlockInspector,
		originDefaultAttributes,
	]);

	const setPreviewAttributePatchForContext = useCallback(
		(patch: Object | null): void => {
			if (!patch || !Object.keys(patch).length) {
				setPresetPreviewAttributePatch(null);
				return;
			}

			if (patch.blockeraBlockStates || patch.blockeraInnerBlocks) {
				setPresetPreviewAttributePatch(patch);
				return;
			}

			setPresetPreviewAttributePatch(
				buildPresetPreviewAttributePatch(patch, {
					currentBlock,
					currentState,
					currentBreakpoint,
					currentInnerBlockState,
				})
			);
		},
		[currentBlock, currentState, currentBreakpoint, currentInnerBlockState]
	);

	const presetCanvasPreviewValue = useMemo(
		() => ({
			setPreviewAttributePatch: setPreviewAttributePatchForContext,
			primePresetHover,
		}),
		[primePresetHover, setPreviewAttributePatchForContext]
	);

	const blockStyleProps = useMemo(() => {
		const hasPresetPreviewPatch =
			presetPreviewAttributePatch &&
			Object.keys(presetPreviewAttributePatch).length > 0;

		const mergedAttributes = hasPresetPreviewPatch
			? mergeAttributesWithPresetPreviewPatch(
					sanitizedAttributes,
					presetPreviewAttributePatch
				)
			: sanitizedAttributes;
		const mergedCurrentAttributes = hasPresetPreviewPatch
			? mergeAttributesWithPresetPreviewPatch(
					currentAttributes,
					presetPreviewAttributePatch
				)
			: currentAttributes;

		return {
			clientId,
			hasPresetPreviewPatch: Boolean(hasPresetPreviewPatch),
			supports,
			selectors,
			additional,
			inlineStyles,
			attributes: mergedAttributes,
			blockName: name,
			currentAttributes: mergedCurrentAttributes,
			defaultAttributes,
			customCss: attributes?.blockeraCustomCSS?.value
				?.replace(/(\.|#)block/gi, `#block-${clientId}`)
				?.replace(/&/gi, `#block-${clientId}`),
			activeDeviceType,
			// From this BlockBase instance only (unselected pins master/normal/base).
			// Do not re-read the global extensions UI store inside BlockStyle.
			currentBlock,
			currentState,
			currentBreakpoint,
			currentInnerBlockState,
		};
	}, [
		presetPreviewAttributePatch,
		sanitizedAttributes,
		currentAttributes,
		clientId,
		supports,
		selectors,
		additional,
		inlineStyles,
		name,
		defaultAttributes,
		attributes?.blockeraCustomCSS?.value,
		activeDeviceType,
		currentBlock,
		currentState,
		currentBreakpoint,
		currentInnerBlockState,
	]);

	const blockContextBlock = useMemo(
		() => ({
			blockName: name,
			clientId,
			handleOnChangeAttributes,
			attributes: currentAttributes,
			storeName: 'blockera/controls',
		}),
		[name, clientId, handleOnChangeAttributes, currentAttributes]
	);

	const BlockComponent = useCallback(() => children, [children]);
	const getBlockType = useCallback(
		() => select('core/blocks').getBlockType(name),
		[name]
	);
	const contextSetCurrentTab = insideBlockInspector
		? setInspectorTab
		: setCurrentTab;

	const blockEditContextValue = useMemo(
		() => ({
			args,
			isActive,
			block: blockContextBlock,
			currentTab,
			additional,
			currentBlock,
			currentState,
			setCurrentTab: contextSetCurrentTab,
			isNormalState,
			setAttributes,
			getAttributes,
			blockVariations,
			currentBreakpoint,
			defaultAttributes,
			currentInnerBlock,
			availableAttributes,
			masterIsNormalState,
			blockeraInnerBlocks,
			activeBlockVariation,
			currentInnerBlockState,
			getActiveBlockVariation,
			handleOnChangeAttributes,
			updateBlockEditorSettings,
			BlockComponent,
			attributes: sanitizedAttributes,
			activeDeviceType,
			getBlockType,
		}),
		[
			args,
			isActive,
			blockContextBlock,
			currentTab,
			additional,
			currentBlock,
			currentState,
			contextSetCurrentTab,
			isNormalState,
			setAttributes,
			getAttributes,
			blockVariations,
			currentBreakpoint,
			defaultAttributes,
			currentInnerBlock,
			availableAttributes,
			masterIsNormalState,
			blockeraInnerBlocks,
			activeBlockVariation,
			currentInnerBlockState,
			getActiveBlockVariation,
			handleOnChangeAttributes,
			updateBlockEditorSettings,
			BlockComponent,
			sanitizedAttributes,
			activeDeviceType,
			getBlockType,
		]
	);

	return (
		<BlockEditContextProvider value={blockEditContextValue}>
			<BlockInjectedSlotContext.Provider value={clientId}>
				<PresetCanvasPreviewContext.Provider
					value={presetCanvasPreviewValue}
				>
					<PreviewInjectableStylesContext.Provider
						value={previewInjectableStylesValue}
					>
						{/*<StrictMode>*/}
						{insideBlockInspector && displayBlockControls && (
							<>
								<BlockInspectorTabSync
									blockName={name}
									blockVariation={
										activeBlockVariation?.name || ''
									}
									inspectorClientId={clientId}
									insideBlockInspector={insideBlockInspector}
									currentTab={currentTab}
									setCurrentTab={setCurrentTab}
									onAlignedSetter={registerInspectorTabSetter}
								/>
								<SideEffect
									{...{
										clientId,
										insideBlockInspector: true,
										activeBlockVariation:
											activeBlockVariation?.name || '',
										blockName: name,
										currentBlock,
										currentTab,
										currentState: isInnerBlock(currentBlock)
											? currentInnerBlockState
											: currentState,
										isActive,
										availableStates: isInnerBlock(
											currentBlock
										)
											? availableInnerStates
											: availableStates,
										blockeraUnsavedData:
											blockAttributes?.blockeraUnsavedData,
									}}
								/>
								<BlockPartials
									insideBlockInspector
									clientId={clientId}
									isActive={isActive}
									inspectorEdit={
										<BlockInspectorEditContent
											{...{
												notice,
												clientId,
												isActive,
												currentBlock,
												BlockEditComponent,
												availableStates,
												availableInnerStates,
												insideBlockInspector,
												blockProps: {
													name,
													activeBlockVariation:
														activeBlockVariation?.name ||
														'',
													clientId,
													supports,
													className,
													attributes:
														sanitizedAttributes,
													setAttributes,
													defaultAttributes,
													currentAttributes,
													currentTab,
													currentBlock,
													currentState,
													setCurrentTab:
														setInspectorTab,
													currentBreakpoint,
													blockeraInnerBlocks,
													currentInnerBlockState,
													handleOnChangeAttributes,
													additional,
													currentStateAttributes:
														currentAttributes,
													...props,
												},
											}}
										/>
									}
								>
									{usesStyleVariationHooks ? (
										<BlockBaseInspectorBundle
											changesetsBridgeRef={
												changesetsBridgeRef
											}
											hasStyleVariations={
												hasStyleVariations
											}
											hasSizeVariations={
												hasSizeVariations
											}
											styleVariationsConfig={
												styleVariationsConfig
											}
											fillPartialsProps={{
												notice,
												clientId,
												isActive,
												setActive,
												currentState,
												currentBlock,
												availableStates,
												currentInnerBlock,
												currentBreakpoint,
												BlockEditComponent,
												blockeraInnerBlocks,
												availableInnerStates,
												insideBlockInspector,
												currentInnerBlockState,
												updateBlockEditorSettings,
												blockProps: {
													name,
													activeBlockVariation:
														activeBlockVariation?.name ||
														'',
													clientId,
													supports,
													className,
													attributes:
														sanitizedAttributes,
													setAttributes,
													defaultAttributes,
													currentAttributes,
													currentTab,
													currentBlock,
													currentState,
													setCurrentTab:
														setInspectorTab,
													currentBreakpoint,
													blockeraInnerBlocks,
													currentInnerBlockState,
													handleOnChangeAttributes,
													additional,
													currentStateAttributes:
														currentAttributes,
													...props,
												},
											}}
										/>
									) : (
										<BlockFillPartials
											blockStyleVariationsProps={{}}
											blockSizeVariationsProps={{}}
											notice={notice}
											clientId={clientId}
											isActive={isActive}
											setActive={setActive}
											currentState={currentState}
											currentBlock={currentBlock}
											availableStates={availableStates}
											currentInnerBlock={
												currentInnerBlock
											}
											currentBreakpoint={
												currentBreakpoint
											}
											BlockEditComponent={
												BlockEditComponent
											}
											blockeraInnerBlocks={
												blockeraInnerBlocks
											}
											availableInnerStates={
												availableInnerStates
											}
											insideBlockInspector={
												insideBlockInspector
											}
											currentInnerBlockState={
												currentInnerBlockState
											}
											updateBlockEditorSettings={
												updateBlockEditorSettings
											}
											blockProps={{
												name,
												activeBlockVariation:
													activeBlockVariation?.name ||
													'',
												clientId,
												supports,
												className,
												attributes: sanitizedAttributes,
												setAttributes,
												defaultAttributes,
												currentAttributes,
												currentTab,
												currentBlock,
												currentState,
												setCurrentTab: setInspectorTab,
												currentBreakpoint,
												blockeraInnerBlocks,
												currentInnerBlockState,
												handleOnChangeAttributes,
												additional,
												currentStateAttributes:
													currentAttributes,
												...props,
											}}
										/>
									)}
								</BlockPartials>
							</>
						)}

						{!insideBlockInspector && (
							<GlobalStylesPanelBaseControlConfigContext.Provider
								value={{
									name,
									clientId,
									getAttributesRef: getAttributes,
								}}
							>
								<BaseControlContext.Provider
									value={{
										components:
											GLOBAL_STYLES_BASE_CONTROL_COMPONENTS,
									}}
								>
									<BlockPartials
										insideBlockInspector={false}
										clientId={clientId}
										isActive={isActive}
									>
										{usesStyleVariationHooks ? (
											<BlockBaseInspectorBundle
												changesetsBridgeRef={
													changesetsBridgeRef
												}
												hasStyleVariations={
													hasStyleVariations
												}
												hasSizeVariations={
													hasSizeVariations
												}
												styleVariationsConfig={
													styleVariationsConfig
												}
												fillPartialsProps={{
													notice,
													clientId,
													isActive,
													setActive,
													currentState,
													currentBlock,
													availableStates,
													currentInnerBlock,
													currentBreakpoint,
													BlockEditComponent,
													blockeraInnerBlocks,
													availableInnerStates,
													insideBlockInspector,
													currentInnerBlockState,
													updateBlockEditorSettings,
													blockProps: {
														// Sending props like exactly "edit" function props of WordPress Block.
														// Because needs total block props in outside overriding component like "blockera" in overriding process.
														name,
														activeBlockVariation:
															activeBlockVariation?.name ||
															'',
														clientId,
														supports,
														className,
														attributes:
															sanitizedAttributes,
														setAttributes,
														defaultAttributes,
														currentAttributes,
														currentTab,
														currentBlock,
														currentState,
														setCurrentTab,
														currentBreakpoint,
														blockeraInnerBlocks,
														currentInnerBlockState,
														handleOnChangeAttributes,
														additional,
														currentStateAttributes:
															currentAttributes,
														...props,
													},
												}}
											/>
										) : (
											<BlockFillPartials
												blockStyleVariationsProps={{}}
												blockSizeVariationsProps={{}}
												notice={notice}
												clientId={clientId}
												isActive={isActive}
												setActive={setActive}
												currentState={currentState}
												currentBlock={currentBlock}
												availableStates={
													availableStates
												}
												currentInnerBlock={
													currentInnerBlock
												}
												currentBreakpoint={
													currentBreakpoint
												}
												BlockEditComponent={
													BlockEditComponent
												}
												blockeraInnerBlocks={
													blockeraInnerBlocks
												}
												availableInnerStates={
													availableInnerStates
												}
												insideBlockInspector={
													insideBlockInspector
												}
												currentInnerBlockState={
													currentInnerBlockState
												}
												updateBlockEditorSettings={
													updateBlockEditorSettings
												}
												blockProps={{
													name,
													activeBlockVariation:
														activeBlockVariation?.name ||
														'',
													clientId,
													supports,
													className,
													attributes:
														sanitizedAttributes,
													setAttributes,
													defaultAttributes,
													currentAttributes,
													currentTab,
													currentBlock,
													currentState,
													setCurrentTab,
													currentBreakpoint,
													blockeraInnerBlocks,
													currentInnerBlockState,
													handleOnChangeAttributes,
													additional,
													currentStateAttributes:
														currentAttributes,
													...props,
												}}
											/>
										)}
									</BlockPartials>
								</BaseControlContext.Provider>
							</GlobalStylesPanelBaseControlConfigContext.Provider>
						)}

						{insideBlockInspector && (
							<>
								<ErrorBoundary
									fallbackRender={({
										error,
									}): MixedElement => (
										<ErrorBoundaryFallback
											{...{
												error,
												notice,
												clientId,
												setNotice,
												from: 'style-wrapper',
												props: blockStyleProps,
												isReportingErrorCompleted,
												setIsReportingErrorCompleted,
												fallbackComponent: BlockStyle,
											}}
										/>
									)}
								>
									<StylesWrapper>
										<BlockStyle {...blockStyleProps} />
									</StylesWrapper>
								</ErrorBoundary>
								{/*</StrictMode>*/}

								<BlockeraLayoutToolbar
									blockName={name}
									currentAttributes={currentAttributes}
									handleOnChangeAttributes={
										handleOnChangeAttributes
									}
								/>

								<BlockeraTextAlignToolbar
									blockName={name}
									currentAttributes={currentAttributes}
									handleOnChangeAttributes={
										handleOnChangeAttributes
									}
								/>

								<ContextualToolbarComponents />

								<BlockFeaturesInlineStyles
									clientId={clientId}
									className={className}
									currentAttributes={currentAttributes}
								/>

								{children}
							</>
						)}
					</PreviewInjectableStylesContext.Provider>
				</PresetCanvasPreviewContext.Provider>
			</BlockInjectedSlotContext.Provider>
		</BlockEditContextProvider>
	);
};

export const BlockBase: ComponentType<any> = memo(
	BlockBaseImpl,
	(prevProps: Object, nextProps: Object): boolean =>
		arePropsEqual(prevProps, nextProps, {
			shallowKeys: ['setAttributes', 'children', 'additional'],
		})
);
