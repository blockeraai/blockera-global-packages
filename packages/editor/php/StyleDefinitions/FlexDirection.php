<?php

namespace Blockera\Editor\StyleDefinitions;

use Blockera\Editor\StyleDefinitions\Traits\WithDisplayValueTrait;

class FlexDirection extends BaseStyleDefinition {

	use WithDisplayValueTrait;

	protected function css( array $setting ): array {

		if ( ! isset( $setting['type'] ) ) {
			return [];
		}

		$cssProperty = $setting['type'];

		if ( '' === $cssProperty || 'flex-direction' !== $cssProperty || ! isset( $setting[ $cssProperty ] ) ) {
			return [];
		}

		$item = $setting['flex-direction'];

		if ( ! is_array( $item ) ) {
			return [];
		}

		$display = $this->getDisplayValue();

		if ( 'flex' !== $display && 'grid' !== $display ) {
			return [];
		}

		$direction      = $item['direction'] ?? null;
		$axes           = $this->resolveCssAxes( $item );
		$alignItems     = $axes['flexAlign'];
		$justifyContent = $axes['flexJustify'];

		if ( null !== $direction && '' !== $direction ) {
			$this->declarations[ $cssProperty ] = $direction;
		}

		if ( null !== $alignItems && '' !== $alignItems ) {
			$this->declarations['align-items'] = $alignItems . ' !important';
		}

		if ( null !== $justifyContent && '' !== $justifyContent ) {
			$this->declarations['justify-content'] = $justifyContent . ' !important';
		}

		$this->setCss( $this->declarations );

		return $this->css;
	}

	/**
	 * Resolve blockeraFlexLayout axes for CSS.
	 *
	 * Legacy `alignItems` / `justifyContent` (no flexAlign/flexJustify):
	 * row is 1:1; column swaps into align-items / justify-content, except when
	 * `alignItems` is `stretch` or `justifyContent` is `space-around` /
	 * `space-between` (already CSS-axis values; do not swap).
	 * New `flexAlign` / `flexJustify` map 1:1 to those CSS properties.
	 *
	 * @param array $item Flex layout value.
	 * @return array{flexAlign: string, flexJustify: string}
	 */
	private function resolveCssAxes( array $item ): array {
		$has_old = array_key_exists( 'alignItems', $item ) || array_key_exists( 'justifyContent', $item );
		$has_new = array_key_exists( 'flexAlign', $item ) || array_key_exists( 'flexJustify', $item );

		$flex_align   = isset( $item['flexAlign'] ) && is_string( $item['flexAlign'] ) ? $item['flexAlign'] : '';
		$flex_justify = isset( $item['flexJustify'] ) && is_string( $item['flexJustify'] ) ? $item['flexJustify'] : '';

		$is_legacy = $has_old && ( ! $has_new || ( '' === $flex_align && '' === $flex_justify ) );

		if ( $is_legacy ) {
			$align_items     = isset( $item['alignItems'] ) && is_string( $item['alignItems'] ) ? $item['alignItems'] : '';
			$justify_content = isset( $item['justifyContent'] ) && is_string( $item['justifyContent'] ) ? $item['justifyContent'] : '';
			$direction       = isset( $item['direction'] ) && is_string( $item['direction'] ) ? $item['direction'] : 'row';

			$is_distribution = in_array( $justify_content, [ 'space-around', 'space-between' ], true );
			$should_swap     = 'column' === $direction && 'stretch' !== $align_items && ! $is_distribution;

			if ( $should_swap ) {
				$flex_align   = $justify_content;
				$flex_justify = $align_items;
			} else {
				$flex_align   = $align_items;
				$flex_justify = $justify_content;
			}
		}

		return [
			'flexAlign'   => $flex_align,
			'flexJustify' => $flex_justify,
		];
	}
}
