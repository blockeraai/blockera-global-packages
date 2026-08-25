<?php

namespace Blockera\Editor\StyleDefinitions;

class FlexWrap extends BaseStyleDefinition {

	protected function css( array $setting ): array {
		if ( ! isset( $setting['type'], $setting['flex-wrap'] ) || 'flex-wrap' !== $setting['type'] ) {
			return [];
		}

		$flexWrap = $setting['flex-wrap'];
		if ( ! is_array( $flexWrap ) ) {
			return [];
		}

		$resolved = $this->resolveFlexWrapKeyword( $flexWrap );
		if ( null === $resolved ) {
			return [];
		}

		[ $keyword, $reverse ] = $resolved;
		$suffix                = ( $reverse && 'wrap' === $keyword ) ? '-reverse' : '';

		$this->declarations['flex-wrap'] = $keyword . $suffix . ' !important';
		$this->setCss( $this->declarations );

		return $this->css;
	}

	/**
	 * Control + block attrs use `{ val, reverse }`; some payloads wrap that in `value`,
	 * or store the CSS keyword on `value` as a string. Never concatenate an array.
	 *
	 * @param array<string, mixed> $flexWrap
	 * @return array{0: string, 1: bool}|null Keyword and reverse flag, or null to skip.
	 */
	private function resolveFlexWrapKeyword( array $flexWrap ): ?array {
		$nested = $flexWrap['value'] ?? null;
		if ( is_array( $nested ) ) {
			$from_nested = $this->resolveFlexWrapKeyword( $nested );
			if ( null !== $from_nested ) {
				return [
					$from_nested[0],
					$from_nested[1] || ! empty( $flexWrap['reverse'] ),
				];
			}
		}

		$keyword = null;
		if ( is_string( $nested ) ) {
			$keyword = $nested;
		} elseif ( is_string( $flexWrap['val'] ?? null ) ) {
			$keyword = $flexWrap['val'];
		}

		if ( ! is_string( $keyword ) || '' === $keyword ) {
			return null;
		}

		return [ $keyword, ! empty( $flexWrap['reverse'] ) ];
	}
}
