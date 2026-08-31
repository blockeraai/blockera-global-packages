<?php

namespace Blockera\Editor\Tests;

use Blockera\Editor\StyleDefinitions\FlexDirection;
use ReflectionMethod;

/**
 * @covers \Blockera\Editor\StyleDefinitions\FlexDirection
 * @covers \Blockera\Editor\StyleDefinitions\FlexDirection::css
 * @covers \Blockera\Editor\StyleDefinitions\FlexDirection::resolveCssAxes
 */
class FlexDirectionTest extends StyleDefinitionTestCase {

	protected string $definition_class = FlexDirection::class;

	/**
	 * @param array<string, mixed> $item
	 * @return array{flexAlign: string, flexJustify: string}
	 */
	private function invokeResolveCssAxes( array $item ): array {
		$method = new ReflectionMethod( FlexDirection::class, 'resolveCssAxes' );
		$method->setAccessible( true );

		return $method->invoke( $this->definition(), $item );
	}

	public function testReturnsEmptyOnGuards(): void {
		$definition = $this->definition();

		$this->assertSame( [], $this->invokeCss( $definition, [] ) );
		$this->assertSame( [], $this->invokeCss( $definition, [ 'type' => '' ] ) );
		$this->assertSame( [], $this->invokeCss( $definition, [ 'type' => 'gap' ] ) );
		$this->assertSame( [], $this->invokeCss( $definition, [ 'type' => 'flex-direction' ] ) );
		$this->assertSame(
			[],
			$this->invokeCss(
				$definition,
				[
					'type'           => 'flex-direction',
					'flex-direction' => 'row',
				]
			)
		);
	}

	public function testReturnsEmptyWhenDisplayIsNotFlexOrGrid(): void {
		$definition = $this->definition();
		$definition->setSettings( [ 'blockeraDisplay' => 'block' ] );

		$result = $this->invokeCss(
			$definition,
			[
				'type'           => 'flex-direction',
				'flex-direction' => [
					'direction' => 'row',
				],
			]
		);

		$this->assertSame( [], $result );
	}

	public function testEmitsDirectionAlignAndJustifyForLegacyColumnKeys(): void {
		$definition = $this->definition();
		$definition->setSettings( [ 'blockeraDisplay' => 'flex' ] );

		$result = $this->invokeCss(
			$definition,
			[
				'type'           => 'flex-direction',
				'flex-direction' => [
					'direction'      => 'column',
					'alignItems'     => 'center',
					'justifyContent' => 'flex-start',
				],
			]
		);

		$this->assertSame(
			$this->cssMap(
				[
					'flex-direction'  => 'column',
					'align-items'     => 'flex-start !important',
					'justify-content' => 'center !important',
				]
			),
			$result
		);
	}

	public function testEmitsDirectionAlignAndJustifyForNewColumnKeys(): void {
		$definition = $this->definition();
		$definition->setSettings( [ 'blockeraDisplay' => 'flex' ] );

		$result = $this->invokeCss(
			$definition,
			[
				'type'           => 'flex-direction',
				'flex-direction' => [
					'direction'   => 'column',
					'flexAlign'   => 'flex-start',
					'flexJustify' => 'center',
				],
			]
		);

		$this->assertSame(
			$this->cssMap(
				[
					'flex-direction'  => 'column',
					'align-items'     => 'flex-start !important',
					'justify-content' => 'center !important',
				]
			),
			$result
		);
	}

	public function testEmitsDirectionAlignAndJustifyForLegacyRowKeys(): void {
		$definition = $this->definition();
		$definition->setSettings( [ 'blockeraDisplay' => 'flex' ] );

		$result = $this->invokeCss(
			$definition,
			[
				'type'           => 'flex-direction',
				'flex-direction' => [
					'direction'      => 'row',
					'alignItems'     => 'center',
					'justifyContent' => 'space-between',
				],
			]
		);

		$this->assertSame(
			$this->cssMap(
				[
					'flex-direction'  => 'row',
					'align-items'     => 'center !important',
					'justify-content' => 'space-between !important',
				]
			),
			$result
		);
	}

	public function testEmitsDirectionAlignAndJustifyForNewRowKeys(): void {
		$definition = $this->definition();
		$definition->setSettings( [ 'blockeraDisplay' => 'flex' ] );

		$result = $this->invokeCss(
			$definition,
			[
				'type'           => 'flex-direction',
				'flex-direction' => [
					'direction'   => 'row',
					'flexAlign'   => 'center',
					'flexJustify' => 'space-between',
				],
			]
		);

		$this->assertSame(
			$this->cssMap(
				[
					'flex-direction'  => 'row',
					'align-items'     => 'center !important',
					'justify-content' => 'space-between !important',
				]
			),
			$result
		);
	}

	public function testGridDisplayGateAllowsOutput(): void {
		$definition = $this->definition();
		$definition->setBlock(
			[
				'attrs' => [
					'blockeraDisplay' => 'grid',
				],
			]
		);

		$result = $this->invokeCss(
			$definition,
			[
				'type'           => 'flex-direction',
				'flex-direction' => [
					'direction' => 'row-reverse',
				],
			]
		);

		$this->assertSame( $this->cssMap( [ 'flex-direction' => 'row-reverse' ] ), $result );
	}

