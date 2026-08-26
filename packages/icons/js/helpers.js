//@flow

/**
 * Returns a kebab-cased string of the given icon component name.
 * for example `Device2xlDesktop` becomes `device-2xl-desktop`
 *
 * @param {string} str - The string to convert to kebab-case.
 * @return {string} The kebab-cased string.
 */
export function getIconKebabId(str: string): string {
	return str.replace(/[A-Z0-9]/g, (match, index) => {
		if (index === 0) {
			return match.toLowerCase();
		} else if (/[0-9]/.test(match)) {
			return `-${match}`;
		}
		return `-${match.toLowerCase()}`;
	});
}

const STROKE_ICON_LIBRARIES = ['feather', 'lucide', 'untitledui', 'tabler'];

/**
 * Stroke-based npm icon libraries (Feather, Lucide, Untitled UI).
 *
 * @param {string} library Icon library id.
 * @return {boolean} True when the library uses stroke-based SVG icons.
 */
export function isStrokeIconLibrary(library: string): boolean {
	return STROKE_ICON_LIBRARIES.includes(library);
}

/**
 * Detect stroke SVG markup (fill="none" + stroke).
 *
 * @param {string} svg SVG markup.
 * @return {boolean} True when markup looks like a stroke icon SVG.
 */
export function isStrokeSvgMarkup(svg: string): boolean {
	if (!svg || typeof svg !== 'string') {
		return false;
	}

	return /fill=["']none["']/i.test(svg) && /stroke/i.test(svg);
}

/**
 * Whether a fill value is an intentional solid fill (not none / gradient).
 *
 * @param {string | null | void} fill Fill attribute or style value.
 * @return {boolean} True when the value is a solid accent fill.
 */
export function isSvgFillAccentValue(fill: string | null | void): boolean {
	if (!fill || typeof fill !== 'string') {
		return false;
	}

	const lower = fill.trim().toLowerCase();

	return lower !== 'none' && !lower.startsWith('url(');
}

/**
 * Whether an SVG shape uses an explicit non-none fill (accent dot, etc.).
 *
 * @param {Element | null | void} node SVG element.
 * @return {boolean} True when the element has an intentional fill accent.
 */
export function isSvgFillAccentElement(node: Element | null | void): boolean {
	if (!node) {
		return false;
	}

	const element: any = node;

	if (typeof element.getAttribute !== 'function') {
		return false;
	}

	if (!element.hasAttribute('fill')) {
		return false;
	}

	return isSvgFillAccentValue(element.getAttribute('fill'));
}

/**
 * Extract the first SVG element from captured icon HTML.
 *
 * @param {string} html Icon markup (may include wrapper spans).
 * @return {string} The first SVG element outer HTML, or the original html.
 */
export function extractSvgMarkup(html: string): string {
	if (!html || typeof html !== 'string') {
		return '';
	}

	if (typeof document !== 'undefined') {
		const template = document.createElement('template');
		template.innerHTML = html.trim();
		const svg = template.content.querySelector('svg');

		if (svg) {
			return svg.outerHTML;
		}
	}

	const match = html.match(/<svg[\s\S]*<\/svg>/i);

	return match ? match[0] : html;
}

/**
 * Normalize stroke icon SVG for storage and frontend output.
 *
 * @param {string} html   Icon markup.
 * @param {string} library Icon library id.
 * @return {string} Normalized SVG markup safe for storage and rendering.
 */
export function prepareIconSvgForStorage(
	html: string,
	library: string = ''
): string {
	let svgMarkup = extractSvgMarkup(html);

	if (!svgMarkup) {
		return html;
	}

	if (!isStrokeIconLibrary(library) && !isStrokeSvgMarkup(svgMarkup)) {
		return svgMarkup;
	}

	if (typeof document === 'undefined') {
		svgMarkup = svgMarkup.replace(
			/(<svg[^>]*\sstyle=["'])([^"']*)(["'])/i,
			(_match, open, style, close) => {
				const cleaned = style
					.replace(/\bfill\s*:\s*[^;]+;?/gi, '')
					.trim();
				return `${open}${cleaned}${close}`;
			}
		);

		if (/\bfill=/i.test(svgMarkup)) {
			svgMarkup = svgMarkup.replace(
				/(<svg[^>]*)\sfill=["'][^"']*["']/i,
				'$1 fill="none"'
			);
		} else {
			// RegExp without /g replaces only the first match.
			svgMarkup = svgMarkup.replace(/<svg/i, '<svg fill="none"');
		}

		if (!/\bstroke=/i.test(svgMarkup)) {
			svgMarkup = svgMarkup.replace(
				/<svg/i,
				'<svg stroke="currentColor"'
			);
		}

		return svgMarkup;
	}

	const template = document.createElement('template');
	template.innerHTML = svgMarkup;
	const svg = template.content.querySelector('svg');

	if (!svg) {
		return svgMarkup;
	}

	const svgEl: any = svg;

	svgEl.setAttribute('fill', 'none');

	if (!svgEl.getAttribute('stroke')) {
		svgEl.setAttribute('stroke', 'currentColor');
	}

	if (svgEl.style?.fill) {
		svgEl.style.fill = '';
		svgEl.style.removeProperty('fill');
	}

	const shapeTags = [
		'path',
		'circle',
		'rect',
		'ellipse',
		'line',
		'polyline',
		'polygon',
	];

	shapeTags.forEach((tag) => {
		svgEl.querySelectorAll(tag).forEach((node) => {
			const shapeNode: any = node;
			const isFillAccent = isSvgFillAccentElement(shapeNode);

			if (isFillAccent) {
				const rootStroke =
					svgEl.getAttribute('stroke') || 'currentColor';
				const rootStrokeWidth = svgEl.getAttribute('stroke-width');

				if (!shapeNode.getAttribute('stroke')) {
					shapeNode.setAttribute('stroke', rootStroke);
				}

				if (rootStrokeWidth && !shapeNode.getAttribute('stroke-width')) {
					shapeNode.setAttribute('stroke-width', rootStrokeWidth);
				}

				if (shapeNode.style?.fill) {
					shapeNode.style.fill = '';
					shapeNode.style.removeProperty('fill');
				}

				return;
			}

			shapeNode.setAttribute('fill', 'none');

			if (!shapeNode.getAttribute('stroke')) {
				shapeNode.setAttribute('stroke', 'currentColor');
			}

			if (shapeNode.style?.fill) {
				shapeNode.style.fill = '';
				shapeNode.style.removeProperty('fill');
			}
		});
	});

	svgEl.querySelectorAll('[fill]').forEach((node) => {
		const fillNode: any = node;

		if (isSvgFillAccentElement(fillNode)) {
			return;
		}

		if (fillNode.getAttribute('fill') !== 'none') {
			fillNode.setAttribute('fill', 'none');
		}
	});

	return svgEl.outerHTML;
}
