/**
 * Visual-only annotation overlay. Never used as a search source.
 *
 * @package
 */

import { dispatch, select } from '@wordpress/data';
import { store as annotationsStore } from '@wordpress/annotations';
import {
	ANNOTATION_SOURCE,
	ANNOTATION_SOURCE_CURRENT,
	ANNOTATION_ID_PREFIX,
} from './store/constants';

function removeAnnotationsBySource(source) {
	const annotationsDispatch = dispatch(annotationsStore);

	if (
		typeof annotationsDispatch?.__experimentalRemoveAnnotationsBySource ===
		'function'
	) {
		annotationsDispatch.__experimentalRemoveAnnotationsBySource(source);
	}
}

export function clearSearchHighlights() {
	removeAnnotationsBySource(ANNOTATION_SOURCE);
	removeAnnotationsBySource(ANNOTATION_SOURCE_CURRENT);
}

function addVisibleAnnotation(match, source, index) {
	const annotationsDispatch = dispatch(annotationsStore);

	if (
		typeof annotationsDispatch?.__experimentalAddAnnotation !== 'function'
	) {
		return;
	}

	annotationsDispatch.__experimentalAddAnnotation({
		id: `${ANNOTATION_ID_PREFIX}-${index}`,
		source,
		blockClientId: match.clientId,
		richTextIdentifier: match.identifier,
		range: {
			start: match.start,
			end: match.end,
		},
	});
}

export function applySearchHighlights(results, currentIndex = 0) {
	clearSearchHighlights();

	const annotationsDispatch = dispatch(annotationsStore);

	if (
		typeof annotationsDispatch?.__experimentalAddAnnotation !== 'function'
	) {
		return;
	}

	results.forEach((match, index) => {
		if (match.kind !== 'visible') {
			return;
		}

		addVisibleAnnotation(
			match,
			index === currentIndex
				? ANNOTATION_SOURCE_CURRENT
				: ANNOTATION_SOURCE,
			index
		);
	});
}

export function annotationsStoreAvailable() {
	return Boolean(select(annotationsStore));
}

const HIGHLIGHT_MARK_SELECTOR = `.annotation-text-${ANNOTATION_SOURCE}, .annotation-text-${ANNOTATION_SOURCE_CURRENT}`;
const ANNOTATION_INDEX_PATTERN = new RegExp(
	`${ANNOTATION_ID_PREFIX}-(\\d+)$`
);

export function getClickedMatchIndex(event) {
	const mark = event.target?.closest?.(HIGHLIGHT_MARK_SELECTOR);
	if (!mark) {
		return -1;
	}

	const id = mark.id || '';
	const matched = id.match(ANNOTATION_INDEX_PATTERN);
	if (!matched) {
		return -1;
	}

	return Number.parseInt(matched[1], 10);
}

export function getCanvasDocuments() {
	const docs = [document];
	document
		.querySelectorAll(
			'iframe[name="editor-canvas"], iframe.editor-canvas__iframe'
		)
		.forEach((iframe) => {
			if (iframe.contentDocument) {
				docs.push(iframe.contentDocument);
			}
		});
	return docs;
}