	public function testSkipsEmptyDirectionValuesLegacyKeys(): void {
		$definition = $this->definition();
		$definition->setSettings( [ 'blockeraDisplay' => 'flex' ] );

		$result = $this->invokeCss(
			$definition,
			[
				'type'           => 'flex-direction',
				'flex-direction' => [
					'direction'      => '',
					'alignItems'     => null,
					'justifyContent' => '',
				],
			]
		);

		$this->assertSame( [], $result );
	}

	public function testSkipsEmptyDirectionValuesNewKeys(): void {
		$definition = $this->definition();
		$definition->setSettings( [ 'blockeraDisplay' => 'flex' ] );

		$result = $this->invokeCss(
			$definition,
			[
				'type'           => 'flex-direction',
				'flex-direction' => [
					'direction'   => '',
					'flexAlign'   => '',
					'flexJustify' => '',
				],
			]
		);

		$this->assertSame( [], $result );
	}

	public function testResolveHelperPairsLegacyAndNewColumnKeys(): void {
		$expected = [
			'flexAlign'   => 'flex-start',
			'flexJustify' => 'center',
		];

		$this->assertSame(
			$expected,
			$this->invokeResolveCssAxes(
				[
					'direction'      => 'column',
					'alignItems'     => 'center',
					'justifyContent' => 'flex-start',
				]
			)
		);

		$this->assertSame(
			$expected,
			$this->invokeResolveCssAxes(
				[
					'direction'   => 'column',
					'flexAlign'   => 'flex-start',
					'flexJustify' => 'center',
				]
			)
		);
	}

	public function testEmitsDirectionAlignAndJustifyForLegacyColumnStretch(): void {
		$definition = $this->definition();
		$definition->setSettings( [ 'blockeraDisplay' => 'flex' ] );

		$result = $this->invokeCss(
			$definition,
			[
				'type'           => 'flex-direction',
				'flex-direction' => [
					'direction'      => 'column',
					'alignItems'     => 'stretch',
					'justifyContent' => 'flex-start',
				],
			]
		);

		$this->assertSame(
			$this->cssMap(
				[
					'flex-direction'  => 'column',
					'align-items'     => 'stretch !important',
					'justify-content' => 'flex-start !important',
				]
			),
			$result
		);
	}

	public function testEmitsDirectionAlignAndJustifyForNewColumnStretch(): void {
		$definition = $this->definition();
		$definition->setSettings( [ 'blockeraDisplay' => 'flex' ] );

		$result = $this->invokeCss(
			$definition,
			[
				'type'           => 'flex-direction',
				'flex-direction' => [
					'direction'   => 'column',
					'flexAlign'   => 'stretch',
					'flexJustify' => 'flex-start',
				],
			]
		);

		$this->assertSame(
			$this->cssMap(
				[
					'flex-direction'  => 'column',
					'align-items'     => 'stretch !important',
					'justify-content' => 'flex-start !important',
				]
			),
			$result
		);
	}

	public function testResolveHelperDoesNotSwapLegacyColumnStretch(): void {
		$expected = [
			'flexAlign'   => 'stretch',
			'flexJustify' => 'space-between',
		];

		$this->assertSame(
			$expected,
			$this->invokeResolveCssAxes(
				[
					'direction'      => 'column',
					'alignItems'     => 'stretch',
					'justifyContent' => 'space-between',
				]
			)
		);

		$this->assertSame(
			$expected,
			$this->invokeResolveCssAxes(
				[
					'direction'   => 'column',
					'flexAlign'   => 'stretch',
					'flexJustify' => 'space-between',
				]
			)
		);
	}

	public function testEmitsDirectionAlignAndJustifyForLegacyColumnSpaceBetween(): void {
		$definition = $this->definition();
		$definition->setSettings( [ 'blockeraDisplay' => 'flex' ] );

		$result = $this->invokeCss(
			$definition,
			[
				'type'           => 'flex-direction',
				'flex-direction' => [
					'direction'      => 'column',
					'alignItems'     => 'center',
					'justifyContent' => 'space-between',
				],
			]
		);

		$this->assertSame(
			$this->cssMap(
				[
					'flex-direction'  => 'column',
					'align-items'     => 'center !important',
					'justify-content' => 'space-between !important',
				]
			),
			$result
		);
	}

	public function testEmitsDirectionAlignAndJustifyForNewColumnSpaceBetween(): void {
		$definition = $this->definition();
		$definition->setSettings( [ 'blockeraDisplay' => 'flex' ] );

		$result = $this->invokeCss(
			$definition,
			[
				'type'           => 'flex-direction',
				'flex-direction' => [
					'direction'   => 'column',
					'flexAlign'   => 'center',
					'flexJustify' => 'space-between',
				],
			]
		);

		$this->assertSame(
			$this->cssMap(
				[
					'flex-direction'  => 'column',
					'align-items'     => 'center !important',
					'justify-content' => 'space-between !important',
				]
			),
			$result
		);
	}

	public function testResolveHelperDoesNotSwapLegacyColumnSpaceDistribution(): void {
		foreach ( [ 'space-around', 'space-between' ] as $justify_content ) {
			$expected = [
				'flexAlign'   => 'center',
				'flexJustify' => $justify_content,
			];

			$this->assertSame(
				$expected,
				$this->invokeResolveCssAxes(
					[
						'direction'      => 'column',
						'alignItems'     => 'center',
						'justifyContent' => $justify_content,
					]
				)
			);

			$this->assertSame(
				$expected,
				$this->invokeResolveCssAxes(
					[
						'direction'   => 'column',
						'flexAlign'   => 'center',
						'flexJustify' => $justify_content,
					]
				)
			);
		}
	}
}
