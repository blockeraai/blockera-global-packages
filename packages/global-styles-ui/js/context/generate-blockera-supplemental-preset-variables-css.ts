/**
 * Blockera dependencies
 */
import {
	THEME_JSON_PRESET_METADATA_BASE,
	resolveThemeJsonPresetCssDeclarationValue,
	BLOCKERA_PRESET_METADATA_PATHS,
} from '@blockera/data';
import { trackPerfCounter } from '@blockera/utils';

/**
 * Preset buckets already emitted by core {@see generateGlobalStyles} in
 * `@wordpress/global-styles-engine` (see `PRESET_METADATA` in that package).
 */
const CORE_ENGINE_CSS_VAR_INFIXES = new Set([
	'color',
	'gradient',
	'duotone',
	'shadow',
	'font-size',
	'font-family',
	'spacing',
	'border-radius',
	'dimension',
]);

const BLOCKERA_ONLY_PRESET_ROWS: Array<{
	path: string[];
	cssVarInfix: string;
}> = [
	{
		path: [...BLOCKERA_PRESET_METADATA_PATHS.BORDER_PRESETS],
		cssVarInfix: 'border',
	},
	{
		path: [...BLOCKERA_PRESET_METADATA_PATHS.TRANSITION_PRESETS],
		cssVarInfix: 'transition',
	},
	{
		path: [...BLOCKERA_PRESET_METADATA_PATHS.TRANSFORM_PRESETS],
		cssVarInfix: 'transform',
	},
	{
		path: [...BLOCKERA_PRESET_METADATA_PATHS.FILTER_PRESETS],
		cssVarInfix: 'filter',
	},
	{
		path: [...BLOCKERA_PRESET_METADATA_PATHS.TEXT_SHADOW_PRESETS],
		cssVarInfix: 'text-shadow',
	},
];

const PRESET_ORIGINS = ['default', 'theme', 'custom'] as const;

type PresetRow = Record<string, unknown>;

type SlugDeclarationCache = {
	item: PresetRow;
	declaration: string;
};

type OriginDeclarationCache = {
	items: unknown;
	declarations: string[];
	bySlug: Map<string, SlugDeclarationCache>;
};

type PathDeclarationCache = {
	group: unknown;
	declarations: string[];
	origins: Partial<Record<(typeof PRESET_ORIGINS)[number], OriginDeclarationCache>>;
};

type SupplementalCssCache = {
	settings: Record<string, unknown>;
	css: string;
	paths: Map<string, PathDeclarationCache>;
};

let supplementalCssCache: SupplementalCssCache | null = null;

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getAtPath(object: Record<string, unknown>, path: string[]): unknown {
	let current: unknown = object;
	for (const segment of path) {
		if (!isPlainObject(current)) {
			return undefined;
		}
		current = current[segment];
	}
	return current;
}

function normalizeSlug(slug: unknown): string {
	return String(slug ?? '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-');
}

function pathCacheKey(path: string[], cssVarInfix: string): string {
	return `${path.join('.')}:${cssVarInfix}`;
}

function collectOriginDeclarations(
	items: unknown,
	cssVarInfix: string,
	previous: OriginDeclarationCache | undefined
): OriginDeclarationCache {
	if (previous && previous.items === items) {
		return previous;
	}

	if (!Array.isArray(items)) {
		return {
			items,
			declarations: [],
			bySlug: new Map(),
		};
	}

	const bySlug: Map<string, SlugDeclarationCache> = new Map();
	const declarations: string[] = [];

	for (const item of items) {
		if (!isPlainObject(item)) {
			continue;
		}

		const preset = item as PresetRow;
		const slug = normalizeSlug(preset.slug);

		if (!slug) {
			continue;
		}

		const previousSlug = previous?.bySlug.get(slug);

		if (previousSlug && previousSlug.item === preset) {
			bySlug.set(slug, previousSlug);
			if (previousSlug.declaration) {
				declarations.push(previousSlug.declaration);
			}
			continue;
		}

		const value = resolveThemeJsonPresetCssDeclarationValue(
			preset,
			cssVarInfix
		);
		const declaration = value
			? `--wp--preset--${cssVarInfix}--${slug}: ${value}`
			: '';

		bySlug.set(slug, { item: preset, declaration });

		if (declaration) {
			declarations.push(declaration);
		}
	}

	return { items, declarations, bySlug };
}

function collectPresetDeclarations(
	settings: Record<string, unknown>,
	path: string[],
	cssVarInfix: string,
	previous: PathDeclarationCache | undefined
): PathDeclarationCache {
	const group = getAtPath(settings, path);

	if (previous && previous.group === group) {
		return previous;
	}

	if (!isPlainObject(group)) {
		return { group, declarations: [], origins: {} };
	}

	const declarations: string[] = [];
	const origins: PathDeclarationCache['origins'] = {};

	for (const origin of PRESET_ORIGINS) {
		const originCache = collectOriginDeclarations(
			group[origin],
			cssVarInfix,
			previous?.origins[origin]
		);
		origins[origin] = originCache;
		declarations.push(...originCache.declarations);
	}

	return { group, declarations, origins };
}

function supplementalPresetRows(): Array<{
	path: string[];
	cssVarInfix: string;
}> {
	const rows: Array<{ path: string[]; cssVarInfix: string }> = [];

	for (const row of THEME_JSON_PRESET_METADATA_BASE) {
		if (CORE_ENGINE_CSS_VAR_INFIXES.has(row.cssVarInfix)) {
			continue;
		}

		rows.push({ path: row.path, cssVarInfix: row.cssVarInfix });
	}

	rows.push(...BLOCKERA_ONLY_PRESET_ROWS);

	return rows;
}

/**
 * CSS custom properties for Blockera / extended theme.json preset paths that
 * core `generateGlobalStyles` does not emit (e.g. `typography.blockeraLineHeights`).
 *
 * After persist, unchanged infix groups and unchanged slugs reuse the previous
 * declarations (core-owned buckets such as color/shadow are skipped).
 *
 * Parity target: variables slice of {@see blockera_get_global_stylesheet()}.
 */
export function generateBlockeraSupplementalPresetVariablesCss(
	settings: Record<string, unknown> | undefined
): string {
	if (!settings) {
		trackPerfCounter('gs.supplementalCss', { outcome: 'empty' });
		supplementalCssCache = null;
		return '';
	}

	if (supplementalCssCache && supplementalCssCache.settings === settings) {
		trackPerfCounter('gs.supplementalCss', { outcome: 'retained' });
		return supplementalCssCache.css;
	}

	const nextPaths: Map<string, PathDeclarationCache> = new Map();
	const declarations: string[] = [];
	let rebuiltCount = 0;

	for (const row of supplementalPresetRows()) {
		const key = pathCacheKey(row.path, row.cssVarInfix);
		const previous = supplementalCssCache?.paths.get(key);
		const next = collectPresetDeclarations(
			settings,
			row.path,
			row.cssVarInfix,
			previous
		);

		nextPaths.set(key, next);
		declarations.push(...next.declarations);

		if (next !== previous) {
			rebuiltCount += 1;
		}
	}

	const css = declarations.length ? `:root{${declarations.join(';')};}` : '';

	supplementalCssCache = {
		settings,
		css,
		paths: nextPaths,
	};

	trackPerfCounter('gs.supplementalCss', {
		outcome: rebuiltCount === 0 ? 'retained' : 'patched',
	});

	return css;
}

export function resetBlockeraSupplementalPresetVariablesCssCacheForTests(): void {
	supplementalCssCache = null;
}
